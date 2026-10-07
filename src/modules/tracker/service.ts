import "server-only";

import { randomUUID } from "node:crypto";

import { companyKey } from "@/lib/domain";
import {
  decrypt,
  decryptJson,
  decryptOptional,
  encrypt,
  encryptJson,
  encryptOptional,
} from "@/lib/services/crypto";

import { nextRoundNumber, statusWhenScheduling, toUtcRange } from "./domain/rounds";
import {
  type ApplicationRepository,
  type CustomFieldRepository,
  type RoundRepository,
} from "./repository";
import {
  JsonApplicationRepository,
  JsonCustomFieldRepository,
  JsonRoundRepository,
} from "./repository.json";
import {
  type Application,
  type ApplicationInput,
  type ApplicationPatch,
  type ApplicationRecord,
  type Attachment,
  type ApplicationStatus,
  type ChecklistItem,
  type CustomField,
  EMPTY_PEOPLE,
  PeopleSchema,
  type Round,
  type RoundInput,
  type RoundRecord,
  type RoundResult,
  type RoundStatus,
} from "./schemas";

/** What a deleted round leaves behind for other modules to clean up. */
export interface DeletedRound {
  id: string;
  storageKeys: string[];
}

export class TrackerError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "TrackerError";
  }
}

/** Default prep checklist for a newly scheduled round. */
function defaultChecklist(): ChecklistItem[] {
  return [
    "Read the job description again",
    "Research the company and product",
    "Revise the topics for this round",
    "Prepare 2–3 stories for behavioral questions",
    "Prepare questions to ask the interviewer",
  ].map((label) => ({ id: randomUUID(), label, done: false }));
}

/**
 * The private tracker for ONE user. Sensitive fields are encrypted before they
 * are written and decrypted only for the owner.
 */
export class TrackerService {
  constructor(
    private readonly applications: ApplicationRepository,
    private readonly rounds: RoundRepository,
    private readonly customFields: CustomFieldRepository,
  ) {}

  /* Mapping ------------------------------------------------------------------ */

  private toApplication(record: ApplicationRecord): Application {
    return {
      ...record,
      referrerName: decryptOptional(record.referrerName),
      agency: decryptOptional(record.agency),
      expectedSalary: decryptOptional(record.expectedSalary),
      offeredSalary: decryptOptional(record.offeredSalary),
      notes: decryptOptional(record.notes),
      outcome: decryptOptional(record.outcome),
    };
  }

  private toRound(record: RoundRecord): Round {
    return {
      ...record,
      people: record.people ? decryptJson(record.people, PeopleSchema) : EMPTY_PEOPLE,
      notes: decryptOptional(record.notes),
      cancelReason: decryptOptional(record.cancelReason),
      followUpNote: decryptOptional(record.followUpNote),
      attachments: record.attachments.map((attachment) => ({
        ...attachment,
        fileName: decrypt(attachment.fileName),
      })),
    };
  }

  private applicationFields(input: ApplicationInput) {
    return {
      companyName: input.companyName,
      companyKey: companyKey(input.companyName) || "company",
      jobTitle: input.jobTitle,
      technologies: input.technologies,
      jobLink: input.jobLink,
      source: input.source,
      referrerName: encryptOptional(input.referrerName),
      agency: encryptOptional(input.agency),
      appliedOn: input.appliedOn,
      status: input.status,
      expectedSalary: encryptOptional(input.expectedSalary),
      offeredSalary: encryptOptional(input.offeredSalary),
      offerJoiningDate: input.offerJoiningDate,
      notes: encryptOptional(input.notes),
      followUpDate: input.followUpDate,
      outcome: encryptOptional(input.outcome),
    };
  }

  /* Applications --------------------------------------------------------------- */

  async listApplications(): Promise<Application[]> {
    const records = await this.applications.list();
    return records
      .map((record) => this.toApplication(record))
      .sort((a, b) => a.kanbanOrder - b.kanbanOrder || b.createdAt.localeCompare(a.createdAt));
  }

