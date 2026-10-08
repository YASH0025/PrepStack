# PROJECT BRIEF: Community-Driven Interview Preparation & Job-Switch Platform

You are acting as a senior full-stack engineer, product-minded architect, and UI/UX designer.
Your job is to help me design and build this product step by step, with production-quality code.
Read this entire brief before writing anything. Follow the constraints strictly.

---

## 1. PRODUCT VISION

Build the "job-switch command center" for software developers:
track every interview, prepare specifically for it, practice with structured content,
and learn from developers who just sat in that room.

One-line positioning:
"Track every interview, prep specifically for it, and learn from real developer experiences, all in one place."

This is NOT an AI product. All personalization comes from:
- structured user inputs
- a curated skill graph and question bank
- a transparent rules-based roadmap engine
- community-submitted interview reports

Do not add AI/LLM features anywhere unless I explicitly ask.

---

## 2. TARGET USERS

Primary: Indian software developers with 2–6 years of experience planning a job switch,
especially moving from service companies to product companies.

Their real problems:
- They don't know which topics matter for their experience level and target role.
- They have limited time, often while serving long notice periods (30–90 days).
- They manage interviews in messy spreadsheets, notes, and chats.
- Interview experience information online is scattered, stale, or untrustworthy.
- Generic prep content treats a 2-year and a 6-year developer the same.
- Behavioral and HR rounds are under-prepared.
- They forget what they studied because there is no structured revision.

---

## 3. CORE PRODUCT LOOP (the identity of the product)

1. User logs a real interview in the private tracker. It appears on the calendar.
2. Platform generates or adjusts a targeted prep plan toward that date,
   within the user's notice-period timeline.
3. User studies topic pages and practices questions calibrated to their experience level.
4. 24 hours before the interview, the user gets a focused revision sheet.
5. After the interview, the user fills in a 2-minute private debrief from the calendar event.
6. Missed or partially answered questions go into spaced-repetition review.
   Weak topics feed back into the roadmap.
7. Optionally, the user publishes an anonymized version as a community interview report.
8. Community reports improve topic prioritization for future users.

The product must deliver full value to a single user on day one.
The core value must never depend on the community already existing.

---

## 4. PRODUCT PRINCIPLES (non-negotiable)

- Private by default: tracker data, notes, salary, contacts, and interviewer details are never public.
- Nothing is published automatically. Publishing requires an explicit action and a preview.
- Community reports are user-submitted experiences, not official or guaranteed questions.
- Every topic priority shows WHY it is recommended.
- Never overpromise outcomes or make predictions from small datasets.
  Always show sample sizes and dates for community-derived data.
- Be honest about time: if a plan doesn't fit, show what is being skipped.
- Prefer simple, reliable workflows over flashy features.

---

## 5. MVP SCOPE

### IN SCOPE (build now)

1. Authentication and user profile
2. Onboarding: current stack, years of experience, target role, available time, daily hours
3. Diagnostic assessment per track
4. Skill graph and content (first track: Full-Stack JavaScript —
   JavaScript, React, Node.js/Express, MongoDB/SQL, general engineering)
5. Rules-based roadmap engine with time-based plans (7/15/30/60/90 days, custom)
6. Topic pages with level-calibrated questions and answers
7. Topic progress tracking and a personal saved-question library
8. Private interview tracker (spreadsheet, kanban views)
9. Interview calendar with detailed event panels
10. Interview-linked prep plans (an interview date becomes a roadmap deadline)
11. Last-24-hours revision sheet
12. Notice-period planner
13. Behavioral story bank
14. Spaced-repetition review
15. Post-interview private debrief
16. Anonymized publishing of debriefs as community interview reports
17. Community report search and filters, plus usefulness voting
18. "Today" dashboard
19. Admin CMS for authoring topics, questions, and the skill graph
20. In-app notifications and essential emails (interview reminders, password reset)

### OUT OF SCOPE (do not build yet; keep the architecture open for them)

Video calls, collaborative code editor, reputation points, badges, leaderboards, forum,
coding battles, server-side code execution, trend alerts, offer comparison, referral board,
browser extension, payments, and mobile apps.

Added after the MVP at the owner's request: peer mock interviews, the readiness passport,
coding practice with an in-browser runner (JavaScript and Python via Pyodide; original
problem statements with links to LeetCode), and system design practice linked to ScaleLab.

