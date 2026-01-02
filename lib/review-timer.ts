export type ReviewTimerSession = {
  reviewId: string;
  startedAt: number;
  pausedAt: number | null;
  pausedSeconds: number;
  isPaused: boolean;
};

export type ReviewTimerPending = {
  reviewId: string;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  pausedSeconds: number;
};

const SESSION_KEY = "revisame.reviewTimerSession";
const PENDING_KEY = "revisame.reviewTimerPending";

const safeParse = <T,>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const readReviewTimerSession = (): ReviewTimerSession | null => {
  if (typeof window === "undefined") return null;
  return safeParse<ReviewTimerSession>(
    window.localStorage.getItem(SESSION_KEY)
  );
};

export const writeReviewTimerSession = (session: ReviewTimerSession) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearReviewTimerSession = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
};

export const readReviewTimerPending = (): ReviewTimerPending | null => {
  if (typeof window === "undefined") return null;
  return safeParse<ReviewTimerPending>(
    window.localStorage.getItem(PENDING_KEY)
  );
};

export const writeReviewTimerPending = (pending: ReviewTimerPending) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
};

export const clearReviewTimerPending = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_KEY);
};

export const computeElapsedSeconds = (session: ReviewTimerSession) => {
  const endMs = session.isPaused && session.pausedAt ? session.pausedAt : Date.now();
  const elapsedMs = Math.max(
    0,
    endMs - session.startedAt - session.pausedSeconds * 1000
  );
  return Math.floor(elapsedMs / 1000);
};