  async getApplication(id: string): Promise<Application | null> {
    const record = await this.applications.getById(id);
    return record ? this.toApplication(record) : null;
  }

  async createApplication(input: ApplicationInput): Promise<Application> {
    const existing = await this.applications.list();
    const minOrder = existing.reduce((min, record) => Math.min(min, record.kanbanOrder), 0);
    const record = await this.applications.create({
      ...this.applicationFields(input),
      customValues: {},
      kanbanOrder: minOrder - 1,
    });
    return this.toApplication(record);
  }

  async updateApplication(id: string, input: ApplicationInput): Promise<Application> {
    const record = await this.applications.update(id, this.applicationFields(input));
    if (!record) throw new TrackerError("Application not found");
    return this.toApplication(record);
  }

  /** Inline edit of simple, non-sensitive fields. */
  async patchApplication(id: string, patch: ApplicationPatch): Promise<Application> {
    const record = await this.applications.update(id, {
      ...patch,
      ...(patch.companyName ? { companyKey: companyKey(patch.companyName) || "company" } : {}),
    });
    if (!record) throw new TrackerError("Application not found");
    return this.toApplication(record);
  }

  async setApplicationStatus(id: string, status: ApplicationStatus): Promise<Application> {
    const record = await this.applications.update(id, { status });
    if (!record) throw new TrackerError("Application not found");
    return this.toApplication(record);
  }

  async moveApplication(id: string, status: ApplicationStatus, order: number): Promise<void> {
    const moved = await this.applications.move(id, status, order);
    if (!moved) throw new TrackerError("Application not found");
  }

  async setCustomValue(id: string, fieldId: string, value: string | number | boolean | null) {
    const record = await this.applications.getById(id);
    if (!record) throw new TrackerError("Application not found");
    const fields = await this.customFields.list();
    if (!fields.some((field) => field.id === fieldId)) throw new TrackerError("Unknown column");
    await this.applications.update(id, {
      customValues: { ...record.customValues, [fieldId]: value },
    });
  }

  /** Deletes an application and all its rounds. Returns what the rounds left behind. */
  async deleteApplication(id: string): Promise<DeletedRound[]> {
    const rounds = await this.rounds.listForApplication(id);
    await this.rounds.deleteForApplication(id);
    await this.applications.delete(id);
    const orphaned = new Set(
      await this.unreferenced(
        rounds.flatMap((round) => round.attachments.map((attachment) => attachment.storageKey)),
      ),
    );
    return rounds.map((round) => ({
      id: round.id,
      storageKeys: round.attachments
        .map((attachment) => attachment.storageKey)
        .filter((key) => orphaned.has(key)),
    }));
  }

  /**
   * Storage keys no remaining round still points at. Rescheduled rounds share
   * their attachments, so a file is only deleted once nothing references it.
   */
  private async unreferenced(keys: string[]): Promise<string[]> {
    if (keys.length === 0) return [];
    const inUse = new Set(
      (await this.rounds.list()).flatMap((round) =>
        round.attachments.map((attachment) => attachment.storageKey),
      ),
    );
    return [...new Set(keys)].filter((key) => !inUse.has(key));
  }

  /* Rounds ----------------------------------------------------------------------- */

  async listRounds(): Promise<Round[]> {
    const records = await this.rounds.list();
    return records
      .map((record) => this.toRound(record))
      .sort((a, b) => a.startUtc.localeCompare(b.startUtc));
  }

  async getRound(id: string): Promise<Round | null> {
    const record = await this.rounds.getById(id);
    return record ? this.toRound(record) : null;
  }

  async roundsForApplication(applicationId: string): Promise<Round[]> {
    const records = await this.rounds.listForApplication(applicationId);
    return records
      .map((record) => this.toRound(record))
      .sort((a, b) => a.roundNumber - b.roundNumber);
  }