---

## 6. FEATURE SPECIFICATIONS

### 6.1 Onboarding
- 3 short steps: (1) current stack + experience, (2) target role + optional target companies,
  (3) total prep window + daily hours.
- Optional step: notice-period details (see 6.13).
- All optional fields can be skipped and edited later.
- Ends with an optional diagnostic, then generates the roadmap.

### 6.2 Skill graph (core data asset)
- Topics are nodes with prerequisite edges (for example, Event Loop → Promises → Async Error Handling).
- Each topic has: track, category, description, estimated hours, and core importance (1–5).
- Each topic has a required depth for each experience band:
  bands are 0–2, 2–4, 4–6, and 6+ years.
  Depth levels are KNOW (define it), EXPLAIN (how and why),
  APPLY (real usage and trade-offs), and DESIGN (architecture decisions).
- Each topic belongs to one or more target roles, with role-specific importance.

### 6.3 Diagnostic
- Multiple-choice and short-answer questions tagged by topic and depth.
- The result is a per-topic estimated depth, which outweighs self-rating.
- It can be retaken, and results are stored historically.

### 6.4 Roadmap engine (rules-based, deterministic, explainable)

Inputs:
- profile (stack, experience band, target role)
- diagnostic results
- daily hours and total days
- optional deadline from the nearest tracked interview
- notice-period plan constraints (6.13)
- weak topics from debriefs
- community topic frequency for the role and experience band (only when the sample size ≥ a configurable threshold)

Algorithm:
1. Select topics required for the target role.
2. Set the required depth per topic from the user's experience band.
3. Remove topics where the diagnostic shows the user already meets the required depth.
4. Score each remaining topic:
   priority = (core_importance × level_weight)
            + community_frequency_boost (only if sample ≥ threshold)
            + weakness_boost (from the diagnostic and debriefs)
5. Order by priority while respecting prerequisites (topological sort).
6. Fit to the budget (daily hours × days). If over budget, trim the lowest-priority topics
   and store them as "skipped" with a reason.
7. Schedule into days with revision slots and a weekly self-check.
8. Store a human-readable "reason" for every topic's priority.

Re-planning triggers: a missed day, a new assessment result, a new or changed interview date,
a debrief with weak topics, a change to the notice-period plan, or a manual edit.
Re-planning must preserve completed items.
The engine must be a pure, testable TypeScript module with unit tests.

### 6.5 Topic pages
- Explanation, key concepts, and common mistakes
- Questions with answers at JUNIOR, MID, and SENIOR levels
- Resources (links), quick self-check, and bookmarking
- "Add to review" button on any question (feeds 6.15)
- Status: Not started / Learning / Completed / Needs revision / Difficult

### 6.6 Private interview tracker

Application fields: company, job title, technology, job link/JD, source (LinkedIn, Naukri,
referral, consultant, company site, other), referrer name, recruitment agency,
application date, application status, expected salary, offered salary, notes,
follow-up date, outcome, plus custom columns.

Application statuses: Interested, Applied, Recruiter screening, Technical interview,
Managerial interview, HR round, Offer received, Offer accepted, Rejected, Withdrawn, On hold.

Each application has multiple interview rounds. Each round has TWO separate status fields:
- Round status (did the meeting happen?): Scheduled, Completed, Cancelled, Rescheduled,
  No-show (by me), No-show (by them)
- Round result (what was the outcome?): Awaiting result, Cleared, Rejected, On hold, Not applicable

Views:
- Spreadsheet: inline editing, sort, filter, search, custom columns
- Kanban: drag applications between statuses
- Calendar: see 6.11

Other requirements:
- Export to CSV/Excel, generated on the fly and streamed (never stored)
- Each application opens a side panel with all rounds as a mini timeline,
  a linked prep checklist, relevant community reports, and private notes.
- Marking a round "Completed + Cleared" suggests advancing the application status
  and scheduling the next round.

### 6.7 Debrief and anonymized publishing

Debrief (opened from a completed calendar event or round):
- Questions asked. Each question has: text, topic tag (from the skill graph or free text),
  type (concept / coding / system design / behavioral / HR), and a self-rating
  of NAILED / PARTIAL / MISSED.
