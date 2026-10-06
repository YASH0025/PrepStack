#!/usr/bin/env node
/**
 * Generates src/seed/content/*.json from the authored content in this folder.
 *
 *   npm run seed:generate
 *
 * Ids are derived from slugs, so regenerating never changes existing ids.
 * The generated files are committed; the app copies them into DATA_DIR on
 * first start (files that already exist are never overwritten).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { base, stableId } from "./ids.mjs";
import { behavioralQuestions, competencies, hrQuestions, interviewerQuestions } from "./people.mjs";
import { dataTopics } from "./topics-data.mjs";
import { engineeringTopics } from "./topics-engineering.mjs";
import { javascriptTopics } from "./topics-javascript.mjs";
import { nodeTopics } from "./topics-node.mjs";
import { reactTopics } from "./topics-react.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "../../src/seed/content");
const SCHEMA_VERSION = 1;

const track = {
  ...base("track:fullstack-js"),
  slug: "fullstack-js",
  name: "Full-Stack JavaScript",
  description:
    "JavaScript, TypeScript, React, Node.js/Express, SQL and MongoDB, plus engineering fundamentals.",
  active: true,
};

const roleDefs = [
  [
    "frontend",
    "Frontend Developer (React)",
    "Builds web interfaces with React, TypeScript and modern browser APIs.",
  ],
  [
    "backend",
    "Backend Developer (Node.js)",
    "Builds APIs and services with Node.js, databases and cloud infrastructure.",
  ],
  [
    "fullstack",
    "Full-Stack Developer",
    "Works across React frontends and Node.js backends, from UI to database.",
  ],
];
const roles = roleDefs.map(([slug, name, description]) => ({
  ...base(`role:${slug}`),
  trackId: track.id,
  slug,
  name,
  description,
}));
const roleId = Object.fromEntries(roles.map((role) => [role.slug, role.id]));

const allTopicDefs = [
  ...javascriptTopics,
  ...reactTopics,
  ...nodeTopics,
  ...dataTopics,
  ...engineeringTopics,
];
const topicId = (slug) => stableId(`topic:${slug}`);
const knownSlugs = new Set(allTopicDefs.map((topic) => topic.slug));

const errors = [];
const topics = [];
const prerequisites = [];
const questions = [];
const resources = [];

for (const def of allTopicDefs) {
  const depthByBand = Object.fromEntries(
    Object.entries(def.bands).map(([band, [depth, hours]]) => [band, { depth, hours }]),
  );
  const roleImportance = Object.entries(def.roles)
    .filter(([, importance]) => importance > 0)
    .map(([slug, importance]) => ({ roleId: roleId[slug], importance }));

  topics.push({
    ...base(`topic:${def.slug}`),
    trackId: track.id,
    slug: def.slug,
    name: def.name,
    category: def.category,
    description: def.description,
    explanation: def.explanation.trim(),
    keyConcepts: def.concepts,
    commonMistakes: def.mistakes,
    coreImportance: def.importance,
    depthByBand,
    roleImportance,
    published: true,
  });

  for (const prerequisite of def.prerequisites) {
    if (!knownSlugs.has(prerequisite))
      errors.push(`${def.slug}: unknown prerequisite ${prerequisite}`);
    prerequisites.push({
      ...base(`prereq:${def.slug}:${prerequisite}`),
      topicId: topicId(def.slug),
      prerequisiteId: topicId(prerequisite),
    });
  }

  def.questions.forEach((question, index) => {
    const common = {
      ...base(`question:${def.slug}:${index}`),
      topicId: topicId(def.slug),
      prompt: question.prompt,
      depth: question.depth,
    };
    if (question.mcq) {
      questions.push({
        ...common,
        type: "CONCEPT",
        format: "MCQ",
        answers: [],
        options: question.options,
        correctIndex: question.correct,
        explanation: question.explanation,
        selfCheck: Boolean(question.selfCheck),
        diagnostic: Boolean(question.diagnostic),
      });
    } else {
      questions.push({
        ...common,
        type: question.type,
        format: "OPEN",
        answers: [
          { level: "JUNIOR", answer: question.junior },
          { level: "MID", answer: question.mid },
          { level: "SENIOR", answer: question.senior },
        ],
        options: [],
        correctIndex: null,
        explanation: question.mid,
        selfCheck: false,
        diagnostic: false,
      });
    }
  });

  def.resources.forEach(([title, url, kind], index) => {
    resources.push({
      ...base(`resource:${def.slug}:${index}`),
      topicId: topicId(def.slug),
      title,
      url,
      kind,
    });
  });
}

const competencyRecords = competencies.map(([slug, name], order) => ({
  ...base(`competency:${slug}`),
  slug,
  name,
  order,
}));

const behavioral = [
  ...behavioralQuestions.map((question, index) => ({
    ...base(`behavioral:${index}`),
    kind: "BEHAVIORAL",
    ...question,
  })),
  ...hrQuestions.map((question, index) => ({
    ...base(`hr:${index}`),
    kind: "HR_INDIA",
    ...question,
  })),
];

const interviewer = interviewerQuestions.map(([text, roundTypes], index) => ({
  ...base(`interviewer-question:${index}`),
  text,
  roundTypes,
}));

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const files = {
  "tracks.json": [track],
  "roles.json": roles,
  "competencies.json": competencyRecords,
  "topics.json": topics,
  "topic-prerequisites.json": prerequisites,
  "questions.json": questions,
  "resources.json": resources,
  "behavioral-questions.json": behavioral,
  "interviewer-questions.json": interviewer,
};

await mkdir(outDir, { recursive: true });
for (const [name, records] of Object.entries(files)) {
  await writeFile(
    path.join(outDir, name),
    JSON.stringify({ schemaVersion: SCHEMA_VERSION, records }, null, 2) + "\n",
  );
}

console.log(
  `Seed generated: ${topics.length} topics, ${questions.length} questions ` +
    `(${questions.filter((q) => q.diagnostic).length} diagnostic), ${resources.length} resources, ` +
    `${behavioral.length} behavioral/HR questions, ${interviewer.length} questions to ask.`,
);
