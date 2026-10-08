import { type Difficulty } from "./schemas";

/**
 * System design practice runs in ScaleLab (a separate app). These are its
 * interview problems; ids match ScaleLab's `/play?interview=<id>` links.
 * Keep in sync with packages/interview/src/problems in the ScaleLab repo.
 */
export interface DesignProblem {
  id: string;
  title: string;
  tagline: string;
  difficulty: Difficulty;
}

export const DESIGN_PROBLEMS: DesignProblem[] = [
  {
    id: "url-shortener",
    title: "URL shortener",
    tagline: "Like bit.ly or TinyURL",
    difficulty: "EASY",
  },
  { id: "pastebin", title: "Pastebin", tagline: "Share text snippets by link", difficulty: "EASY" },
  {
    id: "rate-limiter",
    title: "API rate limiter",
    tagline: "Keep a public API up during a scraping attack",
    difficulty: "MEDIUM",
  },
  {
    id: "typeahead",
    title: "Search autocomplete",
    tagline: "Suggestions as you type",
    difficulty: "MEDIUM",
  },
  { id: "instagram", title: "Photo sharing", tagline: "Like Instagram", difficulty: "MEDIUM" },
  {
    id: "notification-system",
    title: "Notification system",
    tagline: "Push, email and SMS for every product team",
    difficulty: "MEDIUM",
  },
  {
    id: "flash-sale",
    title: "Flash sale",
    tagline: "An online store on its biggest sale day",
    difficulty: "MEDIUM",
  },
  {
    id: "web-crawler",
    title: "Web crawler",
    tagline: "Crawl the web for a search engine",
    difficulty: "MEDIUM",
  },
  {
    id: "ai-assistant",
    title: "AI assistant over your documents",
    tagline: "A ChatGPT-style assistant with RAG",
    difficulty: "MEDIUM",
  },
  { id: "news-feed", title: "News feed", tagline: "Like Twitter / X", difficulty: "HARD" },
  { id: "chat", title: "Chat app", tagline: "Like WhatsApp or Messenger", difficulty: "HARD" },
  {
    id: "video-streaming",
    title: "Video streaming",
    tagline: "Like YouTube or Netflix",
    difficulty: "HARD",
  },
  {
    id: "file-storage",
    title: "File storage and sync",
    tagline: "Like Dropbox or Google Drive",
    difficulty: "HARD",
  },
  { id: "ride-sharing", title: "Ride sharing", tagline: "Like Uber or Ola", difficulty: "HARD" },
  {
    id: "ticket-booking",
    title: "Ticket booking",
    tagline: "Like Ticketmaster or BookMyShow",
    difficulty: "HARD",
  },
];

export const DESIGN_SKILL = "system-design-basics";

export function scaleLabUrl(base: string, problemId?: string): string {
  const url = new URL(problemId ? "/play" : "/interview", base);
  if (problemId) url.searchParams.set("interview", problemId);
  return url.toString();
}
