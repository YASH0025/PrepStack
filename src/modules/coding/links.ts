import { CODING_SKILLS } from "./schemas";
import { DESIGN_SKILL } from "./system-design";

/** Hands-on practice for a skill-graph topic, used by the roadmap and topic pages. */
export function practiceLinkForTopic(slug: string): { href: string; label: string } | null {
  if ((CODING_SKILLS as readonly string[]).includes(slug)) {
    return { href: `/practice/coding?skill=${slug}`, label: "Start practice" };
  }
  if (slug === DESIGN_SKILL) {
    return { href: "/practice/system-design", label: "Practise in ScaleLab" };
  }
  return null;
}
