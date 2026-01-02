"use client";

import { useEffect, useMemo, useState } from "react";
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

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

type DayReview = {
  id: string;
  subject: string;
  topic: string;
  studiedAt: string;
  notes?: string;
  dueAt: string;
  dueKey: string;
  status: "pendente" | "concluida" | "adiada";
};

type ReviewRow = {
  id: string;
  due_at: string;
  status: "pendente" | "concluida" | "adiada";
  study?: {
    topic?: string | null;
    studied_at?: string | null;
    notes?: string | null;
    subject?: { name?: string | null } | null;
  } | null;
};

const toKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const formatShortDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const getDaysLate = (today: string, due: string) => {
  const todayDate = new Date(`${today}T00:00:00`);
  const dueDate = new Date(`${due}T00:00:00`);
  const diffMs = todayDate.getTime() - dueDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
};

export default function Revisoes() {
  const supabase = useMemo(() => createClient(), []);
  const { addToast } = useToast();
  const today = new Date();
  const [viewDate, setViewDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [showDayPanel, setShowDayPanel] = useState(false);
  const [reviewsStore, setReviewsStore] = useState<Record<string, DayReview>>(
    {}
  );
  const [activeReview, setActiveReview] = useState<DayReview | null>(null);
  const [modalType, setModalType] = useState<
    "timer" | "complete" | "defer" | null
  >(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [questionsTotal, setQuestionsTotal] = useState(0);
  const [questionsCorrect, setQuestionsCorrect] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState<boolean | null>(
    null
  );
  const [showQuestionHint, setShowQuestionHint] = useState(false);
  const [isFinishingReview, setIsFinishingReview] = useState(false);
  const [timerSession, setTimerSession] = useState<ReviewTimerSession | null>(
    null
  );
  const [timerTick, setTimerTick] = useState(0);
  const [pendingTimerData, setPendingTimerData] =
    useState<ReviewTimerPending | null>(null);
  const [resumeAfterFinishCancel, setResumeAfterFinishCancel] = useState(false);
  const todayKey = toKey(today);

  useEffect(() => {
    const loadReviews = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setReviewsStore({});
        return;
      }
      const start = new Date(viewDate.getFullYear(), viewDate.getMonth() - 2, 1);
      const end = new Date(
        viewDate.getFullYear(),
        viewDate.getMonth() + 3,
        0,
        23,
        59,
        59
      );
      const { data } = await supabase
        .from("reviews")
        .select(
          "id,due_at,status,study:studies(topic,studied_at,notes,subject:subjects(name))"
        )
        .eq("user_id", user.id)
        .gte("due_at", start.toISOString())
        .lte("due_at", end.toISOString());

      const map: Record<string, DayReview> = {};
      (data as ReviewRow[] | null ?? []).forEach((review: ReviewRow) => {
        const dueAt = review.due_at ?? start.toISOString();
        const key = dueAt.split("T")[0] ?? toKey(start);
        const subject = review.study?.subject?.name ?? "Matéria";
        const topic = review.study?.topic ?? "Assunto";
        const studiedAt = review.study?.studied_at
          ? toKey(new Date(review.study.studied_at))
          : key;
        map[review.id] = {
          id: review.id,
          subject,
          topic,
          studiedAt,
          notes: review.study?.notes ?? "",
          dueAt,
          dueKey: key,
          status: review.status ?? "pendente",
        };
      });

      setReviewsStore(map);
    };

    loadReviews();
  }, [supabase, viewDate]);

  const eventsByDate = useMemo(() => {
    const grouped: Record<string, DayReview[]> = {};
    Object.values(reviewsStore).forEach((review) => {
      if (!grouped[review.dueKey]) {
        grouped[review.dueKey] = [];
      }
      grouped[review.dueKey].push(review);
    });
    Object.values(grouped).forEach((list) => {
      list.sort((a, b) => {
        if (a.status === b.status) return a.dueKey.localeCompare(b.dueKey);
        if (a.status === "concluida") return 1;
        if (b.status === "concluida") return -1;
        return a.dueKey.localeCompare(b.dueKey);
      });
    });
    return grouped;
  }, [reviewsStore]);

  const reviewIndexById = useMemo(() => {
    const grouped = new Map<string, DayReview[]>();
    Object.values(reviewsStore).forEach((review) => {
      const key = `${review.subject}__${review.topic}__${review.studiedAt}`;
      const existing = grouped.get(key) ?? [];
      existing.push(review);
      grouped.set(key, existing);
    });
    const map = new Map<string, number>();
    grouped.forEach((list) => {
      const ordered = [...list].sort((a, b) => a.dueKey.localeCompare(b.dueKey));
      ordered.forEach((review, index) => {
        map.set(review.id, index + 1);
      });
    });
    return map;
  }, [reviewsStore]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const lastDay = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    const startOffset = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const cells: {
      date: Date;
      inMonth: boolean;
    }[] = [];

    for (let i = startOffset; i > 0; i -= 1) {
      cells.push({
        date: new Date(viewDate.getFullYear(), viewDate.getMonth(), 1 - i),
        inMonth: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({
        date: new Date(viewDate.getFullYear(), viewDate.getMonth(), day),
        inMonth: true,
      });
    }

    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i += 1) {
      cells.push({
        date: new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, i),
        inMonth: false,
      });
    }

    return cells;
  }, [viewDate]);

  const goToPreviousMonth = () => {
    setViewDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setViewDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  };

  const goToToday = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

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
    const review = reviewsStore[pendingTimerData.reviewId];
    if (!review) return;
    clearReviewTimerPending();
    setActiveReview(review);
    setShowQuestions(false);
    setQuestionsTotal(0);
    setQuestionsCorrect(0);
    setQuestionsAnswered(null);
    setShowQuestionHint(false);
    setModalType("complete");
  }, [pendingTimerData, reviewsStore]);

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
      const review = reviewsStore[reviewId];
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
  }, [reviewsStore, timerSession]);

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

  const startReviewTimer = (review: DayReview) => {
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

    setReviewsStore((prev) => {
      const updated = { ...prev };
      delete updated[activeReview.id];
      return updated;
    });

    setPendingTimerData(null);
    clearReviewTimerPending();
    addToast({
      variant: "success",
      title: "Revisão concluída.",
      description: "Boa, seguimos para a próxima.",
    });
    setModalType(null);
    setActiveReview(null);
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

  const confirmDefer = async () => {
    if (!activeReview) return;
    const newDue = new Date(activeReview.dueAt);
    newDue.setDate(newDue.getDate() + 1);
    const newDueIso = newDue.toISOString();
    const { error } = await supabase
      .from("reviews")
      .update({ due_at: newDueIso })
      .eq("id", activeReview.id);

    if (error) {
      addToast({
        variant: "error",
        title: "Não foi possível reagendar.",
        description: "Tente novamente em instantes.",
      });
      return;
    }

    const newKey = toKey(newDue);
    setReviewsStore((prev) => ({
      ...prev,
      [activeReview.id]: {
        ...activeReview,
        dueAt: newDueIso,
        dueKey: newKey,
      },
    }));

    addToast({
      variant: "success",
      title: "Revisão reagendada.",
      description: "Voltamos este item para o próximo dia.",
    });
    setModalType(null);
    setActiveReview(null);
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

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-[#1f1c18]">Revisões</h1>
          <p className="text-sm text-[#5f574a]">
            Visualize o que já foi feito e o que vem nos próximos dias.
          </p>
        </div>
      </header>

      <section className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-3 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className="min-h-[44px] rounded-md border border-[#e2d6c4] bg-[#f0e6d9] px-4 py-2 text-sm font-semibold text-[#4b4337]"
              onClick={goToToday}
            >
              Hoje
            </button>
            <div className="text-base font-semibold text-[#1f1c18]">
              {monthNames[viewDate.getMonth()]} de {viewDate.getFullYear()}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="min-h-[44px] rounded-md border border-[#e2d6c4] bg-[#fdf8f1] px-3 py-2 text-sm font-semibold text-[#4b4337]"
                aria-label="Mês anterior"
                onClick={goToPreviousMonth}
              >
                ◀
              </button>
              <button
                type="button"
                className="min-h-[44px] rounded-md border border-[#e2d6c4] bg-[#fdf8f1] px-3 py-2 text-sm font-semibold text-[#4b4337]"
                aria-label="Próximo mês"
                onClick={goToNextMonth}
              >
                ▶
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-1 text-[11px] font-semibold text-[#6b6357] sm:gap-2 sm:text-xs">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                <div key={day} className="px-1 py-1 text-center sm:px-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarCells.map((cell) => {
                const key = toKey(cell.date);
                const items = eventsByDate[key] ?? [];
                const isSelected = key === selectedDateKey;
                const isToday =
                  cell.inMonth &&
                  cell.date.getDate() === today.getDate() &&
                  viewDate.getMonth() === today.getMonth() &&
                  viewDate.getFullYear() === today.getFullYear();
                const count = items.length;
                const isPast = key < todayKey;
                const hasOverdue = items.some(
                  (item) => item.status !== "concluida" && key < todayKey
                );
                const allCompleted =
                  items.length > 0 &&
                  items.every((item) => item.status === "concluida");
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => {
                      setSelectedDateKey(key);
                      setShowDayPanel(true);
                    }}
                    style={
                      isToday
                        ? {
                            backgroundColor: "#bde4d4",
                            borderColor: "#1f5b4b",
                            borderWidth: "2px",
                          }
                        : undefined
                    }
                    className={`relative h-14 rounded-md border px-1 py-2 text-left transition sm:h-[84px] sm:px-2 ${
                      cell.inMonth
                        ? "border-[#e2d6c4] bg-white text-[#1f1c18]"
                        : "border-[#efe2d1] bg-[#fdf8f1] text-[#b2a598]"
                    } ${
                      isToday ? "text-[#1f3f35]" : ""
                    } ${
                      !isToday && isSelected
                        ? "border-2 border-[#1f5b4b] bg-[#e9f4ef]"
                        : ""
                    }`}
                  >
                    <div className="absolute left-2 top-2 text-xs font-semibold sm:left-2.5 sm:top-2.5 sm:text-sm">
                      {cell.date.getDate()}
                    </div>
                    {count > 0 ? (
                      <>
                        {hasOverdue ? (
                          <>
                            <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-[#c84b3a] sm:hidden" />
                            <span className="absolute bottom-2 right-2 hidden h-4 w-4 items-center justify-center text-[#c84b3a] sm:flex">
                              <svg
                                aria-hidden="true"
                                className="h-3 w-3"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path
                                  d="M6 6l12 12M18 6l-12 12"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </span>
                          </>
                        ) : isPast && allCompleted ? (
                          <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full border border-[#1f5b4b] text-[#1f5b4b] sm:bottom-2 sm:right-2 sm:h-5 sm:w-5">
                            <svg
                              aria-hidden="true"
                              className="h-2.5 w-2.5"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M5 12l4 4L19 7" strokeLinecap="round" />
                            </svg>
                          </span>
                        ) : (
                          <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-[#1f5b4b] sm:bottom-2 sm:right-2 sm:h-3 sm:w-3" />
                        )}
                      </>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div
        className={`fixed left-0 top-0 z-40 h-[100dvh] w-[100dvw] bg-black/30 transition ${
          showDayPanel ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setShowDayPanel(false)}
        aria-hidden="true"
      />
      <aside
        className={`fixed right-0 top-0 z-50 h-screen w-full max-w-sm border-l border-[#e6dbc9] bg-[#fffaf2] transition ${
          showDayPanel ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full min-h-0 flex-col p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#5a5246]">
                Revisões do dia
              </p>
              <p className="mt-1 text-base font-semibold text-[#1f1c18]">
                {selectedDateKey
                  ? new Date(selectedDateKey).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                  : "Selecione um dia"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Fechar painel"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e2d6c4] bg-white text-[#6b6357] hover:bg-[#f0e6d9]"
              onClick={() => setShowDayPanel(false)}
            >
              <svg
                aria-hidden="true"
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M6 6l12 12M18 6l-12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-3 text-sm text-[#4b4337]">
            {(selectedDateKey ? eventsByDate[selectedDateKey] : null)?.length ? (
              eventsByDate[selectedDateKey!].map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-3 py-3"
                >
                  <div className="space-y-2">
                    <div className="relative">
                      <div className="pr-16">
                        <p className="text-base font-semibold text-[#1f1c18] dark:text-[#f6f1ea]">
                          {item.subject}
                        </p>
                        <p className="mt-1 text-sm font-medium text-[#4b4337]">
                          {reviewIndexById.get(item.id) ?? 1}ª revisão -{" "}
                          {item.topic}
                        </p>
                        {item.notes?.trim() ? (
                          <p className="mt-1 text-xs text-[#6b6357]">
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
                          Estudado em: {formatShortDate(item.studiedAt)}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#6b6357] dark:text-[#8a8276]">
                          {item.dueKey < todayKey ? (
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
                          <span>
                            Revisão prevista para: {formatShortDate(item.dueKey)}
                          </span>
                        </p>
                      </div>
                    </div>
                    {item.status === "concluida" ? (
                      <div className="rounded-md border border-[#d8eadf] bg-[#e9f4ef] px-3 py-2 text-center text-xs text-[#2f5d4e]">
                        Revisão realizada em {formatShortDate(item.dueKey)}
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                        {item.dueKey < todayKey ? null : (
                          <button
                            className="min-h-[40px] rounded-md border border-[#e2d6c4] bg-[#f0e6d9] px-3 py-2 text-xs font-semibold text-[#4b4337]"
                            onClick={() => {
                              setActiveReview(item);
                              setModalType("defer");
                            }}
                          >
                            Adiar revisão
                          </button>
                        )}
                        {item.dueKey < todayKey ? (
                          <div className="flex w-full items-center justify-between gap-3">
                            <div className="text-xs font-semibold text-[#c84b3a]">
                              <p>Atrasada</p>
                              <p>{getDaysLate(todayKey, item.dueKey)} dias de atraso</p>
                            </div>
                            <button
                              className={`min-h-[40px] rounded-md px-3 py-2 text-xs font-semibold inline-flex items-center gap-2 ${
                                timerSession?.reviewId === item.id
                                  ? "bg-[#e9f4ef] text-[#1f5b4b] border border-[#1f5b4b]"
                                  : "bg-[#1f5b4b] text-[#fffaf2]"
                              }`}
                              onClick={() => startReviewTimer(item)}
                            >
                              <svg
                                aria-hidden="true"
                                className="h-3.5 w-3.5"
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
                        ) : (
                          <button
                            className={`min-h-[40px] rounded-md px-3 py-2 text-xs font-semibold inline-flex items-center gap-2 ${
                              timerSession?.reviewId === item.id
                                ? "bg-[#e9f4ef] text-[#1f5b4b] border border-[#1f5b4b]"
                                : "bg-[#1f5b4b] text-[#fffaf2]"
                            }`}
                            onClick={() => startReviewTimer(item)}
                          >
                            <svg
                              aria-hidden="true"
                              className="h-3.5 w-3.5"
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
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col gap-3 rounded-md border border-[#efe2d1] bg-[#fbf7f2] px-3 py-3 text-xs text-[#6b6357]">
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
                      Nenhuma revisão agendada.
                    </p>
                    <p className="text-xs text-[#6b6357]">
                      Este dia está livre no seu calendário.
                    </p>
                  </div>
                </div>
                <div className="text-xs text-[#6b6357]">
                  Passos: escolha outro dia ou registre um novo estudo para
                  gerar revisões.
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {modalType && activeReview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4">
          <div className="w-full max-w-md rounded-lg bg-[#fffaf2] p-5 modal-shadow sm:p-6 max-h-[85vh] overflow-y-auto">
            {modalType === "timer" ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-4 border-b border-[#efe2d1] mb-4 pb-8">
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
