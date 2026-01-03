"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown, Smile } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/app/components/toast-provider";

type SubjectOption = {
  id: string;
  label: string;
};

const isNonNullable = <T,>(value: T | null | undefined): value is T =>
  value != null;

export default function Adicionar() {
  const supabase = createClient();
  const { addToast } = useToast();
  const [cadenceDays, setCadenceDays] = useState<number[]>([]);
  const todayIso = useMemo(
    () => new Date().toISOString().split("T")[0],
    []
  );
  const [studyDate, setStudyDate] = useState(todayIso);
  const [subjectId, setSubjectId] = useState("");
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const subjectDropdownRef = useRef<HTMLDivElement | null>(null);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [hasQuestions, setHasQuestions] = useState(false);
  const [questionsTotal, setQuestionsTotal] = useState(0);
  const [questionsCorrect, setQuestionsCorrect] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadSubjects = useCallback(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("active_template_id")
        .eq("id", user.id)
        .maybeSingle();

      const { data: templateData } = await supabase
        .from("templates")
        .select("cadence_days")
        .eq("id", profile?.active_template_id ?? "")
        .maybeSingle();

      if (templateData?.cadence_days?.length) {
        setCadenceDays(templateData.cadence_days);
      } else {
        const { data: defaultTemplate } = await supabase
          .from("templates")
          .select("cadence_days")
          .eq("is_default", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        setCadenceDays(defaultTemplate?.cadence_days ?? []);
      }

      const { data: linkedSubjects } = await supabase
        .from("user_subjects")
        .select("subject:subjects(id,name)")
        .eq("user_id", user.id);

      type LinkedSubject = {
        subject: { id: string; name: string } | null;
      };

      const mapped =
        (linkedSubjects as LinkedSubject[] | null)
          ?.map((item: LinkedSubject) => item.subject)
          .filter(isNonNullable)
          .map((subject) => ({
            id: subject.id,
            label: subject.name,
          })) ?? [];

      setSubjects(mapped);
      if (mapped.length > 0) {
        const exists = mapped.some((item) => item.id === subjectId);
        if (!exists) {
          setSubjectId("");
        }
      } else {
        setSubjectId("");
      }
    },
    [supabase, subjectId]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSubjects();
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadSubjects]);

  useEffect(() => {
    if (!subjectOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!subjectDropdownRef.current) return;
      if (!subjectDropdownRef.current.contains(event.target as Node)) {
        setSubjectOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [subjectOpen]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      loadSubjects();
    };
    window.addEventListener("revisame:profile-updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("revisame:profile-updated", handleProfileUpdate);
    };
  }, [loadSubjects]);

  const selectedSubject = useMemo(
    () => subjects.find((item) => item.id === subjectId),
    [subjects, subjectId]
  );

  const isValid = useMemo(() => {
    if (!subjectId || !topic.trim()) return false;
    if (!studyDate) return false;
    if (studyDate > todayIso) return false;
    if (hasQuestions && (questionsTotal <= 0 || questionsCorrect < 0)) {
      return false;
    }
    if (hasQuestions && questionsCorrect > questionsTotal) {
      return false;
    }
    return true;
  }, [
    subjectId,
    topic,
    hasQuestions,
    questionsTotal,
    questionsCorrect,
    studyDate,
    todayIso,
  ]);

  const previewItems = useMemo(() => {
    if (!cadenceDays.length) return [];
    return cadenceDays.map((days, index) => ({
      label: `Revisão ${index + 1}`,
      when: days === 1 ? "Amanhã" : `Em ${days} dias`,
    }));
  }, [cadenceDays]);

  const handleSaveStudy = async () => {
    if (!isValid) return;
    setSaving(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setMessage("Você precisa estar autenticado.");
      addToast({
        variant: "error",
        title: "Você precisa estar autenticado.",
        description: "Faça login para registrar um estudo.",
      });
      return;
    }

    const { data: study, error } = await supabase
      .from("studies")
      .insert({
        user_id: user.id,
        subject_id: subjectId,
        topic,
        studied_at: new Date(`${studyDate}T00:00:00`).toISOString(),
        notes: notes.trim() ? notes.trim() : null,
        questions_total: hasQuestions ? questionsTotal : null,
        questions_correct: hasQuestions ? questionsCorrect : null,
      })
      .select("id,studied_at")
      .single();

    if (error || !study) {
      setSaving(false);
      setMessage("Não foi possível salvar o estudo.");
      addToast({
        variant: "error",
        title: "Não foi possível salvar o estudo.",
        description: "Tente novamente em instantes.",
      });
      return;
    }

    const studiedAt = new Date(study.studied_at ?? new Date().toISOString());
    const reviewsPayload = (cadenceDays.length ? cadenceDays : [1, 7, 15]).map(
      (days) => {
        const dueDate = new Date(studiedAt);
        dueDate.setDate(dueDate.getDate() + days);
        return {
          user_id: user.id,
          study_id: study.id,
          due_at: dueDate.toISOString(),
          status: "pendente",
        };
      }
    );

    const { error: reviewError } = await supabase
      .from("reviews")
      .insert(reviewsPayload);

    if (reviewError) {
      setSaving(false);
      setMessage("O estudo foi salvo, mas as revisões falharam.");
      addToast({
        variant: "error",
        title: "Revisões não foram criadas.",
        description: "O estudo foi salvo, mas as revisões falharam.",
      });
      return;
    }

    setTopic("");
    setNotes("");
    setHasQuestions(false);
    setQuestionsTotal(0);
    setQuestionsCorrect(0);
    setStudyDate(todayIso);
    setSubjectId("");
    setSaving(false);
    setMessage("Estudo salvo e revisões criadas.");
    addToast({
      variant: "success",
      title: "Estudo salvo.",
      description: "Revisões geradas automaticamente.",
    });
  };

  return (
    <div className="page-stack">
      <header className="flex flex-col gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-[var(--text-strong)]">
            Adicionar estudo
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Cadastre um novo estudo e as revisões serão agendadas
            automaticamente.
          </p>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                Data do estudo
              </label>
              <input
                type="date"
                className="h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface-white)] px-3 text-base text-[var(--text-strong)]"
                value={studyDate}
                max={todayIso}
                onChange={(event) => setStudyDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                Matéria
              </label>
              <div className="relative w-full" ref={subjectDropdownRef}>
                <button
                  type="button"
                  className="flex h-11 w-full items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-white)] px-3 text-base text-[var(--text-strong)]"
                  onClick={() => setSubjectOpen((prev) => !prev)}
                >
                  <span>
                    {selectedSubject?.label ?? "Selecione uma matéria"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
                </button>
                {subjectOpen ? (
                  <div className="absolute z-20 mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface-white)] shadow-[var(--shadow-accent-pop)]">
                    <div className="max-h-56 overflow-auto py-1">
                      {subjects.length === 0 ? (
                        <div className="flex flex-col gap-2 px-3 py-3 text-sm text-[var(--text-muted)] bg-[var(--surface-soft)]">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-medium)]">
                              <Smile className="h-3 w-3" aria-hidden="true" />
                            </span>
                            <div>
                              <p className="font-semibold text-[var(--text-medium)]">
                                Nenhuma matéria cadastrada.
                              </p>
                              <p className="text-xs text-[var(--text-muted)]">
                                Cadastre uma matéria para continuar.
                              </p>
                            </div>
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">
                            Passos: use “Adicionar matéria” e selecione o seu
                            objetivo.
                          </div>
                        </div>
                      ) : (
                        subjects.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-base text-[var(--text-strong)] hover:bg-[var(--surface-hover)]"
                            onClick={() => {
                              setSubjectId(item.id);
                              setSubjectOpen(false);
                            }}
                          >
                            {item.label}
                          </button>
                        ))
                      )}
                      <div className="border-t border-[var(--border)] px-2 py-2">
                        <button
                          type="button"
                          className="flex w-full items-center justify-center rounded-md border border-[var(--accent-border)] bg-[var(--surface-success)] px-3 py-2 text-xs font-semibold text-[var(--accent)]"
                          onClick={() => {
                            setSubjectOpen(false);
                            setShowAddSubject(true);
                          }}
                        >
                        + Adicionar nova matéria
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                Assunto
              </label>
              <input
                type="text"
                className="h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface-white)] px-3 text-base text-[var(--text-strong)]"
                placeholder="Ex: Funções e gráficos"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-[var(--text-muted)]">
              Observações (opcional)
            </label>
            <textarea
              className="min-h-[96px] w-full rounded-md border border-[var(--border)] bg-[var(--surface-white)] px-3 py-2 text-base text-[var(--text-strong)]"
              placeholder="Alguma observação sobre o estudo"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <div className="space-y-3 border-t border-[var(--border)] pt-4">
            <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">
              Você resolveu questões durante esse estudo?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className={`min-h-[44px] rounded-md border px-4 py-2 text-sm font-semibold ${
                  !hasQuestions
                    ? "border-[var(--accent-border)] bg-[var(--surface-success)] text-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--text-medium)]"
                }`}
                onClick={() => setHasQuestions(false)}
              >
                Não
              </button>
              <button
                type="button"
                className={`min-h-[44px] rounded-md border px-4 py-2 text-sm font-semibold ${
                  hasQuestions
                    ? "border-[var(--accent-border)] bg-[var(--surface-success)] text-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--text-medium)]"
                }`}
                onClick={() => setHasQuestions(true)}
              >
                Sim
              </button>
            </div>
            {hasQuestions ? (
              <div className="grid gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-medium)]">
                    Quantas questões
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface-white)] px-3 text-base text-[var(--text-strong)]"
                    value={questionsTotal}
                    onChange={(event) =>
                      setQuestionsTotal(Number(event.target.value))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-medium)]">
                    Quantas corretas
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface-white)] px-3 text-base text-[var(--text-strong)]"
                    value={questionsCorrect}
                    onChange={(event) =>
                      setQuestionsCorrect(Number(event.target.value))
                    }
                  />
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className="min-h-[48px] w-full rounded-md bg-[var(--accent-bg)] px-5 py-3 text-sm font-semibold text-[var(--text-on-accent)] disabled:cursor-not-allowed disabled:bg-[var(--accent-disabled)]"
            disabled={!isValid || saving}
            onClick={handleSaveStudy}
          >
            {saving ? "Salvando..." : "Salvar estudo e gerar revisões"}
          </button>
          {message ? (
            <div className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-3 text-xs text-[var(--text-muted)]">
              {message}
            </div>
          ) : null}
        </div>

        <aside className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">
              Prévia de revisões
            </p>
            <div className="mt-2 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
              <h2 className="text-xl font-semibold text-[var(--text-strong)]">
                Assim ficarão suas revisões para esse assunto.
              </h2>
            </div>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Baseado no template atual e na data do estudo.
            </p>
          </div>
          {subjectId && topic.trim() ? (
            previewItems.length > 0 ? (
              <div className="space-y-3">
                {previewItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-medium)]"
                  >
                    <p className="font-semibold text-[var(--text-strong)]">{item.label}</p>
                    <p className="text-xs text-[var(--text-muted)]">{item.when}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-4 text-sm text-[var(--text-muted)]">
                Defina um template em Configurações para ver a prévia.
              </div>
            )
          ) : (
            <div className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-4 text-sm text-[var(--text-muted)]">
              Preencha Matéria e Assunto para visualizar a prévia das revisões.
            </div>
          )}
          <div className="rounded-md border border-[var(--border-success-strong)] bg-[var(--surface-success)] px-4 py-3 text-xs text-[var(--accent)]">
            Templates podem ser ajustados em{" "}
            <Link href="/configuracoes" className="font-semibold underline">
              Configurações
            </Link>
            .
          </div>
        </aside>
      </section>

      {showAddSubject ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4">
        <div className="w-full max-w-md rounded-lg bg-[var(--surface)] p-5 modal-shadow sm:p-6 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-[var(--text-strong)]">
              Adicionar matéria
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              A matéria será cadastrada para o tipo de estudo atual.
            </p>
            <div className="mt-4 space-y-2">
              <label className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                Nome da matéria
              </label>
              <input
                type="text"
                className="h-11 w-full max-w-md rounded-md border border-[var(--border)] bg-[var(--surface-white)] px-3 text-base text-[var(--text-strong)]"
                placeholder="Ex: Finanças"
                value={newSubject}
                onChange={(event) => setNewSubject(event.target.value)}
              />
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="min-h-[44px] rounded-md bg-[var(--accent-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-on-accent)] disabled:cursor-not-allowed disabled:bg-[var(--accent-disabled)]"
                disabled={!newSubject.trim()}
                onClick={async () => {
                  const trimmed = newSubject.trim();
                  if (!trimmed) return;
                  const {
                    data: { user },
                  } = await supabase.auth.getUser();
                  if (!user) {
                    addToast({
                      variant: "error",
                      title: "Você precisa estar autenticado.",
                      description: "Faça login para cadastrar matérias.",
                    });
                    return;
                  }

                  const { data: createdSubject, error } = await supabase
                    .from("subjects")
                    .insert({
                      name: trimmed,
                      is_default: false,
                      owner_user_id: user.id,
                    })
                    .select("id,name")
                    .single();

                  if (error || !createdSubject) {
                    addToast({
                      variant: "error",
                      title: "Não foi possível cadastrar a matéria.",
                      description: "Tente novamente em instantes.",
                    });
                    return;
                  }

                  const { error: linkError } = await supabase
                    .from("user_subjects")
                    .insert({
                      user_id: user.id,
                      subject_id: createdSubject.id,
                    });

                  if (linkError) {
                    addToast({
                      variant: "error",
                      title: "Matéria criada, mas não vinculada.",
                      description: "Tente salvar novamente.",
                    });
                    return;
                  }

                  addToast({
                    variant: "success",
                    title: "Matéria cadastrada.",
                    description: "Já está disponível para novos estudos.",
                  });

                  const created = {
                    id: createdSubject.id,
                    label: createdSubject.name,
                  };
                  setSubjects((prev) => [...prev, created]);
                  setSubjectId(createdSubject.id);
                  setNewSubject("");
                  setShowAddSubject(false);
                }}
              >
                Salvar matéria
              </button>
              <button
                type="button"
                className="min-h-[44px] rounded-md border border-[var(--border-neutral)] bg-[var(--surface-neutral)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)]"
                onClick={() => {
                  setNewSubject("");
                  setShowAddSubject(false);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
