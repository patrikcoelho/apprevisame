"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  ClockPlus,
  List,
  Minus,
  Pause,
  Play,
  Smile,
  X,
} from "lucide-react";
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

type CompletedReviewRow = {
  id: string;
  due_at: string;
  completed_at: string | null;
  review_duration_seconds: number | null;
  study?: {
    topic?: string | null;
    studied_at?: string | null;
    questions_total?: number | null;
    questions_correct?: number | null;
    subject?: { name?: string | null } | null;
  } | null;
};

type CompletedReviewItem = {
  id: string;
  subject: string;
  topic: string;
  completedAt: string | null;
  durationSeconds: number | null;
  studiedAt: string | null;
  dueAt: string;
  questionsTotal: number | null;
  questionsCorrect: number | null;
};

const toKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const formatShortDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatCompletedDate = (isoDate: string | null) => {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getShortDateParts = (isoDate: string) => {
  const date = new Date(`${isoDate}T00:00:00`);
  const day = date.toLocaleDateString("pt-BR", { day: "2-digit" });
  const month = date
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");
  return { day, month };
};

const getDaysLate = (today: string, due: string) => {
  const todayDate = new Date(`${today}T00:00:00`);
  const dueDate = new Date(`${due}T00:00:00`);
  const diffMs = todayDate.getTime() - dueDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
};

export default function RevisoesClient() {
  const supabase = useMemo(() => createClient(), []);
  const { addToast } = useToast();
  const today = new Date();
  const searchParams = useSearchParams();
  const [viewDate, setViewDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [viewMode, setViewMode] = useState<"lista" | "calendario">("lista");
  const [listStatusFilter, setListStatusFilter] = useState<
    "todas" | "atrasadas" | "hoje"
  >("todas");
  const [showCompleted, setShowCompleted] = useState(false);
  const [completedRange, setCompletedRange] = useState<
    "todas" | "semana" | "30" | "90" | "ano"
  >("todas");
  const [completedReviews, setCompletedReviews] = useState<CompletedReviewItem[]>(
    []
  );
  const [completedHasMore, setCompletedHasMore] = useState(true);
  const [completedLoading, setCompletedLoading] = useState(false);
  const completedOffsetRef = useRef(0);
  const completedLoadingRef = useRef(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [showDayPanel, setShowDayPanel] = useState(false);
  const [reviewsStore, setReviewsStore] = useState<Record<string, DayReview>>(
    {}
  );
  const [activeReview, setActiveReview] = useState<DayReview | null>(null);
  const [modalType, setModalType] = useState<
    "timer" | "complete" | "defer" | null
  >(null);
  const [, setShowQuestions] = useState(false);
  const [questionsTotal, setQuestionsTotal] = useState(0);
  const [questionsCorrect, setQuestionsCorrect] = useState(0);
  const [, setQuestionsAnswered] = useState<boolean | null>(null);
  const [, setShowQuestionHint] = useState(false);
  const [isFinishingReview, setIsFinishingReview] = useState(false);
  const [timerSession, setTimerSession] = useState<ReviewTimerSession | null>(
    () => readReviewTimerSession()
  );
  const [, setTimerTick] = useState(0);
  const [pendingTimerData, setPendingTimerData] =
    useState<ReviewTimerPending | null>(() => readReviewTimerPending());
  const [resumeAfterFinishCancel, setResumeAfterFinishCancel] = useState(false);
  const todayKey = toKey(today);

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

  const { overdueCount, todayCount } = useMemo(() => {
    const values = Object.values(reviewsStore);
    const pending = values.filter((item) => item.status !== "concluida");
    const overdue = pending.filter((item) => item.dueKey < todayKey).length;
    const todayItems = pending.filter((item) => item.dueKey === todayKey).length;
    return { overdueCount: overdue, todayCount: todayItems };
  }, [reviewsStore, todayKey]);

  const completedFromDate = useMemo(() => {
    const base = new Date(today);
    if (completedRange === "semana") {
      base.setDate(base.getDate() - 7);
      return base;
    }
    if (completedRange === "30") {
      base.setDate(base.getDate() - 30);
      return base;
    }
    if (completedRange === "90") {
      base.setDate(base.getDate() - 90);
      return base;
    }
    if (completedRange === "ano") {
      return new Date(today.getFullYear(), 0, 1);
    }
    return null;
  }, [completedRange, today]);

  const listReviews = useMemo(() => {
    const items = Object.values(reviewsStore).filter((item) => {
      if (item.status === "concluida") return false;
      if (listStatusFilter === "atrasadas") return item.dueKey < todayKey;
      if (listStatusFilter === "hoje") return item.dueKey === todayKey;
      return item.dueKey <= todayKey;
    });
    return items.sort((a, b) => {
      if (a.status === b.status) return a.dueKey.localeCompare(b.dueKey);
      if (a.status === "concluida") return 1;
      if (b.status === "concluida") return -1;
      return a.dueKey.localeCompare(b.dueKey);
    });
  }, [reviewsStore, todayKey, listStatusFilter]);

  const completedIndexById = useMemo(() => {
    const grouped = new Map<string, CompletedReviewItem[]>();
    completedReviews.forEach((review) => {
      const key = `${review.subject}__${review.topic}__${review.studiedAt ?? ""}`;
      const existing = grouped.get(key) ?? [];
      existing.push(review);
      grouped.set(key, existing);
    });
    const map = new Map<string, number>();
    grouped.forEach((list) => {
      const ordered = [...list].sort((a, b) =>
        (a.completedAt ?? "").localeCompare(b.completedAt ?? "")
      );
      ordered.forEach((review, index) => {
        map.set(review.id, index + 1);
      });
    });
    return map;
  }, [completedReviews]);

  const loadCompletedReviews = useCallback(
    async (reset = false) => {
      if (completedLoadingRef.current) return;
      completedLoadingRef.current = true;
      setCompletedLoading(true);
      const offset = reset ? 0 : completedOffsetRef.current;
      const limit = 10;

      let query = supabase
        .from("reviews")
        .select(
          "id,due_at,completed_at,review_duration_seconds,study:studies(topic,studied_at,questions_total,questions_correct,subject:subjects(name))"
        )
        .eq("status", "concluida")
        .order("completed_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (completedFromDate) {
        query = query.gte("completed_at", completedFromDate.toISOString());
      }

      const { data, error } = await query;
      if (error) {
        addToast({
          variant: "error",
          title: "Não foi possível carregar revisões concluídas.",
          description: "Tente novamente em instantes.",
        });
        completedLoadingRef.current = false;
        setCompletedLoading(false);
        return;
      }

      const mapped = (data as CompletedReviewRow[] | null ?? []).map((row) => ({
        id: row.id,
        subject: row.study?.subject?.name ?? "Matéria",
        topic: row.study?.topic ?? "Assunto",
        completedAt: row.completed_at ?? row.due_at,
        durationSeconds: row.review_duration_seconds ?? null,
        studiedAt: row.study?.studied_at ?? null,
        dueAt: row.due_at,
        questionsTotal: row.study?.questions_total ?? null,
        questionsCorrect: row.study?.questions_correct ?? null,
      }));

      setCompletedReviews((prev) => (reset ? mapped : [...prev, ...mapped]));
      setCompletedHasMore(mapped.length === limit);
      completedOffsetRef.current = offset + mapped.length;
      completedLoadingRef.current = false;
      setCompletedLoading(false);
    },
    [addToast, completedFromDate, supabase]
  );

  useEffect(() => {
    if (!showCompleted) return;
    setCompletedReviews([]);
    setCompletedHasMore(true);
    completedOffsetRef.current = 0;
    loadCompletedReviews(true);
  }, [showCompleted, completedRange, loadCompletedReviews]);

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
      const review = reviewsStore[pendingTimerData.reviewId];
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
    if (typeof document === "undefined") return;
    if (!modalType) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [modalType]);

  useEffect(() => {
    if (viewMode !== "calendario") {
      setShowDayPanel(false);
    }
  }, [viewMode]);

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "todas" || status === "atrasadas" || status === "hoje") {
      setListStatusFilter(status);
    }
  }, [searchParams]);

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
  }, [reviewsStore, timerSession, toggleTimerPause]);

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

  const elapsedSeconds = timerSession ? computeElapsedSeconds(timerSession) : 0;

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
    <div className="page-stack">
      <header className="flex flex-col gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-[var(--text-strong)]">Revisões</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Visualize o que já foi feito e o que vem nos próximos dias.
          </p>
        </div>
      </header>

      <div className="-mb-6 flex flex-wrap items-center justify-between gap-3">
        {!showCompleted ? (
          <>
            <div className="flex w-fit items-center overflow-hidden rounded-md border border-[var(--border-soft)] bg-[var(--tab-bg)] p-1">
              {[
                { value: "lista", label: "Lista" },
                { value: "calendario", label: "Calendário" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() =>
                    setViewMode(item.value as "lista" | "calendario")
                  }
                  className={`min-h-[34px] rounded-md px-4 py-1 text-xs font-semibold inline-flex items-center gap-2 transition ${
                    viewMode === item.value
                      ? "bg-[var(--tab-active-bg)] text-[var(--tab-active-text)]"
                      : "text-[var(--tab-text)]"
                  }`}
                >
                  {item.value === "lista" ? (
                    <List className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {item.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowCompleted(true)}
              className="text-xs font-semibold text-[var(--accent)] underline-offset-4 transition hover:underline"
            >
              Mostrar revisões concluídas
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowCompleted(false)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] underline-offset-4 transition hover:underline"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Voltar às revisões do dia
          </button>
        )}
      </div>

      {showCompleted ? (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--text-strong)]">
              Revisões concluídas
            </p>
            <div className="flex items-center gap-2">
              <label
                htmlFor="revisoes-concluidas"
                className="text-xs font-semibold text-[var(--text-muted)]"
              >
                Período
              </label>
              <select
                id="revisoes-concluidas"
                value={completedRange}
                onChange={(event) =>
                  setCompletedRange(
                    event.target.value as "todas" | "semana" | "30" | "90" | "ano"
                  )
                }
                className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface-white)] px-3 text-xs font-semibold text-[var(--text-medium)]"
              >
                <option value="todas">Todas</option>
                <option value="semana">Última semana</option>
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
                <option value="ano">Ano atual</option>
              </select>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {completedReviews.length === 0 && !completedLoading ? (
              <div className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-3 text-sm text-[var(--text-muted)]">
                Nenhuma revisão concluída nesse período.
              </div>
            ) : (
              completedReviews.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-strong)]">
                        {item.subject}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {item.topic}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
                        <span>
                          {completedIndexById.get(item.id) ?? 1}ª revisão
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-[var(--text-strong)]">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Concluída em {formatCompletedDate(item.completedAt)}
                        </span>
                        {item.durationSeconds ? (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                              {Math.round(item.durationSeconds / 60)} min
                            </span>
                          </>
                        ) : null}
                        {item.completedAt &&
                        new Date(item.completedAt) > new Date(item.dueAt) ? (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-[var(--accent-danger)]">
                              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                              Concluída com atraso
                            </span>
                          </>
                        ) : null}
                      </div>
                      {item.questionsTotal && item.questionsTotal > 0 ? (
                        <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-[var(--border-soft)] bg-[var(--surface-soft)] px-2 py-1 text-[11px] text-[var(--text-muted)]">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>
                            Acerto em questões:{" "}
                            <span className="font-semibold text-[var(--text-strong)]">
                              {Math.round(
                                ((item.questionsCorrect ?? 0) / item.questionsTotal) *
                                  100
                              )}
                              %
                            </span>{" "}
                            ({item.questionsCorrect ?? 0}/{item.questionsTotal})
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 flex justify-center">
            {completedHasMore ? (
              <button
                type="button"
                className="min-h-[40px] rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2 text-xs font-semibold text-[var(--text-medium)]"
                onClick={() => loadCompletedReviews(false)}
                disabled={completedLoading}
              >
                {completedLoading ? "Carregando..." : "Ver mais revisões"}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {!showCompleted && viewMode === "calendario" ? (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                className="min-h-[44px] rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-medium)]"
                onClick={goToToday}
              >
                Hoje
              </button>
              <div className="text-base font-semibold text-[var(--text-strong)]">
                {monthNames[viewDate.getMonth()]} de {viewDate.getFullYear()}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="min-h-[44px] rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm font-semibold text-[var(--text-medium)]"
                  aria-label="Mês anterior"
                  onClick={goToPreviousMonth}
                >
                  ◀
                </button>
                <button
                  type="button"
                  className="min-h-[44px] rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm font-semibold text-[var(--text-medium)]"
                  aria-label="Próximo mês"
                  onClick={goToNextMonth}
                >
                  ▶
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-7 gap-1 text-[11px] font-semibold text-[var(--text-muted)] sm:gap-2 sm:text-xs">
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
                              backgroundColor: "var(--surface-success-strong)",
                              borderColor: "var(--accent-border)",
                              borderWidth: "2px",
                            }
                          : undefined
                      }
                      className={`relative h-14 rounded-md border px-1 py-2 text-left transition sm:h-[84px] sm:px-2 ${
                        cell.inMonth
                          ? "border-[var(--border)] bg-[var(--surface-white)] text-[var(--text-strong)]"
                          : "border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--text-disabled)]"
                      } ${
                        isToday ? "text-[var(--accent)]" : ""
                      } ${
                        !isToday && isSelected
                          ? "border-2 border-[var(--accent-border)] bg-[var(--surface-success)]"
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
                              <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-[var(--accent-danger)] sm:hidden" />
                              <span className="absolute bottom-2 right-2 hidden h-4 w-4 items-center justify-center text-[var(--accent-danger)] sm:flex">
                                <X className="h-3 w-3" aria-hidden="true" />
                              </span>
                            </>
                          ) : isPast && allCompleted ? (
                            <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full border border-[var(--accent-border)] text-[var(--accent)] sm:bottom-2 sm:right-2 sm:h-5 sm:w-5">
                              <Check className="h-2.5 w-2.5" aria-hidden="true" />
                            </span>
                          ) : (
                            <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-[var(--accent-bg)] sm:bottom-2 sm:right-2 sm:h-3 sm:w-3" />
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
      ) : null}

      {!showCompleted && viewMode !== "calendario" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[var(--text-muted)]">
              {listStatusFilter === "atrasadas"
                ? `Você tem ${listReviews.length} revisões atrasadas`
                : `Você tem ${listReviews.length} revisões para hoje`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="revisoes-status"
                className="text-xs font-semibold text-[var(--text-muted)]"
              >
                Status
              </label>
              <select
                id="revisoes-status"
                value={listStatusFilter}
                onChange={(event) =>
                  setListStatusFilter(
                    event.target.value as "todas" | "atrasadas" | "hoje"
                  )
                }
                className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface-white)] px-3 text-xs font-semibold text-[var(--text-medium)]"
              >
                <option value="todas">Todas</option>
                <option value="atrasadas">Atrasadas</option>
                <option value="hoje">Hoje</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            {listReviews.length === 0 ? (
              <div className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-3 text-sm text-[var(--text-muted)]">
                Nenhuma revisão encontrada.
              </div>
            ) : (
              listReviews.map((item) => {
                const dateParts = getShortDateParts(item.dueKey);
                const isCompleted = item.status === "concluida";
                const isOverdue = !isCompleted && item.dueKey < todayKey;
                const isToday = !isCompleted && item.dueKey === todayKey;
                const cardClass = isOverdue
                  ? "border-[var(--border-soft)] bg-[var(--surface-warm-soft)]"
                  : isCompleted
                  ? "border-[var(--border-soft)] bg-[var(--surface-subtle)]"
                  : "border-[var(--border-soft)] bg-[var(--surface-accent-muted)]";
                const dateTone = isOverdue
                  ? "text-[var(--accent-danger)]"
                  : isCompleted
                  ? "text-[var(--text-muted)]"
                  : "text-[var(--accent)]";

                return (
                  <div
                    key={item.id}
                    className={`flex flex-row items-center gap-3 rounded-md border px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 ${cardClass}`}
                  >
                    <div className="flex min-w-0 flex-1 flex-row items-center gap-3 sm:gap-4">
                      <div className="flex min-w-[76px] flex-col items-start justify-center gap-1 px-1 py-1 text-left sm:min-w-[88px] sm:items-center sm:px-2 sm:text-center">
                        <span
                          className="mb-1 font-semibold leading-[1.05] text-[var(--text-muted)]"
                          style={{ fontSize: "10px" }}
                        >
                          {isToday ? "Data da revisão" : "Data prevista"}
                        </span>
                        {isToday ? (
                          <span className={`text-[28px] font-semibold leading-none sm:text-[36px] ${dateTone}`}>
                            Hoje
                          </span>
                        ) : (
                          <span className={`flex items-baseline gap-2 ${dateTone}`}>
                            <span className="text-[28px] font-semibold leading-none sm:text-[36px]">
                              {dateParts.day}
                            </span>
                            <span className="text-[28px] font-semibold uppercase leading-none sm:text-[36px]">
                              {dateParts.month}
                            </span>
                          </span>
                        )}
                        {isOverdue ? (
                          <span className="mt-1 text-[10px] font-semibold text-[var(--text-muted)]">
                            {getDaysLate(todayKey, item.dueKey)} dias de atraso
                          </span>
                        ) : null}
                      </div>
                      <div
                        aria-hidden="true"
                        className="mx-2 self-center h-10 w-px bg-[var(--border-soft)] sm:mx-3"
                      />
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-[var(--text-strong)]">
                          {item.subject}
                        </p>
                        <p className="mt-1 text-sm font-medium text-[var(--text-medium)]">
                          {reviewIndexById.get(item.id) ?? 1}ª revisão -{" "}
                          {item.topic}
                        </p>
                        {item.notes?.trim() ? (
                          <p className="mt-1 text-xs text-[var(--text-muted-strong)] line-clamp-2">
                            Observações do estudo: {item.notes}
                          </p>
                        ) : null}
                        {!isCompleted ? (
                          <>
                          <p className="mt-1.5 flex items-center gap-2 text-[11px] text-[var(--text-muted-strong)]">
                            <Calendar
                              className="h-3.5 w-3.5 text-[var(--text-muted-strong)]"
                              aria-hidden="true"
                            />
                              Estudado em: {formatShortDate(item.studiedAt)}
                            </p>
                          </>
                        ) : (
                          <p className="mt-2 text-xs text-[var(--text-muted-strong)]">
                            Revisão concluída.
                          </p>
                        )}
                      </div>
                    </div>
                    {!isCompleted ? (
                      <div className="flex flex-shrink-0 justify-end gap-2 sm:ml-auto sm:self-center">
                        {isToday ? (
                          <button
                            type="button"
                            aria-label="Adiar revisão"
                            className="h-11 w-11 rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-0 text-sm font-semibold text-[var(--text-medium)] inline-flex items-center justify-center sm:h-auto sm:w-auto sm:rounded-md sm:px-4 sm:py-2"
                            onClick={() => {
                              setActiveReview(item);
                              setModalType("defer");
                            }}
                          >
                            <ClockPlus className="h-4 w-4" aria-hidden="true" />
                            <span className="hidden sm:inline">Adiar revisão</span>
                          </button>
                        ) : null}
                        <button
                          type="button"
                          aria-label={
                            timerSession?.reviewId === item.id
                              ? "Revisão em andamento"
                              : "Iniciar revisão"
                          }
                          className={`h-11 w-11 rounded-full border px-0 text-sm font-semibold inline-flex items-center justify-center sm:h-12 sm:w-12 ${
                            timerSession?.reviewId === item.id
                              ? "bg-[var(--surface-success)] text-[var(--accent)] border border-[var(--accent-border)]"
                              : isOverdue
                              ? "border border-[var(--accent-danger)] text-[var(--accent-danger)] bg-transparent"
                              : "bg-[var(--accent-bg)] text-[var(--text-on-accent)]"
                          }`}
                          onClick={() => startReviewTimer(item)}
                        >
                          {timerSession?.reviewId === item.id ? (
                            <Pause className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Play className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      {!showCompleted && viewMode === "calendario" ? (
        <>
          <div
            className={`fixed left-0 top-0 z-40 h-[100dvh] w-[100dvw] bg-black/30 transition ${
              showDayPanel ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            onClick={() => setShowDayPanel(false)}
            aria-hidden="true"
          />
          <aside
            className={`fixed right-0 top-0 z-50 h-screen w-full max-w-sm border-l border-[var(--border)] bg-[var(--surface)] transition ${
              showDayPanel ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex h-full min-h-0 flex-col p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-muted)]">
                    Revisões do dia
                  </p>
                  <p className="mt-1 text-base font-semibold text-[var(--text-strong)]">
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
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-white)] text-[var(--text-muted)] hover:bg-[var(--surface-strong)]"
                  onClick={() => setShowDayPanel(false)}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-3 text-sm text-[var(--text-medium)]">
                {(selectedDateKey ? eventsByDate[selectedDateKey] : null)?.length ? (
                  eventsByDate[selectedDateKey!].map((item) => (
                    <div
                      key={item.id}
                      className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-3"
                    >
                      <div className="space-y-2">
                        <div className="relative">
                          <div className="pr-16">
                            <p className="text-base font-semibold text-[var(--text-strong)]">
                              {item.subject}
                            </p>
                            <p className="mt-1 text-sm font-medium text-[var(--text-medium)]">
                              {reviewIndexById.get(item.id) ?? 1}ª revisão -{" "}
                              {item.topic}
                            </p>
                            {item.notes?.trim() ? (
                              <p className="mt-1 text-xs text-[var(--text-muted)]">
                                Observações do estudo: {item.notes}
                              </p>
                            ) : null}
                            <p className="mt-2 flex items-center gap-2 text-[11px] text-[var(--text-muted-strong)]">
                              <Calendar
                                className="h-3.5 w-3.5 text-[var(--text-muted-strong)]"
                                aria-hidden="true"
                              />
                              Estudado em: {formatShortDate(item.studiedAt)}
                            </p>
                            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-muted-strong)]">
                              {item.dueKey < todayKey ? (
                                <AlertCircle
                                  className="h-3.5 w-3.5 text-[var(--accent-danger)]"
                                  aria-hidden="true"
                                />
                              ) : (
                                <Clock
                                  className="h-3.5 w-3.5 text-[var(--accent)]"
                                  aria-hidden="true"
                                />
                              )}
                              <span>
                                Revisão prevista para: {formatShortDate(item.dueKey)}
                              </span>
                            </p>
                          </div>
                        </div>
                        {item.status === "concluida" ? (
                          <div className="rounded-md border border-[var(--border-success-strong)] bg-[var(--surface-success)] px-3 py-2 text-center text-xs text-[var(--accent)]">
                            Revisão realizada em {formatShortDate(item.dueKey)}
                          </div>
                        ) : (
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                            {item.dueKey < todayKey ? null : (
                              <button
                                className="min-h-[40px] rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-xs font-semibold text-[var(--text-medium)]"
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
                                <div className="text-xs font-semibold text-[var(--accent-danger)]">
                                  <p>Atrasada</p>
                                  <p>
                                    {getDaysLate(todayKey, item.dueKey)} dias de atraso
                                  </p>
                                </div>
                                <button
                                  className={`min-h-[40px] rounded-md px-3 py-2 text-xs font-semibold inline-flex items-center gap-2 ${
                                    timerSession?.reviewId === item.id
                                      ? "bg-[var(--surface-success)] text-[var(--accent)] border border-[var(--accent-border)]"
                                      : "border border-[var(--accent-danger)] text-[var(--accent-danger)] bg-transparent"
                                  }`}
                                  onClick={() => startReviewTimer(item)}
                                >
                                  {timerSession?.reviewId === item.id ? (
                                    <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                                  ) : (
                                    <Play className="h-3.5 w-3.5" aria-hidden="true" />
                                  )}
                                  {timerSession?.reviewId === item.id
                                    ? "Revisão em andamento"
                                    : "Começar agora"}
                                </button>
                              </div>
                            ) : (
                              <button
                                className={`min-h-[40px] rounded-md px-3 py-2 text-xs font-semibold inline-flex items-center gap-2 ${
                                  timerSession?.reviewId === item.id
                                    ? "bg-[var(--surface-success)] text-[var(--accent)] border border-[var(--accent-border)]"
                                    : "bg-[var(--accent-bg)] text-[var(--text-on-accent)]"
                                }`}
                                onClick={() => startReviewTimer(item)}
                              >
                                {timerSession?.reviewId === item.id ? (
                                  <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                                ) : (
                                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                                )}
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
                  <div className="flex flex-col gap-3 rounded-md border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-3 text-xs text-[var(--text-muted)]">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-white)] text-[var(--text-medium)]">
                        <Smile className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="font-semibold text-[var(--text-medium)]">
                          Nenhuma revisão agendada.
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Este dia está livre no seu calendário.
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      Passos: escolha outro dia ou registre um novo estudo para
                      gerar revisões.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </>
      ) : null}

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
                    timerSession?.isPaused
                      ? "border-[var(--border-warm)] bg-[var(--surface-warm)]"
                      : "border-[var(--border-soft)] bg-[var(--surface-bright)]"
                  }`}
                >
                  <p className="text-sm font-semibold text-[var(--text-muted)]">
                    Tempo revisando
                  </p>
                  {timerSession?.isPaused ? (
                    <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-warm)]">
                      <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                      Pausado
                    </div>
                  ) : null}
                  <p
                    className={`mt-2 text-3xl font-semibold ${
                      timerSession?.isPaused ? "text-[var(--accent-warm)]" : "text-[var(--accent)]"
                    }`}
                  >
                    {timerSession ? formatElapsed(elapsedSeconds) : "00:00"}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  {!timerSession ? (
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
                        {timerSession.isPaused ? "Continuar" : "Pausar"}
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
