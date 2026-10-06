/** Competencies, behavioral and India-specific HR questions, and questions to ask interviewers. */

export const competencies = [
  ["ownership", "Ownership"],
  ["conflict", "Conflict"],
  ["failure", "Failure"],
  ["leadership", "Leadership"],
  ["teamwork", "Teamwork"],
  ["deadline-pressure", "Deadline pressure"],
  ["ambiguity", "Ambiguity"],
  ["customer-focus", "Customer focus"],
  ["technical-decision", "Technical decision"],
  ["learning", "Learning"],
  ["influence", "Influence"],
];

const STAR_HINT =
  "Use STAR: Situation (one or two lines of context), Task (what you were responsible for), Action (what YOU did, in detail), Result (measurable outcome and what you learned).";

export const behavioralQuestions = [
  {
    text: "Tell me about a time you took ownership of a problem that was not strictly yours.",
    competencies: ["ownership"],
    guidance: `${STAR_HINT}\n\nPick a case where you noticed something others ignored (a flaky deploy, a recurring customer complaint), acted without being asked, and kept stakeholders informed. Show judgement: you involved the actual owner rather than silently taking over.`,
  },
  {
    text: "Describe a disagreement with a teammate or manager. How did you resolve it?",
    competencies: ["conflict", "influence"],
    guidance: `${STAR_HINT}\n\nKeep it professional and specific. Show that you understood the other person's view, used data or a small experiment to decide, and either persuaded them or committed to their decision ("disagree and commit"). Avoid stories where the other person is simply wrong and you win.`,
  },
  {
    text: "Tell me about a time you failed or made a significant mistake.",
    competencies: ["failure", "learning"],
    guidance: `${STAR_HINT}\n\nChoose a real mistake with real impact (not a disguised strength). Spend most of the time on what you did to fix it and the lasting change you made (a check in CI, a runbook, a review practice). Interviewers look for accountability, not blame.`,
  },
  {
    text: "Describe a time you had to deliver under a tight deadline.",
    competencies: ["deadline-pressure", "ownership"],
    guidance: `${STAR_HINT}\n\nExplain how you negotiated scope (what you cut and why), communicated risk early, and protected quality where it mattered. Numbers help: "shipped the core flow in 6 days; deferred reporting to the next sprint".`,
  },
  {
    text: "Tell me about a time you worked with unclear or changing requirements.",
    competencies: ["ambiguity", "customer-focus"],
    guidance: `${STAR_HINT}\n\nShow how you reduced ambiguity: asked targeted questions, wrote down assumptions, built a small prototype or first version for feedback, and designed to make change cheap.`,
  },
  {
    text: "Describe the most complex technical decision you made. What were the alternatives?",
    competencies: ["technical-decision"],
    guidance: `${STAR_HINT}\n\nState the options and trade-offs clearly (cost, complexity, performance, team skills), how you evaluated them (benchmarks, a spike, a design doc reviewed by peers), and what happened afterwards, including anything you would decide differently now.`,
  },
  {
    text: "Tell me about a time you led a project or initiative without formal authority.",
    competencies: ["leadership", "influence"],
    guidance: `${STAR_HINT}\n\nFocus on how you aligned people: a clear goal, a written plan, small wins, unblocking others, and giving credit. Mention outcomes for the team, not just the system.`,
  },
  {
    text: "Give an example of going beyond the requirements to help a customer or user.",
    competencies: ["customer-focus"],
    guidance: `${STAR_HINT}\n\nConnect your action to user impact: reduced support tickets, faster load times, fewer drop-offs. Show that you validated the need (data, feedback) instead of gold-plating.`,
  },
  {
    text: "How did you learn a new technology quickly for a project?",
    competencies: ["learning"],
    guidance: `${STAR_HINT}\n\nDescribe your learning approach (docs, small prototypes, asking experts, reading source code), how you reduced risk while learning, and how you shared what you learned with the team.`,
  },
  {
    text: "Tell me about a time you helped a struggling teammate.",
    competencies: ["teamwork", "leadership"],
    guidance: `${STAR_HINT}\n\nShow empathy and practical support (pairing, breaking down work, better documentation) and the result for the person and the team. Keep the teammate anonymous and respectful.`,
  },
  {
    text: "Describe a situation where you had to push back on a stakeholder's request.",
    competencies: ["influence", "conflict", "customer-focus"],
    guidance: `${STAR_HINT}\n\nExplain the underlying goal you uncovered, the risk of doing it as asked, and the alternative you proposed. Good answers end with the stakeholder agreeing because their real need was met.`,
  },
  {
    text: "Tell me about a production incident you handled.",
    competencies: ["ownership", "deadline-pressure", "technical-decision"],
    guidance: `${STAR_HINT}\n\nCover detection, mitigation first (rollback, feature flag), root cause, communication during the incident, and the blameless follow-up actions that prevented recurrence.`,
  },
];