- Coding problem, system design prompt, or take-home assignment details
- Interviewer feedback (if given)
- Overall self-rating, difficulty (1–5), actual duration, how it felt
- Next steps, lessons learned, follow-up actions

Automatic effects (private only):
- PARTIAL and MISSED questions can be added to spaced repetition in one click
  (default: pre-selected).
- Weak topics are passed to the roadmap engine as a weakness boost.
- Behavioral questions can be linked to the story used, or flagged "need a story."

Anonymized publishing:
- "Share anonymized version" runs an anonymizer that removes user identity, HR/recruiter details,
  interviewer details, salary, contacts, notes, and free-text personal info;
  rounds the date to month/year; and lets the user edit before publishing.
- It shows an exact preview of the public version, then creates a NEW public record
  with no reference or traceable link back to the private record.

### 6.8 Community interview intel
- Search and filter by company, role, technology, experience band, round type, topic,
  difficulty, and recency.
- Each report shows date, experience band, rounds, topics, and questions.
- Usefulness voting, bookmarking, and reporting for moderation.
- Aggregated topic frequency per company/role shows the sample size and date range.
  Below the threshold, display "Not enough data yet."
- Clear disclaimer: user-submitted, not official.

### 6.9 Today dashboard
Answers: What should I study today? What is my next interview? What should I revise before it?
What is due for review? Which topics am I weak in? Where am I in my notice period?

Widgets:
- next interview countdown with a "revision sheet" button when within 24–48 hours
- today's roadmap tasks
- spaced-repetition review due count with a "start review" button
- notice-period progress bar with key dates
- weak topics
- pending debriefs for completed rounds
- follow-ups due
- recent community reports for tracked companies

### 6.10 Admin CMS
- Role-protected area to create and edit tracks, roles, topics, prerequisites,
  depth-by-band, questions, level answers, resources, and the behavioral question library.
- Moderate community reports (approve, hide, edit for anonymity).

### 6.11 Interview calendar

Views and behavior:
- Month, week, and agenda (list) views.
- Filters by company, round status, round result, and round type.
- Events are color-coded by round status, with an icon too (never color alone).
- Clicking an empty slot quick-adds an interview round.
- Additional markers: last working day and other notice-period milestones (6.13),
  follow-up dates, scheduled revision sessions.
