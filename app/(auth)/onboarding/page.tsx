"use client";

import { useEffect, useState } from "react";
import { Smile } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/app/components/toast-provider";

type TemplateItem = {
  id: string;
  title: string;
  cadence: string;
  desc: string;
};

type SubjectRow = {
  id: string;
  name: string;
};

type TemplateRow = {
  id: string;
  name: string;
  cadence_days: number[];
};

const bestTimeOptions = ["Manhã", "Tarde", "Noite"] as const;

type BestTime = (typeof bestTimeOptions)[number];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("Aprovar na próxima prova");
  const [bestTime, setBestTime] = useState<BestTime>("Noite");
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubject, setCustomSubject] = useState("");
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [dailyTime, setDailyTime] = useState("19:00");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const checkCompletion = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (!name && user.user_metadata?.full_name) {
        setName(user.user_metadata.full_name);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name,active_template_id")
        .eq("id", user.id)
        .maybeSingle();

      const { data: subjectLinks } = await supabase
        .from("user_subjects")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (profile?.full_name && profile.active_template_id && subjectLinks?.length) {
        router.replace("/");
      }
    };

    checkCompletion();
  }, [name, router, supabase]);

  useEffect(() => {
    const loadDefaults = async () => {
      const { data: subjectsData } = await supabase
        .from("subjects")
        .select("id,name")
        .eq("is_default", true)
        .order("name", { ascending: true });

      const subjectNames =
        (subjectsData as SubjectRow[] | null)
          ?.map((item: SubjectRow) => item.name)
          .filter(Boolean) ?? [];
      setAvailableSubjects(subjectNames);
      if (subjectNames.length > 0) {
        setSelectedSubjects(subjectNames.slice(0, 2));
      }

      const { data: templatesData } = await supabase
        .from("templates")
        .select("id,name,cadence_days")
        .eq("is_default", true)
        .order("created_at", { ascending: true });

      const mappedTemplates =
        (templatesData as TemplateRow[] | null)?.map((item: TemplateRow) => ({
          id: item.id,
          title: item.name,
          cadence: item.cadence_days.map((day: number) => `${day}d`).join(", "),
          desc: "Template predefinido do sistema.",
        })) ?? [];

      setTemplates(mappedTemplates);
      if (mappedTemplates.length > 0) {
        setSelectedTemplate(mappedTemplates[0].title);
      }
    };

    loadDefaults();
  }, [supabase]);

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((item) => item !== subject)
        : [...prev, subject]
    );
  };

  const handleFinish = async () => {
    setSaving(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      setMessage("Você precisa estar autenticado para concluir.");
      addToast({
        variant: "error",
        title: "Você precisa estar autenticado.",
        description: "Faça login para finalizar o onboarding.",
      });
      return;
    }

    const { data: templatesData } = await supabase
      .from("templates")
      .select("id,name")
      .eq("name", selectedTemplate)
      .limit(1);

    const activeTemplateId = templatesData?.[0]?.id ?? null;

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: name,
      objective,
      best_time: bestTime,
      plan: "Gratuito",
      active_template_id: activeTemplateId,
    });

    if (profileError) {
      setSaving(false);
      setMessage("Não foi possível salvar seu perfil.");
      addToast({
        variant: "error",
        title: "Não foi possível salvar o perfil.",
        description: "Tente novamente em instantes.",
      });
      return;
    }

    const { data: subjectsData } = await supabase
      .from("subjects")
      .select("id,name,is_default");

    const subjectMap = new Map(
      ((subjectsData as SubjectRow[] | null) ?? []).map((subject: SubjectRow) => [
        subject.name,
        subject,
      ])
    );

    const selected = Array.from(new Set(selectedSubjects));
    const subjectIds: string[] = [];

    for (const subjectName of selected) {
      const existing = subjectMap.get(subjectName);
      if (existing) {
        subjectIds.push(existing.id);
        continue;
      }

      const { data: createdSubject, error: createError } = await supabase
        .from("subjects")
        .insert({
          name: subjectName,
          is_default: false,
          owner_user_id: user.id,
        })
        .select("id")
        .single();

      if (createError || !createdSubject) {
        continue;
      }
      subjectIds.push(createdSubject.id);
    }

    if (subjectIds.length > 0) {
      const { error: linkError } = await supabase.from("user_subjects").insert(
        subjectIds.map((subjectId) => ({
          user_id: user.id,
          subject_id: subjectId,
        }))
      );

      if (linkError) {
        setSaving(false);
        setMessage("Não foi possível vincular as matérias.");
        addToast({
          variant: "error",
          title: "Não foi possível vincular as matérias.",
          description: "Tente novamente em instantes.",
        });
        return;
      }
    }

    setSaving(false);
    addToast({
      variant: "success",
      title: "Onboarding concluído.",
      description: "Seu painel já está pronto.",
    });
    router.push("/");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--text-muted)]">
          Onboarding
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">
          Configure sua conta inicial.
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Em poucos passos você já começa com o painel pronto.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-3 text-xs font-semibold uppercase text-[var(--text-muted)]">
        <span>Etapa {step} de 3</span>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((item) => (
            <span
              key={item}
              className={`h-2 w-10 rounded-full ${
                step >= item ? "bg-[var(--accent-bg)]" : "bg-[var(--surface-muted)]"
              }`}
            />
          ))}
        </div>
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)]">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border-soft)] bg-[var(--surface-white)] px-3 text-base text-[var(--text-strong)]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)]">
              Objetivo principal
            </label>
            <input
              type="text"
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border-soft)] bg-[var(--surface-white)] px-3 text-base text-[var(--text-strong)]"
              placeholder="Ex: Aprovação na próxima prova"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)]">
              Melhor horário para estudar
            </label>
            <select
              className="mt-2 h-11 w-full rounded-md border border-[var(--border-soft)] bg-[var(--surface-white)] px-3 text-base text-[var(--text-strong)]"
              value={bestTime}
              onChange={(event) =>
                setBestTime(event.target.value as BestTime)
              }
            >
              {bestTimeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text-strong)]">
              Matérias recomendadas para começar
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Selecione as matérias que deseja acompanhar.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {availableSubjects.length === 0 ? (
              <div className="flex flex-col gap-3 rounded-md border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-3 text-xs text-[var(--text-muted)]">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-medium)]">
                    <Smile className="h-3 w-3" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-semibold text-[var(--text-medium)]">
                      Nenhuma matéria padrão encontrada.
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Você pode cadastrar matérias personalizadas.
                    </p>
                  </div>
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  Passos: avance e adicione suas próprias matérias.
                </div>
              </div>
            ) : (
              availableSubjects.map((subject) => {
                const selected = selectedSubjects.includes(subject);
                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => toggleSubject(subject)}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs font-semibold ${
                      selected
                        ? "border-[var(--accent-border)] bg-[var(--surface-success)] text-[var(--accent)]"
                        : "border-[var(--border-soft)] bg-[var(--surface-white)] text-[var(--text-medium)]"
                    }`}
                  >
                    <span>{subject}</span>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        selected ? "bg-[var(--accent-bg)]" : "bg-[var(--surface-muted)]"
                      }`}
                    />
                  </button>
                );
              })
            )}
          </div>
          <div className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-4">
            <label className="text-xs font-semibold text-[var(--text-muted)]">
              Adicionar matéria personalizada
            </label>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={customSubject}
                onChange={(event) => setCustomSubject(event.target.value)}
                className="h-11 w-full rounded-md border border-[var(--border-soft)] bg-[var(--surface-white)] px-3 text-base text-[var(--text-strong)]"
                placeholder="Ex: Direito Tributário"
              />
              <button
                type="button"
                className="rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-3 text-xs font-semibold text-[var(--text-medium)]"
                onClick={() => {
                  const trimmed = customSubject.trim();
                  if (!trimmed) return;
                  if (selectedSubjects.includes(trimmed)) return;
                  setSelectedSubjects((prev) => [...prev, trimmed]);
                  setCustomSubject("");
                }}
              >
                Adicionar
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Você pode cadastrar novas matérias mais tarde no painel.
            </p>
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-[var(--accent)]"
            onClick={() => setStep(3)}
          >
            Pular e ajustar depois
          </button>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text-strong)]">
              Escolha o template de revisão
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Você pode trocar o template nas configurações.
            </p>
          </div>
          <div className="grid gap-3">
            {templates.length === 0 ? (
              <div className="flex flex-col gap-3 rounded-md border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 text-xs text-[var(--text-muted)]">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-medium)]">
                    <Smile className="h-3 w-3" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-semibold text-[var(--text-medium)]">
                      Nenhum template disponível.
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Crie um template para organizar suas revisões.
                    </p>
                  </div>
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  Passos: avance e cadastre seu primeiro template.
                </div>
              </div>
            ) : (
              templates.map((template) => {
                const isActive = template.title === selectedTemplate;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplate(template.title)}
                    className={`rounded-md border px-4 py-3 text-left ${
                      isActive
                        ? "border-2 border-[var(--accent-border)] bg-[var(--surface-success)]"
                        : "border-[var(--border-soft)] bg-[var(--surface-white)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[var(--text-strong)]">
                        {template.title}
                      </p>
                      {isActive ? (
                        <span className="rounded-full bg-[var(--accent-bg)] px-2 py-1 text-[10px] uppercase text-[var(--text-white)]">
                          Selecionado
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[var(--accent)]">
                      {template.cadence}
                    </p>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      {template.desc}
                    </p>
                  </button>
                );
              })
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)]">
              Horário do lembrete diário
            </label>
            <input
              type="time"
              value={dailyTime}
              onChange={(event) => setDailyTime(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border-soft)] bg-[var(--surface-white)] px-3 text-base text-[var(--text-strong)]"
            />
          </div>
          <div className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-3 text-xs text-[var(--text-muted)]">
            <p className="font-semibold text-[var(--text-medium)]">Resumo final</p>
            <p className="mt-1">
              {selectedSubjects.length} matérias · Template {selectedTemplate}
            </p>
            <p className="mt-1">Lembrete diário às {dailyTime}.</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2 text-xs font-semibold text-[var(--text-medium)]"
          onClick={() => setStep((prev) => Math.max(1, prev - 1))}
          disabled={step === 1}
        >
          Voltar
        </button>
        {step < 3 ? (
          <button
            type="button"
            className="min-h-[44px] rounded-md bg-[var(--accent-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-on-accent)]"
            onClick={() => setStep((prev) => Math.min(3, prev + 1))}
          >
            Continuar
          </button>
        ) : (
          <button
            type="button"
            className="min-h-[44px] rounded-md bg-[var(--accent-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-on-accent)] disabled:cursor-not-allowed disabled:bg-[var(--accent-disabled)]"
            onClick={handleFinish}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Concluir e ir para o painel"}
          </button>
        )}
      </div>

      {message ? (
        <div className="rounded-md border border-[var(--border-warm)] bg-[var(--surface-warm)] px-4 py-3 text-xs text-[var(--accent-warm)]">
          {message}
        </div>
      ) : null}
    </div>
  );
}
