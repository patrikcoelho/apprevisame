"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/app/components/toast-provider";
import {
  clearReviewTimerPending,
  clearReviewTimerSession,
  computeElapsedSeconds,
  readReviewTimerPending,
  readReviewTimerSession,
  writeReviewTimerPending,
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
};

type HomeClientProps = {
  fullName?: string | null;
  initialReviews: Review[];
};

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

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

const formatDate = (isoDate: string) => {
  const date = new Date(isoDate + "T00:00:00");
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getDaysLate = (today: string, due: string) => {
  const todayDate = new Date(`${today}T00:00:00`);
  const dueDate = new Date(`${due}T00:00:00`);
  const diffMs = todayDate.getTime() - dueDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
};

export default function HomeClient({ fullName, initialReviews }: HomeClientProps) {
  const supabase = createClient();
  const { addToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [activeReview, setActiveReview] = useState<Review | null>(null);
  const [modalType, setModalType] = useState<
    "defer" | "complete" | "timer" | null
  >(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [questionsAnswered, setQuestionsAnswered] = useState<boolean | null>(
    null
  );
  const [showQuestionHint, setShowQuestionHint] = useState(false);
  const [questionsTotal, setQuestionsTotal] = useState(0);
  const [questionsCorrect, setQuestionsCorrect] = useState(0);
  const [isFinishingReview, setIsFinishingReview] = useState(false);
  const [timerSession, setTimerSession] = useState<ReviewTimerSession | null>(
    null
  );
  const [timerTick, setTimerTick] = useState(0);
  const [pendingTimerData, setPendingTimerData] =
    useState<ReviewTimerPending | null>(null);
  const [resumeAfterFinishCancel, setResumeAfterFinishCancel] = useState(false);

  const todayIso = toDateKey(new Date());

  const { overdue, todayReviews } = useMemo(() => {
    const overdueList = reviews.filter((review) => review.dueAt < todayIso);
    const todayList = reviews.filter((review) => review.dueAt === todayIso);
    return { overdue: overdueList, todayReviews: todayList };
  }, [reviews, todayIso]);
  const hasOverdue = overdue.length > 0;
  const hasToday = todayReviews.length > 0;
  const hasAnyReviews = hasOverdue || hasToday;
  const reviewIndexById = useMemo(() => {
    const grouped = new Map<string, Review[]>();
    reviews.forEach((review) => {
      const key = `${review.subject}__${review.topic}__${review.studiedAt}`;
      const existing = grouped.get(key) ?? [];
      existing.push(review);
      grouped.set(key, existing);
    });
    const map = new Map<string, number>();
    grouped.forEach((list) => {
      const ordered = [...list].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
      ordered.forEach((review, index) => {
        map.set(review.id, index + 1);
      });
    });
    return map;
  }, [reviews]);

  useEffect(() => {
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
    const review = reviews.find(
      (item) => item.id === pendingTimerData.reviewId
    );
    if (!review) return;
    clearReviewTimerPending();
    setActiveReview(review);
    setShowQuestions(false);
    setQuestionsTotal(0);
    setQuestionsCorrect(0);
    setQuestionsAnswered(null);
    setShowQuestionHint(false);
    setModalType("complete");
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
  }, [reviews, timerSession]);

  const updateTimerSession = (next: ReviewTimerSession | null) => {
    if (next) {
      writeReviewTimerSession(next);
    } else {
      clearReviewTimerSession();
    }
    window.dispatchEvent(
      new CustomEvent("revisame:review-timer", { detail: next })
    );
  };

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

  const toggleTimerPause = () => {
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
  };

  const elapsedSeconds = useMemo(() => {
    if (!timerSession) return 0;
    return computeElapsedSeconds(timerSession);
  }, [timerSession, timerTick]);

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
    setShowQuestions(false);
    setQuestionsTotal(0);
    setQuestionsCorrect(0);
    setQuestionsAnswered(null);
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

    setReviews((prev) => prev.filter((review) => review.id !== activeReview.id));
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-[#1f1c18]">
            Olá{fullName ? `, ${fullName}` : ""}.
          </h1>
          <p className="text-sm font-semibold text-[#5a5246]">
            Essas são suas revisões de hoje
          </p>
        </div>
      </div>

      {!hasAnyReviews ? (
        <section className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-3 sm:p-6">
          <div className="flex flex-col gap-4 rounded-md border border-[#efe2d1] bg-[#fbf7f2] px-3 py-4 text-sm text-[#6b6357] sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e2d6c4] bg-white text-[#1f5b4b]">
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M9 12l2 2 4-4" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </span>
              <div>
                <p className="font-semibold text-[#4b4337]">
                  Nenhuma revisão para hoje.
                </p>
                <p className="text-xs text-[#6b6357]">
                  Você está em dia com o seu cronograma.
                </p>
              </div>
            </div>
            <Link
              href="/adicionar"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-[#1f5b4b] px-4 py-2 text-center text-sm font-semibold text-[#fffaf2]"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Adicionar estudo
            </Link>
          </div>
        </section>
      ) : (
        <>
          {hasOverdue ? (
            <section className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1f1c18]">
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4 text-[#c84b3a]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <path d="M12 8v5" strokeLinecap="round" />
                    <path d="M12 16h.01" strokeLinecap="round" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  Atrasadas
                </h2>
                <span className="text-xs font-semibold text-[#c84b3a]">
                  {overdue.length} pendentes
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {overdue.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-4"
                  >
                  <div>
                    <p className="text-base font-semibold text-[#1f1c18]">
                      {item.subject}
                    </p>
                    <p className="mt-1 text-sm font-medium text-[#4b4337]">
                      {reviewIndexById.get(item.id) ?? 1}ª revisão - {item.topic}
                    </p>
                    {item.notes?.trim() ? (
                      <p className="mt-1 text-xs text-[#7a6f62]">
                        Observações do estudo: {item.notes}
                      </p>
                    ) : null}
                    <p className="mt-2 flex items-center gap-2 text-[11px] text-[#6b6357] dark:text-[#8a8276]">
                      <svg
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-[#6b6357] dark:text-[#8a8276]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <rect x="4" y="5" width="16" height="14" rx="2" />
                        <path d="M8 3v4M16 3v4" strokeLinecap="round" />
                      </svg>
                      Estudado em: {formatDate(item.studiedAt)}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-[11px] text-[#6b6357] dark:text-[#8a8276]">
                      {item.dueAt < todayIso ? (
                        <svg
                          aria-hidden="true"
                          className="h-3.5 w-3.5 text-[#c84b3a]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <path d="M12 9v4" strokeLinecap="round" />
                          <path d="M12 16h.01" strokeLinecap="round" />
                          <circle cx="12" cy="12" r="9" />
                        </svg>
                      ) : (
                        <svg
                          aria-hidden="true"
                          className="h-3.5 w-3.5 text-[#1f5b4b]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v5l3 2" strokeLinecap="round" />
                        </svg>
                      )}
                      <span>Revisão prevista para: {formatDate(item.dueAt)}</span>
                      {item.dueAt < todayIso ? (
                        <>
                          <span className="text-[#6b6357] dark:text-[#8a8276]">
                            •
                          </span>
                          <span className="font-semibold text-[#c84b3a]">
                            {getDaysLate(todayIso, item.dueAt)} dias de atraso
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={`min-h-[44px] rounded-md px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 ${
                        timerSession?.reviewId === item.id
                          ? "bg-[#e9f4ef] text-[#1f5b4b] border border-[#1f5b4b]"
                          : "bg-[#1f5b4b] text-[#fffaf2]"
                      }`}
                      onClick={() => startReviewTimer(item)}
                    >
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M8 5l10 7-10 7V5z" strokeLinecap="round" />
                      </svg>
                      {timerSession?.reviewId === item.id
                        ? "Revisão em andamento"
                        : "Iniciar revisão"}
                    </button>
                  </div>
                </div>
              ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1f1c18]">
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 text-[#1f5b4b]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path d="M5 12l4 4L19 7" strokeLinecap="round" />
                </svg>
                Para hoje
              </h2>
              <span className="text-xs text-[#6b6357]">
                {todayReviews.length} itens
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {todayReviews.length === 0 ? (
                <div className="flex flex-col gap-3 rounded-md border border-[#efe2d1] bg-[#fbf7f2] px-3 py-3 text-sm text-[#6b6357] sm:px-4 sm:py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e2d6c4] bg-white text-[#4b4337]">
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <path d="M9 10h.01M15 10h.01" strokeLinecap="round" />
                        <path
                          d="M16 16c-1-1-3-1-4-1s-3 0-4 1"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <div>
                      <p className="font-semibold text-[#4b4337]">
                        Nenhuma revisão para hoje.
                      </p>
                      <p className="text-xs text-[#6b6357]">
                        Dia livre para estudar novos assuntos.
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-[#6b6357]">
                    Passos: registre um novo estudo ou planeje a próxima semana.
                  </div>
                </div>
              ) : (
                todayReviews.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-4"
                  >
                  <div>
                    <p className="text-base font-semibold text-[#3b332a]">
                      {item.subject}
                    </p>
                    <p className="mt-1 text-sm font-medium text-[#4b4337]">
                      {reviewIndexById.get(item.id) ?? 1}ª revisão - {item.topic}
                    </p>
                    {item.notes?.trim() ? (
                      <p className="mt-1 text-xs text-[#7a6f62]">
                        Observações do estudo: {item.notes}
                      </p>
                    ) : null}
                    <p className="mt-2 flex items-center gap-2 text-[11px] text-[#6b6357] dark:text-[#8a8276]">
                      <svg
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-[#6b6357] dark:text-[#8a8276]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <rect x="4" y="5" width="16" height="14" rx="2" />
                        <path d="M8 3v4M16 3v4" strokeLinecap="round" />
                      </svg>
                      Estudado em: {formatDate(item.studiedAt)}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-[11px] text-[#6b6357] dark:text-[#8a8276]">
                      <svg
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-[#1f5b4b]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" strokeLinecap="round" />
                      </svg>
                      Revisão prevista para: {formatDate(item.dueAt)}
                    </p>
                  </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="min-h-[44px] rounded-md border border-[#e2d6c4] bg-[#f0e6d9] px-4 py-2 text-sm font-semibold text-[#4b4337]"
                        onClick={() => openDeferModal(item)}
                      >
                        Adiar revisão
                      </button>
                      <button
                        className={`min-h-[44px] rounded-md px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 ${
                          timerSession?.reviewId === item.id
                            ? "bg-[#e9f4ef] text-[#1f5b4b] border border-[#1f5b4b]"
                            : "bg-[#1f5b4b] text-[#fffaf2]"
                        }`}
                        onClick={() => startReviewTimer(item)}
                      >
                        <svg
                          aria-hidden="true"
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M8 5l10 7-10 7V5z" strokeLinecap="round" />
                        </svg>
                        {timerSession?.reviewId === item.id
                          ? "Revisão em andamento"
                          : "Iniciar revisão"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}

      {modalType && activeReview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4">
          <div className="w-full max-w-md rounded-lg bg-[#fffaf2] p-5 modal-shadow sm:p-6 max-h-[85vh] overflow-y-auto">
            {modalType === "timer" ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-4 border-b border-[#efe2d1] mb-4 pb-4">
                    <p className="text-base font-semibold text-[#1f1c18]">
                      Revisão em andamento
                    </p>
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e2d6c4] bg-white text-[#6b6357]"
                      aria-label="Minimizar revisão"
                      onClick={
                        isFinishingReview ? cancelFinishFlow : handleTimerCloseRequest
                      }
                    >
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M5 12h14" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-2">
                    <h3 className="text-xl font-semibold text-[#1f1c18]">
                      {activeReview.subject}
                    </h3>
                    <p className="mt-1 text-sm text-[#5f574a]">
                      {activeReview.topic}
                    </p>
                  </div>
                </div>

                <div
                  className={`rounded-md border px-4 py-4 text-center ${
                    timerSession?.isPaused
                      ? "border-[#cfe7dc] bg-[#e6f3ed]"
                      : "border-[#efe2d1] bg-[#fdf8f1]"
                  }`}
                >
                  <p className="text-sm font-semibold text-[#6b6357]">
                    Tempo revisando
                  </p>
                  {timerSession?.isPaused ? (
                    <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#1f5b4b]">
                      <svg
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M8 5v14M16 5v14" strokeLinecap="round" />
                      </svg>
                      Pausado
                    </div>
                  ) : null}
                  <p
                    className={`mt-2 text-3xl font-semibold ${
                      timerSession?.isPaused ? "text-[#1f5b4b]" : "text-[#1f5b4b]"
                    }`}
                  >
                    {timerSession ? formatElapsed(elapsedSeconds) : "00:00"}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  {!timerSession ? (
                    <button
                      className="min-h-[44px] rounded-md bg-[#1f5b4b] px-4 py-2 text-sm font-semibold text-[#fffaf2]"
                      onClick={beginTimerSession}
                    >
                      Iniciar cronômetro
                    </button>
                  ) : isFinishingReview ? (
                    <>
                      <div className="rounded-md border border-[#e2d6c4] bg-[#f0e6d9] px-4 py-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-[#4b4337]">
                              Quantas questões
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={questionsTotal}
                              onChange={(event) =>
                                setQuestionsTotal(Number(event.target.value))
                              }
                              className="h-11 w-full rounded-md border border-[#e2d6c4] bg-white px-3 text-base text-[#1f1c18]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-[#4b4337]">
                              Quantas corretas
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={questionsCorrect}
                              onChange={(event) =>
                                setQuestionsCorrect(Number(event.target.value))
                              }
                              className="h-11 w-full rounded-md border border-[#e2d6c4] bg-white px-3 text-base text-[#1f1c18]"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          className="min-h-[44px] w-full rounded-md bg-[#1f5b4b] px-4 py-2 text-sm font-semibold text-[#fffaf2]"
                          onClick={finalizeReview}
                        >
                          Concluir revisão
                        </button>
                        <button
                          className="min-h-[44px] w-full rounded-md border border-[#e1e1e1] bg-[#f3f3f3] px-4 py-2 text-sm font-semibold text-[#6b6357]"
                          onClick={cancelFinishFlow}
                        >
                          Voltar à revisão
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        className="min-h-[44px] rounded-md border border-[#cfe7dc] bg-[#edf7f1] px-4 py-2 text-sm font-semibold text-[#2f5d4e]"
                        onClick={toggleTimerPause}
                      >
                        {timerSession.isPaused ? "Continuar" : "Pausar"}
                      </button>
                      <button
                        className="min-h-[44px] rounded-md bg-[#1f5b4b] px-4 py-2 text-sm font-semibold text-[#fffaf2]"
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
                <h3 className="text-lg font-semibold text-[#1f1c18]">
                  Adiar revisão
                </h3>
                <p className="text-sm text-[#5f574a]">
                  Tem certeza que deseja adiar esta revisão por 1 dia?
                </p>
                <div className="rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-4 py-3 text-sm text-[#4b4337]">
                  {activeReview.subject} - {activeReview.topic}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    className="min-h-[44px] rounded-md bg-[#1f5b4b] px-4 py-2 text-sm font-semibold text-[#fffaf2]"
                    onClick={confirmDefer}
                  >
                    Confirmar adiamento
                  </button>
                  <button
                    className="min-h-[44px] rounded-md border border-[#e1e1e1] bg-[#f3f3f3] px-4 py-2 text-sm font-semibold text-[#6b6357]"
                    onClick={closeModal}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#1f1c18]">
                  Finalizar revisão
                </h3>
                <div
                  className={`space-y-3 rounded-md border px-4 py-4 ${
                    showQuestionHint
                      ? "border-[#1f5b4b] bg-[#f7efe4]"
                      : "border-[#e2d6c4] bg-[#f0e6d9]"
                  }`}
                >
                  <p className="text-sm text-[#5f574a]">
                    Resolveu alguma questão durante a revisão?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={`min-h-[44px] rounded-md border px-4 py-2 text-sm font-semibold ${
                        questionsAnswered === true
                          ? "border-[#1f5b4b] bg-[#1f5b4b] text-[#fffaf2]"
                          : "border-[#d8c9b5] bg-[#fffaf2] text-[#4b4337]"
                      }`}
                      onClick={() => {
                        setQuestionsAnswered(true);
                        setShowQuestions(true);
                        setShowQuestionHint(false);
                      }}
                    >
                      Sim
                    </button>
                    <button
                      className={`min-h-[44px] rounded-md border px-4 py-2 text-sm font-semibold ${
                        questionsAnswered === false
                          ? "border-[#1f5b4b] bg-[#1f5b4b] text-[#fffaf2]"
                          : "border-[#d8c9b5] bg-[#fffaf2] text-[#4b4337]"
                      }`}
                      onClick={() => {
                        setQuestionsAnswered(false);
                        setShowQuestions(false);
                        setShowQuestionHint(false);
                      }}
                    >
                      Não
                    </button>
                  </div>
                  {showQuestions ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#4b4337]">
                          Quantas questões
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={questionsTotal}
                          onChange={(event) =>
                            setQuestionsTotal(Number(event.target.value))
                          }
                          className="h-11 w-full rounded-md border border-[#e2d6c4] bg-white px-3 text-base text-[#1f1c18]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#4b4337]">
                          Quantas corretas
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={questionsCorrect}
                          onChange={(event) =>
                            setQuestionsCorrect(Number(event.target.value))
                          }
                          className="h-11 w-full rounded-md border border-[#e2d6c4] bg-white px-3 text-base text-[#1f1c18]"
                        />
                      </div>
                    </div>
                  ) : null}
                  {showQuestionHint ? (
                    <p className="text-xs font-semibold text-[#1f5b4b]">
                      Responda a pergunta para concluir.
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    className={`min-h-[44px] w-full rounded-md px-4 py-2 text-sm font-semibold text-[#fffaf2] ${
                      questionsAnswered === null
                        ? "cursor-not-allowed bg-[#2a6a58] text-[#e9f4ef]"
                        : "bg-[#1f5b4b]"
                    }`}
                    onClick={handleConfirmCompleteClick}
                    disabled={questionsAnswered === null}
                  >
                    Concluir revisão
                  </button>
                  <button
                    className="min-h-[44px] w-full rounded-md border border-[#e1e1e1] bg-[#f3f3f3] px-4 py-2 text-sm font-semibold text-[#6b6357]"
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
