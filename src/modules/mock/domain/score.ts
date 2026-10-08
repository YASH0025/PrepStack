/**
 * Peer score (PURE): averages of the ratings a user received.
 */
import { FEEDBACK_AREAS, type FeedbackArea } from "../schemas";
import { SCORE_MIN_SESSIONS } from "./rules";

export interface ReceivedFeedback {
  sessionId: string;
  fromUserId: string;
  ratings: Record<FeedbackArea, number>;
}

export interface PeerScore {
  sessions: number;
  /** Distinct people who rated (a public score needs several, not one friend). */
  partners: number;
  /** Mean of all areas, one decimal, or null with no feedback. */
  overall: number | null;
  byArea: Record<FeedbackArea, number | null>;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

export function peerScore(feedback: ReceivedFeedback[]): PeerScore {
  const sessions = new Set(feedback.map((item) => item.sessionId)).size;
  const partners = new Set(feedback.map((item) => item.fromUserId)).size;
  const byArea = Object.fromEntries(
    FEEDBACK_AREAS.map((area) => [
      area,
      feedback.length
        ? round1(feedback.reduce((sum, item) => sum + item.ratings[area], 0) / feedback.length)
        : null,
    ]),
  ) as Record<FeedbackArea, number | null>;
  const values = Object.values(byArea).filter((value): value is number => value !== null);
  return {
    sessions,
    partners,
    overall: values.length ? round1(values.reduce((a, b) => a + b, 0) / values.length) : null,
    byArea,
  };
}

/**
 * The score may be shown publicly only when opted in and based on enough
 * sessions with enough different partners.
 */
export function publicScore(score: PeerScore, showScore: boolean): PeerScore | null {
  return showScore &&
    score.sessions >= SCORE_MIN_SESSIONS &&
    score.partners >= SCORE_MIN_SESSIONS &&
    score.overall !== null
    ? score
    : null;
}