export const hrQuestions = [
  {
    text: "Why are you looking to switch jobs?",
    competencies: [],
    guidance:
      "Be positive and forward-looking. Focus on what you want next (product ownership, scale, a domain, learning) rather than complaints about your current employer. One or two honest reasons are enough. If moving from a service company, frame it as wanting deeper ownership of a product over the long term.",
  },
  {
    text: "What is your current CTC?",
    competencies: [],
    guidance:
      "Answer factually and consistently with documents you may be asked to share later (payslips, Form 16). Break it into fixed, variable and other components if asked. You can add context such as a pending increment. Informational only; this is not legal or HR advice.",
  },
  {
    text: "What is your expected CTC?",
    competencies: ["influence"],
    guidance:
      "Research the market range for the role, level and city first. Give a range anchored on the role's value rather than only a percentage hike on your current salary, and mention you are open to discussing the full package (variable pay, joining bonus, ESOPs). If asked early, you can ask for the budgeted range for the role.",
  },
  {
    text: "What is your notice period? Can you join earlier?",
    competencies: [],
    guidance:
      "State your contractual notice period and any realistic options: buyout (who pays), early release by negotiation, or leave adjustment. Do not promise an early date you cannot guarantee. If already serving notice, share your last working day.",
  },
  {
    text: "Are you open to relocation?",
    competencies: [],
    guidance:
      "Answer clearly. If yes, you can ask about relocation support. If conditional, state the conditions (timeline, hybrid days). Avoid saying yes if you are not, because it surfaces later at the offer stage.",
  },
  {
    text: "Can you explain the gap in your career?",
    competencies: ["learning"],
    guidance:
      "Be brief and honest, then move to what you did to stay current (courses, projects, certifications) and why you are ready now. You do not need to share private details such as health information.",
  },
  {
    text: "What will you do if your current company makes a counter-offer?",
    competencies: [],
    guidance:
      "Show that your decision is based on the role and growth, not only money, so a counter-offer does not change the reasons you are moving. Interviewers ask this to judge offer-acceptance risk.",
  },
  {
    text: "Do you have any other offers?",
    competencies: [],
    guidance:
      "Be truthful. If you have offers, you can mention them at a high level and your timeline for deciding; this can help you negotiate but should not sound like a threat. If not, say you are in process with a few companies.",
  },
  {
    text: "Why do you want to join our company?",
    competencies: ["customer-focus"],
    guidance:
      "Prepare two or three specific reasons: the product and its users, the engineering challenges, and the team or culture (from talks, blogs, or people you spoke with). Generic answers ('good brand') are weak.",
  },
  {
    text: "Where do you see yourself in a few years?",
    competencies: ["learning", "leadership"],
    guidance:
      "Describe a growth direction (deeper technical expertise, tech lead, or a move toward product) that this role can support. Avoid suggesting you plan to leave soon.",
  },
];

export const interviewerQuestions = [
  [
    "What does a typical week look like for someone in this role?",
    ["RECRUITER_SCREEN", "MANAGERIAL", "HR"],
  ],
  ["What would success look like in the first 90 days?", ["MANAGERIAL", "HR", "RECRUITER_SCREEN"]],
  [
    "What are the biggest technical challenges the team is facing right now?",
    ["TECHNICAL", "SYSTEM_DESIGN", "MANAGERIAL"],
  ],
  ["How does the team decide what to build next?", ["MANAGERIAL", "BEHAVIORAL"]],
  ["How is code reviewed and deployed? How often do you release?", ["TECHNICAL", "CODING"]],
  [
    "How do you handle production incidents and on-call?",
    ["TECHNICAL", "SYSTEM_DESIGN", "MANAGERIAL"],
  ],
  [
    "What does the architecture look like at a high level, and what would you change?",
    ["SYSTEM_DESIGN", "TECHNICAL"],
  ],
  [
    "How do you measure engineering quality or developer experience here?",
    ["TECHNICAL", "MANAGERIAL"],
  ],
  ["How is performance evaluated, and how do promotions work?", ["MANAGERIAL", "HR"]],
  ["How does the team support learning and growth?", ["MANAGERIAL", "HR", "BEHAVIORAL"]],
  [
    "What do you enjoy most about working here?",
    ["TECHNICAL", "CODING", "BEHAVIORAL", "MANAGERIAL"],
  ],
  [
    "What are the next steps in the process and the expected timeline?",
    ["RECRUITER_SCREEN", "HR", "OTHER"],
  ],
  ["What is the hybrid or remote policy for this team?", ["RECRUITER_SCREEN", "HR"]],
  ["What would you expect a strong submission to include?", ["TAKE_HOME"]],
  ["How large is the team, and how is it structured?", ["RECRUITER_SCREEN", "MANAGERIAL"]],
];
