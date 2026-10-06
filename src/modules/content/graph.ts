/**
 * Pure helpers for the skill graph (topics + prerequisite edges).
 */

export interface Edge {
  topicId: string;
  prerequisiteId: string;
}

/** Returns true if adding these edges for `topicId` would create a cycle. */
export function wouldCreateCycle(
  edges: Edge[],
  topicId: string,
  newPrerequisiteIds: string[],
): boolean {
  if (newPrerequisiteIds.includes(topicId)) return true;
  const proposed = [
    ...edges.filter((edge) => edge.topicId !== topicId),
    ...newPrerequisiteIds.map((prerequisiteId) => ({ topicId, prerequisiteId })),
  ];
  const prerequisitesOf = new Map<string, string[]>();
  for (const edge of proposed) {
    const list = prerequisitesOf.get(edge.topicId) ?? [];
    list.push(edge.prerequisiteId);
    prerequisitesOf.set(edge.topicId, list);
  }
  // DFS from topicId through prerequisites; reaching topicId again means a cycle.
  const stack = [...newPrerequisiteIds];
  const seen = new Set<string>();
  while (stack.length) {
    const current = stack.pop() as string;
    if (current === topicId) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    stack.push(...(prerequisitesOf.get(current) ?? []));
  }
  return false;
}

/** All transitive prerequisites of a topic (not including itself). */
export function allPrerequisites(edges: Edge[], topicId: string): Set<string> {
  const direct = new Map<string, string[]>();
  for (const edge of edges) {
    const list = direct.get(edge.topicId) ?? [];
    list.push(edge.prerequisiteId);
    direct.set(edge.topicId, list);
  }
  const result = new Set<string>();
  const stack = [...(direct.get(topicId) ?? [])];
  while (stack.length) {
    const current = stack.pop() as string;
    if (result.has(current) || current === topicId) continue;
    result.add(current);
    stack.push(...(direct.get(current) ?? []));
  }
  return result;
}
