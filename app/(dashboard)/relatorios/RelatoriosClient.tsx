"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createClient } from "@/lib/supabase/client";

type SubjectOption = {
  id: string;
  name: string;
};

type StudyRow = {
  studied_at: string;
  questions_total: number | null;
  questions_correct: number | null;
  subject_id: string | null;
  subject: { name: string | null } | null;
};

type StudyRowRaw = Omit<StudyRow, "subject"> & {
  subject: { name: string | null }[] | null;
};

type ReviewRow = {
  due_at: string;
  status: "pendente" | "concluida" | "adiada";
  completed_at: string | null;
  review_started_at: string | null;
  review_duration_seconds: number | null;
  review_paused_seconds: number | null;
  study: {
    subject_id: string | null;
    subject: { name: string | null } | null;
  } | null;
};

type ReviewRowRaw = Omit<ReviewRow, "study"> & {
  study:
    | {
        subject_id: string | null;
        subject: { name: string | null }[] | null;
      }[]
    | null;
};

type MultiSelectOption = {
  value: string;
  label: string;
};

type MultiSelectDropdownProps = {
  label: string;
  options: MultiSelectOption[];
  placeholder: string;
  selected: string[];
  onChange: (next: string[]) => void;
};

const formatDuration = (seconds: number) => {
  if (!seconds) return "0min";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}min`;
};

const formatShortDate = (date: Date) =>
  date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const getReviewTimestamp = (review: ReviewRow) =>
  review.review_started_at ??
  review.completed_at ??
  review.due_at;

const normalizeStudyRow = (row: StudyRowRaw): StudyRow => ({
  ...row,
  subject: Array.isArray(row.subject) ? row.subject[0] ?? null : row.subject ?? null,
});

const normalizeReviewRow = (row: ReviewRowRaw): ReviewRow => {
  const study = row.study?.[0] ?? null;
  const subject = study?.subject?.[0] ?? null;
  return {
    ...row,
    study: study
      ? {
          subject_id: study.subject_id ?? null,
          subject: subject ? { name: subject.name ?? null } : null,
        }
      : null,
  };
};

const isWithinTurn = (hour: number, turn: string) => {
  if (turn === "morning") return hour >= 5 && hour <= 11;
  if (turn === "afternoon") return hour >= 12 && hour <= 17;
  if (turn === "evening") return hour >= 18 && hour <= 23;
  if (turn === "night") return hour >= 0 && hour <= 4;
  return true;
};

function MultiSelectDropdown({
  label,
  options,
  placeholder,
  selected,
  onChange,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const selectedLabels = options
    .filter((option) => selected.includes(option.value))
    .map((option) => option.label);
  const summary =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? selectedLabels[0]
        : `${selected.length} selecionadas`;

  const toggleValue = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
      return;
    }
    onChange([...selected, value]);
  };

  return (
    <div className="relative space-y-2" ref={wrapperRef}>
      <label className="text-xs font-semibold uppercase text-[#6b6357]">
        {label}
      </label>
      <button
        type="button"
        className="flex h-10 w-full items-center justify-between rounded-md border border-[#e2d6c4] bg-white px-3 text-sm text-[#1f1c18]"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={selected.length ? "" : "text-[#6b6357]"}>
          {summary}
        </span>
        <svg
          aria-hidden="true"
          className="h-4 w-4 text-[#6b6357]"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M5 8l5 5 5-5" strokeLinecap="round" />
        </svg>
      </button>
      {open ? (
        <div className="absolute left-0 right-0 z-20 mt-1 w-full rounded-md border border-[#e2d6c4] bg-white shadow-[0_18px_40px_-26px_rgba(31,91,75,0.6)]">
          <div className="max-h-56 overflow-y-auto py-1">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-[#6b6357]">
                Nenhuma opção disponível.
              </div>
            ) : (
              options.map((option) => {
                const checked = selected.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#1f1c18] hover:bg-[#f6efe4]"
                    onClick={() => toggleValue(option.value)}
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded border ${
                        checked
                          ? "border-[#1f5b4b] bg-[#1f5b4b]"
                          : "border-[#e2d6c4] bg-white"
                      }`}
                    >
                      {checked ? (
                        <svg
                          aria-hidden="true"
                          className="h-3 w-3 text-white"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M5 12l4 4L19 7" strokeLinecap="round" />
                        </svg>
                      ) : null}
                    </span>
                    <span>{option.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function RelatoriosClient() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [studies, setStudies] = useState<StudyRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAllSubjects, setShowAllSubjects] = useState(false);

  const [period, setPeriod] = useState<"7" | "30" | "90" | "custom">("30");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [questionFilter, setQuestionFilter] = useState("all");
  const [minDuration, setMinDuration] = useState("0");
  const [weekdayFilter, setWeekdayFilter] = useState<string[]>([]);
  const [turnFilter, setTurnFilter] = useState("all");

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUserId(data.user?.id ?? null);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  const todayIso = useMemo(
    () => new Date().toISOString().split("T")[0],
    []
  );

  const range = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    if (period !== "custom") {
      const days = Number.parseInt(period, 10);
      const start = new Date(now);
      start.setDate(start.getDate() - (days - 1));
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }

    const start = customStart
      ? new Date(`${customStart}T00:00:00`)
      : new Date(now);
    const endCustom = customEnd
      ? new Date(`${customEnd}T23:59:59`)
      : end;
    start.setHours(0, 0, 0, 0);
    return { start, end: endCustom };
  }, [period, customStart, customEnd]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);

    const rangeStart = range.start.toISOString();
    const rangeEnd = range.end.toISOString();

    Promise.all([
      supabase
        .from("studies")
        .select(
          "studied_at,questions_total,questions_correct,subject_id,subject:subjects(name)"
        )
        .eq("user_id", userId)
        .gte("studied_at", rangeStart)
        .lte("studied_at", rangeEnd)
        .returns<StudyRowRaw[]>(),
      supabase
        .from("reviews")
        .select(
          "due_at,status,completed_at,review_started_at,review_duration_seconds,review_paused_seconds,study:studies(subject_id,subject:subjects(name))"
        )
        .eq("user_id", userId)
        .gte("due_at", rangeStart)
        .lte("due_at", rangeEnd)
        .returns<ReviewRowRaw[]>(),
    ])
      .then(([studiesResult, reviewsResult]) => {
        if (!active) return;
        setStudies(studiesResult.data?.map(normalizeStudyRow) ?? []);
        setReviews(reviewsResult.data?.map(normalizeReviewRow) ?? []);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [supabase, userId, range.start, range.end]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    supabase
      .from("user_subjects")
      .select("subject:subjects(id,name)")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (!active) return;
        const mapped =
          (data ?? [])
            .flatMap((row) => row.subject ?? [])
            .filter((subject) => subject?.id && subject?.name)
            .map((subject) => ({
              id: subject.id,
              name: subject.name,
            })) ?? [];
        setSubjects(mapped);
      });
    return () => {
      active = false;
    };
  }, [supabase, userId]);

  const filteredStudies = useMemo(() => {
    return studies.filter((item) => {
      if (
        subjectFilter.length > 0 &&
        (!item.subject_id || !subjectFilter.includes(item.subject_id))
      ) {
        return false;
      }
      if (questionFilter === "with" && !(item.questions_total ?? 0)) {
        return false;
      }
      if (questionFilter === "without" && (item.questions_total ?? 0) > 0) {
        return false;
      }
      const studiedAt = new Date(item.studied_at);
      if (weekdayFilter.length > 0) {
        const weekday = studiedAt.getDay().toString();
        if (!weekdayFilter.includes(weekday)) return false;
      }
      if (turnFilter !== "all" && !isWithinTurn(studiedAt.getHours(), turnFilter)) {
        return false;
      }
      return true;
    });
  }, [studies, subjectFilter, questionFilter, weekdayFilter, turnFilter]);

  const filteredReviews = useMemo(() => {
    const now = new Date();
    const minSeconds = Number.parseInt(minDuration, 10) * 60;
    return reviews.filter((item) => {
      if (subjectFilter.length > 0) {
        const subjectId = item.study?.subject_id ?? null;
        if (!subjectId || !subjectFilter.includes(subjectId)) return false;
      }
      if (statusFilter.length > 0) {
        const isOverdue =
          item.status !== "concluida" && new Date(item.due_at) < now;
        const normalizedStatus = isOverdue ? "atrasada" : item.status;
        if (!statusFilter.includes(normalizedStatus)) return false;
      }
      const anchorDate = new Date(getReviewTimestamp(item));
      if (weekdayFilter.length > 0) {
        const weekday = anchorDate.getDay().toString();
        if (!weekdayFilter.includes(weekday)) return false;
      }
      if (turnFilter !== "all" && !isWithinTurn(anchorDate.getHours(), turnFilter)) {
        return false;
      }
      const duration = item.review_duration_seconds ?? 0;
      if (minSeconds > 0 && duration < minSeconds) return false;
      return true;
    });
  }, [reviews, subjectFilter, statusFilter, weekdayFilter, turnFilter, minDuration]);

  const totalQuestions = filteredStudies.reduce(
    (sum, item) => sum + (item.questions_total ?? 0),
    0
  );
  const totalCorrect = filteredStudies.reduce(
    (sum, item) => sum + (item.questions_correct ?? 0),
    0
  );
  const accuracy = totalQuestions
    ? Math.round((totalCorrect / totalQuestions) * 100)
    : 0;

  const completedReviews = filteredReviews.filter(
    (item) => item.status === "concluida"
  );
  const totalReviewSeconds = completedReviews.reduce(
    (sum, item) => sum + (item.review_duration_seconds ?? 0),
    0
  );
  const totalPausedSeconds = completedReviews.reduce(
    (sum, item) => sum + (item.review_paused_seconds ?? 0),
    0
  );
  const avgReviewSeconds = completedReviews.length
    ? Math.round(totalReviewSeconds / completedReviews.length)
    : 0;
  const completionRate = filteredReviews.length
    ? Math.round((completedReviews.length / filteredReviews.length) * 100)
    : 0;

  const overdueCount = filteredReviews.filter(
    (item) => item.status !== "concluida" && new Date(item.due_at) < new Date()
  ).length;

  const activeDays = new Set(
    filteredStudies.map((item) => toDateKey(new Date(item.studied_at)))
  );

  let streak = 0;
  const streakCursor = new Date();
  streakCursor.setHours(0, 0, 0, 0);
  while (activeDays.has(toDateKey(streakCursor))) {
    streak += 1;
    streakCursor.setDate(streakCursor.getDate() - 1);
  }

  const subjectCounts = filteredStudies.reduce<Record<string, number>>(
    (acc, item) => {
      const name = item.subject?.name ?? "Sem matéria";
      acc[name] = (acc[name] ?? 0) + 1;
      return acc;
    },
    {}
  );
  const sortedSubjects = Object.entries(subjectCounts).sort(
    (a, b) => b[1] - a[1]
  );
  const topSubjects = sortedSubjects.slice(0, 5);
  const visibleSubjects = useMemo(
    () => (showAllSubjects ? sortedSubjects : topSubjects),
    [showAllSubjects, sortedSubjects, topSubjects]
  );

  const weekSummaries = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 4 }, (_, index) => {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - (3 - index) * 7);
      weekEnd.setHours(23, 59, 59, 999);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);
      const count = filteredStudies.filter((item) => {
        const studiedAt = new Date(item.studied_at);
        return studiedAt >= weekStart && studiedAt <= weekEnd;
      }).length;
      return {
        label: `${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)}`,
        shortLabel: formatShortDate(weekStart),
        count,
      };
    });
  }, [filteredStudies]);

  const maxWeekCount = Math.max(
    1,
    ...weekSummaries.map((item) => item.count)
  );
  const chartData = useMemo(
    () =>
      weekSummaries.map((week) => ({
        label: week.shortLabel,
        range: week.label,
        value: week.count,
      })),
    [weekSummaries]
  );
  const ChartTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: { payload: { range: string; value: number } }[];
  }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    return (
      <div className="rounded-md bg-[var(--chart-tooltip-bg)] px-3 py-2 text-[11px] font-semibold text-[var(--chart-tooltip-text)] shadow-[0_12px_30px_-20px_rgba(31,91,75,0.4)]">
        <div className="text-[10px] font-normal text-[var(--chart-tooltip-subtle)]">
          {item.range}
        </div>
        {item.value} estudos
      </div>
    );
  };

  const weeklyStudyGoal = 5;
  const weeklyMinutesGoal = 120;
  const startOfWeek = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return start;
  }, []);
  const studiesWeek = filteredStudies.filter(
    (item) => new Date(item.studied_at) >= startOfWeek
  );
  const weeklyReviewSeconds = completedReviews.reduce((sum, item) => {
    const completedAt = item.completed_at ? new Date(item.completed_at) : null;
    if (!completedAt || completedAt < startOfWeek) return sum;
    return sum + (item.review_duration_seconds ?? 0);
  }, 0);
  const weeklyMinutes = Math.round(weeklyReviewSeconds / 60);

  const hasAnyData =
    filteredStudies.length > 0 ||
    filteredReviews.length > 0 ||
    totalQuestions > 0;

  const FiltersContent = (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-[#6b6357]">
          Período
        </label>
        <div className="relative">
          <select
            className="h-10 w-full appearance-none rounded-md border border-[#e2d6c4] bg-white px-3 pr-9 text-sm text-[#1f1c18]"
            value={period}
            onChange={(event) =>
              setPeriod(event.target.value as typeof period)
            }
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="custom">Personalizado</option>
          </select>
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b6357]"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M5 8l5 5 5-5" strokeLinecap="round" />
          </svg>
        </div>
        {period === "custom" ? (
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              className="h-10 w-full rounded-md border border-[#e2d6c4] bg-white px-3 text-xs text-[#1f1c18]"
              value={customStart}
              max={todayIso}
              onChange={(event) => setCustomStart(event.target.value)}
            />
            <input
              type="date"
              className="h-10 w-full rounded-md border border-[#e2d6c4] bg-white px-3 text-xs text-[#1f1c18]"
              value={customEnd}
              max={todayIso}
              onChange={(event) => setCustomEnd(event.target.value)}
            />
          </div>
        ) : null}
      </div>

      <MultiSelectDropdown
        label="Matéria"
        placeholder="Todas"
        options={subjects.map((subject) => ({
          value: subject.id,
          label: subject.name,
        }))}
        selected={subjectFilter}
        onChange={setSubjectFilter}
      />

      <MultiSelectDropdown
        label="Status da revisão"
        placeholder="Todos"
        options={[
          { value: "pendente", label: "Pendentes" },
          { value: "concluida", label: "Concluídas" },
          { value: "adiada", label: "Adiadas" },
          { value: "atrasada", label: "Atrasadas" },
        ]}
        selected={statusFilter}
        onChange={setStatusFilter}
      />

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-[#6b6357]">
          Questões
        </label>
        <div className="relative">
          <select
            className="h-10 w-full appearance-none rounded-md border border-[#e2d6c4] bg-white px-3 pr-9 text-sm text-[#1f1c18]"
            value={questionFilter}
            onChange={(event) => setQuestionFilter(event.target.value)}
          >
            <option value="all">Todas</option>
            <option value="with">Com questões</option>
            <option value="without">Sem questões</option>
          </select>
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b6357]"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M5 8l5 5 5-5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-[#6b6357]">
          Tempo mínimo
        </label>
        <div className="relative">
          <select
            className="h-10 w-full appearance-none rounded-md border border-[#e2d6c4] bg-white px-3 pr-9 text-sm text-[#1f1c18]"
            value={minDuration}
            onChange={(event) => setMinDuration(event.target.value)}
          >
            <option value="0">Sem filtro</option>
            <option value="5">5 min</option>
            <option value="10">10 min</option>
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="60">1h+</option>
          </select>
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b6357]"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M5 8l5 5 5-5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <MultiSelectDropdown
        label="Dia da semana"
        placeholder="Todos"
        options={[
          { value: "0", label: "Domingo" },
          { value: "1", label: "Segunda" },
          { value: "2", label: "Terça" },
          { value: "3", label: "Quarta" },
          { value: "4", label: "Quinta" },
          { value: "5", label: "Sexta" },
          { value: "6", label: "Sábado" },
        ]}
        selected={weekdayFilter}
        onChange={setWeekdayFilter}
      />

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-[#6b6357]">
          Turno
        </label>
        <div className="relative">
          <select
            className="h-10 w-full appearance-none rounded-md border border-[#e2d6c4] bg-white px-3 pr-9 text-sm text-[#1f1c18]"
            value={turnFilter}
            onChange={(event) => setTurnFilter(event.target.value)}
          >
            <option value="all">Todos</option>
            <option value="morning">Manhã</option>
            <option value="afternoon">Tarde</option>
            <option value="evening">Noite</option>
            <option value="night">Madrugada</option>
          </select>
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b6357]"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M5 8l5 5 5-5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-[#1f1c18]">
              Relatórios
            </h1>
            <p className="text-sm text-[#5f574a]">
              Resumo automático do período selecionado.
            </p>
          </div>
          <button
            type="button"
            className="flex h-10 w-11 items-center justify-center rounded-md border border-[#e2d6c4] bg-white text-[#1f5b4b] lg:hidden"
            onClick={() => setShowFilters(true)}
            aria-label="Abrir filtros"
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M3 5h18l-7 8v4l-4 2v-6L3 5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      <section className="hidden rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-4 lg:block">
        {FiltersContent}
      </section>

      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          showFilters ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          className={`absolute inset-0 modal-overlay transition-opacity ${
            showFilters ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setShowFilters(false)}
          aria-hidden="true"
        />
        <aside
          className={`absolute right-0 top-0 flex h-full w-[78%] max-w-xs flex-col border-l border-[#e6dbc9] bg-[#fffaf2] modal-shadow transition-transform ${
            showFilters ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#efe2d1] px-5 py-4">
            <h2 className="text-lg font-semibold text-[#1f1c18]">Filtros</h2>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e2d6c4] bg-white text-[#6b6357]"
              aria-label="Fechar filtros"
              onClick={() => setShowFilters(false)}
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 6l12 12M18 6l-12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {FiltersContent}
          </div>
          <div className="border-t border-[#efe2d1] bg-[#fffaf2] px-5 py-4">
            <button
              type="button"
              className="min-h-[44px] w-full rounded-md border border-[#1f5b4b] bg-[#1f5b4b] px-4 py-2 text-sm font-semibold text-white"
              onClick={() => setShowFilters(false)}
            >
              Aplicar filtros
            </button>
          </div>
        </aside>
      </div>

      {loading ? (
        <section className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-4 text-sm text-[#6b6357]">
          Carregando relatórios...
        </section>
      ) : !hasAnyData ? (
        <section className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-4 sm:p-6">
          <div className="flex flex-col gap-3 rounded-md border border-[#efe2d1] bg-[#fbf7f2] px-4 py-4 text-sm text-[#6b6357]">
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
                  Nenhum dado encontrado.
                </p>
                <p className="text-xs text-[#6b6357]">
                  Ajuste os filtros ou registre novos estudos.
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Estudos no período",
                value: filteredStudies.length,
                caption: "Registro selecionado",
              },
              {
                label: "Revisões concluídas",
                value: completedReviews.length,
                caption: "No período",
              },
              {
                label: "Tempo de revisão",
                value: formatDuration(totalReviewSeconds),
                caption: "Somatório",
              },
              {
                label: "Revisões atrasadas",
                value: overdueCount,
                caption: "Acompanhamento",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-4"
              >
                <p className="text-xs font-semibold uppercase text-[#6b6357]">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-[#1f1c18]">
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-[#6b6357]">{item.caption}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-[#1f1c18]">
                Desempenho em questões
              </h2>
              <div className="mt-4 space-y-3 text-sm text-[#4b4337]">
                <div className="flex items-center justify-between">
                  <span>Questões resolvidas</span>
                  <span className="font-semibold text-[#1f5b4b]">
                    {totalQuestions}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Questões corretas</span>
                  <span className="font-semibold text-[#1f5b4b]">
                    {totalCorrect}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Taxa de acertos</span>
                  <span className="font-semibold text-[#1f5b4b]">
                    {accuracy}%
                  </span>
                </div>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#efe2d1]">
                <div
                  className="h-full rounded-full bg-[#1f5b4b]"
                  style={{ width: `${accuracy}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-[#1f1c18]">
                Consistência
              </h2>
              <div className="mt-4 space-y-3 text-sm text-[#4b4337]">
                <div className="flex items-center justify-between">
                  <span>Dias estudados</span>
                  <span className="font-semibold text-[#1f5b4b]">
                    {activeDays.size}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sequência atual</span>
                  <span className="font-semibold text-[#1f5b4b]">
                    {streak} dias
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Revisões concluídas</span>
                  <span className="font-semibold text-[#1f5b4b]">
                    {completedReviews.length}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-[#1f1c18]">
                Linha do tempo
              </h2>
              <p className="mt-1 text-xs text-[#6b6357]">
                Distribuição de estudos nas últimas 4 semanas.
              </p>
              <div className="mt-4 h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 6, right: 6, left: 6, bottom: 8 }}
                  >
                    <defs>
                      <linearGradient id="studyArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-line)" stopOpacity="0.05" />
                        <stop offset="100%" stopColor="var(--chart-line)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="var(--chart-grid)"
                      strokeOpacity={1}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--chart-text)", fontSize: 10 }}
                      interval="preserveStartEnd"
                      padding={{ left: 8, right: 8 }}
                    />
                    <YAxis hide domain={[0, maxWeekCount]} />
                    <Tooltip
                      cursor={{ stroke: "var(--chart-grid)", strokeWidth: 1 }}
                      content={<ChartTooltip />}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="none"
                      fill="url(#studyArea)"
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="var(--chart-line)"
                      strokeWidth={2}
                      dot={{ r: 2, fill: "var(--chart-line)" }}
                      activeDot={{ r: 3, fill: "var(--chart-line)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-3">
                {weekSummaries.map((week) => (
                  <div key={week.label} className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#6b6357]">
                      <span>{week.label}</span>
                      <span className="font-semibold text-[#1f5b4b]">
                        {week.count === 1
                          ? "1 estudo realizado"
                          : `${week.count} estudos realizados`}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#efe2d1]">
                      <div
                        className="h-full rounded-full bg-[#1f5b4b]"
                        style={{ width: `${(week.count / maxWeekCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-[#1f1c18]">
                Matérias mais estudadas
              </h2>
              <p className="mt-1 text-xs text-[#6b6357]">
                Ranking por quantidade de estudos no período.
              </p>
              <div className="mt-4 space-y-3">
                {visibleSubjects.length > 0 ? (
                  visibleSubjects.map(([name, count]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-3 py-3 text-sm text-[#4b4337]"
                    >
                      <span className="font-semibold text-[#1f1c18]">
                        {name}
                      </span>
                      <span className="text-xs text-[#6b6357]">
                        {count === 1
                          ? "1 estudo realizado"
                          : `${count} estudos realizados`}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-4 py-4 text-sm text-[#6b6357]">
                    Registre estudos para ver o ranking por matéria.
                  </div>
                )}
              </div>
              {sortedSubjects.length > 5 ? (
                <button
                  type="button"
                  className="mt-3 text-xs font-semibold text-[#1f5b4b] underline decoration-[#1f5b4b]/40 underline-offset-4"
                  onClick={() => setShowAllSubjects((prev) => !prev)}
                >
                  {showAllSubjects
                    ? "Mostrar menos matérias"
                    : "Mostrar todas as matérias estudadas"}
                </button>
              ) : null}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-[#1f1c18]">
                Eficiência das revisões
              </h2>
              <div className="mt-4 space-y-3 text-sm text-[#4b4337]">
                <div className="flex items-center justify-between">
                  <span>Taxa de conclusão</span>
                  <span className="font-semibold text-[#1f5b4b]">
                    {completionRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tempo médio por revisão</span>
                  <span className="font-semibold text-[#1f5b4b]">
                    {formatDuration(avgReviewSeconds)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pausa média</span>
                  <span className="font-semibold text-[#1f5b4b]">
                    {formatDuration(
                      completedReviews.length
                        ? Math.round(totalPausedSeconds / completedReviews.length)
                        : 0
                    )}
                  </span>
                </div>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#efe2d1]">
                <div
                  className="h-full rounded-full bg-[#1f5b4b]"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-[#1f1c18]">
                Metas da semana
              </h2>
              <p className="mt-1 text-xs text-[#6b6357]">
                Sugestão inicial para manter consistência.
              </p>
              <div className="mt-4 space-y-4 text-sm text-[#4b4337]">
                <div>
                  <div className="flex items-center justify-between">
                    <span>Estudos</span>
                    <span className="font-semibold text-[#1f5b4b]">
                      {studiesWeek.length}/{weeklyStudyGoal}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#efe2d1]">
                    <div
                      className="h-full rounded-full bg-[#1f5b4b]"
                      style={{
                        width: `${Math.min(
                          100,
                          (studiesWeek.length / weeklyStudyGoal) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span>Tempo de revisão</span>
                    <span className="font-semibold text-[#1f5b4b]">
                      {weeklyMinutes}/{weeklyMinutesGoal} min
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#efe2d1]">
                    <div
                      className="h-full rounded-full bg-[#1f5b4b]"
                      style={{
                        width: `${Math.min(
                          100,
                          (weeklyMinutes / weeklyMinutesGoal) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
