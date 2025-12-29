"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SubjectItem = {
  id: string;
  label: string;
  type: "Concurso" | "Faculdade";
  isDefault: boolean;
};

type TemplateItem = {
  id: string;
  title: string;
  cadence: string;
  detail: string;
  source: "Padrão" | "Personalizado";
  steps: number[];
};

type ProfileRow = {
  full_name?: string | null;
  study_type?: "Concurso" | "Faculdade" | null;
  plan?: string | null;
  active_template_id?: string | null;
  theme?: string | null;
  language?: string | null;
  date_format?: string | null;
  notify_email?: boolean | null;
  notify_app?: boolean | null;
  notify_daily?: boolean | null;
  notify_daily_time?: string | null;
  notify_weekly?: boolean | null;
  notify_weekly_day?: string | null;
  notify_weekly_time?: string | null;
  notify_overdue_top?: boolean | null;
  notify_priority?: string | null;
};

type SubjectLinkRow = {
  subject: {
    id: string;
    name: string;
    study_type: "Concurso" | "Faculdade";
    is_default: boolean;
  } | null;
};

type TemplateRow = {
  id: string;
  name: string;
  cadence_days: number[];
  is_default: boolean;
  owner_user_id: string | null;
};

const prefModeOptions = ["Não definido", "Claro", "Escuro"] as const;
const prefLanguageOptions = [
  "Não definido",
  "Português (BR)",
  "English (US)",
] as const;
const prefDateFormatOptions = [
  "Não definido",
  "DD/MM/AAAA",
  "MM/DD/AAAA",
  "AAAA-MM-DD",
] as const;
const notifyWeeklyDayOptions = [
  "Segunda",
  "Quarta",
  "Sexta",
  "Domingo",
] as const;
const notifyPriorityOptions = ["Baixo", "Médio", "Alto"] as const;
const materiaFilterOptions = ["Todas", "Ativas", "Inativas"] as const;

type AccountType = "Concurso" | "Faculdade";
type PrefMode = (typeof prefModeOptions)[number];
type PrefLanguage = (typeof prefLanguageOptions)[number];
type PrefDateFormat = (typeof prefDateFormatOptions)[number];
type NotifyWeeklyDay = (typeof notifyWeeklyDayOptions)[number];
type NotifyPriority = (typeof notifyPriorityOptions)[number];
type MateriaFilter = (typeof materiaFilterOptions)[number];

const isPrefMode = (value?: string | null): value is PrefMode =>
  Boolean(value && prefModeOptions.includes(value as PrefMode));
const isPrefLanguage = (value?: string | null): value is PrefLanguage =>
  Boolean(value && prefLanguageOptions.includes(value as PrefLanguage));
const isPrefDateFormat = (value?: string | null): value is PrefDateFormat =>
  Boolean(value && prefDateFormatOptions.includes(value as PrefDateFormat));
const isNotifyWeeklyDay = (value?: string | null): value is NotifyWeeklyDay =>
  Boolean(value && notifyWeeklyDayOptions.includes(value as NotifyWeeklyDay));
const isNotifyPriority = (value?: string | null): value is NotifyPriority =>
  Boolean(value && notifyPriorityOptions.includes(value as NotifyPriority));

