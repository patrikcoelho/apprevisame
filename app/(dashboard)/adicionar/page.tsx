"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/app/components/toast-provider";

type StudyType = "Concurso" | "Faculdade";

type SubjectOption = {
  id: string;
  label: string;
};

export default function Adicionar() {
  const supabase = createClient();
  const { addToast } = useToast();
  const [studyType, setStudyType] = useState<StudyType>("Concurso");
  const [cadenceDays, setCadenceDays] = useState<number[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [subjectOpen, setSubjectOpen] = useState(false);
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
        .select("study_type,active_template_id")
        .eq("id", user.id)
        .maybeSingle();

      const profileType = (profile?.study_type as StudyType) ?? "Concurso";
      setStudyType(profileType);

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
        .select("subject:subjects(id,name,study_type)")
        .eq("user_id", user.id);

      type LinkedSubject = {
        subject: { id: string; name: string; study_type: StudyType } | null;
      };

      const mapped =
        (linkedSubjects as LinkedSubject[] | null)
          ?.map((item: LinkedSubject) => item.subject)
          .filter((subject): subject is { id: string; name: string } =>
            Boolean(subject)
          )
          .filter((subject) => subject.study_type === profileType)
          .map((subject) => ({
            id: subject.id,
            label: subject.name,
          })) ?? [];

      setSubjects(mapped);
      if (mapped.length > 0) {
        const exists = mapped.some((item) => item.id === subjectId);
        if (!subjectId || !exists) {
          setSubjectId(mapped[0].id);
        }
      } else {
        setSubjectId("");
      }
    },
    [supabase, subjectId]
  );

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

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
    if (hasQuestions && (questionsTotal <= 0 || questionsCorrect < 0)) {
      return false;
    }
    if (hasQuestions && questionsCorrect > questionsTotal) {
      return false;
    }
    return true;
  }, [subjectId, topic, hasQuestions, questionsTotal, questionsCorrect]);

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
    setSaving(false);
    setMessage("Estudo salvo e revisões criadas.");
    addToast({
      variant: "success",
      title: "Estudo salvo.",
      description: "Revisões geradas automaticamente.",
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-[#1f1c18]">
            Adicionar estudo
          </h1>
          <p className="text-sm text-[#5f574a]">
            Matéria, assunto e data são obrigatórios. A data e a hora são
            registradas automaticamente.
          </p>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4 rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-4 sm:p-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-[#6b6357]">
                Matéria
              </label>
              <div className="relative w-full">
                <button
                  type="button"
                  className="flex h-11 w-full items-center justify-between rounded-md border border-[#e2d6c4] bg-white px-3 text-base text-[#1f1c18]"
                  onClick={() => setSubjectOpen((prev) => !prev)}
                >
                  <span>
                    {selectedSubject?.label ?? "Selecione uma matéria"}
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
                {subjectOpen ? (
                  <div className="absolute z-20 mt-2 w-full rounded-md border border-[#e2d6c4] bg-white shadow-[0_18px_40px_-26px_rgba(31,91,75,0.6)]">
                    <div className="max-h-56 overflow-auto py-1">
                      {subjects.length === 0 ? (
                        <div className="flex flex-col gap-2 px-3 py-3 text-sm text-[#6b6357] bg-[#fbf7f2]">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#e2d6c4] bg-[#fdf8f1] text-[#4b4337]">
                              <svg
                                aria-hidden="true"
                                className="h-3 w-3"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <circle cx="12" cy="12" r="9" />
                                <path
                                  d="M9 10h.01M15 10h.01"
                                  strokeLinecap="round"
                                />
                                <path
                                  d="M16 16c-1-1-3-1-4-1s-3 0-4 1"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                            <div>
                              <p className="font-semibold text-[#4b4337]">
                                Nenhuma matéria cadastrada.
                              </p>
                              <p className="text-xs text-[#6b6357]">
                                Cadastre uma matéria para continuar.
                              </p>
                            </div>
                          </div>
                          <div className="text-xs text-[#6b6357]">
                            Passos: use “Adicionar matéria” e selecione o seu
                            objetivo.
                          </div>
                        </div>
                      ) : (
                        subjects.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-base text-[#1f1c18] hover:bg-[#f6efe4]"
                            onClick={() => {
                              setSubjectId(item.id);
                              setSubjectOpen(false);
                            }}
                          >
                            {item.label}
                          </button>
                        ))
                      )}
                      <div className="border-t border-[#e6dbc9] px-2 py-2">
                        <button
                          type="button"
                          className="flex w-full items-center justify-center rounded-md border border-[#1f5b4b] bg-[#e9f4ef] px-3 py-2 text-xs font-semibold text-[#1f5b4b]"
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
              <label className="text-xs font-semibold uppercase text-[#6b6357]">
                Assunto
              </label>
              <input
                type="text"
                className="h-11 w-full rounded-md border border-[#e2d6c4] bg-white px-3 text-base text-[#1f1c18]"
                placeholder="Ex: Funções e gráficos"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-[#6b6357]">
              Observações (opcional)
            </label>
            <textarea
              className="min-h-[96px] w-full rounded-md border border-[#e2d6c4] bg-white px-3 py-2 text-base text-[#1f1c18]"
              placeholder="Alguma observação sobre o estudo"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <div className="space-y-3 border-t border-[#e6dbc9] pt-4">
            <p className="text-xs font-semibold uppercase text-[#6b6357]">
              Você resolveu questões durante esse estudo?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className={`min-h-[44px] rounded-md border px-4 py-2 text-sm font-semibold ${
                  hasQuestions
                    ? "border-[#1f5b4b] bg-[#e9f4ef] text-[#1f5b4b]"
                    : "border-[#e2d6c4] bg-[#f0e6d9] text-[#4b4337]"
                }`}
                onClick={() => setHasQuestions(true)}
              >
                Sim
              </button>
              <button
                type="button"
                className={`min-h-[44px] rounded-md border px-4 py-2 text-sm font-semibold ${
                  !hasQuestions
                    ? "border-[#1f5b4b] bg-[#e9f4ef] text-[#1f5b4b]"
                    : "border-[#e2d6c4] bg-[#f0e6d9] text-[#4b4337]"
                }`}
                onClick={() => setHasQuestions(false)}
              >
                Não
              </button>
            </div>
            {hasQuestions ? (
              <div className="grid gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#4b4337]">
                    Quantas questões
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="h-11 w-full rounded-md border border-[#e2d6c4] bg-white px-3 text-base text-[#1f1c18]"
                    value={questionsTotal}
                    onChange={(event) =>
                      setQuestionsTotal(Number(event.target.value))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#4b4337]">
                    Quantas corretas
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="h-11 w-full rounded-md border border-[#e2d6c4] bg-white px-3 text-base text-[#1f1c18]"
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
            className="min-h-[48px] w-full rounded-md bg-[#1f5b4b] px-5 py-3 text-sm font-semibold text-[#fffaf2] disabled:cursor-not-allowed disabled:bg-[#9fbfb5]"
            disabled={!isValid || saving}
            onClick={handleSaveStudy}
          >
            {saving ? "Salvando..." : "Salvar estudo e gerar revisões"}
          </button>
          {message ? (
            <div className="rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-4 py-3 text-xs text-[#6b6357]">
              {message}
            </div>
          ) : null}
        </div>

        <aside className="space-y-4 rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-4 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase text-[#6b6357]">
              Prévia de revisões
            </p>
            <div className="mt-2 flex items-center gap-2">
              <svg
                aria-hidden="true"
                className="h-5 w-5 text-[#1f5b4b]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <rect x="4" y="5" width="16" height="14" rx="2" />
                <path d="M8 3v4M16 3v4" strokeLinecap="round" />
              </svg>
              <h2 className="text-xl font-semibold text-[#1f1c18]">
                Assim ficará seu calendário.
              </h2>
            </div>
            <p className="mt-2 text-sm text-[#5f574a]">
              Baseado no template atual e na data de hoje.
            </p>
          </div>
          {subjectId && topic.trim() ? (
            previewItems.length > 0 ? (
              <div className="space-y-3">
                {previewItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-4 py-3 text-sm text-[#4b4337]"
                  >
                    <p className="font-semibold text-[#1f1c18]">{item.label}</p>
                    <p className="text-xs text-[#6b6357]">{item.when}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-4 py-4 text-sm text-[#6b6357]">
                Defina um template em Configurações para ver a prévia.
              </div>
            )
          ) : (
            <div className="rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-4 py-4 text-sm text-[#6b6357]">
              Preencha Matéria e Assunto para visualizar a prévia das revisões.
            </div>
          )}
          <div className="rounded-md border border-[#d8eadf] bg-[#e9f4ef] px-4 py-3 text-xs text-[#2f5d4e]">
            Templates podem ser ajustados em Configurações.
          </div>
        </aside>
      </section>

      {showAddSubject ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-[#fffaf2] p-5 shadow-[0_24px_60px_-40px_rgba(31,91,75,0.6)] sm:p-6 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-[#1f1c18]">
              Adicionar matéria
            </h3>
            <p className="mt-2 text-sm text-[#5f574a]">
              A matéria será cadastrada para o tipo de estudo atual.
            </p>
            <div className="mt-4 space-y-2">
              <label className="text-xs font-semibold uppercase text-[#6b6357]">
                Nome da matéria
              </label>
              <input
                type="text"
                className="h-11 w-full max-w-md rounded-md border border-[#e2d6c4] bg-white px-3 text-base text-[#1f1c18]"
                placeholder="Ex: Finanças"
                value={newSubject}
                onChange={(event) => setNewSubject(event.target.value)}
              />
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="min-h-[44px] rounded-md border border-[#e2d6c4] bg-[#f0e6d9] px-4 py-2 text-sm font-semibold text-[#4b4337]"
                onClick={() => {
                  setNewSubject("");
                  setShowAddSubject(false);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="min-h-[44px] rounded-md bg-[#1f5b4b] px-4 py-2 text-sm font-semibold text-[#fffaf2] disabled:cursor-not-allowed disabled:bg-[#9fbfb5]"
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
                      study_type: studyType,
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
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
