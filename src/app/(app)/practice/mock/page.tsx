import type { Metadata } from "next";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { CalendarPlus, History, Search, Users, UserRoundSearch } from "lucide-react";

import { EmptyState, PageHeader, Section } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BAND_LABELS } from "@/lib/domain";
import { todayIn } from "@/lib/local-date";
import { cn } from "@/lib/utils";
import { requireUser } from "@/modules/auth/service";
import { getContentService } from "@/modules/content/service";
import { SCORE_MIN_SESSIONS } from "@/modules/mock/domain/rules";
import { FEEDBACK_AREAS, FEEDBACK_AREA_LABELS } from "@/modules/mock/schemas";
import { mockFor } from "@/modules/mock/service";
import { FindPartnerForm, JoinMockForm, PostSlotForm } from "@/modules/mock/ui/mock-forms";
import { MyOpenItems, SlotList } from "@/modules/mock/ui/slot-list";
import { requireProfile } from "@/modules/profile/service";

export const metadata: Metadata = { title: "Mock interviews" };

const TABS = [
  { key: "upcoming", label: "Upcoming", icon: Users },
  { key: "slots", label: "Book a slot", icon: Search },
  { key: "post", label: "Post a slot", icon: CalendarPlus },
  { key: "partner", label: "Find a partner", icon: UserRoundSearch },
  { key: "history", label: "History & score", icon: History },
] as const;
type Tab = (typeof TABS)[number]["key"];

const STATUS_BADGE = {
  SCHEDULED: { label: "Scheduled", variant: "info" },
  COMPLETED: { label: "Done", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "muted" },
  NO_SHOW: { label: "No-show", variant: "warning" },
} as const;

