"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/app/components/toast-provider";

type Review = {
  id: string;
  subject: string;
  topic: string;
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
  const day = String(date.getDate()).padStart(2, "0");
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

export default function HomeClient({ fullName, initialReviews }: HomeClientProps) {
  const supabase = createClient();
  const { addToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [activeReview, setActiveReview] = useState<Review | null>(null);
  const [modalType, setModalType] = useState<"defer" | "complete" | null>(
    null
  );
  const [showQuestions, setShowQuestions] = useState(false);
  const [questionsTotal, setQuestionsTotal] = useState(0);
  const [questionsCorrect, setQuestionsCorrect] = useState(0);

  const todayIso = toDateKey(new Date());

  const { overdue, todayReviews } = useMemo(() => {
    const overdueList = reviews.filter((review) => review.dueAt < todayIso);
    const todayList = reviews.filter((review) => review.dueAt === todayIso);
    return { overdue: overdueList, todayReviews: todayList };
  }, [reviews, todayIso]);
  const hasOverdue = overdue.length > 0;
  const hasToday = todayReviews.length > 0;
  const hasAnyReviews = hasOverdue || hasToday;

  const openDeferModal = (review: Review) => {
    setActiveReview(review);
    setModalType("defer");
  };

  const openCompleteModal = (review: Review) => {
    setActiveReview(review);
    setModalType("complete");
    setShowQuestions(false);
    setQuestionsTotal(0);
    setQuestionsCorrect(0);
  };

  const closeModal = () => {
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

  const confirmComplete = async () => {
    if (!activeReview) return;
    const { error } = await supabase
      .from("reviews")
      .update({
        status: "concluida",
        completed_at: new Date().toISOString(),
      })
      .eq("id", activeReview.id);

    if (error) {
      addToast({
        variant: "error",
        title: "Não foi possível concluir.",
        description: "Tente novamente em instantes.",
      });
      return;
    }

    setReviews((prev) => prev.filter((review) => review.id !== activeReview.id));
    addToast({
      variant: "success",
      title: "Revisão concluída.",
      description: "Boa, seguimos para a próxima.",
    });
    closeModal();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.35em] text-[#6c5f4f]">
            Revisões do dia
          </p>
          <h1 className="text-2xl font-semibold text-[#1f1c18]">
            Olá{fullName ? `, ${fullName}` : ""}.
          </h1>
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
            <section className="rounded-lg border border-[#f0c6b9] bg-[#fbe7df] p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-[#7c3c31]">
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4"
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
                <span className="text-xs font-semibold text-[#9d4b3b]">
                  {overdue.length} pendentes
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {overdue.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 rounded-md border border-[#f4d6cd] bg-[#fffaf2] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#4b2b24]">
                        {item.subject}
                      </p>
                      <p className="text-xs text-[#7b4a3f]">{item.topic}</p>
                      <p className="mt-2 text-xs text-[#7b4a3f]">
                        Estudado em {formatDate(item.studiedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="min-h-[44px] rounded-md bg-[#1f5b4b] px-4 py-2 text-sm font-semibold text-[#fffaf2]"
                        onClick={() => openCompleteModal(item)}
                      >
                        Realizar revisão
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
                      <p className="text-sm font-semibold text-[#3b332a]">
                        {item.subject}
                      </p>
                      <p className="text-xs text-[#6b6357]">{item.topic}</p>
                      <p className="mt-2 text-xs text-[#6b6357]">
                        Estudado em {formatDate(item.studiedAt)}
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
                        className="min-h-[44px] rounded-md bg-[#1f5b4b] px-4 py-2 text-sm font-semibold text-[#fffaf2]"
                        onClick={() => openCompleteModal(item)}
                      >
                        Realizar revisão
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-[#fffaf2] p-5 shadow-[0_24px_60px_-40px_rgba(31,91,75,0.6)] sm:p-6 max-h-[85vh] overflow-y-auto">
            {modalType === "defer" ? (
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
                <p className="text-sm text-[#5f574a]">
                  Resolveu alguma questão durante a revisão?
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={`min-h-[44px] rounded-md border px-4 py-2 text-sm font-semibold ${
                      showQuestions
                        ? "border-[#1f5b4b] bg-[#e9f4ef] text-[#1f5b4b]"
                        : "border-[#e2d6c4] bg-[#f0e6d9] text-[#4b4337]"
                    }`}
                    onClick={() => setShowQuestions(true)}
                  >
                    Sim
                  </button>
                  <button
                    className={`min-h-[44px] rounded-md border px-4 py-2 text-sm font-semibold ${
                      !showQuestions
                        ? "border-[#1f5b4b] bg-[#e9f4ef] text-[#1f5b4b]"
                        : "border-[#e2d6c4] bg-[#f0e6d9] text-[#4b4337]"
                    }`}
                    onClick={() => setShowQuestions(false)}
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
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    className="min-h-[44px] rounded-md bg-[#1f5b4b] px-4 py-2 text-sm font-semibold text-[#fffaf2]"
                    onClick={confirmComplete}
                  >
                    Concluir revisão
                  </button>
                  <button
                    className="min-h-[44px] rounded-md border border-[#e1e1e1] bg-[#f3f3f3] px-4 py-2 text-sm font-semibold text-[#6b6357]"
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
