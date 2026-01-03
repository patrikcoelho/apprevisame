"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Minus,
  Pause,
  Play,
  Percent,
  Plus,
  Target,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/app/components/toast-provider";
import {
  clearReviewTimerPending,
  clearReviewTimerSession,
  computeElapsedSeconds,
  readReviewTimerPending,
  readReviewTimerSession,
  writeReviewTimerSession,
  ReviewTimerPending,
  ReviewTimerSession,
} from "@/lib/review-timer";

type Review = {
  id: string;
  subject: string;
  topic: string;
  notes?: string;
  studiedAt: string;
  dueAt: string;
  completedAt?: string | null;
  reviewDurationSeconds?: number | null;
  questionsTotal?: number | null;
  questionsCorrect?: number | null;
  status: "pendente" | "concluida" | "adiada";
};

type HomeClientProps = {
  fullName?: string | null;
  initialReviews: Review[];
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (isoDate: string, days: number) => {
  const date = new Date(isoDate + "T00:00:00");
  date.setDate(date.getDate() + days);
  return toDateKey(date);
};

export default function HomeClient({ fullName, initialReviews }: HomeClientProps) {
  const supabase = createClient();
  const { addToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [activeReview, setActiveReview] = useState<Review | null>(null);
  const [modalType, setModalType] = useState<
    "defer" | "complete" | "timer" | null
  >(null);
  const [, setShowQuestions] = useState(false);
  const [, setQuestionsAnswered] = useState<boolean | null>(null);
  const [, setShowQuestionHint] = useState(false);
  const [questionsTotal, setQuestionsTotal] = useState(0);
  const [questionsCorrect, setQuestionsCorrect] = useState(0);
  const [isFinishingReview, setIsFinishingReview] = useState(false);
  const [rangeMode, setRangeMode] = useState<"7" | "30" | "custom">("7");
  const [appliedRangeMode, setAppliedRangeMode] = useState<
    "7" | "30" | "custom"
  >("7");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [customAppliedStart, setCustomAppliedStart] = useState("");
  const [customAppliedEnd, setCustomAppliedEnd] = useState("");
  const [timerSession, setTimerSession] = useState<ReviewTimerSession | null>(null);
  const [, setTimerTick] = useState(0);
  const [pendingTimerData, setPendingTimerData] =
    useState<ReviewTimerPending | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [resumeAfterFinishCancel, setResumeAfterFinishCancel] = useState(false);
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const pendingReviews = useMemo(
    () => reviews.filter((review) => review.status !== "concluida"),
    [reviews]
  );
  const overdueReviews = useMemo(
    () => pendingReviews.filter((review) => review.dueAt < todayKey),
    [pendingReviews, todayKey]
  );
  const todayReviews = useMemo(
    () => pendingReviews.filter((review) => review.dueAt <= todayKey),
    [pendingReviews, todayKey]
  );
  const completedReviews = useMemo(
    () => reviews.filter((review) => review.status === "concluida"),
    [reviews]
  );
  const upcomingReviews = useMemo(
    () => [...pendingReviews].sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
    [pendingReviews]
  );

  const appliedRange = useMemo(() => {
    const today = new Date();
    const getDefaultStart = (days: number) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (days - 1));
      return toDateKey(date);
    };
    let startKey =
      appliedRangeMode === "30" ? getDefaultStart(30) : getDefaultStart(7);
    let endKey = toDateKey(today);

    if (appliedRangeMode === "custom" && customAppliedStart && customAppliedEnd) {
      startKey = customAppliedStart;
      endKey = customAppliedEnd;
    }

    const startDate = new Date(`${startKey}T00:00:00`);
    const endDate = new Date(`${endKey}T00:00:00`);
    if (startDate > endDate) {
      const temp = startKey;
      startKey = endKey;
      endKey = temp;
    }

    return { startKey, endKey };
  }, [appliedRangeMode, customAppliedEnd, customAppliedStart]);

  const rangeKeys = useMemo(() => {
    const keys: { key: string; label: string }[] = [];
    const startDate = new Date(`${appliedRange.startKey}T00:00:00`);
    const endDate = new Date(`${appliedRange.endKey}T00:00:00`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return keys;
    }
    if (startDate > endDate) return keys;

    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDays =
      Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
    const maxDays = 60;
    const windowStart =
      totalDays > maxDays
        ? new Date(endDate.getTime() - (maxDays - 1) * msPerDay)
        : startDate;

    const cursor = new Date(windowStart);
    while (cursor <= endDate) {
      keys.push({
        key: toDateKey(cursor),
        label: cursor.toLocaleDateString("pt-BR", { day: "2-digit" }),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return keys;
  }, [appliedRange.endKey, appliedRange.startKey]);

  const completedCountByDay = useMemo(() => {
    const counts = new Map<string, number>();
    completedReviews.forEach((review) => {
      if (!review.completedAt) return;
      const key = toDateKey(new Date(review.completedAt));
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [completedReviews]);

  const completedInRange = useMemo(() => {
    const startKey = appliedRange.startKey;
    const endKey = appliedRange.endKey;
    return completedReviews.filter((review) => {
      if (!review.completedAt) return false;
      const key = toDateKey(new Date(review.completedAt));
      return key >= startKey && key <= endKey;
    });
  }, [appliedRange.endKey, appliedRange.startKey, completedReviews]);

  const questionStats = useMemo(() => {
    const startKey = appliedRange.startKey;
    const endKey = appliedRange.endKey;
    let total = 0;
    let correct = 0;
    reviews.forEach((review) => {
      if (!review.questionsTotal || review.questionsTotal <= 0) return;
      if (review.studiedAt < startKey || review.studiedAt > endKey) return;
      total += review.questionsTotal;
      correct += review.questionsCorrect ?? 0;
    });
    return { total, correct };
  }, [appliedRange.endKey, appliedRange.startKey, reviews]);

  const accuracyPercent =
    questionStats.total > 0
      ? Math.round((questionStats.correct / questionStats.total) * 100)
      : null;

  const nextReview = useMemo(
    () => todayReviews[0] ?? upcomingReviews[0] ?? null,
    [todayReviews, upcomingReviews]
  );

  const uiTimerSession = isHydrated ? timerSession : null;
  const activeTimerReview = useMemo(
    () =>
      uiTimerSession
        ? reviews.find((review) => review.id === uiTimerSession.reviewId) ?? null
        : null,
    [reviews, uiTimerSession]
  );
  const isCustomReady =
    appliedRangeMode === "custom" && customAppliedStart && customAppliedEnd;
  const customRangeDays = useMemo(() => {
    if (!isCustomReady) return 0;
    const startDate = new Date(`${customAppliedStart}T00:00:00`);
    const endDate = new Date(`${customAppliedEnd}T00:00:00`);
    const diffMs = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  }, [customAppliedEnd, customAppliedStart, isCustomReady]);

  const estimatedMinutes = useMemo(() => {
    const durations = completedInRange
      .map((review) => review.reviewDurationSeconds ?? 0)
      .filter((value) => value > 0);
    const average =
      durations.length > 0
        ? durations.reduce((sum, value) => sum + value, 0) / durations.length
        : 15 * 60;
    return Math.round((average / 60) * todayReviews.length);
  }, [completedInRange, todayReviews.length]);

  const formatShortDate = (key: string) =>
    new Date(`${key}T00:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });

  const formatCompletedDate = (iso: string | null | undefined) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  const updateTimerSession = useCallback((next: ReviewTimerSession | null) => {
    if (next) {
      writeReviewTimerSession(next);
    } else {
      clearReviewTimerSession();
    }
    window.dispatchEvent(
      new CustomEvent("revisame:review-timer", { detail: next })
    );
  }, []);

  const toggleTimerPause = useCallback(() => {
    if (!timerSession) return;
    if (timerSession.isPaused) {
      const now = Date.now();
      const pausedAt = timerSession.pausedAt ?? now;
      const pausedSeconds =
        timerSession.pausedSeconds + Math.floor((now - pausedAt) / 1000);
      const next = {
        ...timerSession,
        isPaused: false,
        pausedAt: null,
        pausedSeconds,
      };
      updateTimerSession(next);
      setTimerSession(next);
      return;
    }
    const next = { ...timerSession, isPaused: true, pausedAt: Date.now() };
    updateTimerSession(next);
    setTimerSession(next);
  }, [timerSession, updateTimerSession]);

  useEffect(() => {
    setIsHydrated(true);
    setTimerSession(readReviewTimerSession());
    setPendingTimerData(readReviewTimerPending());
  }, []);

  useEffect(() => {
    if (!timerSession || timerSession.isPaused) return;
    const interval = window.setInterval(() => {
      setTimerTick((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerSession]);

  useEffect(() => {
    const handleTimerUpdate = (event: Event) => {
      const detail = (event as CustomEvent<ReviewTimerSession | null>).detail;
      setTimerSession(detail ?? null);
    };
    const handleTimerComplete = (event: Event) => {
      const detail = (event as CustomEvent<ReviewTimerPending>).detail;
      if (!detail) return;
      setPendingTimerData(detail);
    };

    window.addEventListener("revisame:review-timer", handleTimerUpdate);
    window.addEventListener("revisame:review-complete", handleTimerComplete);
    return () => {
      window.removeEventListener("revisame:review-timer", handleTimerUpdate);
      window.removeEventListener(
        "revisame:review-complete",
        handleTimerComplete
      );
    };
  }, []);

  useEffect(() => {
    if (!pendingTimerData) return;
    const timeoutId = window.setTimeout(() => {
      const review = reviews.find(
        (item) => item.id === pendingTimerData.reviewId
      );
      if (!review) return;
      clearReviewTimerPending();
      setActiveReview(review);
      setShowQuestions(true);
      setQuestionsTotal(0);
      setQuestionsCorrect(0);
      setQuestionsAnswered(true);
      setShowQuestionHint(false);
      setModalType("complete");
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pendingTimerData, reviews]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isOpen = modalType === "timer";
    window.localStorage.setItem(
      "revisame.reviewTimerModalOpen",
      isOpen ? "true" : "false"
    );
    window.dispatchEvent(
      new CustomEvent("revisame:review-timer-modal", { detail: isOpen })
    );
  }, [modalType]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyFinishRequest = (reviewId: string, wasRunning: boolean) => {
      const review = reviews.find((item) => item.id === reviewId);
      if (!review) return;
      setActiveReview(review);
      setModalType("timer");
      setIsFinishingReview(true);
      setShowQuestions(false);
      setQuestionsTotal(0);
      setQuestionsCorrect(0);
      setResumeAfterFinishCancel(wasRunning);
      setShowQuestionHint(false);
      if (wasRunning && timerSession && !timerSession.isPaused) {
        toggleTimerPause();
      }
    };

    const handleFinishRequest = (event: Event) => {
      const detail = (
        event as CustomEvent<{ reviewId: string; wasRunning?: boolean }>
      ).detail;
      if (!detail?.reviewId) return;
      applyFinishRequest(detail.reviewId, Boolean(detail.wasRunning));
    };

    window.addEventListener("revisame:review-finish-request", handleFinishRequest);
    const stored = window.localStorage.getItem("revisame.reviewFinishRequest");
    if (stored) {
      try {
        const detail = JSON.parse(stored) as {
          reviewId?: string;
          wasRunning?: boolean;
        };
        if (detail?.reviewId) {
          applyFinishRequest(detail.reviewId, Boolean(detail.wasRunning));
        }
      } catch {
        // ignore invalid storage
      }
      window.localStorage.removeItem("revisame.reviewFinishRequest");
    }

    return () => {
      window.removeEventListener(
        "revisame:review-finish-request",
        handleFinishRequest
      );
    };
  }, [reviews, timerSession, toggleTimerPause]);

  const formatElapsed = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const startReviewTimer = (review: Review) => {
    if (timerSession && timerSession.reviewId !== review.id) {
      addToast({
        variant: "error",
        title: "Você já tem uma revisão em andamento.",
        description: "Finalize a revisão atual antes de iniciar outra.",
      });
      return;
    }
    if (timerSession && timerSession.reviewId === review.id && !timerSession.isPaused) {
      toggleTimerPause();
    }
    setActiveReview(review);
    setModalType("timer");
    setPendingTimerData(null);
    clearReviewTimerPending();
  };

  const beginTimerSession = () => {
    if (!activeReview) return;
    const session: ReviewTimerSession = {
      reviewId: activeReview.id,
      startedAt: Date.now(),
      pausedAt: null,
      pausedSeconds: 0,
      isPaused: false,
    };
    updateTimerSession(session);
    setTimerSession(session);
  };

  const elapsedSeconds = uiTimerSession ? computeElapsedSeconds(uiTimerSession) : 0;

  const openDeferModal = (review: Review) => {
    setActiveReview(review);
    setModalType("defer");
  };

  const closeModal = () => {
    setModalType(null);
    setActiveReview(null);
    setShowQuestions(false);
    setQuestionsTotal(0);
    setQuestionsCorrect(0);
    setQuestionsAnswered(null);
    setShowQuestionHint(false);
    setIsFinishingReview(false);
    setResumeAfterFinishCancel(false);
  };

  const handleTimerCloseRequest = () => {
    setModalType(null);
    setActiveReview(null);
    setIsFinishingReview(false);
    setShowQuestionHint(false);
    if (timerSession?.isPaused) {
      toggleTimerPause();
    }
  };

  const startFinishFlow = () => {
    if (!timerSession) return;
    if (!timerSession.isPaused) {
      setResumeAfterFinishCancel(true);
      toggleTimerPause();
    } else {
      setResumeAfterFinishCancel(false);
    }
    clearReviewTimerPending();
    setPendingTimerData(null);
    setIsFinishingReview(true);
    setShowQuestions(true);
    setQuestionsTotal(0);
    setQuestionsCorrect(0);
    setQuestionsAnswered(true);
    setShowQuestionHint(false);
  };

  const cancelFinishFlow = () => {
    setIsFinishingReview(false);
    if (resumeAfterFinishCancel || timerSession?.isPaused) {
      toggleTimerPause();
    }
    setResumeAfterFinishCancel(false);
    setShowQuestions(false);
    setQuestionsTotal(0);
    setQuestionsCorrect(0);
    setQuestionsAnswered(null);
    setShowQuestionHint(false);
    setModalType(null);
    setActiveReview(null);
  };

  const confirmDefer = async () => {
    if (!activeReview) return;
    const newDueDate = addDays(activeReview.dueAt, 1);
    const { error } = await supabase
      .from("reviews")
      .update({ due_at: new Date(newDueDate + "T00:00:00").toISOString() })
      .eq("id", activeReview.id);

    if (error) {
      addToast({
        variant: "error",
        title: "Não foi possível reagendar.",
        description: "Tente novamente em instantes.",
      });
      return;
    }

    setReviews((prev) =>
      prev.map((review) =>
        review.id === activeReview.id
          ? { ...review, dueAt: newDueDate }
          : review
      )
    );
    addToast({
      variant: "success",
      title: "Revisão reagendada.",
      description: "Voltamos este item para o próximo dia.",
    });
    closeModal();
  };

  const confirmComplete = async (pendingOverride?: ReviewTimerPending | null) => {
    if (!activeReview) return;
    const pending = pendingOverride ?? pendingTimerData;
    const completedAt = new Date().toISOString();
    const startedAt = pending?.startedAt
      ? new Date(pending.startedAt).toISOString()
      : null;
    const { error } = await supabase
      .from("reviews")
      .update({
        status: "concluida",
        completed_at: completedAt,
        review_started_at: startedAt,
        review_duration_seconds: pending?.durationSeconds ?? null,
        review_paused_seconds: pending?.pausedSeconds ?? null,
      })
      .eq("id", activeReview.id);

    if (error) {
      console.error("Erro ao concluir revisão:", error);
      addToast({
        variant: "error",
        title: "Não foi possível concluir.",
        description: error.message || "Tente novamente em instantes.",
      });
      return;
    }

    setReviews((prev) =>
      prev.map((review) =>
        review.id === activeReview.id
          ? { ...review, status: "concluida" }
          : review
      )
    );
    setPendingTimerData(null);
    clearReviewTimerPending();
    addToast({
      variant: "success",
      title: "Revisão concluída.",
      description: "Boa, seguimos para a próxima.",
    });
    closeModal();
  };

  const handleConfirmCompleteClick: React.MouseEventHandler<
    HTMLButtonElement
  > = () => {
    confirmComplete(null);
  };

  const finalizeReview = async () => {
    if (!timerSession) return;
    const endedAt = Date.now();
    const durationSeconds = computeElapsedSeconds(timerSession);
    const pending: ReviewTimerPending = {
      reviewId: timerSession.reviewId,
      startedAt: timerSession.startedAt,
      endedAt,
      durationSeconds,
      pausedSeconds: timerSession.pausedSeconds,
    };
    updateTimerSession(null);
    setTimerSession(null);
    setIsFinishingReview(false);
    await confirmComplete(pending);
  };

  return (
    <div className="page-stack">
      <div className="flex flex-col gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-[var(--text-strong)]">
            Olá{fullName ? `, ${fullName}` : ""}.
          </h1>
          <p className="text-sm font-semibold text-[var(--text-muted)]">
            {todayReviews.length
              ? `Hoje você tem ${todayReviews.length} revisões para fazer.`
              : "Hoje você não tem revisões pendentes."}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Tempo estimado: {todayReviews.length ? `~${estimatedMinutes} min` : "—"}
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-medium)]">
          <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
            Período
          </span>
          <div className="flex items-center gap-2">
            {[
              { label: "7 dias", value: "7" },
              { label: "30 dias", value: "30" },
              { label: "Personalizado", value: "custom" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  const next = option.value as "7" | "30" | "custom";
                  setRangeMode(next);
                  if (next !== "custom") {
                    setAppliedRangeMode(next);
                  }
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  rangeMode === option.value
                    ? "bg-[var(--accent-bg)] text-[var(--text-on-accent)]"
                    : "border border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--text-medium)]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {rangeMode === "custom" ? (
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-semibold text-[var(--text-muted)]">
                De
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
                className="h-9 rounded-md border border-[var(--border-soft)] bg-[var(--surface-white)] px-2 text-xs text-[var(--text-strong)]"
              />
              <label className="text-xs font-semibold text-[var(--text-muted)]">
                Até
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
                className="h-9 rounded-md border border-[var(--border-soft)] bg-[var(--surface-white)] px-2 text-xs text-[var(--text-strong)]"
              />
              <button
                type="button"
                className="h-9 rounded-md bg-[var(--accent-bg)] px-3 text-xs font-semibold text-[var(--text-on-accent)] disabled:cursor-not-allowed disabled:bg-[var(--accent-bg-disabled)]"
                onClick={() => {
                  if (!customStart || !customEnd) return;
                  setCustomAppliedStart(customStart);
                  setCustomAppliedEnd(customEnd);
                  setAppliedRangeMode("custom");
                }}
                disabled={!customStart || !customEnd}
              >
                Aplicar
              </button>
            </div>
          ) : null}
        </div>

        {(appliedRangeMode === "7" ||
          appliedRangeMode === "30" ||
          appliedRangeMode === "custom") ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
            {(() => {
              const count =
                appliedRangeMode === "custom" && isCustomReady
                  ? customRangeDays
                  : appliedRangeMode === "30"
                  ? 30
                  : 7;
              const isCompactGrid =
                appliedRangeMode === "7" ||
                (appliedRangeMode === "custom" && isCustomReady && count <= 7);
              return (
                <div
                  className={
                    isCompactGrid
                      ? "grid grid-cols-7 gap-2"
                      : "flex items-center gap-2 overflow-x-auto"
                  }
                >
                  {Array.from({ length: count }).map((_, index) => (
                    <span
                      key={`range-pill-${index}`}
                      className={`flex h-8 items-center justify-center rounded-lg border text-[11px] font-semibold ${
                        isCompactGrid ? "w-full" : "w-7 flex-shrink-0"
                      } ${
                        index === 0
                          ? "border-[var(--accent-border)] bg-[var(--surface-accent-muted)] text-[var(--accent)]"
                          : "border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--text-muted)]"
                      }`}
                    >
                      {index === 0 ? (
                        <Check className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        index + 1
                      )}
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Revisões hoje",
                value: todayReviews.length,
                icon: CalendarDays,
                cta: {
                  label: "Ver todas",
                  href: "/revisoes?status=todas",
                },
              },
              {
                label: "Atrasadas",
                value: overdueReviews.length,
                icon: AlertTriangle,
                cta: {
                  label: "Ver atrasadas",
                  href: "/revisoes?status=atrasadas",
                },
              },
              {
                label: "Concluídas no período",
                value: completedInRange.length,
                icon: CheckCircle2,
              },
              {
                label: "Taxa de acerto (período)",
                value: accuracyPercent !== null ? `${accuracyPercent}%` : "—",
                icon: Percent,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                    {item.label}
                  </p>
                  <item.icon className="h-4 w-4 text-[var(--text-muted)]" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">
                  {item.value}
                </p>
                {item.cta ? (
                  <Link
                    href={item.cta.href}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]"
                  >
                    {item.cta.label}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
            ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--text-strong)]">
                Evolução de revisões concluídas
              </p>
              <span className="text-xs text-[var(--text-muted)]">
                {appliedRangeMode === "7"
                  ? "Últimos 7 dias"
                  : appliedRangeMode === "30"
                  ? "Últimos 30 dias"
                  : isCustomReady
                  ? "Período personalizado"
                  : "Selecione datas"}
              </span>
            </div>
            <div className="mt-4 w-full max-w-full overflow-x-auto">
              {(() => {
                const counts = rangeKeys.map(
                  (day) => completedCountByDay.get(day.key) ?? 0
                );
                const maxCount = Math.max(1, ...counts);
                return (
                  <div className="flex h-20 min-w-max items-end gap-2 px-1">
                    {rangeKeys.map((day, index) => (
                      <div key={day.key} className="flex w-9 flex-col items-center gap-2">
                        <div className="flex h-20 w-full items-end pt-2">
                          <div className="flex w-full flex-col items-center">
                            {counts[index] > 2 ? null : (
                              <span className="mb-1 text-[10px] font-semibold text-[var(--text-muted)]">
                                {counts[index]}
                              </span>
                            )}
                            <div
                              className="relative w-4 rounded-md bg-[var(--chart-bar)]"
                              style={{
                                height: `${Math.max(
                                  10,
                                  (counts[index] / maxCount) * 56
                                )}px`,
                              }}
                            >
                              {counts[index] > 2 ? (
                                <span className="absolute left-1/2 top-1 flex w-full -translate-x-1/2 justify-center text-[10px] font-semibold text-[var(--text-strong)]">
                                  {counts[index]}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {day.label}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Total do período</span>
              <span className="font-semibold text-[var(--text-strong)]">
                {completedInRange.length}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--text-strong)]">
                Desempenho em questões
              </p>
              <span className="text-xs text-[var(--text-muted)]">
                {appliedRangeMode === "7"
                  ? "Últimos 7 dias"
                  : appliedRangeMode === "30"
                  ? "Últimos 30 dias"
                  : isCustomReady
                  ? "Período personalizado"
                  : "Selecione datas"}
              </span>
            </div>
            <div className="mt-4 flex items-end gap-4">
              <div className="flex-1">
                <div className="text-2xl font-semibold text-[var(--text-strong)]">
                  {accuracyPercent !== null ? `${accuracyPercent}%` : "—"}
                </div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">
                  {questionStats.total > 0
                    ? `${questionStats.correct} corretas de ${questionStats.total}`
                    : "Nenhuma questão registrada"}
                </div>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-subtle)]">
                <Target className="h-5 w-5 text-[var(--text-muted)]" />
              </div>
            </div>
            <div className="mt-4 h-2 w-full rounded-full bg-[var(--surface-subtle)]">
              <div
                className="h-2 rounded-full bg-[var(--accent-bg)]"
                style={{
                  width: `${accuracyPercent ?? 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_1fr]">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--text-strong)]">
                Próximas revisões
              </p>
              <span className="text-xs text-[var(--text-muted)]">Até 5 itens</span>
            </div>
            <div className="mt-3 space-y-3">
              {upcomingReviews.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Nenhuma revisão pendente no momento.
                </p>
              ) : (
                upcomingReviews.slice(0, 5).map((review) => {
                  const isActive = uiTimerSession?.reviewId === review.id;
                  return (
                    <div
                      key={review.id}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm ${
                        isActive
                          ? "border-[var(--accent-border)] bg-[var(--surface-accent-muted)]"
                          : "border-[var(--border-soft)] bg-[var(--surface-subtle)]"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[var(--text-strong)]">
                          {review.subject}
                        </p>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {review.topic}
                      </p>
                    </div>
                    <div className="ml-auto flex flex-col items-end text-xs text-[var(--text-muted)]">
                      <span>{formatShortDate(review.dueAt)}</span>
                      {review.dueAt < todayKey ? (
                        <span className="font-semibold text-[var(--accent-warm)]">
                          Atrasada
                        </span>
                      ) : null}
                    </div>
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${
                          isActive
                            ? "border-[var(--accent-border)] bg-[var(--accent-bg)] text-[var(--text-on-accent)]"
                            : "border-[var(--border-soft)] bg-[var(--surface-bright)] text-[var(--text-medium)]"
                        }`}
                        onClick={() => startReviewTimer(review)}
                      >
                        {isActive ? (
                          <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <Play className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {isActive ? "Em andamento" : "Iniciar"}
                      </button>
                    </div>
                  );
                })
                )}
              </div>
            </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                Ações rápidas
              </p>
              <div className="mt-3 space-y-3">
                <button
                  type="button"
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold ${
                    activeTimerReview
                      ? "border border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--text-medium)]"
                      : "bg-[var(--accent-bg)] text-[var(--text-on-accent)]"
                  }`}
                  onClick={() => {
                    if (activeTimerReview) {
                      setActiveReview(activeTimerReview);
                      setModalType("timer");
                      return;
                    }
                    if (nextReview) startReviewTimer(nextReview);
                  }}
                  disabled={!nextReview && !activeTimerReview}
                >
                  <span className="flex items-center gap-2">
                    <Play className="h-4 w-4" aria-hidden="true" />
                    {activeTimerReview
                      ? "Ver revisão em andamento"
                      : "Iniciar próxima revisão agora"}
                  </span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <Link
                  href="/adicionar"
                  className="flex w-full items-center justify-between rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-3 text-sm font-semibold text-[var(--text-medium)]"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Adicionar estudo
                  </span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <div className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-3 text-xs text-[var(--text-muted)]">
                  {nextReview ? (
                    <>
                      Próxima revisão:{" "}
                      <span className="font-semibold text-[var(--text-strong)]">
                        {nextReview.subject}
                      </span>{" "}
                      ({formatShortDate(nextReview.dueAt)})
                    </>
                  ) : (
                    "Nenhuma revisão pendente. Aproveite para adiantar estudos."
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--text-strong)]">
                  Últimas concluídas
                </p>
                <span className="text-xs text-[var(--text-muted)]">Até 5 itens</span>
              </div>
              <div className="mt-3 space-y-3">
                {completedInRange.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">
                    Nenhuma revisão concluída ainda.
                  </p>
                ) : (
                  completedInRange
                    .sort((a, b) =>
                      (b.completedAt ?? "").localeCompare(a.completedAt ?? "")
                    )
                    .slice(0, 5)
                    .map((review) => (
                    <div
                      key={review.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[var(--text-strong)]">
                          {review.subject}
                        </p>
                        <p className="truncate text-xs text-[var(--text-muted)]">
                          {review.topic}
                        </p>
                      </div>
                      <div className="flex flex-col items-end text-xs text-[var(--text-muted)]">
                        <span>{formatCompletedDate(review.completedAt)}</span>
                        {review.reviewDurationSeconds ? (
                          <span className="font-semibold text-[var(--text-strong)]">
                            {Math.round(review.reviewDurationSeconds / 60)} min
                          </span>
                        ) : null}
                      </div>
                    </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {modalType && activeReview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4">
          <div className="w-full max-w-md rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)] p-6 modal-shadow sm:p-7 max-h-[85vh] overflow-y-auto">
            {modalType === "timer" ? (
              <div className="space-y-4">
                <div>
                  <div className="mb-4 flex items-center justify-between gap-4 border-b border-[var(--border-soft)] pb-4">
                    <p className="text-base font-semibold text-[var(--text-strong)]">
                      Revisão em andamento
                    </p>
                    <button
                      type="button"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--text-muted)]"
                      aria-label="Minimizar revisão"
                      onClick={
                        isFinishingReview ? cancelFinishFlow : handleTimerCloseRequest
                      }
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-2">
                    <h3 className="text-xl font-semibold text-[var(--text-strong)]">
                      {activeReview.subject}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {activeReview.topic}
                    </p>
                  </div>
                </div>

                <div
                  className={`rounded-xl border px-4 py-4 text-center shadow-sm ${
                    uiTimerSession?.isPaused
                      ? "border-[var(--border-warm)] bg-[var(--surface-warm)]"
                      : "border-[var(--border-soft)] bg-[var(--surface-bright)]"
                  }`}
                >
                  <p className="text-sm font-semibold text-[var(--text-muted)]">
                    Tempo revisando
                  </p>
                  {uiTimerSession?.isPaused ? (
                    <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-warm)]">
                      <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                      Pausado
                    </div>
                  ) : null}
                  <p
                    className={`mt-2 text-3xl font-semibold ${
                      uiTimerSession?.isPaused
                        ? "text-[var(--accent-warm)]"
                        : "text-[var(--accent)]"
                    }`}
                  >
                    {uiTimerSession ? formatElapsed(elapsedSeconds) : "00:00"}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  {!uiTimerSession ? (
                    <button
                      className="min-h-[44px] rounded-xl bg-[var(--accent-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-on-accent)]"
                      onClick={beginTimerSession}
                    >
                      Iniciar cronômetro
                    </button>
                  ) : isFinishingReview ? (
                    <>
                      <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-[var(--text-medium)]">
                              Quantas questões
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={questionsTotal}
                              onChange={(event) =>
                                setQuestionsTotal(Number(event.target.value))
                              }
                              className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-white)] px-3 text-base text-[var(--text-strong)]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-[var(--text-medium)]">
                              Quantas corretas
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={questionsCorrect}
                              onChange={(event) =>
                                setQuestionsCorrect(Number(event.target.value))
                              }
                              className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-white)] px-3 text-base text-[var(--text-strong)]"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-col gap-2">
                        <button
                          className="min-h-[44px] w-full rounded-xl bg-[var(--accent-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-on-accent)]"
                          onClick={finalizeReview}
                        >
                          Concluir revisão
                        </button>
                        <button
                          className="min-h-[44px] w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)]"
                          onClick={cancelFinishFlow}
                        >
                          Voltar à revisão
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        className="min-h-[44px] rounded-xl border border-[var(--border-soft)] bg-[var(--surface-neutral)] px-4 py-2 text-sm font-semibold text-[var(--text-medium)]"
                        onClick={toggleTimerPause}
                      >
                        {uiTimerSession?.isPaused ? "Continuar" : "Pausar"}
                      </button>
                      <button
                        className="min-h-[44px] rounded-xl bg-[var(--accent-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-on-accent)]"
                        onClick={startFinishFlow}
                      >
                        Concluir revisão
                      </button>
                    </>
                  )}
                </div>

              </div>
            ) : modalType === "defer" ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[var(--text-strong)]">
                  Adiar revisão
                </h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Tem certeza que deseja adiar esta revisão por 1 dia?
                </p>
                <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-medium)]">
                  {activeReview.subject} - {activeReview.topic}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    className="min-h-[44px] rounded-xl bg-[var(--accent-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-on-accent)]"
                    onClick={confirmDefer}
                  >
                    Confirmar adiamento
                  </button>
                  <button
                    className="min-h-[44px] rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)]"
                    onClick={closeModal}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[var(--text-strong)]">
                  Finalizar revisão
                </h3>
                <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[var(--text-medium)]">
                        Quantas questões
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={questionsTotal}
                        onChange={(event) =>
                          setQuestionsTotal(Number(event.target.value))
                        }
                        className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-white)] px-3 text-base text-[var(--text-strong)]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[var(--text-medium)]">
                        Quantas corretas
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={questionsCorrect}
                        onChange={(event) =>
                          setQuestionsCorrect(Number(event.target.value))
                        }
                        className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-white)] px-3 text-base text-[var(--text-strong)]"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    className="min-h-[44px] w-full rounded-xl bg-[var(--accent-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-on-accent)]"
                    onClick={handleConfirmCompleteClick}
                  >
                    Concluir revisão
                  </button>
                  <button
                    className="min-h-[44px] w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)]"
                    onClick={closeModal}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