export default async function MockInterviewsPage({ searchParams }: PageProps<"/practice/mock">) {
  const user = await requireUser("/practice/mock");
  const profile = await requireProfile(user.id);
  const params = await searchParams;
  const mock = mockFor(user.id);
  const content = getContentService();
  const [mockProfile, roles, topics] = await Promise.all([
    mock.profile(),
    content.roles(profile.trackId),
    content.topics({ trackId: profile.trackId, publishedOnly: true }),
  ]);

  if (!mockProfile || params.edit === "1") {
    return (
      <div className="grid gap-4">
        <PageHeader
          title={mockProfile ? "Mock interview profile" : "Mock interviews"}
          description="Practise with another developer: 60 minutes, you take turns interviewing each other. You meet on your own Google Meet or Zoom link."
        />
        <JoinMockForm
          isEdit={Boolean(mockProfile)}
          roles={roles.map((role) => ({ id: role.id, name: role.name }))}
          defaults={{
            displayName: mockProfile?.displayName ?? profile.displayName ?? "",
            roleId: mockProfile?.roleId ?? profile.targetRoleId,
            band: mockProfile?.band ?? profile.experienceBand,
            timezone: mockProfile?.timezone ?? profile.timezone,
            showScore: mockProfile?.showScore ?? false,
          }}
        />
      </div>
    );
  }

  const tab: Tab = TABS.some((item) => item.key === params.tab) ? (params.tab as Tab) : "upcoming";
  const now = new Date();
  const tz = mockProfile.timezone;
  const when = (iso: string) => formatInTimeZone(new Date(iso), tz, "EEE d MMM, HH:mm");
  const topicName = new Map(topics.map((topic) => [topic.id, topic.name]));
  const roleName = new Map(roles.map((role) => [role.id, role.name]));
  const pickerTopics = topics
    .filter((topic) => topic.roleImportance.some((entry) => entry.roleId === mockProfile.roleId))
    .map((topic) => ({ id: topic.id, name: topic.name, category: topic.category }));
  const [sessions, mySlots, myRequests] = await Promise.all([
    mock.mySessions(),
    mock.mySlots(),
    mock.myRequests(),
  ]);
  const upcoming = sessions
    .filter((view) => view.session.status === "SCHEDULED")
    .sort((a, b) => a.session.startUtc.localeCompare(b.session.startUtc));
  const past = sessions.filter((view) => view.session.status !== "SCHEDULED");
  const suspended =
    mockProfile.suspendedUntil && Date.parse(mockProfile.suspendedUntil) > now.getTime();

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Mock interviews"
        description={`You appear as ${mockProfile.displayName} · ${roleName.get(mockProfile.roleId) ?? ""} · ${BAND_LABELS[mockProfile.band]}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/practice/mock?edit=1">Edit profile</Link>
          </Button>
        }
      />
      {suspended && (
        <p
          className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950/40"
          role="status"
        >
          Booking is paused until {when(mockProfile.suspendedUntil as string)} after repeated
          no-shows.
        </p>
      )}
      <nav aria-label="Mock interview sections" className="flex flex-wrap gap-1 border-b">
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={`/practice/mock?tab=${item.key}`}
            aria-current={tab === item.key ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm",
              tab === item.key
                ? "border-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
            {item.key === "upcoming" && upcoming.length > 0 && (
              <Badge variant="secondary">{upcoming.length}</Badge>
            )}
          </Link>
        ))}
      </nav>

      {tab === "upcoming" && (
        <div className="grid gap-4">
          {upcoming.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No mock interviews scheduled"
              description="Book an open slot, post your own, or let us find you a partner."
              action={
                <Button asChild>
                  <Link href="/practice/mock?tab=slots">Browse open slots</Link>
                </Button>
              }
            />
          ) : (
            <ul className="grid gap-3">
              {upcoming.map(({ session, partner }) => (
                <li key={session.id}>
                  <Link
                    href={`/practice/mock/sessions/${session.id}`}
                    className="flex flex-wrap items-center gap-3 rounded-lg border p-4 hover:bg-accent/40"
                  >
                    <span className="grid flex-1 gap-0.5">
                      <span className="font-medium">{when(session.startUtc)}</span>
                      <span className="text-sm text-muted-foreground">
                        with {partner.displayName}
                      </span>
                    </span>
                    {!session.meetingLink && <Badge variant="warning">Add a meeting link</Badge>}
                    <span className="text-sm text-primary">Open →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Section title="Your open slots and requests">
            <MyOpenItems
              slots={mySlots.map((slot) => ({
                id: slot.id,
                when: when(slot.startUtc),
                topics: slot.hostTopics.map((id) => topicName.get(id) ?? "Topic"),
              }))}
              requests={myRequests.map((request) => ({
                id: request.id,
                times: request.startTimes.map(when),
                topics: request.topics.map((id) => topicName.get(id) ?? "Topic"),
              }))}
            />
            {mySlots.length === 0 && myRequests.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing open right now.</p>
            )}
          </Section>
        </div>
      )}

      {tab === "slots" && (
        <SlotsTab
          userId={user.id}
          now={now}
          allLevels={params.all === "1"}
          when={when}
          topicName={topicName}
          roleName={roleName}
          pickerTopics={pickerTopics}
        />
      )}

      {tab === "post" && (
        <Section
          title="Post an open slot"
          description="Anyone at a similar level can book it. Times are in your timezone."
        >
          <PostSlotForm topics={pickerTopics} today={todayIn(tz)} />
        </Section>
      )}

      {tab === "partner" && (
        <Section
          title="Find me a partner"
          description="Give a few times that suit you. We pair you with someone for the same role and a similar level who picked the same time."
        >
          <FindPartnerForm topics={pickerTopics} today={todayIn(tz)} />
        </Section>
      )}

      {tab === "history" && <HistoryTab userId={user.id} past={past} when={when} />}
    </div>
  );
}

async function SlotsTab({
  userId,
  now,
  allLevels,
  when,
  topicName,
  roleName,
  pickerTopics,
}: {
  userId: string;
  now: Date;
  allLevels: boolean;
  when: (iso: string) => string;
  topicName: Map<string, string>;
  roleName: Map<string, string>;
  pickerTopics: { id: string; name: string; category: string }[];
}) {
  const mock = mockFor(userId);
  const me = await mock.profile();
  const slots = await mock.openSlots({ roleId: me?.roleId, matchMyLevel: !allLevels }, now);
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        {allLevels
          ? "Showing all levels for your role. "
          : "Showing your role at a similar level. "}
        <Link
          className="underline"
          href={allLevels ? "/practice/mock?tab=slots" : "/practice/mock?tab=slots&all=1"}
        >
          {allLevels ? "Similar level only" : "Show all levels"}
        </Link>
      </p>
      {slots.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No open slots right now"
          description="Post your own slot or ask us to find you a partner."
          action={
            <Button asChild variant="outline">
              <Link href="/practice/mock?tab=partner">Find a partner</Link>
            </Button>
          }
        />
      ) : (
        <SlotList
          topics={pickerTopics}
          slots={slots.map((slot) => ({
            id: slot.id,
            when: when(slot.startUtc),
            hostName: slot.hostName,
            level: BAND_LABELS[slot.band],
            role: roleName.get(slot.roleId) ?? "Developer",
            hostTopics: slot.hostTopics.map((id) => topicName.get(id) ?? "Topic"),
            note: slot.note,
            hasLink: Boolean(slot.meetingLink),
          }))}
        />
      )}
    </div>
  );
}

async function HistoryTab({
  userId,
  past,
  when,
}: {
  userId: string;
  past: Awaited<ReturnType<ReturnType<typeof mockFor>["mySessions"]>>;
  when: (iso: string) => string;
}) {
  const mock = mockFor(userId);
  const [score, profile] = await Promise.all([mock.score(), mock.profile()]);
  return (
    <div className="grid gap-6">
      <Section
        title="Your peer score"
        description={
          profile?.showScore
            ? `Shown on your readiness passport once you have ${SCORE_MIN_SESSIONS} sessions with feedback.`
            : "Private. You can choose to show it on your passport in your mock interview profile."
        }
      >
        {score.overall === null ? (
          <p className="text-sm text-muted-foreground">No feedback yet.</p>
        ) : (
          <div className="grid gap-2">
            <p className="text-2xl font-semibold">
              {score.overall}/5{" "}
              <span className="text-sm font-normal text-muted-foreground">
                from {score.sessions} session{score.sessions === 1 ? "" : "s"}
              </span>
            </p>
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {FEEDBACK_AREAS.map((area) => (
                <li key={area} className="flex justify-between gap-2 rounded-md border px-3 py-1.5">
                  <span>{FEEDBACK_AREA_LABELS[area]}</span>
                  <span className="font-medium">{score.byArea[area] ?? "–"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>
      <Section title="Past sessions">
        {past.length === 0 ? (
          <p className="text-sm text-muted-foreground">No past sessions yet.</p>
        ) : (
          <ul className="grid gap-2">
            {past.map(({ session, partner, feedbackReceived, myFeedbackGiven }) => (
              <li key={session.id}>
                <Link
                  href={`/practice/mock/sessions/${session.id}`}
                  className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm hover:bg-accent/40"
                >
                  <Badge variant={STATUS_BADGE[session.status].variant}>
                    {STATUS_BADGE[session.status].label}
                  </Badge>
                  <span className="flex-1">
                    {when(session.startUtc)} with {partner.displayName}
                  </span>
                  {feedbackReceived && <Badge variant="success">Feedback received</Badge>}
                  {session.status === "COMPLETED" && !myFeedbackGiven && (
                    <Badge variant="warning">Give feedback</Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