export default function Configuracoes() {
  const supabase = useMemo(() => createClient(), []);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("—");
  const tabs = [
    {
      label: "Conta",
      value: "conta",
      icon: (
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path d="M20 21a8 8 0 0 0-16 0" strokeLinecap="round" />
          <circle cx="12" cy="8" r="4" />
        </svg>
      ),
    },
    {
      label: "Matérias",
      value: "materias",
      icon: (
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path d="M4 6h12a3 3 0 0 1 3 3v9H7a3 3 0 0 1-3-3z" />
          <path d="M7 6v12" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Templates",
      value: "templates",
      icon: (
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path d="M8 6h10v10H8z" />
          <path d="M6 8H4v10h10v-2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Segurança",
      value: "seguranca",
      icon: (
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path d="M12 3l8 4v5c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V7l8-4z" />
        </svg>
      ),
    },
    {
      label: "Notificações",
      value: "notificacoes",
      icon: (
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
          <path d="M9 19a3 3 0 0 0 6 0" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Privacidade",
      value: "privacidade",
      icon: (
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path d="M12 3l8 4v5c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V7l8-4z" />
        </svg>
      ),
    },
    {
      label: "Planos",
      value: "planos",
      icon: (
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path d="M4 7h16v10H4z" />
          <path d="M7 10h6M7 14h10" strokeLinecap="round" />
        </svg>
      ),
    },
  ] as const;

  type TabValue = (typeof tabs)[number]["value"];

  const [activeTab, setActiveTab] = useState<TabValue>("conta");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("PM");
  const [editingAccountType, setEditingAccountType] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("Concurso");
  const [editingPreferences, setEditingPreferences] = useState(false);
  const [prefMode, setPrefMode] = useState<PrefMode>("Não definido");
  const [prefLanguage, setPrefLanguage] =
    useState<PrefLanguage>("Não definido");
  const [prefDateFormat, setPrefDateFormat] =
    useState<PrefDateFormat>("Não definido");
  const [editingSecurity, setEditingSecurity] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [editingNotifications, setEditingNotifications] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyApp, setNotifyApp] = useState(false);
  const [notifyDaily, setNotifyDaily] = useState(true);
  const [notifyDailyTime, setNotifyDailyTime] = useState("19:00");
  const [notifyWeekly, setNotifyWeekly] = useState(true);
  const [notifyWeeklyDay, setNotifyWeeklyDay] =
    useState<NotifyWeeklyDay>("Segunda");
  const [notifyWeeklyTime, setNotifyWeeklyTime] = useState("08:00");
  const [notifyOverdueTop, setNotifyOverdueTop] = useState(true);
  const [notifyPriority, setNotifyPriority] =
    useState<NotifyPriority>("Alto");
  const [editingPrivacy, setEditingPrivacy] = useState(false);
  const [confirmExport, setConfirmExport] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [materiaSearch, setMateriaSearch] = useState("");
  const [materiaFilter, setMateriaFilter] =
    useState<MateriaFilter>("Todas");
  const [showMateriaModal, setShowMateriaModal] = useState(false);
  const [novaMateria, setNovaMateria] = useState("");
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [cadenceInput, setCadenceInput] = useState("");
  const [templateCadence, setTemplateCadence] = useState<number[]>([1, 7, 15]);
  const [templateMode, setTemplateMode] = useState<"create" | "edit">("create");
  const [templateBeingEdited, setTemplateBeingEdited] = useState<string | null>(
    null
  );
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [templateToActivate, setTemplateToActivate] =
    useState<TemplateItem | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [activePlan, setActivePlan] = useState<"Gratuito" | "Premium">(
    "Gratuito"
  );

  const filteredSubjects = useMemo(() => {
    const search = materiaSearch.trim().toLowerCase();
    return subjects.filter((item) => {
      if (item.type !== accountType) return false;
      if (!search) return true;
      return item.label.toLowerCase().includes(search);
    });
  }, [subjects, accountType, materiaSearch]);

  const activeTemplate = useMemo(
    () => templates.find((item) => item.id === activeTemplateId),
    [templates, activeTemplateId]
  );

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        setUserEmail(user.email);
      }
      if (user?.id) {
        setUserId(user.id);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "full_name,study_type,plan,active_template_id,theme,language,date_format,notify_email,notify_app,notify_daily,notify_daily_time,notify_weekly,notify_weekly_day,notify_weekly_time,notify_overdue_top,notify_priority"
        )
        .eq("id", user?.id ?? "")
        .maybeSingle();

      const typedProfile = profile as ProfileRow | null;

      if (typedProfile?.full_name) {
        setProfileName(typedProfile.full_name);
        setProfileAvatar(
          typedProfile.full_name
            .split(" ")
            .map((part: string) => part[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()
        );
      } else {
        setProfileAvatar("—");
      }
      if (typedProfile?.study_type) {
        setAccountType(typedProfile.study_type);
      }
      if (typedProfile?.plan) {
        setActivePlan(typedProfile.plan === "Premium" ? "Premium" : "Gratuito");
      }
      if (typedProfile?.active_template_id) {
        setActiveTemplateId(typedProfile.active_template_id);
      }
      if (isPrefMode(typedProfile?.theme)) {
        setPrefMode(typedProfile.theme);
      }
      if (isPrefLanguage(typedProfile?.language)) {
        setPrefLanguage(typedProfile.language);
      }
      if (isPrefDateFormat(typedProfile?.date_format)) {
        setPrefDateFormat(typedProfile.date_format);
      }
      if (typedProfile && typedProfile.notify_email !== null) {
        setNotifyEmail(Boolean(typedProfile.notify_email));
      }
      if (typedProfile && typedProfile.notify_app !== null) {
        setNotifyApp(Boolean(typedProfile.notify_app));
      }
      if (typedProfile && typedProfile.notify_daily !== null) {
        setNotifyDaily(Boolean(typedProfile.notify_daily));
      }
      if (typedProfile && typedProfile.notify_daily_time) {
        setNotifyDailyTime(typedProfile.notify_daily_time);
      }
      if (typedProfile && typedProfile.notify_weekly !== null) {
        setNotifyWeekly(Boolean(typedProfile.notify_weekly));
      }
      if (isNotifyWeeklyDay(typedProfile?.notify_weekly_day)) {
        setNotifyWeeklyDay(typedProfile.notify_weekly_day);
      }
      if (typedProfile && typedProfile.notify_weekly_time) {
        setNotifyWeeklyTime(typedProfile.notify_weekly_time);
      }
      if (typedProfile && typedProfile.notify_overdue_top !== null) {
        setNotifyOverdueTop(Boolean(typedProfile.notify_overdue_top));
      }
      if (isNotifyPriority(typedProfile?.notify_priority)) {
        setNotifyPriority(typedProfile.notify_priority);
      }

      const { data: subjectLinks } = await supabase
        .from("user_subjects")
        .select("subject:subjects(id,name,study_type,is_default)")
        .eq("user_id", user?.id ?? "");

      const subjectItems = (subjectLinks as SubjectLinkRow[] | null) ?? [];
      const subjectEntries = subjectItems
        .map((item: SubjectLinkRow) => item.subject)
        .filter(
          (
            subject
          ): subject is NonNullable<SubjectLinkRow["subject"]> =>
            Boolean(subject)
        );
      const mappedSubjects = subjectEntries.map(
        (subject: NonNullable<SubjectLinkRow["subject"]>) => ({
          id: subject.id,
          label: subject.name,
          type: subject.study_type,
          isDefault: subject.is_default,
        })
      );

      setSubjects(mappedSubjects);

      const { data: templatesData } = await supabase
        .from("templates")
        .select("id,name,cadence_days,is_default,owner_user_id")
        .eq("study_type", profile?.study_type ?? "Concurso")
        .order("created_at", { ascending: true });

      const mappedTemplates: TemplateItem[] =
        (templatesData as TemplateRow[] | null)?.map((item) => ({
          id: item.id,
          title: item.name,
          cadence: item.cadence_days.map((day: number) => `${day}d`).join(", "),
          detail: item.is_default
            ? "Template predefinido do sistema."
            : "Template personalizado.",
          source: item.is_default
            ? ("Padrão" as const)
            : ("Personalizado" as const),
          steps: item.cadence_days,
        })) ?? [];

      setTemplates(mappedTemplates);
      setProfileLoaded(true);
    };

    loadProfile();
  }, [supabase]);

  const handleProfileToggle = async () => {
    if (editingProfile && userId) {
      await supabase.from("profiles").upsert({
        id: userId,
        full_name: profileName,
      });
    }
    setEditingProfile((prev) => !prev);
  };

  const handleAccountTypeToggle = async () => {
    if (editingAccountType && userId) {
      await supabase.from("profiles").upsert({
        id: userId,
        study_type: accountType,
      });
    }
    setEditingAccountType((prev) => !prev);
  };

  const handlePreferencesToggle = async () => {
    if (editingPreferences && userId) {
      await supabase.from("profiles").upsert({
        id: userId,
        theme: prefMode === "Não definido" ? null : prefMode,
        language: prefLanguage === "Não definido" ? null : prefLanguage,
        date_format: prefDateFormat === "Não definido" ? null : prefDateFormat,
      });
    }
    setEditingPreferences((prev) => !prev);
  };

  const handleNotificationsToggle = async () => {
    if (editingNotifications && userId) {
      await supabase.from("profiles").upsert({
        id: userId,
        notify_email: notifyEmail,
        notify_app: notifyApp,
        notify_daily: notifyDaily,
        notify_daily_time: notifyDailyTime,
        notify_weekly: notifyWeekly,
        notify_weekly_day: notifyWeeklyDay,
        notify_weekly_time: notifyWeeklyTime,
        notify_overdue_top: notifyOverdueTop,
        notify_priority: notifyPriority,
      });
    }
    setEditingNotifications((prev) => !prev);
  };

  const handlePlanChange = async (plan: "Gratuito" | "Premium") => {
    if (!userId) return;
    setActivePlan(plan);
    await supabase.from("profiles").upsert({
      id: userId,
      plan,
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.35em] text-[#6c5f4f]">
            Configurações
          </p>
          <h1 className="text-2xl font-semibold text-[#1f1c18]">
            Controle total da sua conta.
          </h1>
          <p className="text-sm text-[#5f574a]">
            Ajuste tipo de estudo, matérias, templates e notificações.
          </p>
        </div>
      </header>

      <nav className="flex flex-wrap items-center gap-2 rounded-lg border border-[#e6dbc9] bg-[#fffdf9] px-4 py-3 text-sm font-semibold text-[#4b4337]">
        {tabs.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setActiveTab(item.value)}
            className={`rounded-md px-3 py-2 ${
              activeTab === item.value
                ? "bg-[#f0e6d9] text-[#1f3f35]"
                : "hover:bg-[#f6efe4]"
            }`}
          >
            <span className="flex items-center gap-2">
              {item.icon}
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {activeTab === "conta" ? (
        <section className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-6">
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#4b4337]">
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 text-[#1f5b4b]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path d="M20 21a8 8 0 0 0-16 0" strokeLinecap="round" />
                  <circle cx="12" cy="8" r="4" />
                </svg>
                Dados pessoais
              </div>
              <div className="mt-3 space-y-3">
                <div className="w-full max-w-sm">
                  <label className="text-xs font-semibold text-[#6b6357]">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    disabled={!editingProfile}
                    placeholder="Seu nome"
                    className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18] disabled:bg-[#fdf8f1] disabled:text-[#6b6357]"
                  />
                </div>
                <div className="w-full max-w-sm">
                  <label className="text-xs font-semibold text-[#6b6357]">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    disabled
                    className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-3 text-sm text-[#6b6357]"
                  />
                </div>
                <div className="flex w-full max-w-sm items-center gap-3 rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-4 py-3 text-sm text-[#4b4337]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#e2d6c4] bg-white text-sm font-semibold text-[#6b6357]">
                    {profileAvatar}
                  </div>
                  <div>
                    <p className="text-xs text-[#6b6357]">Foto do perfil</p>
                    <label className={`mt-1 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold ${
                      editingProfile
                        ? "cursor-pointer border-[#e2d6c4] bg-white text-[#4b4337]"
                        : "border-[#efe2d1] bg-[#fdf8f1] text-[#6b6357]"
                    }`}>
                      Selecionar imagem
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={!editingProfile}
                      />
                    </label>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className="rounded-md bg-[#1f5b4b] px-4 py-2 text-xs font-semibold text-[#fffaf2]"
                  onClick={handleProfileToggle}
                >
                  {editingProfile ? "Salvar dados" : "Editar dados"}
                </button>
              </div>
            </div>

            <div className="border-t border-[#e6dbc9] pt-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#4b4337]">
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 text-[#1f5b4b]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
                </svg>
                Tipo de conta
              </div>
              <div className="mt-3 w-full max-w-sm">
                <label className="text-xs font-semibold text-[#6b6357]">
                  Tipo atual
                </label>
                <select
                  className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18] disabled:bg-[#fdf8f1] disabled:text-[#6b6357]"
                  disabled={!editingAccountType}
                  value={accountType}
                  onChange={(event) =>
                    setAccountType(event.target.value as AccountType)
                  }
                >
                  <option>Concurso</option>
                  <option>Faculdade</option>
                </select>
              </div>
              <p className="mt-2 text-xs text-[#6b6357]">
                Alterar o tipo impacta a lista de matérias disponíveis.
              </p>
              <button
                className="mt-3 rounded-md border border-[#e2d6c4] bg-[#f0e6d9] px-4 py-2 text-xs font-semibold text-[#4b4337]"
                onClick={handleAccountTypeToggle}
              >
                {editingAccountType ? "Salvar tipo" : "Alterar tipo"}
              </button>
            </div>

            <div className="border-t border-[#e6dbc9] pt-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#4b4337]">
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 text-[#1f5b4b]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path d="M12 3v3M12 18v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M3 12h3M18 12h3M4.9 19.1l2.1-2.1M17 7l2.1-2.1" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
                Preferências do sistema
              </div>
              <div className="mt-3 space-y-3 text-sm text-[#4b4337]">
                <div className="w-full max-w-sm">
                  <label className="text-xs font-semibold text-[#6b6357]">
                    Modo do sistema
                  </label>
                <select
                  className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18] disabled:bg-[#fdf8f1] disabled:text-[#6b6357]"
                  disabled={!editingPreferences}
                  value={prefMode}
                  onChange={(event) =>
                    setPrefMode(event.target.value as PrefMode)
                  }
                >
                    {prefModeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                </select>
                </div>
                <div className="w-full max-w-sm">
                  <label className="text-xs font-semibold text-[#6b6357]">
                    Idioma
                  </label>
                <select
                  className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18] disabled:bg-[#fdf8f1] disabled:text-[#6b6357]"
                  disabled={!editingPreferences}
                  value={prefLanguage}
                  onChange={(event) =>
                    setPrefLanguage(event.target.value as PrefLanguage)
                  }
                >
                    {prefLanguageOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                </select>
                </div>
                <div className="w-full max-w-sm">
                  <label className="text-xs font-semibold text-[#6b6357]">
                    Formato de data
                  </label>
                <select
                  className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18] disabled:bg-[#fdf8f1] disabled:text-[#6b6357]"
                  disabled={!editingPreferences}
                  value={prefDateFormat}
                  onChange={(event) =>
                    setPrefDateFormat(event.target.value as PrefDateFormat)
                  }
                >
                    {prefDateFormatOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                </select>
                </div>
              </div>
              <button
                className="mt-3 rounded-md border border-[#e2d6c4] bg-[#f0e6d9] px-4 py-2 text-xs font-semibold text-[#4b4337]"
                onClick={handlePreferencesToggle}
              >
                {editingPreferences ? "Salvar preferências" : "Ajustar preferências"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "materias" ? (
        <section className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-6">
          <div className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-[#6b6357]">
                  Matérias
                </p>
                <h2 className="text-xl font-semibold text-[#1f1c18]">
                  Cadastro por tipo de estudo.
                </h2>
              </div>
              <button
                className="rounded-md bg-[#1f5b4b] px-4 py-2 text-xs font-semibold text-[#fffaf2] shadow-[0_10px_30px_-20px_rgba(31,91,75,0.7)]"
                onClick={() => setShowMateriaModal(true)}
              >
                Adicionar matéria
              </button>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-[#4b4337]">
              <div className="rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-4 py-3">
                Tipo atual: {accountType}
              </div>
              <div className="rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-4 py-3">
                Total cadastradas:{" "}
                {filteredSubjects.length}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="w-full max-w-md">
                <label className="text-xs font-semibold text-[#6b6357]">
                  Buscar matéria
                </label>
                <input
                  type="text"
                  value={materiaSearch}
                  onChange={(event) => setMateriaSearch(event.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18]"
                  placeholder="Digite para filtrar"
                />
              </div>
              <div className="w-full max-w-xs">
                <label className="text-xs font-semibold text-[#6b6357]">
                  Status
                </label>
                <select
                  className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18]"
                  value={materiaFilter}
                  onChange={(event) =>
                    setMateriaFilter(event.target.value as MateriaFilter)
                  }
                >
                  {materiaFilterOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-md border border-[#efe2d1] bg-[#fdf8f1] p-4">
              <h3 className="text-sm font-semibold text-[#4b4337]">
                Matérias cadastradas
              </h3>
              <div className="mt-3 space-y-2">
                {filteredSubjects.length === 0 ? (
                  <div className="rounded-md border border-[#e2d6c4] bg-white px-3 py-3 text-xs text-[#6b6357]">
                    Nenhuma matéria cadastrada para este tipo de estudo.
                  </div>
                ) : (
                  filteredSubjects.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#e2d6c4] bg-white px-3 py-2 text-xs text-[#4b4337]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{item.label}</span>
                        <span className="rounded-full bg-[#f0e6d9] px-2 py-1 text-[10px] uppercase text-[#4b4337]">
                          {item.type}
                        </span>
                        <span className="rounded-full border border-[#e2d6c4] px-2 py-1 text-[10px] uppercase text-[#6b6357]">
                          {item.isDefault ? "Padrão" : "Personalizada"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!item.isDefault ? (
                          <button className="text-[11px] font-semibold text-[#1f5b4b]">
                            Editar
                          </button>
                        ) : null}
                        <button className="text-[11px] font-semibold text-[#9d4b3b]">
                          Remover
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "templates" ? (
        <section className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-[#6b6357]">
                Templates
              </p>
              <h2 className="text-xl font-semibold text-[#1f1c18]">
                Ritmos prontos e personalizáveis.
              </h2>
            </div>
            <button
              className="cursor-pointer rounded-md bg-[#1f5b4b] px-4 py-2 text-xs font-semibold text-[#fffaf2] shadow-[0_10px_30px_-20px_rgba(31,91,75,0.7)]"
              onClick={() => setShowTemplateModal(true)}
            >
              Criar template
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {templates.map((template) => {
              const isActive = template.id === activeTemplateId;
              return (
                <div
                  key={template.id}
                  className={`rounded-md border p-4 ${
                    isActive
                      ? "border-2 border-[#1f5b4b] bg-[#e9f4ef] shadow-[0_12px_28px_-22px_rgba(31,91,75,0.6)]"
                      : "border-[#efe2d1] bg-[#fdf8f1]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-base font-semibold text-[#1f1c18]">
                      {template.title}
                    </p>
                    {isActive ? (
                      <span className="rounded-full bg-[#1f5b4b] px-2 py-1 text-[10px] uppercase text-white">
                        Ativo
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-[#1f5b4b]">
                    {template.cadence}
                  </p>
                  <p className="mt-3 text-sm text-[#5f574a]">
                    {template.detail}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {isActive ? (
                      <span className="text-xs font-semibold text-[#2f5d4e]">
                        Este é o template ativo.
                      </span>
                    ) : (
                      <button
                        className="cursor-pointer text-xs font-semibold text-[#1f5b4b]"
                        onClick={() => {
                          setTemplateToActivate(template);
                          setShowActivateModal(true);
                        }}
                      >
                        Ativar
                      </button>
                    )}
                    {template.source === "Personalizado" ? (
                      <>
                        <button
                          className="cursor-pointer text-xs font-semibold text-[#4b4337]"
                          onClick={() => {
                            setTemplateMode("edit");
                            setTemplateBeingEdited(template.id);
                            setTemplateName(template.title);
                            setTemplateCadence(template.steps);
                            setCadenceInput("");
                            setShowTemplateModal(true);
                          }}
                        >
                          Editar
                        </button>
                        <button className="cursor-pointer text-xs font-semibold text-[#9d4b3b]">
                          Excluir
                        </button>
                      </>
                    ) : (
                      <button className="cursor-pointer text-xs font-semibold text-[#6b6357]">
                        Duplicar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-md border border-[#efe2d1] bg-[#fdf8f1] p-4">
            <p className="text-xs font-semibold uppercase text-[#6b6357]">
              Prévia de cadência atual
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#4b4337]">
              {activeTemplate?.steps?.length ? (
                activeTemplate.steps.map((step) => (
                  <span
                    key={step}
                    className="rounded-full border border-[#e2d6c4] bg-white px-3 py-1"
                  >
                    {step} {step === 1 ? "dia" : "dias"}
                  </span>
                ))
              ) : (
                <span className="text-[#6b6357]">
                  Nenhum template ativo definido.
                </span>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "notificacoes" ? (
        <section className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-6">
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#4b4337]">
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 text-[#1f5b4b]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                  <circle cx="9" cy="7" r="2" />
                  <circle cx="15" cy="12" r="2" />
                  <circle cx="11" cy="17" r="2" />
                </svg>
                Canais de aviso
              </div>
              <p className="mt-2 text-xs text-[#6b6357]">
                Defina por onde deseja receber lembretes e alertas.
              </p>
              <div className="mt-3 grid gap-3 text-sm text-[#4b4337]">
                <div className="w-full max-w-sm">
                  <label className="text-xs font-semibold text-[#6b6357]">
                    E-mail
                  </label>
                  <select
                    className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18] disabled:bg-[#fdf8f1] disabled:text-[#6b6357]"
                    disabled={!editingNotifications}
                    value={notifyEmail ? "Ativo" : "Inativo"}
                    onChange={(event) =>
                      setNotifyEmail(event.target.value === "Ativo")
                    }
                  >
                    <option>Ativo</option>
                    <option>Inativo</option>
                  </select>
                </div>
                <div className="w-full max-w-sm">
                  <label className="text-xs font-semibold text-[#6b6357]">
                    Aplicativo
                  </label>
                  <select
                    className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18] disabled:bg-[#fdf8f1] disabled:text-[#6b6357]"
                    disabled={!editingNotifications}
                    value={notifyApp ? "Ativo" : "Inativo"}
                    onChange={(event) =>
                      setNotifyApp(event.target.value === "Ativo")
                    }
                  >
                    <option>Ativo</option>
                    <option>Inativo</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-[#e6dbc9] pt-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#4b4337]">
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
                Rotina de lembretes
              </div>
              <div className="mt-3 grid gap-3 text-sm text-[#4b4337]">
                <div className="w-full max-w-sm">
                  <label className="text-xs font-semibold text-[#6b6357]">
                    Lembrete diário
                  </label>
                  <select
                    className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18] disabled:bg-[#fdf8f1] disabled:text-[#6b6357]"
                    disabled={!editingNotifications}
                    value={notifyDaily ? "Ativo" : "Inativo"}
                    onChange={(event) =>
                      setNotifyDaily(event.target.value === "Ativo")
                    }
                  >
                    <option>Ativo</option>
                    <option>Inativo</option>
                  </select>
                </div>
                <div className="w-full max-w-sm">
                  <label className="text-xs font-semibold text-[#6b6357]">
                    Horário do lembrete diário
                  </label>
                  <input
                    type="time"
                    value={notifyDailyTime}
                    onChange={(event) => setNotifyDailyTime(event.target.value)}
                    disabled={!editingNotifications}
                    className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18] disabled:bg-[#fdf8f1] disabled:text-[#6b6357]"
                  />
                </div>
                <div className="w-full max-w-sm">
                  <label className="text-xs font-semibold text-[#6b6357]">
                    Resumo semanal
                  </label>
                  <select
                    className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18] disabled:bg-[#fdf8f1] disabled:text-[#6b6357]"
                    disabled={!editingNotifications}
                    value={notifyWeekly ? "Ativo" : "Inativo"}
                    onChange={(event) =>
                      setNotifyWeekly(event.target.value === "Ativo")
                    }
                  >
                    <option>Ativo</option>
                    <option>Inativo</option>
                  </select>
                </div>
                <div className="w-full max-w-sm">
                  <label className="text-xs font-semibold text-[#6b6357]">
                    Dia do resumo
                  </label>
                  <select
                    className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18] disabled:bg-[#fdf8f1] disabled:text-[#6b6357]"
                    disabled={!editingNotifications}
                    value={notifyWeeklyDay}
                    onChange={(event) =>
                      setNotifyWeeklyDay(event.target.value as NotifyWeeklyDay)
                    }
                  >
                    {notifyWeeklyDayOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-full max-w-sm">
                  <label className="text-xs font-semibold text-[#6b6357]">
                    Horário do resumo semanal
                  </label>
                  <input
                    type="time"
                    value={notifyWeeklyTime}
                    onChange={(event) => setNotifyWeeklyTime(event.target.value)}
                    disabled={!editingNotifications}
                    className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18] disabled:bg-[#fdf8f1] disabled:text-[#6b6357]"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-[#e6dbc9] pt-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#4b4337]">
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 text-[#1f5b4b]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path d="M12 8v5" strokeLinecap="round" />
                  <path d="M12 16h.01" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
                Prioridades de alerta
              </div>
              <div className="mt-3 space-y-3 text-sm text-[#4b4337]">
                <div className="w-full max-w-sm">
                  <label className="text-xs font-semibold text-[#6b6357]">
                    Revisões atrasadas no topo
                  </label>
                  <select
                    className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18] disabled:bg-[#fdf8f1] disabled:text-[#6b6357]"
                    disabled={!editingNotifications}
                    value={notifyOverdueTop ? "Ativo" : "Inativo"}
                    onChange={(event) =>
                      setNotifyOverdueTop(event.target.value === "Ativo")
                    }
                  >
                    <option>Ativo</option>
                    <option>Inativo</option>
                  </select>
                </div>
                <div className="w-full max-w-sm">
                  <label className="text-xs font-semibold text-[#6b6357]">
                    Nível de urgência
                  </label>
                  <select
                    className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18] disabled:bg-[#fdf8f1] disabled:text-[#6b6357]"
                    disabled={!editingNotifications}
                    value={notifyPriority}
                    onChange={(event) =>
                      setNotifyPriority(event.target.value as NotifyPriority)
                    }
                  >
                    {notifyPriorityOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-[#e6dbc9] pt-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#4b4337]">
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 text-[#1f5b4b]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <rect x="4" y="6" width="16" height="12" rx="2" />
                  <path d="M7 9h10M7 13h6" strokeLinecap="round" />
                </svg>
                Prévia das notificações
              </div>
              <div className="mt-3 w-full max-w-sm rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-4 py-3 text-sm text-[#4b4337]">
                <p>Hoje você tem 3 revisões pendentes.</p>
                <p className="mt-1 text-xs text-[#6b6357]">
                  Lembrete diário programado para {notifyDailyTime}. Resumo
                  semanal em {notifyWeeklyDay} às {notifyWeeklyTime}.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-md bg-[#1f5b4b] px-4 py-2 text-xs font-semibold text-[#fffaf2]"
                onClick={handleNotificationsToggle}
              >
                {editingNotifications
                  ? "Salvar notificações"
                  : "Editar notificações"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "seguranca" ? (
        <section className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-6">
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#4b4337]">
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 text-[#1f5b4b]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path d="M12 3l8 4v5c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V7l8-4z" />
                </svg>
                Acesso e senha
              </div>
              <div className="mt-3 grid gap-3 text-sm text-[#4b4337]">
                <div className="w-full max-w-sm">
                  <label className="text-xs font-semibold text-[#6b6357]">
                    Senha atual
                  </label>
                  <input
                    type="password"
                    value={editingSecurity ? "" : "********"}
                    disabled={!editingSecurity}
                    className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18] disabled:bg-[#fdf8f1] disabled:text-[#6b6357]"
                    placeholder={editingSecurity ? "Digite sua senha atual" : ""}
                  />
                  <button
                    className="mt-2 text-xs font-semibold text-[#1f5b4b]"
                    onClick={() => setShowForgotModal(true)}
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <div className="w-full max-w-sm">
                  <label className="text-xs font-semibold text-[#6b6357]">
                    Nova senha
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    disabled={!editingSecurity}
                    className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18] disabled:bg-[#fdf8f1] disabled:text-[#6b6357]"
                  />
                </div>
                <div className="w-full max-w-sm">
                  <label className="text-xs font-semibold text-[#6b6357]">
                    Confirmar senha
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    disabled={!editingSecurity}
                    className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18] disabled:bg-[#fdf8f1] disabled:text-[#6b6357]"
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className="rounded-md bg-[#1f5b4b] px-4 py-2 text-xs font-semibold text-[#fffaf2]"
                  onClick={() => setEditingSecurity((prev) => !prev)}
                >
                  {editingSecurity ? "Salvar segurança" : "Editar segurança"}
                </button>
              </div>
            </div>

            <div className="border-t border-[#e6dbc9] pt-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#4b4337]">
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 text-[#1f5b4b]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path d="M4 6h16" strokeLinecap="round" />
                  <path d="M4 12h10" strokeLinecap="round" />
                  <path d="M4 18h6" strokeLinecap="round" />
                </svg>
                Sessões ativas
              </div>
              <div className="mt-3 space-y-3 text-sm text-[#4b4337]">
                <div className="w-full max-w-sm rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-4 py-3">
                  São Paulo · Chrome · Último acesso hoje
                </div>
                <div className="w-full max-w-sm rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-4 py-3">
                  Salvador · Safari · Último acesso ontem
                </div>
              </div>
              <button
                className="mt-4 rounded-md border border-[#e2d6c4] bg-[#f0e6d9] px-4 py-2 text-xs font-semibold text-[#4b4337]"
                disabled={!editingSecurity}
              >
                Encerrar todas as sessões
              </button>
            </div>

            <div className="border-t border-[#e6dbc9] pt-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#4b4337]">
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 text-[#1f5b4b]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path d="M12 3v4M8 5h8M6 10h12M7 20h10l-1-9H8l-1 9z" />
                </svg>
                Segurança adicional
              </div>
              <div className="mt-3 space-y-3 text-sm text-[#4b4337]">
                <div className="w-full max-w-sm">
                  <label className="text-xs font-semibold text-[#6b6357]">
                    Autenticação em duas etapas
                  </label>
                  <select
                    className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18] disabled:bg-[#fdf8f1] disabled:text-[#6b6357]"
                    disabled={!editingSecurity}
                    value={editingSecurity ? "Ativo" : "Inativo"}
                  >
                    <option>Ativo</option>
                    <option>Inativo</option>
                  </select>
                </div>
                <div className="w-full max-w-sm">
                  <label className="text-xs font-semibold text-[#6b6357]">
                    E-mail de recuperação
                  </label>
                  <input
                    type="email"
                    value="recuperacao@revisame.com"
                    disabled={!editingSecurity}
                    className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18] disabled:bg-[#fdf8f1] disabled:text-[#6b6357]"
                  />
                </div>
              </div>
              <button
                className="mt-4 rounded-md bg-[#1f5b4b] px-4 py-2 text-xs font-semibold text-[#fffaf2]"
                onClick={() => setEditingSecurity((prev) => !prev)}
              >
                {editingSecurity ? "Salvar segurança" : "Editar segurança"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "privacidade" ? (
        <section className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-6">
          <div className="space-y-4 text-sm text-[#4b4337]">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#4b4337]">
              <svg
                aria-hidden="true"
                className="h-5 w-5 text-[#1f5b4b]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <path d="M12 3l8 4v5c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V7l8-4z" />
              </svg>
              Privacidade
            </div>
            <label className="flex w-full max-w-sm items-center gap-3 rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-4 py-3">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={confirmExport}
                onChange={(event) => setConfirmExport(event.target.checked)}
                disabled={!editingPrivacy}
              />
              Exportar todos os dados
            </label>
            <label className="flex w-full max-w-sm items-center gap-3 rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-4 py-3">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={confirmDelete}
                onChange={(event) => setConfirmDelete(event.target.checked)}
                disabled={!editingPrivacy}
              />
              Excluir conta e dados
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-md bg-[#9d4b3b] px-4 py-2 text-xs font-semibold text-[#fffaf2]"
                onClick={() => setEditingPrivacy((prev) => !prev)}
              >
                {editingPrivacy ? "Salvar privacidade" : "Editar privacidade"}
              </button>
              <button
                className="rounded-md border border-[#e2d6c4] bg-[#f0e6d9] px-4 py-2 text-xs font-semibold text-[#4b4337]"
                disabled={!editingPrivacy || (!confirmExport && !confirmDelete)}
              >
                Aplicar ajustes
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "planos" ? (
        <section className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-[#6b6357]">
                Planos
              </p>
              <h2 className="text-xl font-semibold text-[#1f1c18]">
                Escolha o plano ideal para sua rotina.
              </h2>
              <p className="mt-1 text-sm text-[#5f574a]">
                O plano ativo define os recursos disponíveis no sistema.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              {
                name: "Gratuito",
                price: "R$ 0",
                desc: "Para começar e organizar suas revisões.",
                features: [
                  "Cadastro de estudos",
                  "Templates predefinidos",
                  "Avisos diários básicos",
                ],
              },
              {
                name: "Premium",
                price: "R$ 19,90/mês",
                desc: "Mais controle e análises avançadas.",
                features: [
                  "Templates personalizados",
                  "Relatórios avançados",
                  "Notificações inteligentes",
                ],
              },
            ].map((plan) => {
              const isActive = plan.name === activePlan;
              return (
                <div
                  key={plan.name}
                  className={`rounded-md border p-5 ${
                    isActive
                      ? "border-2 border-[#1f5b4b] bg-[#e9f4ef] shadow-[0_12px_28px_-22px_rgba(31,91,75,0.6)]"
                      : "border-[#efe2d1] bg-[#fdf8f1]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-base font-semibold text-[#1f1c18]">
                      {plan.name}
                    </p>
                    {isActive ? (
                      <span className="rounded-full bg-[#1f5b4b] px-2 py-1 text-[10px] uppercase text-white">
                        Ativo
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xl font-semibold text-[#1f5b4b]">
                    {plan.price}
                  </p>
                  <p className="mt-2 text-sm text-[#5f574a]">{plan.desc}</p>
                  <ul className="mt-4 space-y-2 text-xs text-[#4b4337]">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#1f5b4b]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5">
                    {isActive ? (
                      <span className="text-xs font-semibold text-[#2f5d4e]">
                        Este é o seu plano atual.
                      </span>
                    ) : (
                      <button
                        className="rounded-md bg-[#1f5b4b] px-4 py-2 text-xs font-semibold text-[#fffaf2]"
                        onClick={() =>
                          handlePlanChange(plan.name as "Gratuito" | "Premium")
                        }
                      >
                        {plan.name === "Premium" ? "Assinar Premium" : "Voltar"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {showMateriaModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-[#fffaf2] p-6 shadow-[0_24px_60px_-40px_rgba(31,91,75,0.6)]">
            <h3 className="text-lg font-semibold text-[#1f1c18]">
              Adicionar matéria
            </h3>
            <p className="mt-2 text-sm text-[#5f574a]">
              A matéria será vinculada ao tipo de conta atual.
            </p>
            <div className="mt-4">
              <label className="text-xs font-semibold text-[#6b6357]">
                Nome da matéria
              </label>
              <input
                type="text"
                className="mt-2 h-11 w-full rounded-md border border-[#e2d6c4] bg-white px-3 text-sm text-[#1f1c18]"
                value={novaMateria}
                onChange={(event) => setNovaMateria(event.target.value)}
                placeholder="Ex: Direito Tributário"
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="rounded-md border border-[#e2d6c4] bg-[#f0e6d9] px-4 py-2 text-xs font-semibold text-[#4b4337]"
                onClick={() => {
                  setNovaMateria("");
                  setShowMateriaModal(false);
                }}
              >
                Cancelar
              </button>
              <button
                className="rounded-md bg-[#1f5b4b] px-4 py-2 text-xs font-semibold text-[#fffaf2] disabled:cursor-not-allowed disabled:bg-[#9fbfb5]"
                disabled={!novaMateria.trim()}
                onClick={async () => {
                  if (!userId) return;
                  const trimmed = novaMateria.trim();
                  if (!trimmed) return;

                  const { data: createdSubject, error } = await supabase
                    .from("subjects")
                    .insert({
                      name: trimmed,
                      study_type: accountType,
                      is_default: false,
                      owner_user_id: userId,
                    })
                    .select("id,name,study_type,is_default")
                    .single();

                  if (error || !createdSubject) {
                    return;
                  }

                  await supabase.from("user_subjects").insert({
                    user_id: userId,
                    subject_id: createdSubject.id,
                  });

                  setSubjects((prev) => [
                    ...prev,
                    {
                      id: createdSubject.id,
                      label: createdSubject.name,
                      type: createdSubject.study_type,
                      isDefault: createdSubject.is_default,
                    },
                  ]);
                  setNovaMateria("");
                  setShowMateriaModal(false);
                }}
              >
                Salvar matéria
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showTemplateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-[#fffaf2] p-6 shadow-[0_24px_60px_-40px_rgba(31,91,75,0.6)]">
            <h3 className="text-lg font-semibold text-[#1f1c18]">
              {templateMode === "edit" ? "Editar template" : "Criar template"}
            </h3>
            <p className="mt-2 text-sm text-[#5f574a]">
              Defina o nome e os intervalos em dias.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6b6357]">
                  Nome do template
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-[#e2d6c4] bg-white px-3 text-sm text-[#1f1c18]"
                  placeholder="Ex: Revisão rápida"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6b6357]">
                  Cadência (em dias)
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    type="number"
                    min={1}
                    value={cadenceInput}
                    onChange={(event) => setCadenceInput(event.target.value)}
                    className="h-11 w-full rounded-md border border-[#e2d6c4] bg-white px-3 text-sm text-[#1f1c18]"
                    placeholder="Adicionar dias"
                  />
                  <button
                    type="button"
                    className="rounded-md border border-[#e2d6c4] bg-[#f0e6d9] px-3 text-xs font-semibold text-[#4b4337]"
                    onClick={() => {
                      const value = Number(cadenceInput);
                      if (!value || value <= 0) return;
                      if (templateCadence.includes(value)) return;
                      setTemplateCadence((prev) =>
                        [...prev, value].sort((a, b) => a - b)
                      );
                      setCadenceInput("");
                    }}
                  >
                    Adicionar
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-[#4b4337]">
                {templateCadence.map((step) => (
                  <button
                    key={step}
                    type="button"
                    className="flex items-center gap-2 rounded-full border border-[#e2d6c4] bg-white px-3 py-1"
                    onClick={() =>
                      setTemplateCadence((prev) =>
                        prev.filter((item) => item !== step)
                      )
                    }
                  >
                    {step}d
                    <span className="text-[10px] text-[#9d4b3b]">remover</span>
                  </button>
                ))}
              </div>
              <div className="rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-3 py-2 text-xs text-[#6b6357]">
                Sequência: {templateCadence.map((step) => `${step}d`).join(", ")}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="cursor-pointer rounded-md border border-[#e2d6c4] bg-[#f0e6d9] px-4 py-2 text-xs font-semibold text-[#4b4337]"
                onClick={() => {
                  setShowTemplateModal(false);
                  setTemplateName("");
                  setTemplateCadence([1, 7, 15]);
                  setCadenceInput("");
                  setTemplateMode("create");
                  setTemplateBeingEdited(null);
                }}
              >
                Cancelar
              </button>
              <button
                className="cursor-pointer rounded-md bg-[#1f5b4b] px-4 py-2 text-xs font-semibold text-[#fffaf2] disabled:cursor-not-allowed disabled:bg-[#9fbfb5]"
                disabled={!templateName.trim() || templateCadence.length === 0}
                onClick={async () => {
                  if (!userId) return;
                  const trimmed = templateName.trim();
                  if (!trimmed) return;

                  if (templateMode === "edit" && templateBeingEdited) {
                    const { data: updated } = await supabase
                      .from("templates")
                      .update({
                        name: trimmed,
                        cadence_days: templateCadence,
                      })
                      .eq("id", templateBeingEdited)
                      .select("id,name,cadence_days,is_default,owner_user_id")
                      .single();

                    if (updated) {
                      const cadenceDays = (updated.cadence_days ??
                        []) as number[];
                      const cadenceLabel = cadenceDays
                        .map((day) => `${day}d`)
                        .join(", ");
                      setTemplates((prev) =>
                        prev.map((item) =>
                          item.id === updated.id
                            ? {
                                ...item,
                                title: updated.name,
                                cadence: cadenceLabel,
                                steps: cadenceDays,
                                source: updated.is_default
                                  ? "Padrão"
                                  : "Personalizado",
                                detail: updated.is_default
                                  ? "Template predefinido do sistema."
                                  : "Template personalizado.",
                              }
                            : item
                        )
                      );
                    }
                  } else {
                    const { data: created } = await supabase
                      .from("templates")
                      .insert({
                        name: trimmed,
                        cadence_days: templateCadence,
                        study_type: accountType,
                        is_default: false,
                        owner_user_id: userId,
                      })
                      .select("id,name,cadence_days,is_default,owner_user_id")
                      .single();

                    if (created) {
                      const createdCadence = (created.cadence_days ??
                        []) as number[];
                      const createdLabel = createdCadence
                        .map((day: number) => `${day}d`)
                        .join(", ");
                      setTemplates((prev) => [
                        ...prev,
                        {
                          id: created.id,
                          title: created.name,
                          cadence: createdLabel,
                          detail: "Template personalizado.",
                          source: "Personalizado",
                          steps: createdCadence,
                        },
                      ]);
                    }
                  }

                  setShowTemplateModal(false);
                  setTemplateName("");
                  setTemplateCadence([1, 7, 15]);
                  setCadenceInput("");
                  setTemplateMode("create");
                  setTemplateBeingEdited(null);
                }}
              >
                {templateMode === "edit"
                  ? "Salvar alterações"
                  : "Salvar template"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showActivateModal && templateToActivate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-[#fffaf2] p-6 shadow-[0_24px_60px_-40px_rgba(31,91,75,0.6)]">
            <h3 className="text-lg font-semibold text-[#1f1c18]">
              Ativar template
            </h3>
            <p className="mt-2 text-sm text-[#5f574a]">
              Tem certeza que deseja ativar o template{" "}
              <span className="font-semibold text-[#1f5b4b]">
                {templateToActivate.title}
              </span>
              ?
            </p>
            <div className="mt-4 rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-4 py-3 text-sm text-[#4b4337]">
              O novo template será usado nas próximas revisões. As revisões
              anteriores seguirão o template usado no momento do estudo.
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="cursor-pointer rounded-md border border-[#e2d6c4] bg-[#f0e6d9] px-4 py-2 text-xs font-semibold text-[#4b4337]"
                onClick={() => {
                  setShowActivateModal(false);
                  setTemplateToActivate(null);
                }}
              >
                Cancelar
              </button>
              <button
                className="cursor-pointer rounded-md bg-[#1f5b4b] px-4 py-2 text-xs font-semibold text-[#fffaf2]"
                onClick={() => {
                  if (!userId) return;
                  setActiveTemplateId(templateToActivate.id);
                  supabase.from("profiles").upsert({
                    id: userId,
                    active_template_id: templateToActivate.id,
                  });
                  setShowActivateModal(false);
                  setTemplateToActivate(null);
                }}
              >
                Confirmar ativação
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showForgotModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-[#fffaf2] p-6 shadow-[0_24px_60px_-40px_rgba(31,91,75,0.6)]">
            <h3 className="text-lg font-semibold text-[#1f1c18]">
              Recuperar senha
            </h3>
            <p className="mt-2 text-sm text-[#5f574a]">
              Deseja enviar um link de recuperação de senha para o e-mail da
              conta?
            </p>
            <div className="mt-4 rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-4 py-3 text-sm text-[#4b4337]">
              E-mail: {userEmail}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="rounded-md border border-[#e2d6c4] bg-[#f0e6d9] px-4 py-2 text-xs font-semibold text-[#4b4337]"
                onClick={() => setShowForgotModal(false)}
              >
                Cancelar
              </button>
              <button
                className="rounded-md bg-[#1f5b4b] px-4 py-2 text-xs font-semibold text-[#fffaf2]"
                onClick={() => setShowForgotModal(false)}
              >
                Enviar link
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
