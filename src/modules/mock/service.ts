import "server-only";

import { fromZonedTime } from "date-fns-tz";

import { type ExperienceBand } from "@/lib/domain";

import { getContentService } from "@/modules/content/service";

import { findMatches } from "./domain/matching";
import { pickQuestions, swapQuestion } from "./domain/questions";
import {
  bandsCompatible,
  canGiveFeedback,
  canReportNoShow,
  isLateCancel,
  isSuspended,
  overlaps,
  recordNoShow,
  startsSoonEnough,
} from "./domain/rules";
import { type PeerScore, peerScore } from "./domain/score";
import { type MockStore, getMockStore } from "./repository.json";
import {
  type FeedbackInput,
  type JoinMockInput,
  type MatchRequest,
  type MatchRequestInput,
  type MockFeedback,
  type MockProfile,
  type MockReport,
  type MockSession,
  type MockSlot,
  type PostSlotInput,
  type ReportReason,
} from "./schemas";

export class MockError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "MockError";
  }
}

export const MAX_OPEN_SLOTS = 10;
export const MAX_OPEN_REQUESTS = 3;

/** What one participant sees of a session. Never includes the partner's email or private data. */
export interface SessionView {
  session: MockSession;
  partner: { userId: string; displayName: string; band: ExperienceBand | null };
  /** Questions I will ask my partner (with model answers on the page). */
  questionsToAsk: string[];
  partnerTopics: string[];
  myTopics: string[];
  myFeedbackGiven: boolean;
  feedbackReceived: MockFeedback | null;
}

export interface SlotView extends MockSlot {
  hostName: string;
}

function toUtc(date: string, time: string, timezone: string): string {
  const start = fromZonedTime(`${date}T${time}:00`, timezone);
  if (Number.isNaN(start.getTime())) throw new MockError("Invalid date or time");
  return start.toISOString();
}

/** OPEN questions from the content library, the only pool mock questions come from. */
async function openQuestions() {
  const questions = await getContentService().questions();
  return questions.filter((question) => question.format === "OPEN" && question.answers.length > 0);
}

/** Whether a user already has a scheduled session or open slot overlapping a time. */
async function busyChecker(
  store: MockStore,
): Promise<(userId: string, startUtc: string) => boolean> {
  const [sessions, slots] = await Promise.all([
    store.sessions.find((session) => session.status === "SCHEDULED"),
    store.slots.find((slot) => slot.status === "OPEN"),
  ]);
  return (userId, startUtc) =>
    sessions.some(
      (session) =>
        session.participants.some((participant) => participant.userId === userId) &&
        overlaps(session.startUtc, startUtc),
    ) || slots.some((slot) => slot.hostId === userId && overlaps(slot.startUtc, startUtc));
}

interface NewSessionInput {
  source: MockSession["source"];
  startUtc: string;
  roleId: string;
  meetingLink: string | null;
  people: [{ userId: string; topics: string[] }, { userId: string; topics: string[] }];
  questions: Awaited<ReturnType<typeof openQuestions>>;
}

/** Creates a session with questions picked for each participant from their chosen topics. */
function createSession(store: MockStore, input: NewSessionInput): Promise<MockSession> {
  const id = crypto.randomUUID();
  const participant = (person: { userId: string; topics: string[] }) => ({
    userId: person.userId,
    topics: person.topics,
    questionIds: pickQuestions(input.questions, person.topics, `${id}:${person.userId}`).map(
      (question) => question.id,
    ),
  });
  return store.sessions.create({
    id,
    source: input.source,
    startUtc: input.startUtc,
    durationMinutes: 60,
    roleId: input.roleId,
    participants: [participant(input.people[0]), participant(input.people[1])],
    meetingLink: input.meetingLink,
    status: "SCHEDULED",
    cancelledBy: null,
    noShowUserId: null,
    remindedUserIds: [],
  });
}

/**
 * Mock interviews on behalf of ONE signed-in user (`me`). Every method checks
 * that `me` is allowed to see or change what it touches. Partners only ever
 * see each other's display name, role, level and chosen topics.
 */
export class MockService {
  constructor(
    private readonly me: string,
    private readonly store: MockStore = getMockStore(),
  ) {}

  /* ---------------------------- profile ---------------------------- */

  profile(): Promise<MockProfile | null> {
    return this.store.profiles.findOne((profile) => profile.userId === this.me);
  }