  async createRound(
    input: RoundInput,
  ): Promise<{ round: Round; applicationStatus: ApplicationStatus }> {
    const application = await this.applications.getById(input.applicationId);
    if (!application) throw new TrackerError("Application not found", "applicationId");
    const { startUtc, endUtc } = toUtcRange(
      input.date,
      input.startTime,
      input.durationMinutes,
      input.timezone,
    );
    const siblings = await this.rounds.listForApplication(input.applicationId);

    const record = await this.rounds.create({
      applicationId: input.applicationId,
      roundNumber: nextRoundNumber(siblings),
      type: input.type,
      title: input.title,
      startUtc,
      endUtc,
      timezone: input.timezone,
      mode: input.mode,
      meetingLink: input.meetingLink,
      location: input.location,
      status: "SCHEDULED",
      result: "AWAITING",
      people: encryptJson(input.people),
      cancelReason: null,
      cancelledBy: null,
      rescheduledFromId: null,
      rescheduledToId: null,
      reminderMinutes: input.reminderMinutes,
      followUpDate: null,
      followUpNote: null,
      prepChecklist: defaultChecklist(),
      interviewerQuestions: [],
      notes: encryptOptional(input.notes),
      attachments: [],
      sentReminders: [],
    });

    const nextStatus = statusWhenScheduling(application.status, input.type);
    if (nextStatus !== application.status)
      await this.applications.update(application.id, { status: nextStatus });
    return { round: this.toRound(record), applicationStatus: nextStatus };
  }

  async updateRound(id: string, input: RoundInput): Promise<Round> {
    const current = await this.rounds.getById(id);
    if (!current) throw new TrackerError("Round not found");
    const { startUtc, endUtc } = toUtcRange(
      input.date,
      input.startTime,
      input.durationMinutes,
      input.timezone,
    );
    const timeChanged = startUtc !== current.startUtc;
    const record = await this.rounds.update(id, {
      type: input.type,
      title: input.title,
      startUtc,
      endUtc,
      timezone: input.timezone,
      mode: input.mode,
      meetingLink: input.meetingLink,
      location: input.location,
      people: encryptJson(input.people),
      reminderMinutes: input.reminderMinutes,
      notes: encryptOptional(input.notes),
      // A new time means reminders for the old time no longer apply.
      ...(timeChanged ? { sentReminders: [] } : {}),
    });
    if (!record) throw new TrackerError("Round not found");
    return this.toRound(record);
  }

  async setRoundOutcome(id: string, status: RoundStatus, result: RoundResult): Promise<Round> {
    const record = await this.rounds.update(id, { status, result });
    if (!record) throw new TrackerError("Round not found");
    return this.toRound(record);
  }

  async cancelRound(id: string, reason: string, cancelledBy: "ME" | "COMPANY"): Promise<Round> {
    const record = await this.rounds.update(id, {
      status: "CANCELLED",
      result: "NOT_APPLICABLE",
      cancelReason: encryptOptional(reason),
      cancelledBy,
    });
    if (!record) throw new TrackerError("Round not found");
    return this.toRound(record);
  }

  /** Creates a new round linked to the old one; the old one is marked Rescheduled. */
  async rescheduleRound(
    id: string,
    input: {
      date: string;
      startTime: string;
      durationMinutes: number;
      timezone: string;
      reason: string;
      cancelledBy: "ME" | "COMPANY";
    },
  ): Promise<Round> {
    const current = await this.rounds.getById(id);
    if (!current) throw new TrackerError("Round not found");
    if (current.status !== "SCHEDULED")
      throw new TrackerError("Only scheduled rounds can be rescheduled");
    const { startUtc, endUtc } = toUtcRange(
      input.date,
      input.startTime,
      input.durationMinutes,
      input.timezone,
    );
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = current;
    const result = await this.rounds.reschedule(
      id,
      {
        ...rest,
        startUtc,
        endUtc,
        timezone: input.timezone,
        status: "SCHEDULED",
        result: "AWAITING",
        rescheduledToId: null,
        sentReminders: [],
      },
      { cancelReason: encryptOptional(input.reason || null), cancelledBy: input.cancelledBy },
    );
    if (!result) throw new TrackerError("Round not found");
    return this.toRound(result.newRound);
  }

