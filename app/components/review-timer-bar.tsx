"use client";

import { useEffect, useState } from "react";
import { Clock, Pause, Play, Square } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  clearReviewTimerSession,
  computeElapsedSeconds,
  readReviewTimerSession,
  writeReviewTimerSession,
  ReviewTimerSession,
} from "@/lib/review-timer";

type TimerEventDetail = ReviewTimerSession | null;

const MODAL_KEY = "revisame.reviewTimerModalOpen";

const formatElapsed = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export default function ReviewTimerBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<ReviewTimerSession | null>(null);
  const [, setTick] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSession(readReviewTimerSession());
    setIsModalOpen(window.localStorage.getItem(MODAL_KEY) === "true");
    setIsMounted(true);
    const media = window.matchMedia("(min-width: 1024px)");
    const handleChange = () => setIsDesktop(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const handleTimerUpdate = (event: Event) => {
      const detail = (event as CustomEvent<TimerEventDetail>).detail ?? null;
      setSession(detail);
    };

    window.addEventListener("revisame:review-timer", handleTimerUpdate);
    return () => {
      window.removeEventListener("revisame:review-timer", handleTimerUpdate);
    };
  }, []);

  useEffect(() => {
    const handleModalUpdate = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail;
      setIsModalOpen(Boolean(detail));
    };

    window.addEventListener("revisame:review-timer-modal", handleModalUpdate);
    return () => {
      window.removeEventListener(
        "revisame:review-timer-modal",
        handleModalUpdate
      );
    };
  }, []);

  useEffect(() => {
    if (!session || session.isPaused) return;
    const interval = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [session]);

  const elapsedSeconds = session ? computeElapsedSeconds(session) : 0;

  const updateSession = (next: ReviewTimerSession | null) => {
    if (next) {
      writeReviewTimerSession(next);
    } else {
      clearReviewTimerSession();
    }
    window.dispatchEvent(
      new CustomEvent("revisame:review-timer", { detail: next })
    );
  };

  const togglePause = () => {
    if (!session) return;
    if (session.isPaused) {
      const resumedAt = Date.now();
      const pausedAt = session.pausedAt ?? resumedAt;
      const pausedSeconds =
        session.pausedSeconds + Math.floor((resumedAt - pausedAt) / 1000);
      updateSession({
        ...session,
        isPaused: false,
        pausedAt: null,
        pausedSeconds,
      });
      return;
    }
    updateSession({
      ...session,
      isPaused: true,
      pausedAt: Date.now(),
    });
  };

  const requestFinishFlow = () => {
    if (!session) return;
    const wasRunning = !session.isPaused;
    if (wasRunning) {
      updateSession({
        ...session,
        isPaused: true,
        pausedAt: Date.now(),
      });
    }
    const detail = { reviewId: session.reviewId, wasRunning };
    window.dispatchEvent(
      new CustomEvent("revisame:review-finish-request", { detail })
    );
    if (pathname !== "/" && pathname !== "/revisoes") {
      window.localStorage.setItem(
        "revisame.reviewFinishRequest",
        JSON.stringify(detail)
      );
      router.push("/");
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const offset = !session || isModalOpen ? 0 : 96;
    window.dispatchEvent(
      new CustomEvent("revisame:review-timer-offset", {
        detail: { offset },
      })
    );
  }, [isDesktop, isModalOpen, session]);

  if (!isMounted || !session || isModalOpen) return null;

  return (
    <>
      <div
        className="fixed left-0 right-0 z-50 min-h-[56px] border-t border-[var(--accent-border-strong)] bg-[var(--accent-bar-bg)] px-4 py-2 text-[var(--text-white)] shadow-[var(--shadow-accent-glow)] backdrop-blur lg:border-b-0"
        style={{
          top: "auto",
          bottom: isDesktop
            ? "0px"
            : "calc(68px + env(safe-area-inset-bottom))",
        }}
      >
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-on-accent)] bg-[var(--surface-white-10)] text-[var(--text-white)]">
              <Clock className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          {session.isPaused ? (
            <span className="absolute left-12 top-1/2 -translate-y-1/2 rounded-full border border-[var(--border-on-accent)] bg-[var(--surface-white-10)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-white-90)]">
              Pausado
            </span>
          ) : null}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-2xl font-extrabold sm:text-3xl">
            {formatElapsed(elapsedSeconds)}
          </div>
          <div className="flex flex-nowrap items-center justify-end gap-2">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-on-accent)] bg-[var(--surface-white-10)] text-[var(--text-white)]"
              aria-label={
                session.isPaused ? "Continuar revisão" : "Pausar revisão"
              }
              onClick={togglePause}
            >
              {session.isPaused ? (
                <Play className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Pause className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-on-accent)] bg-[var(--accent-warm-bg)] text-[var(--text-white)]"
              aria-label="Encerrar revisão"
              onClick={requestFinishFlow}
            >
              <Square className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

    </>
  );
}