  private async requireProfile(now?: Date): Promise<MockProfile> {
    const profile = await this.profile();
    if (!profile) throw new MockError("Join mock interviews first");
    if (now && isSuspended(profile.suspendedUntil, now)) {
      throw new MockError("Booking is paused for a week after repeated no-shows");
    }
    return profile;
  }

  async join(input: Omit<JoinMockInput, "agree">): Promise<MockProfile> {
    const existing = await this.profile();
    const fields = {
      displayName: input.displayName,
      roleId: input.roleId,
      band: input.band,
      timezone: input.timezone,
      showScore: input.showScore,
    };
    if (existing) return (await this.store.profiles.update(existing.id, fields)) as MockProfile;
    return this.store.profiles.create({
      ...fields,
      userId: this.me,
      noShows: [],
      suspendedUntil: null,
    });
  }

  private async names(userIds: string[]): Promise<Map<string, string>> {
    const wanted = new Set(userIds);
    const profiles = await this.store.profiles.find((profile) => wanted.has(profile.userId));
    return new Map(profiles.map((profile) => [profile.userId, profile.displayName]));
  }

  /* ----------------------- blocks and conflicts ---------------------- */

  private async blockPairs(): Promise<(a: string, b: string) => boolean> {
    const blocks = await this.store.blocks.list();
    const set = new Set(blocks.map((block) => `${block.blockerId}>${block.blockedId}`));
    return (a, b) => set.has(`${a}>${b}`);
  }

  private isBusyFn() {
    return busyChecker(this.store);
  }

  async blockedIds(): Promise<Set<string>> {
    const blocks = await this.store.blocks.find((block) => block.blockerId === this.me);
    return new Set(blocks.map((block) => block.blockedId));
  }

  async block(userId: string): Promise<void> {
    if (userId === this.me) throw new MockError("You cannot block yourself");
    if ((await this.blockedIds()).has(userId)) return;
    await this.store.blocks.create({ blockerId: this.me, blockedId: userId });
  }

  async unblock(userId: string): Promise<void> {
    await this.store.blocks.deleteWhere(
      (block) => block.blockerId === this.me && block.blockedId === userId,
    );
  }

  /* ------------------------------ slots ------------------------------ */

  async openSlots(
    filters: { roleId?: string; matchMyLevel?: boolean },
    now: Date,
  ): Promise<SlotView[]> {
    const me = await this.profile();
    const isBlocked = await this.blockPairs();
    const slots = await this.store.slots.find(
      (slot) =>
        slot.status === "OPEN" &&
        slot.hostId !== this.me &&
        startsSoonEnough(slot.startUtc, now) &&
        (!filters.roleId || slot.roleId === filters.roleId) &&
        (!filters.matchMyLevel || !me || bandsCompatible(slot.band, me.band)) &&
        !isBlocked(this.me, slot.hostId) &&
        !isBlocked(slot.hostId, this.me),
    );
    const names = await this.names(slots.map((slot) => slot.hostId));
    return slots
      .sort((a, b) => a.startUtc.localeCompare(b.startUtc))
      .map((slot) => ({ ...slot, hostName: names.get(slot.hostId) ?? "Someone" }));
  }

  async mySlots(): Promise<MockSlot[]> {
    const slots = await this.store.slots.find(
      (slot) => slot.hostId === this.me && slot.status === "OPEN",
    );
    return slots.sort((a, b) => a.startUtc.localeCompare(b.startUtc));
  }

  async postSlot(input: PostSlotInput, now: Date = new Date()): Promise<MockSlot> {
    const me = await this.requireProfile(now);
    const startUtc = toUtc(input.date, input.time, me.timezone);
    if (!startsSoonEnough(startUtc, now)) {
      throw new MockError("Pick a time at least 2 hours from now", "time");
    }
    if ((await this.mySlots()).length >= MAX_OPEN_SLOTS) {
      throw new MockError(`You can have up to ${MAX_OPEN_SLOTS} open slots`);
    }
    if ((await this.isBusyFn())(this.me, startUtc)) {
      throw new MockError("You already have a session or slot at that time", "time");
    }
    return this.store.slots.create({
      hostId: this.me,
      startUtc,
      roleId: me.roleId,
      band: me.band,
      hostTopics: input.topics,
      meetingLink: input.meetingLink,
      note: input.note,
      status: "OPEN",
      sessionId: null,
    });
  }