- Conflict warning when two rounds overlap.
- Timezone-aware display (store in UTC; display in the user's timezone).

Clicking an event opens a side panel (drawer) with sections that adapt to status:

1. Header (always shown)
   - Company, role, round number and type (e.g. "Round 2 – Technical")
   - Round status and result badges
   - Date, time, time zone, duration
   - Mode: video / phone / onsite
   - "Join meeting" button, or location with a map link
   - Actions: Edit, Reschedule, Cancel, Mark completed

2. People
   - HR/recruiter: name, email, phone, LinkedIn
   - Interviewer(s): name, designation, LinkedIn; panel members
   - Referrer, recruitment agency/consultant

3. Application context
   - Job link/JD, source
   - Overall application status
   - Mini timeline of all rounds (e.g. Round 1 ✓ → Round 2 ● → HR ○)
   - Expected/offered salary, hidden by default behind a "show" toggle

4. Prep (for Scheduled rounds)
   - "Open revision sheet" button (6.12)
   - Prep checklist with progress
   - Topics to revise, relevant community reports
   - Suggested stories from the story bank (6.14)
   - Questions to ask the interviewer

5. Debrief (for Completed rounds)
   - The full debrief (6.7), or a "Write debrief" prompt if missing
   - Questions asked with NAILED / PARTIAL / MISSED ratings
   - Interviewer feedback, self-rating, difficulty, duration, next steps, lessons learned
   - "Share anonymized version" button

6. Cancelled / Rescheduled
   - Reason, and who cancelled (me / company)
   - Link to the new rescheduled round
   - Reschedule history for this round

7. Follow-up and reminders
   - Follow-up date with a reminder (e.g. "No reply from HR in 5 days")
   - Per-interview reminder settings (default: 1 day before and 1 hour before)

8. Notes and attachments
   - Private free-form notes
   - Attachments (assignment, JD PDF) uploaded via the storage service

Smart behaviors:
- One hour after a round's scheduled end, create an in-app notification:
  "How did it go?", linking to a quick debrief.
- Reschedule creates a new round linked to the old one (the old one is marked Rescheduled).

### 6.12 Last-24-hours revision sheet

A one-page, rules-based summary for a specific upcoming round.

Available any time from the round's panel; highlighted on Today and in a notification
when the round is within 24–48 hours.

Contents, in order:
1. Interview header: company, role, round type, date/time, mode, join link
2. Top weak topics relevant to this round type (from the roadmap, diagnostic, and debriefs),
   each with key points, max 5
3. Saved and difficult questions on those topics, max 10
4. Topics frequently reported for this company/role in community reports
   (with sample size; hidden below the threshold)
5. Questions asked in the user's own earlier rounds at this company (from debriefs)
6. For behavioral/HR rounds: suggested stories from the story bank, plus common
   India-specific HR questions
7. Questions to ask the interviewer (from a curated list by round type, plus user additions)
8. Logistics checklist: link tested, documents ready, environment ready

Requirements:
- Generated by a pure, testable function from existing data. No AI.
- Printable / print-friendly layout and mobile-friendly.
- Items can be checked off; check state is saved per round.

### 6.13 Notice-period planner

Inputs:
- Resignation state: Not resigned yet / Serving notice / Already relieved
- Notice period length (days), resignation date (if resigned)
- Buyout possible (yes / no / unsure) and early-release negotiable (yes / no / unsure)
- Target joining window (optional)

Computed outputs:
- Last working day (LWD)
- Suggested phases on a timeline:
  Prep phase → Interview window → Offer & negotiation window → Buffer before LWD
  (if not resigned: a suggested resignation window based on interview progress)
- Calendar markers for LWD and phase boundaries
- Warnings, for example:
  - "Your LWD is in 20 days and you have no interviews scheduled."
  - "This offer's joining date is before your LWD; consider buyout or negotiation."
  - "Interviews are clustered after day X; you may run short on offer time."

Requirements:
- Feeds the roadmap engine as a time constraint (the prep phase end date).
- Shown on Today as a progress bar with key dates.
- Simple, deterministic date logic, unit-tested. No legal or HR advice; informational only.

### 6.14 Behavioral story bank

Story fields:
- Title
- STAR: Situation, Task, Action, Result (with measurable impact where possible)
- Competency tags: Ownership, Conflict, Failure, Leadership, Teamwork, Deadline pressure,
  Ambiguity, Customer focus, Technical decision, Learning, Influence (configurable list)
- Linked project (optional)
- Practice status: Draft / Ready / Practiced
- Usage log: which interview rounds this story was used in (linked from debriefs)

Question library (curated, admin-managed):
- Common behavioral questions mapped to competencies
- India-specific HR questions: why are you switching, current salary, expected hike,
  notice period, relocation, gaps, counter-offers. Each has guidance on how to approach it.

Features:
- Coverage view: which competencies have a Ready story and which are missing
- For any behavioral question, show matching stories by competency
- Add a story to spaced-repetition review
- Suggest stories in the revision sheet and calendar prep for behavioral/HR rounds

### 6.15 Spaced-repetition review

Card sources:
- Saved questions from topic pages
- PARTIAL/MISSED questions from debriefs
- Topic self-check questions the user got wrong
- Stories from the story bank (prompt: competency/question → recall the story)
- Manual cards created by the user

Scheduling (simple Leitner-style, deterministic, unit-tested):
- Boxes with intervals: 1, 3, 7, 14, 30 days
- After reviewing, the user rates: AGAIN (back to box 1), HARD (stay in box),
  GOOD (move up one box), EASY (move up two boxes)
- A card in the top box rated GOOD/EASY is marked "Mastered" (still reviewable)

Features:
- Daily review queue on Today, with a configurable daily cap (default 20)
- Review session UI: show prompt → reveal answer → rate; keyboard shortcuts
- When an interview is within 3 days, prioritize cards on topics relevant to that interview
- Stats: due today, reviewed this week, mastered count, streak (subtle, no gamification pressure)

---

## 7. TECHNOLOGY CONSTRAINTS (strict)

Use ONLY Next.js for both frontend and backend. No separate backend server, no NestJS, no Express.

- Framework: Next.js (latest stable, App Router), TypeScript in strict mode
- Backend: Next.js Route Handlers (app/api/**) and Server Actions
- Validation: Zod for every input and for every record read from or written to storage
- UI: Tailwind CSS + shadcn/ui, lucide-react icons
- Tables: TanStack Table (spreadsheet tracker)
- Kanban: dnd-kit
- Calendar: FullCalendar (or a lightweight equivalent supporting month/week/list views)
- Forms: React Hook Form + Zod
- Server state: TanStack Query where client-side fetching is needed;
  otherwise prefer Server Components
- Dates: date-fns + date-fns-tz (store UTC, display in the user's timezone)
- Email: Resend (free tier is capped per day, so use email only for interview reminders
  and password reset; everything else is in-app)
- File/image storage: Cloudinary (avatars and attachments; resize images once on upload)
- Testing: Vitest for unit tests (roadmap engine, revision sheet, notice planner, spaced repetition,
  anonymizer, repositories, permissions), Playwright for key end-to-end flows

### 7.1 Data storage: JSON files (current phase)

For now, there is NO database. All data is stored in JSON files on the local filesystem
with full CRUD through a repository layer. We will migrate to PostgreSQL later.

Hosting implication:
- The app runs locally (`next dev` / `next start`) or on a server with a persistent disk.
- Do NOT target Vercel serverless in this phase; its filesystem is not persistent.

Folder layout (the data/ directory is git-ignored; seed files live in seed/ and are copied on first run):

data/
  content/        → tracks.json, roles.json, topics.json, topic-prerequisites.json,
                    questions.json, resources.json, behavioral-questions.json,
                    interviewer-questions.json
  community/      → reports.json, votes.json, flags.json
  system/         → users.json, audit-log.json
  private/
    {userId}/     → profile.json, assessments.json, roadmap.json, progress.json,
                    saved-questions.json, applications.json, rounds.json, debriefs.json,
                    stories.json, review-cards.json, notice-plan.json,
                    revision-sheet-state.json, notifications.json

Repository rules:
- Define a TypeScript repository interface per entity (e.g. ApplicationRepository with
  list, getById, create, update, delete, plus query methods).
- Implement JsonRepository classes behind those interfaces.
  Later we add PostgresRepository implementations without changing feature code.
- Feature code must NEVER touch fs or file paths directly; only repositories do.
- Every record has: id (UUID), createdAt, updatedAt (ISO UTC strings).
- Validate with Zod on every read and write; reject invalid data.
- Atomic writes: write to a temp file, then rename.
- Per-file async lock (mutex) to prevent concurrent write corruption.
- Keep each file reasonably small; per-user private data lives in that user's own folder.
- A simple `schemaVersion` field per file, plus a migration helper for format changes.

### 7.2 Authentication (JSON phase)

- Implement a lightweight AuthService behind an interface:
  email + password, bcrypt hashing, httpOnly secure session cookie (signed JWT via jose).
- Users stored in data/system/users.json.
- Roles: user, admin.
- Password reset via an emailed time-limited token.
- Later this will be replaced by Better Auth + Postgres (with Google/GitHub login)
  without changing feature code.

### 7.3 Scheduled work (JSON phase)

- Reminders and notifications are computed by a NotificationService.
- A secured route `app/api/cron/run` processes due reminders (emails, in-app notifications,
  debrief prompts). It is triggered locally by a small script (e.g. `npm run cron`)
  or an OS scheduler.
- Due items shown in the UI (Today, calendar) are also computed on read, so the app works
  even if the cron hasn't run.

### 7.4 Portability rules (future move to Postgres + AWS)

- Wrap all external dependencies behind interfaces: repositories, AuthService,
  EmailService (Resend → SES later), StorageService (Cloudinary → S3 later),
  JobScheduler.
- All configuration via environment variables, validated at startup with Zod.
- Next.js `output: "standalone"` so the app can run in Docker later.
- Planned future stack (do NOT implement now): PostgreSQL (Neon, then AWS RDS),
  Drizzle ORM, Better Auth, Vercel or AWS hosting.

---

## 8. ARCHITECTURE (modular monolith inside Next.js)

src/
  app/                      → routes, layouts, pages, route handlers (thin)
  modules/
    auth/
    profile/
    content/                → skill graph, topics, questions, resources, behavioral library
    assessment/             → diagnostic
    roadmap/                → engine (pure functions) + persistence
    tracker/                → PRIVATE: applications, rounds, debriefs, calendar
    revision-sheet/         → PRIVATE: sheet generator (pure) + check state
    notice-planner/         → PRIVATE: date logic (pure) + plan storage
    story-bank/             → PRIVATE: stories, coverage
    review/                 → PRIVATE: spaced repetition (pure scheduler) + cards
    community/              → PUBLIC: reports, votes, moderation, anonymizer
    notifications/
    admin/
  lib/
    storage/                → JSON repository base, file lock, atomic write, paths
    services/               → email, file storage, auth, scheduler interfaces + implementations
    env.ts, utils
  components/               → shared UI components
  seed/                     → seed JSON data

Rules:
- Each module exposes a server-only service layer. Routes and actions call services;
  services call repositories.
- A module must not read another module's files directly; it calls that module's service.
- Business logic stays out of React components.
- Pure logic (roadmap, revision sheet, notice planner, spaced repetition, anonymizer)
  lives in side-effect-free functions with unit tests.
- Every server action and route handler checks authentication and authorization.

---

## 9. PRIVACY AND SECURITY DESIGN

- Private data lives only in data/private/{userId}/. Services for private modules always
  resolve paths from the authenticated user's ID, never from request input.
- The community module has no code path that reads from data/private/.
- Encrypt sensitive fields at the application level (AES-GCM, key from env):
  salaries, HR/recruiter contact details, interviewer details, private notes.
- HR and interviewer details are third-party personal data: visible only to the owner,
  never in exports to others, never in published reports.
- Publishing goes only through the anonymizer service, with preview and confirmation.
- Users can export all their data (JSON/CSV) and delete their account
  (which deletes their private folder and anonymizes or removes their public contributions per their choice).
- Rate-limit auth and publishing endpoints. Validate and sanitize all input.
- Audit log for admin and moderation actions.

---

## 10. CORE DATA MODEL (entities; refine as needed)

Identity: User, Profile (stack, experienceBand, targetRole, dailyHours, timezone)
Content: Track, Role, Topic, TopicPrerequisite, TopicRoleImportance, TopicDepthByBand,
         Question, QuestionLevelAnswer, Resource, BehavioralQuestion, InterviewerQuestion
Assessment: Assessment, AssessmentAttempt, TopicDepthResult
Roadmap: Roadmap, RoadmapItem (priorityScore, reason, status, scheduledDate, skippedReason),
         TopicProgress, SavedQuestion
Tracker (private): Application, CustomField, InterviewRound
         (roundNumber, type, start/end UTC, timezone, mode, meetingLink, location,
          roundStatus, roundResult, people: hr/interviewers/referrer/agency,
          cancelReason, cancelledBy, rescheduledFromId, reminders, followUpDate,
          prepChecklist, notes, attachments),
         Debrief (questions[] with topic/type/selfRating, feedback, difficulty,
          duration, lessons, nextSteps, linkedStoryIds)
Revision sheet (private): RevisionSheetState (roundId, checkedItems)
Notice planner (private): NoticePlan (resignationState, noticeDays, resignationDate,
          buyout, negotiable, targetJoining, computed LWD and phases)
Story bank (private): Story (STAR fields, competencies, projectRef, status, usage[])
Review (private): ReviewCard (sourceType, sourceId, prompt, answer, box, dueDate,
          lastReviewedAt, history[])
Community (public): InterviewReport, ReportRound, ReportQuestion, ReportTopic,
          ReportVote, ReportFlag
System: Notification, AuditLog

---

## 11. UI/UX DIRECTION

- Calm, focused developer tool: think Linear or Notion, not a gamified learning app.
- Neutral palette with one accent color. Dark mode from day one.
- Dense but readable tables, clear hierarchy, minimal clutter.
- Keyboard shortcuts for frequent actions (new interview, search, start review, mark topic done).
- Fully responsive; Today, calendar panel, revision sheet, and review sessions must work well on mobile.
- Accessible: semantic HTML, focus states, sufficient contrast, status never shown by color alone.

Main navigation:
Today · My Roadmap · Practice (topics, review, story bank) · Interviews (tracker, calendar,
notice planner) · Interview Intel · Profile
(Admin appears only for admins.)

Key screens:
1. Landing page (public, SEO-friendly)
2. Onboarding (3 steps + optional notice period + diagnostic)
3. Today dashboard
4. Roadmap (weekly timeline, topic cards with priority, depth target, hours, "why", skipped list)
5. Topic page (level tabs Junior/Mid/Senior, questions, self-check, add-to-review, status)
6. Review session (spaced repetition)
7. Story bank (list, editor, competency coverage view)
8. Interviews tracker (spreadsheet / kanban toggle; application side panel)
9. Calendar (month / week / agenda) with the event detail drawer
10. Revision sheet (print-friendly)
11. Notice-period planner (inputs + timeline + warnings)
12. Debrief form + anonymized publish preview
13. Interview Intel search + report detail
14. Profile and settings (timezone, reminders, data export, account deletion)
15. Admin CMS

Every screen must have proper loading, empty, and error states.
Empty states should guide the user to the next action.

---

## 12. PUBLIC SEO PAGES

Topic pages and published community reports should have public, server-rendered, indexable
versions (for example, "React interview questions for 3 years experience").
Logged-in features (progress, saving, personalized depth) appear only when authenticated.

---

## 13. BUILD ORDER

Build in this order. Finish and verify each step before starting the next.

Phase 1 – Foundations
  1. Project setup: Next.js, TypeScript strict, Tailwind, shadcn/ui, ESLint, Prettier, env validation
  2. JSON storage layer: repository base class, atomic writes, file locks, Zod validation,
     seed loading, unit tests
  3. AuthService (email/password, sessions, roles, password reset)
  4. App shell: navigation, layout, dark mode, design tokens
  5. Service interfaces: EmailService (Resend), StorageService (Cloudinary),
     NotificationService, encryption helper

Phase 2 – Content and prep core
  6. Admin CMS for the skill graph, questions, and behavioral question library
  7. Seed data for the Full-Stack JavaScript track (realistic sample topics and questions)
  8. Onboarding flow and profile
  9. Diagnostic assessment
  10. Roadmap engine (pure module + unit tests) and roadmap UI
  11. Topic pages, progress tracking, saved questions
  12. Today dashboard (initial version)

Phase 3 – Private tracker and calendar
  13. Applications and rounds CRUD (two-field round status/result)
  14. Spreadsheet and kanban views, custom columns, export
  15. Calendar views + event detail drawer (all sections in 6.11)
  16. Reminders, follow-ups, conflict detection, debrief prompts
  17. Interview-linked roadmap deadlines

Phase 4 – Prep tools
  18. Notice-period planner (pure date logic + tests, UI, calendar markers, Today widget)
  19. Behavioral story bank (stories, competency coverage, question library)
  20. Spaced-repetition review (pure scheduler + tests, cards, review session UI)
  21. Last-24-hours revision sheet (pure generator + tests, print-friendly UI)

Phase 5 – Debrief and community
  22. Debrief flow with question ratings, auto-add to review, weakness feedback to roadmap
  23. Anonymizer + preview + publishing
  24. Interview Intel search, filters, report detail, voting, flagging
  25. Aggregated topic frequency with sample-size thresholds, feeding the roadmap engine

Phase 6 – Hardening
  26. End-to-end tests for core flows, rate limiting, data export/delete, SEO pages,
      performance pass, accessibility pass, full Today dashboard

---

## 14. HOW YOU SHOULD WORK WITH ME

- Before coding, give me: (1) the final folder structure, (2) the complete data model with
  JSON file layout and Zod schemas outline, (3) the designs of the pure modules
  (roadmap engine, revision sheet generator, notice planner, spaced-repetition scheduler,
  anonymizer), and (4) a list of anything ambiguous in this brief. Wait for my confirmation.
- Then build one step at a time from Section 13. For each step:
  explain what you will build, provide COMPLETE file contents (not snippets),
  list the commands to run, and explain how to verify it works.
- Keep scope tightly bounded to what this brief and I specify.
  Do not add features, libraries, or services I haven't approved; suggest them instead.
- If something in this brief is technically problematic, say so directly and propose an alternative.
- Write clean, typed, commented code where logic is non-obvious. No placeholder TODOs in delivered steps.
- Never compromise the privacy rules in Section 9 for convenience.