  async deleteRound(id: string): Promise<DeletedRound | null> {
    const round = await this.rounds.getById(id);
    if (!round) return null;
    await this.rounds.delete(id);
    return {
      id,
      storageKeys: await this.unreferenced(
        round.attachments.map((attachment) => attachment.storageKey),
      ),
    };
  }

  async updateChecklist(id: string, checklist: ChecklistItem[]): Promise<Round> {
    const record = await this.rounds.update(id, { prepChecklist: checklist });
    if (!record) throw new TrackerError("Round not found");
    return this.toRound(record);
  }

  async updateInterviewerQuestions(id: string, questions: string[]): Promise<Round> {
    const record = await this.rounds.update(id, { interviewerQuestions: questions });
    if (!record) throw new TrackerError("Round not found");
    return this.toRound(record);
  }

  async setRoundNotes(id: string, notes: string | null): Promise<Round> {
    const record = await this.rounds.update(id, { notes: encryptOptional(notes) });
    if (!record) throw new TrackerError("Round not found");
    return this.toRound(record);
  }

  async setRoundFollowUp(
    id: string,
    followUpDate: string | null,
    followUpNote: string | null,
  ): Promise<Round> {
    const record = await this.rounds.update(id, {
      followUpDate,
      followUpNote: encryptOptional(followUpNote),
    });
    if (!record) throw new TrackerError("Round not found");
    return this.toRound(record);
  }

  async addAttachment(id: string, input: Attachment): Promise<Round> {
    const attachment = { ...input, fileName: encrypt(input.fileName) };
    const current = await this.rounds.getById(id);
    if (!current) throw new TrackerError("Round not found");
    if (current.attachments.length >= 20)
      throw new TrackerError("At most 20 attachments per round");
    const record = await this.rounds.update(id, {
      attachments: [...current.attachments, attachment],
    });
    return this.toRound(record as RoundRecord);
  }

  async removeAttachment(
    id: string,
    attachmentId: string,
  ): Promise<{ round: Round; storageKey: string | null }> {
    const current = await this.rounds.getById(id);
    if (!current) throw new TrackerError("Round not found");
    const removed =
      current.attachments.find((attachment) => attachment.id === attachmentId) ?? null;
    const record = await this.rounds.update(id, {
      attachments: current.attachments.filter((attachment) => attachment.id !== attachmentId),
    });
    const [orphaned] = removed ? await this.unreferenced([removed.storageKey]) : [];
    return { round: this.toRound(record as RoundRecord), storageKey: orphaned ?? null };
  }

  /** Records that a reminder/prompt was sent (idempotency for scheduled jobs). */
  async markReminderSent(id: string, key: string, at: Date): Promise<void> {
    const current = await this.rounds.getById(id);
    if (!current || current.sentReminders.some((entry) => entry.key === key)) return;
    await this.rounds.update(id, {
      sentReminders: [...current.sentReminders, { key, sentAt: at.toISOString() }].slice(-50),
    });
  }

  /* Custom columns --------------------------------------------------------------- */

  async listCustomFields(): Promise<CustomField[]> {
    return (await this.customFields.list()).sort((a, b) => a.order - b.order);
  }

  async createCustomField(input: { name: string; type: CustomField["type"]; options: string[] }) {
    const fields = await this.customFields.list();
    if (fields.length >= 20) throw new TrackerError("At most 20 custom columns");
    return this.customFields.create({ ...input, order: fields.length });
  }

  async deleteCustomField(id: string): Promise<void> {
    await this.customFields.delete(id);
    for (const record of await this.applications.list()) {
      if (id in record.customValues) {
        const { [id]: _removed, ...rest } = record.customValues;
        await this.applications.update(record.id, { customValues: rest });
      }
    }
  }
}

/** Always scoped to the authenticated user's private folder. */
export function trackerFor(userId: string): TrackerService {
  return new TrackerService(
    new JsonApplicationRepository(userId),
    new JsonRoundRepository(userId),
    new JsonCustomFieldRepository(userId),
  );
}