  async cancelSlot(slotId: string): Promise<void> {
    const slot = await this.store.slots.getById(slotId);
    if (!slot || slot.hostId !== this.me || slot.status !== "OPEN") {
      throw new MockError("Slot not found");
    }
    await this.store.slots.update(slotId, { status: "CANCELLED" });
  }

  /** Books an open slot. The slot file is locked so two people cannot book it at once. */
  async bookSlot(slotId: string, topics: string[], now: Date = new Date()): Promise<MockSession> {
    const me = await this.requireProfile(now);
    const isBlocked = await this.blockPairs();
    const questions = await openQuestions();
    return this.store.slots.transaction(async (slots) => {
      const slot = slots.find((item) => item.id === slotId);
      if (!slot || slot.status !== "OPEN") throw new MockError("This slot is no longer available");
      if (slot.hostId === this.me) throw new MockError("You cannot book your own slot");
      if (isBlocked(this.me, slot.hostId) || isBlocked(slot.hostId, this.me)) {
        throw new MockError("This slot is no longer available");
      }
      if (!startsSoonEnough(slot.startUtc, now)) {
        throw new MockError("This slot starts too soon to book");
      }
      if (!bandsCompatible(slot.band, me.band)) {
        throw new MockError("This slot is for a different experience level");
      }
      if ((await this.isBusyFn())(this.me, slot.startUtc)) {
        throw new MockError("You already have a session at that time");
      }
      const session = await this.createSession({
        source: "SLOT",
        startUtc: slot.startUtc,
        roleId: slot.roleId,
        meetingLink: slot.meetingLink,
        people: [
          { userId: slot.hostId, topics: slot.hostTopics },
          { userId: this.me, topics },
        ],
        questions,
      });
      return {
        records: slots.map((item) =>
          item.id === slotId
            ? {
                ...item,
                status: "BOOKED" as const,
                sessionId: session.id,
                updatedAt: now.toISOString(),
              }
            : item,
        ),
        result: session,
      };
    });
  }

  private createSession(input: NewSessionInput): Promise<MockSession> {
    return createSession(this.store, input);
  }

  /* ------------------------- automatic matching ------------------------ */

  async myRequests(): Promise<MatchRequest[]> {
    return this.store.requests.find(
      (request) => request.userId === this.me && request.status === "OPEN",
    );
  }

  async requestMatch(
    input: MatchRequestInput,
    now: Date = new Date(),
  ): Promise<{ request: MatchRequest; session: MockSession | null }> {
    const me = await this.requireProfile(now);
    if ((await this.myRequests()).length >= MAX_OPEN_REQUESTS) {
      throw new MockError(`You can have up to ${MAX_OPEN_REQUESTS} open partner requests`);
    }
    const startTimes = [...new Set(input.times.map((t) => toUtc(t.date, t.time, me.timezone)))];
    if (startTimes.some((time) => !startsSoonEnough(time, now))) {
      throw new MockError("Every time must be at least 2 hours from now", "times");
    }
    const request = await this.store.requests.create({
      userId: this.me,
      roleId: me.roleId,
      band: me.band,
      topics: input.topics,
      startTimes: startTimes.sort(),
      meetingLink: input.meetingLink,
      status: "OPEN",
      sessionId: null,
    });
    await runMatching(now, this.store);
    const updated = await this.store.requests.getById(request.id);
    const session = updated?.sessionId
      ? await this.store.sessions.getById(updated.sessionId)
      : null;
    return { request: updated ?? request, session };
  }

  async cancelRequest(requestId: string): Promise<void> {
    const request = await this.store.requests.getById(requestId);
    if (!request || request.userId !== this.me || request.status !== "OPEN") {
      throw new MockError("Request not found");
    }
    await this.store.requests.update(requestId, { status: "CANCELLED" });
  }

  /* ------------------------------ sessions ----------------------------- */

  async mySessions(): Promise<SessionView[]> {
    const sessions = await this.store.sessions.find((session) =>
      session.participants.some((participant) => participant.userId === this.me),
    );
    const views = await Promise.all(sessions.map((session) => this.toView(session)));
    return views.sort((a, b) => b.session.startUtc.localeCompare(a.session.startUtc));
  }

  async session(sessionId: string): Promise<SessionView | null> {
    const session = await this.store.sessions.getById(sessionId);
    if (!session || !session.participants.some((p) => p.userId === this.me)) return null;
    return this.toView(session);
  }

