/**
 * Coding problems, authored in our own words. Problem ideas are classic and
 * shared across the industry; statements, examples and tests here are
 * original. `leetcode` only links to LeetCode's own version.
 *
 * Each file exports an array of problems. See README.md for the format.
 */
import arrays from "./arrays.mjs";
import graphsDp from "./graphs-dp.mjs";
import listsTrees from "./lists-trees.mjs";
import stacksGreedy from "./stacks-greedy.mjs";

export const TOPICS = [
  "ARRAYS",
  "STRINGS",
  "HASHING",
  "TWO_POINTERS",
  "SLIDING_WINDOW",
  "BINARY_SEARCH",
  "STACK",
  "INTERVALS",
  "GREEDY",
  "HEAPS",
  "LINKED_LIST",
  "TREES",
  "TRIES",
  "GRAPHS",
  "BACKTRACKING",
  "DYNAMIC_PROGRAMMING",
];

/** Which skill-graph topic (roadmap) a problem practises, by its first topic. */
export const SKILL_BY_TOPIC = {
  ARRAYS: "dsa-arrays-hashing",
  STRINGS: "dsa-arrays-hashing",
  HASHING: "dsa-arrays-hashing",
  TWO_POINTERS: "dsa-arrays-hashing",
  SLIDING_WINDOW: "dsa-arrays-hashing",
  BINARY_SEARCH: "dsa-arrays-hashing",
  STACK: "dsa-arrays-hashing",
  INTERVALS: "dsa-arrays-hashing",
  GREEDY: "dsa-arrays-hashing",
  HEAPS: "dsa-arrays-hashing",
  LINKED_LIST: "dsa-trees-graphs",
  TREES: "dsa-trees-graphs",
  TRIES: "dsa-trees-graphs",
  GRAPHS: "dsa-trees-graphs",
  BACKTRACKING: "dsa-trees-graphs",
  DYNAMIC_PROGRAMMING: "dsa-trees-graphs",
};

/** Problems per authoring file, for `--only=<file>` checks. */
export const FILES = {
  arrays,
  "stacks-greedy": stacksGreedy,
  "lists-trees": listsTrees,
  "graphs-dp": graphsDp,
};

export const ALL_PROBLEMS = Object.values(FILES).flat();
