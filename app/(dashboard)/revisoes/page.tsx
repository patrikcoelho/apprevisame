"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
};

const toKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

export default function Revisoes() {
  const supabase = useMemo(() => createClient(), []);
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [showDayPanel, setShowDayPanel] = useState(false);
  const [eventsByDate, setEventsByDate] = useState<Record<string, DayReview[]>>(
    {}
  );
  const todayKey = toKey(today);

  useEffect(() => {
    const loadReviews = async () => {
      const start = new Date(currentYear, currentMonth, 1);
      const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

      const { data } = await supabase
        .from("reviews")
        .select("id,due_at,study:studies(topic,subject:subjects(name))")
        .eq("status", "pendente")
        .gte("due_at", start.toISOString())
        .lte("due_at", end.toISOString());

      const map: Record<string, DayReview[]> = {};
      (data ?? []).forEach((review) => {
        const key = review.due_at
          ? toKey(new Date(review.due_at))
          : toKey(start);
        const subject = review.study?.subject?.name ?? "Matéria";
        const topic = review.study?.topic ?? "Assunto";
        if (!map[key]) {
          map[key] = [];
        }
        map[key].push({ id: review.id, subject, topic });
      });

      setEventsByDate(map);
    };

    loadReviews();
  }, [currentMonth, currentYear, supabase]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startOffset = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const cells: {
      date: Date;
      inMonth: boolean;
    }[] = [];

    for (let i = startOffset; i > 0; i -= 1) {
      cells.push({
        date: new Date(currentYear, currentMonth, 1 - i),
        inMonth: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ date: new Date(currentYear, currentMonth, day), inMonth: true });
    }

    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i += 1) {
      cells.push({
        date: new Date(currentYear, currentMonth + 1, i),
        inMonth: false,
      });
    }

    return cells;
  }, [currentMonth, currentYear]);

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 0) {
        setCurrentYear((year) => year - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 11) {
        setCurrentYear((year) => year + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.35em] text-[#6c5f4f]">
            Revisões
          </p>
          <h1 className="text-2xl font-semibold text-[#1f1c18]">
            Calendário completo de revisões.
          </h1>
          <p className="text-sm text-[#5f574a]">
            Visualize o que já foi feito e o que vem nos próximos dias.
          </p>
        </div>
      </header>

      <section className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className="rounded-md border border-[#e2d6c4] bg-[#f0e6d9] px-3 py-2 text-xs font-semibold text-[#4b4337]"
              onClick={goToToday}
            >
              Hoje
            </button>
            <div className="text-base font-semibold text-[#1f1c18]">
              {monthNames[currentMonth]} de {currentYear}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-[#e2d6c4] bg-[#fdf8f1] px-2 py-2 text-xs font-semibold text-[#4b4337]"
                aria-label="Mês anterior"
                onClick={goToPreviousMonth}
              >
                ◀
              </button>
              <button
                type="button"
                className="rounded-md border border-[#e2d6c4] bg-[#fdf8f1] px-2 py-2 text-xs font-semibold text-[#4b4337]"
                aria-label="Próximo mês"
                onClick={goToNextMonth}
              >
                ▶
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-[#6b6357]">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
              <div key={day} className="px-2 py-1 text-center">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarCells.map((cell) => {
              const key = toKey(cell.date);
              const items = eventsByDate[key] ?? [];
              const isSelected = key === selectedDateKey;
              const isToday =
                cell.inMonth &&
                cell.date.getDate() === today.getDate() &&
                currentMonth === today.getMonth() &&
                currentYear === today.getFullYear();
              const visibleItems = items.slice(0, 1);
              const hasMore = items.length > 1;
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
                  className={`relative h-[92px] overflow-hidden rounded-md border px-2 py-2 pt-6 text-left transition ${
                    cell.inMonth
                      ? "border-[#e2d6c4] bg-white text-[#1f1c18]"
                      : "border-[#efe2d1] bg-[#fdf8f1] text-[#b2a598]"
                  } ${
                    isToday
                      ? "text-[#1f3f35]"
                      : ""
                  } ${
                    !isToday && isSelected
                      ? "border-2 border-[#1f5b4b] bg-[#e9f4ef]"
                      : ""
                  }`}
                >
                  {isToday ? (
                    <span className="absolute right-2 top-2 rounded-full bg-[#1f5b4b] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-white">
                      Hoje
                    </span>
                  ) : null}
                  <div className="absolute left-2 top-2 text-xs font-semibold">
                    {cell.date.getDate()}
                  </div>
                  <div className="mt-2 space-y-1 text-[10px] text-[#4b4337]">
                    {visibleItems.map((item) => (
                      <div
                        key={item.id}
                        className="truncate rounded-md bg-[#e9f4ef] px-2 py-1 font-semibold text-[#1f5b4b]"
                      >
                        {item.subject}
                      </div>
                    ))}
                    {hasMore ? (
                      <button
                        type="button"
                        className="truncate text-[10px] font-semibold text-[#1f5b4b]"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedDateKey(key);
                          setShowDayPanel(true);
                        }}
                      >
                        + ver mais
                      </button>
                    ) : null}
                  </div>
                </button>
              );
            })}
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
        className={`fixed right-0 top-0 z-50 h-screen w-[300px] border-l border-[#e6dbc9] bg-[#fffaf2] transition ${
          showDayPanel ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#6b6357]">
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
              className="rounded-full border border-[#e2d6c4] bg-white p-2 text-[#6b6357] hover:bg-[#f0e6d9]"
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

          <div className="mt-4 space-y-3 text-sm text-[#4b4337]">
            {(selectedDateKey ? eventsByDate[selectedDateKey] : null)?.length ? (
              eventsByDate[selectedDateKey!].map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-3 py-3"
                >
                  <p className="text-xs font-semibold text-[#1f5b4b]">
                    {item.subject}
                  </p>
                  <p className="mt-1 text-xs text-[#6b6357]">
                    {item.topic}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-3 py-3 text-xs text-[#6b6357]">
                Nenhuma revisão agendada para este dia.
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