  private async requireParticipant(sessionId: string): Promise<MockSession> {
    const session = await this.store.sessions.getById(sessionId);
    if (!session || !session.participants.some((p) => p.userId === this.me)) {
      throw new MockError("Session not found");
    }
    return session;
  }

  private partnerOf(session: MockSession) {
    const partner = session.participants.find((p) => p.userId !== this.me);
    const mine = session.participants.find((p) => p.userId === this.me);
    if (!partner || !mine) throw new MockError("Session not found");
    return { partner, mine };
  }

  private async toView(session: MockSession): Promise<SessionView> {
    const { partner, mine } = this.partnerOf(session);
    const [partnerProfile, feedback] = await Promise.all([
      this.store.profiles.findOne((profile) => profile.userId === partner.userId),
      this.store.feedback.find((item) => item.sessionId === session.id),
    ]);
    return {
      session,
      partner: {
        userId: partner.userId,
        displayName: partnerProfile?.displayName ?? "Your partner",
        band: partnerProfile?.band ?? null,
      },
      questionsToAsk: partner.questionIds,
      partnerTopics: partner.topics,
      myTopics: mine.topics,
      myFeedbackGiven: feedback.some((item) => item.fromUserId === this.me),
      feedbackReceived: feedback.find((item) => item.toUserId === this.me) ?? null,
    };
  }

  async setMeetingLink(sessionId: string, link: string | null): Promise<void> {
    const session = await this.requireParticipant(sessionId);
    if (session.status !== "SCHEDULED") throw new MockError("This session is closed");
    await this.store.sessions.update(sessionId, { meetingLink: link });
  }

  /** Cancelling within 2 hours of the start counts as a no-show for the canceller. */
  async cancelSession(sessionId: string, now: Date = new Date()): Promise<{ late: boolean }> {
    const session = await this.requireParticipant(sessionId);
    if (session.status !== "SCHEDULED") throw new MockError("This session is closed");
    if (now.getTime() >= Date.parse(session.startUtc)) {
      throw new MockError("The session has already started");
    }
    const late = isLateCancel(session.startUtc, now);
    await this.store.sessions.update(sessionId, { status: "CANCELLED", cancelledBy: this.me });
    if (late) await this.applyNoShow(this.me, now);
    return { late };
  }

  /** My partner did not join. Allowed from 15 minutes after the start, for 24 hours. */
  async reportNoShow(sessionId: string, now: Date = new Date()): Promise<void> {
    const session = await this.requireParticipant(sessionId);
    if (session.status !== "SCHEDULED") throw new MockError("This session is closed");
    if (!canReportNoShow(session.startUtc, now)) {
      throw new MockError("You can report a no-show from 15 minutes after the start");
    }
    const { partner } = this.partnerOf(session);
    await this.store.sessions.update(sessionId, {
      status: "NO_SHOW",
      noShowUserId: partner.userId,
    });
    await this.applyNoShow(partner.userId, now);
  }

  private async applyNoShow(userId: string, now: Date): Promise<void> {
    const profile = await this.store.profiles.findOne((item) => item.userId === userId);
    if (!profile) return;
    const result = recordNoShow(profile.noShows, now);
    await this.store.profiles.update(profile.id, {
      noShows: result.noShows,
      suspendedUntil: result.suspendedUntil ?? profile.suspendedUntil,
    });
  }

  /** The interviewer swaps one of the questions they will ask. */
  async swapPartnerQuestion(sessionId: string, questionId: string): Promise<string[]> {
    const session = await this.requireParticipant(sessionId);
    if (session.status !== "SCHEDULED") throw new MockError("This session is closed");
    const { partner } = this.partnerOf(session);
    const next = swapQuestion(
      await openQuestions(),
      partner.questionIds,
      questionId,
      partner.topics,
      `${session.id}:${partner.userId}`,
    );
    await this.setPartnerQuestions(session, next);
    return next;
  }

  /** The interviewer picks a specific question (from the partner's chosen topics) instead. */
  async replacePartnerQuestion(sessionId: string, oldId: string, newId: string): Promise<string[]> {
    const session = await this.requireParticipant(sessionId);
    if (session.status !== "SCHEDULED") throw new MockError("This session is closed");
    const { partner } = this.partnerOf(session);
    const question = (await openQuestions()).find((item) => item.id === newId);
    if (!question || !partner.topics.includes(question.topicId)) {
      throw new MockError("Pick a question from your partner's topics");
    }
    if (partner.questionIds.includes(newId)) return partner.questionIds;
    const next = partner.questionIds.includes(oldId)
      ? partner.questionIds.map((id) => (id === oldId ? newId : id))
      : [...partner.questionIds, newId].slice(0, 12);
    await this.setPartnerQuestions(session, next);
    return next;
  }

  private async setPartnerQuestions(session: MockSession, questionIds: string[]): Promise<void> {
    const participants = session.participants.map((p) =>
      p.userId === this.me ? p : { ...p, questionIds },
    ) as MockSession["participants"];
    await this.store.sessions.update(session.id, { participants });
  }

  /** Scheduler: records that I was sent the 1-hour reminder. */
  async markReminded(sessionId: string): Promise<void> {
    const session = await this.requireParticipant(sessionId);
    if (session.remindedUserIds.includes(this.me)) return;
    await this.store.sessions.update(sessionId, {
      remindedUserIds: [...session.remindedUserIds, this.me],
    });
  }

  /* ------------------------------ feedback ----------------------------- */

  async submitFeedback(
    sessionId: string,
    input: FeedbackInput,
    now: Date = new Date(),
  ): Promise<MockFeedback> {
    const session = await this.requireParticipant(sessionId);
    if (session.status === "CANCELLED" || session.status === "NO_SHOW") {
      throw new MockError("This session did not take place");
    }
    if (!canGiveFeedback(session.startUtc, now)) {
      throw new MockError("You can give feedback once the session has started");
    }
    const { partner } = this.partnerOf(session);
    const asked = new Set(partner.questionIds);
    if (input.questions.some((item) => !asked.has(item.questionId))) {
      throw new MockError("Rate only the questions you asked");
    }
    const feedback = await this.store.feedback.transaction((records) => {
      if (records.some((item) => item.sessionId === sessionId && item.fromUserId === this.me)) {
        throw new MockError("You already gave feedback for this session");
      }
      const created = {
        id: crypto.randomUUID(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        sessionId,
        fromUserId: this.me,
        toUserId: partner.userId,
        ratings: input.ratings,
        questions: input.questions,
        strengths: input.strengths,
        improvements: input.improvements,
      };
      return { records: [...records, created], result: created };
    });
    if (session.status === "SCHEDULED") {
      await this.store.sessions.update(sessionId, { status: "COMPLETED" });
    }
    return feedback;
  }

  /** Feedback others gave me, newest first. */
  async feedbackReceived(): Promise<MockFeedback[]> {
    const items = await this.store.feedback.find((item) => item.toUserId === this.me);
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async score(): Promise<PeerScore> {
    return peerScore(await this.feedbackReceived());
  }

  /* ------------------------------ reports ------------------------------ */

  async report(
    reportedUserId: string,
    input: { reason: ReportReason; note: string },
    sessionId: string | null,
  ): Promise<void> {
    if (reportedUserId === this.me) throw new MockError("You cannot report yourself");
    // You can only report someone you had a session with.
    const sessions = await this.store.sessions.find(
      (session) =>
        session.participants.some((p) => p.userId === this.me) &&
        session.participants.some((p) => p.userId === reportedUserId),
    );
    if (sessions.length === 0) throw new MockError("You can only report a past partner");
    await this.store.reports.create({
      reporterId: this.me,
      reportedUserId,
      sessionId,
      reason: input.reason,
      note: input.note,
      status: "OPEN",
      resolution: null,
    });
  }

  /** Account deletion: drop everything this user put into the shared mock store. */
  async removeAllMyData(): Promise<void> {
    const mine = (id: string) => id === this.me;
    await this.store.slots.deleteWhere((slot) => mine(slot.hostId));
    await this.store.requests.deleteWhere((request) => mine(request.userId));
    await this.store.blocks.deleteWhere((b) => mine(b.blockerId) || mine(b.blockedId));
    await this.store.reports.deleteWhere((r) => mine(r.reporterId));
    // Feedback I received goes; feedback I gave stays with my partner, without my name.
    await this.store.feedback.deleteWhere((f) => mine(f.toUserId));
    await this.store.profiles.deleteWhere((p) => mine(p.userId));
    const sessions = await this.store.sessions.find((s) =>
      s.participants.some((p) => mine(p.userId)),
    );
    for (const session of sessions) {
      if (session.status === "SCHEDULED") {
        await this.store.sessions.update(session.id, { status: "CANCELLED", cancelledBy: this.me });
      }
    }
  }
}

/** Pairs open partner requests. Runs after every new request and from the scheduler. */
export async function runMatching(
  now: Date = new Date(),
  store: MockStore = getMockStore(),
): Promise<number> {
  const questions = await openQuestions();
  return store.requests.transaction(async (requests) => {
    const open = requests.filter((request) => request.status === "OPEN");
    if (open.length < 2) return { records: requests, result: 0 };
    const blocks = await store.blocks.list();
    const blocked = new Set(blocks.map((b) => `${b.blockerId}>${b.blockedId}`));
    const isBusy = await busyChecker(store);
    const profiles = await store.profiles.list();
    const suspended = new Set(
      profiles.filter((p) => isSuspended(p.suspendedUntil, now)).map((p) => p.userId),
    );
    const matches = findMatches(
      open.filter((request) => !suspended.has(request.userId)),
      { now, isBlocked: (a, b) => blocked.has(`${a}>${b}`), isBusy },
    );
    const updates = new Map<string, string>();
    for (const match of matches) {
      const a = open.find((request) => request.id === match.a.id) as MatchRequest;
      const b = open.find((request) => request.id === match.b.id) as MatchRequest;
      const session = await createSession(store, {
        source: "MATCH",
        startUtc: match.startUtc,
        roleId: a.roleId,
        meetingLink: a.meetingLink ?? b.meetingLink,
        people: [
          { userId: a.userId, topics: a.topics },
          { userId: b.userId, topics: b.topics },
        ],
        questions,
      });
      updates.set(a.id, session.id);
      updates.set(b.id, session.id);
    }
    if (updates.size === 0) return { records: requests, result: 0 };
    return {
      records: requests.map((request) =>
        updates.has(request.id)
          ? {
              ...request,
              status: "MATCHED" as const,
              sessionId: updates.get(request.id) ?? null,
              updatedAt: now.toISOString(),
            }
          : request,
      ),
      result: matches.length,
    };
  });
}

export interface ReportView {
  id: string;
  createdAt: string;
  reason: MockReport["reason"];
  note: string;
  reporterName: string;
  reportedUserId: string;
  reportedName: string;
  /** Open reports against the same person. */
  openAgainstReported: number;
  noShows: number;
  suspendedUntil: string | null;
  sessionStartUtc: string | null;
}

/** Moderator tools (callers must check the admin role and write the audit log). */
export const mockModeration = {
  async openReports(store: MockStore = getMockStore()): Promise<ReportView[]> {
    const [reports, profiles, sessions] = await Promise.all([
      store.reports.list(),
      store.profiles.list(),
      store.sessions.list(),
    ]);
    const profile = new Map(profiles.map((item) => [item.userId, item]));
    const open = reports.filter((report) => report.status === "OPEN");
    return open
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((report) => ({
        id: report.id,
        createdAt: report.createdAt,
        reason: report.reason,
        note: report.note,
        reporterName: profile.get(report.reporterId)?.displayName ?? "Deleted user",
        reportedUserId: report.reportedUserId,
        reportedName: profile.get(report.reportedUserId)?.displayName ?? "Deleted user",
        openAgainstReported: open.filter((r) => r.reportedUserId === report.reportedUserId).length,
        noShows: profile.get(report.reportedUserId)?.noShows.length ?? 0,
        suspendedUntil: profile.get(report.reportedUserId)?.suspendedUntil ?? null,
        sessionStartUtc: sessions.find((s) => s.id === report.sessionId)?.startUtc ?? null,
      }));
  },

  async resolve(reportId: string, resolution: string, store: MockStore = getMockStore()) {
    const report = await store.reports.getById(reportId);
    if (!report) throw new MockError("Report not found");
    await store.reports.update(reportId, {
      status: "RESOLVED",
      resolution: resolution.slice(0, 200),
    });
    return report;
  },

  /** Pauses booking for a user (e.g. after abuse). Days 0 lifts a pause. */
  async suspend(userId: string, days: number, now = new Date(), store: MockStore = getMockStore()) {
    const profile = await store.profiles.findOne((item) => item.userId === userId);
    if (!profile) throw new MockError("User has no mock interview profile");
    await store.profiles.update(profile.id, {
      suspendedUntil:
        days > 0 ? new Date(now.getTime() + days * 24 * 60 * 60_000).toISOString() : null,
    });
  },
};

/** Always acts as the given (authenticated) user. */
export function mockFor(userId: string): MockService {
  return new MockService(userId);
}
