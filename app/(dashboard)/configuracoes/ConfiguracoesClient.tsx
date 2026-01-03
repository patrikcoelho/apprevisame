"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  AlertCircle,
  Bell,
  BookOpen,
  Calendar,
  CreditCard,
  LayoutTemplate,
  Lock,
  MessageSquare,
  Pencil,
  Shield,
  SlidersHorizontal,
  Smile,
  Sun,
  User,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/app/components/toast-provider";
import HorizontalTabsNoArrows from "@/app/components/horizontal-tabs-no-arrows";

type SubjectItem = {
  id: string;
  label: string;
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
  plan?: string | null;
  active_template_id?: string | null;
  avatar_url?: string | null;
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

const prefModeOptions = ["Automático", "Claro", "Escuro"] as const;
const notifyWeeklyDayOptions = [
  "Segunda",
  "Quarta",
  "Sexta",
  "Domingo",
] as const;
const notifyPriorityOptions = ["Baixo", "Médio", "Alto"] as const;
const materiaFilterOptions = ["Todas", "Ativas", "Inativas"] as const;

type PrefMode = (typeof prefModeOptions)[number];
type NotifyWeeklyDay = (typeof notifyWeeklyDayOptions)[number];
type NotifyPriority = (typeof notifyPriorityOptions)[number];
type MateriaFilter = (typeof materiaFilterOptions)[number];

const isPrefMode = (value?: string | null): value is PrefMode =>
  Boolean(value && prefModeOptions.includes(value as PrefMode));
const isNotifyWeeklyDay = (value?: string | null): value is NotifyWeeklyDay =>
  Boolean(value && notifyWeeklyDayOptions.includes(value as NotifyWeeklyDay));
const isNotifyPriority = (value?: string | null): value is NotifyPriority =>
  Boolean(value && notifyPriorityOptions.includes(value as NotifyPriority));

export default function Configuracoes() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("—");
  const tabs = [
    {
      label: "Conta",
      value: "conta",
      icon: <User className="h-4 w-4" aria-hidden="true" />,
    },
    {
      label: "Matérias",
      value: "materias",
      icon: <BookOpen className="h-4 w-4" aria-hidden="true" />,
    },
    {
      label: "Templates",
      value: "templates",
      icon: <LayoutTemplate className="h-4 w-4" aria-hidden="true" />,
    },
    {
      label: "Segurança",
      value: "seguranca",
      icon: <Shield className="h-4 w-4" aria-hidden="true" />,
    },
    {
      label: "Notificações",
      value: "notificacoes",
      icon: <Bell className="h-4 w-4" aria-hidden="true" />,
    },
    {
      label: "Privacidade",
      value: "privacidade",
      icon: <Lock className="h-4 w-4" aria-hidden="true" />,
    },
    {
      label: "Planos",
      value: "planos",
      icon: <CreditCard className="h-4 w-4" aria-hidden="true" />,
    },
  ] as const;

  type TabValue = (typeof tabs)[number]["value"];

  const [selectedTab, setSelectedTab] = useState<TabValue>("conta");
  const activeTab =
    (searchParams.get("tab") as TabValue | null) ?? selectedTab;
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("PM");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState<
    string | null
  >(null);
  const [profileSnapshot, setProfileSnapshot] = useState<{
    name: string;
    imageUrl: string | null;
  } | null>(null);
  const [avatarStatus, setAvatarStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [editingPreferences, setEditingPreferences] = useState(false);
  const [prefMode, setPrefMode] = useState<PrefMode>(() => {
    if (typeof window === "undefined") return "Automático";
    const stored = window.localStorage.getItem("revisame:theme");
    return stored && isPrefMode(stored) ? stored : "Automático";
  });
  const [preferencesSnapshot, setPreferencesSnapshot] =
    useState<PrefMode | null>(null);
  const [editingSecurity, setEditingSecurity] = useState(false);
  const minPasswordLength = 6;
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityStatus, setSecurityStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [securityMessage, setSecurityMessage] = useState("");
  const [securitySnapshot, setSecuritySnapshot] = useState<{
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  } | null>(null);
  const [forgotStatus, setForgotStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [forgotMessage, setForgotMessage] = useState("");
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
  const [notificationsSnapshot, setNotificationsSnapshot] = useState<{
    notifyEmail: boolean;
    notifyApp: boolean;
    notifyDaily: boolean;
    notifyDailyTime: string;
    notifyWeekly: boolean;
    notifyWeeklyDay: NotifyWeeklyDay;
    notifyWeeklyTime: string;
    notifyOverdueTop: boolean;
    notifyPriority: NotifyPriority;
  } | null>(null);
  const [editingPrivacy, setEditingPrivacy] = useState(false);
  const [confirmExport, setConfirmExport] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [privacySnapshot, setPrivacySnapshot] = useState<{
    confirmExport: boolean;
    confirmDelete: boolean;
  } | null>(null);
  const [materiaSearch, setMateriaSearch] = useState("");
  const [materiaFilter, setMateriaFilter] =
    useState<MateriaFilter>("Todas");
  const [showMateriaModal, setShowMateriaModal] = useState(false);
  const [novaMateria, setNovaMateria] = useState("");
  const [showEditMateriaModal, setShowEditMateriaModal] = useState(false);
  const [materiaBeingEdited, setMateriaBeingEdited] =
    useState<SubjectItem | null>(null);
  const [editMateriaName, setEditMateriaName] = useState("");
  const [showDeleteMateriaModal, setShowDeleteMateriaModal] = useState(false);
  const [materiaToDelete, setMateriaToDelete] = useState<SubjectItem | null>(
    null
  );
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

  const resolveUserId = useCallback(async () => {
    if (userId) return userId;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) return user.id;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  }, [supabase, userId]);

  function extractAvatarPath(avatarUrl: string) {
    if (!avatarUrl.startsWith("http")) return avatarUrl;
    const signedIdx = avatarUrl.indexOf("/storage/v1/object/sign/avatars/");
    if (signedIdx !== -1) {
      return avatarUrl
        .slice(signedIdx + "/storage/v1/object/sign/avatars/".length)
        .split("?")[0];
    }
    const publicIdx = avatarUrl.indexOf("/storage/v1/object/public/avatars/");
    if (publicIdx !== -1) {
      return avatarUrl
        .slice(publicIdx + "/storage/v1/object/public/avatars/".length)
        .split("?")[0];
    }
    return null;
  }

  const resolveAvatarUrl = useCallback(
    async (avatarUrl: string | null) => {
      if (!avatarUrl) return null;
      if (avatarUrl.startsWith("http")) {
        const rawPath = extractAvatarPath(avatarUrl);
        if (!rawPath) return avatarUrl;
        const { data, error } = await supabase.storage
          .from("avatars")
          .createSignedUrl(rawPath, 60 * 60);
        if (!error && data?.signedUrl) return data.signedUrl;
        return avatarUrl;
      }
      const { data, error } = await supabase.storage
        .from("avatars")
        .createSignedUrl(avatarUrl, 60 * 60);
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    },
    [supabase]
  );

  const loadProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const resolvedUser = user ?? session?.user;

    if (!resolvedUser) return;

    if (resolvedUser.email) {
      setUserEmail(resolvedUser.email);
    }
    if (resolvedUser.id) {
      setUserId(resolvedUser.id);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", resolvedUser.id)
      .maybeSingle();

    const typedProfile = profile as ProfileRow | null;

    if (typedProfile?.avatar_url?.startsWith("http")) {
      const normalizedPath = extractAvatarPath(typedProfile.avatar_url);
      if (normalizedPath && normalizedPath !== typedProfile.avatar_url) {
        await supabase
          .from("profiles")
          .update({ avatar_url: normalizedPath })
          .eq("id", resolvedUser.id);
        typedProfile.avatar_url = normalizedPath;
      }
    }

    const fallbackName =
      typedProfile?.full_name ||
      (resolvedUser.user_metadata?.full_name as string | undefined) ||
      resolvedUser.email?.split("@")[0] ||
      "";
    setProfileName(fallbackName);
    setProfileAvatar(
      fallbackName
        ? fallbackName
            .split(" ")
            .map((part: string) => part[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()
        : "—"
    );

    setProfileImageUrl(await resolveAvatarUrl(typedProfile?.avatar_url ?? null));

    if (typedProfile?.plan) {
      setActivePlan(typedProfile.plan === "Premium" ? "Premium" : "Gratuito");
    }
    setActiveTemplateId(typedProfile?.active_template_id ?? null);
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
      .select("subject:subjects(id,name,is_default)")
      .eq("user_id", resolvedUser.id);

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
        isDefault: subject.is_default,
      })
    );

    setSubjects(mappedSubjects);

    const { data: defaultTemplates } = await supabase
      .from("templates")
      .select("id,name,cadence_days,is_default,owner_user_id")
      .eq("is_default", true)
      .order("created_at", { ascending: true });

    const { data: userTemplates } = await supabase
      .from("templates")
      .select("id,name,cadence_days,is_default,owner_user_id")
      .eq("owner_user_id", resolvedUser.id)
      .order("created_at", { ascending: true });

    const baseTemplates = [
      ...new Map(
        ([...(defaultTemplates ?? []), ...(userTemplates ?? [])] as TemplateRow[]).map(
          (item) => [item.id, item]
        )
      ).values(),
    ];
    let resolvedTemplates = baseTemplates;

    if (
      typedProfile?.active_template_id &&
      !baseTemplates.some((item) => item.id === typedProfile.active_template_id)
    ) {
      const { data: activeTemplate } = await supabase
        .from("templates")
        .select("id,name,cadence_days,is_default,owner_user_id")
        .eq("id", typedProfile.active_template_id)
        .maybeSingle();
      if (activeTemplate) {
        if (!resolvedTemplates.some((item) => item.id === activeTemplate.id)) {
          resolvedTemplates = [...resolvedTemplates, activeTemplate];
        }
      }
    }

    const mappedTemplates: TemplateItem[] =
      resolvedTemplates.map((item) => ({
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

    const activeId = typedProfile?.active_template_id ?? null;
    const sortedTemplates = [...mappedTemplates].sort((a, b) => {
      if (a.id === activeId) return -1;
      if (b.id === activeId) return 1;
      return a.title.localeCompare(b.title);
    });
    setTemplates(sortedTemplates);
    if (
      typedProfile?.active_template_id &&
      mappedTemplates.length > 0 &&
      !mappedTemplates.some(
        (template) => template.id === typedProfile.active_template_id
      )
    ) {
      const fallbackTemplate = mappedTemplates[0];
      setActiveTemplateId(fallbackTemplate.id);
      await supabase.from("profiles").upsert({
        id: resolvedUser.id,
        active_template_id: fallbackTemplate.id,
      });
    }
  }, [resolveAvatarUrl, supabase]);

  const filteredSubjects = useMemo(() => {
    const search = materiaSearch.trim().toLowerCase();
    return subjects.filter((item) => {
      if (!search) return true;
      return item.label.toLowerCase().includes(search);
    });
  }, [subjects, materiaSearch]);

  const activeTemplate = useMemo(
    () => templates.find((item) => item.id === activeTemplateId),
    [templates, activeTemplateId]
  );

  const orderedTemplates = useMemo(() => {
    if (!activeTemplateId) return templates;
    return [...templates].sort((a, b) => {
      if (a.id === activeTemplateId) return -1;
      if (b.id === activeTemplateId) return 1;
      return a.title.localeCompare(b.title);
    });
  }, [templates, activeTemplateId]);

  useEffect(() => {
    const ensureActiveTemplate = async () => {
      if (!activeTemplateId) return;
      if (templates.some((item) => item.id === activeTemplateId)) return;
      const ownerFilter = userId ? `,owner_user_id.eq.${userId}` : "";
      const { data: activeTemplateRow } = await supabase
        .from("templates")
        .select("id,name,cadence_days,is_default,owner_user_id")
        .eq("id", activeTemplateId)
        .or(`is_default.eq.true${ownerFilter}`)
        .maybeSingle();
      if (!activeTemplateRow) return;
      const mappedTemplate: TemplateItem = {
        id: activeTemplateRow.id,
        title: activeTemplateRow.name,
        cadence: activeTemplateRow.cadence_days
          .map((day: number) => `${day}d`)
          .join(", "),
        detail: activeTemplateRow.is_default
          ? "Template predefinido do sistema."
          : "Template personalizado.",
        source: activeTemplateRow.is_default
          ? ("Padrão" as const)
          : ("Personalizado" as const),
        steps: activeTemplateRow.cadence_days,
      };
      setTemplates((prev) => [...prev, mappedTemplate]);
    };

    ensureActiveTemplate();
  }, [activeTemplateId, supabase, templates, userId]);

  useEffect(() => {
    const syncActiveTemplate = async () => {
      if (!templates.length || activeTemplateId) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("active_template_id")
        .eq("id", user.id)
        .maybeSingle();

      const profileActiveId = profile?.active_template_id ?? null;
      if (profileActiveId) {
        const exists = templates.some((item) => item.id === profileActiveId);
        if (exists) {
          setActiveTemplateId(profileActiveId);
          return;
        }
        const { data: activeTemplateRow } = await supabase
          .from("templates")
          .select("id,name,cadence_days,is_default,owner_user_id")
          .eq("id", profileActiveId)
          .maybeSingle();
        if (activeTemplateRow) {
          setTemplates((prev) => [
            ...prev,
            {
              id: activeTemplateRow.id,
              title: activeTemplateRow.name,
              cadence: activeTemplateRow.cadence_days
                .map((day: number) => `${day}d`)
                .join(", "),
              detail: activeTemplateRow.is_default
                ? "Template predefinido do sistema."
                : "Template personalizado.",
              source: activeTemplateRow.is_default
                ? ("Padrão" as const)
                : ("Personalizado" as const),
              steps: activeTemplateRow.cadence_days,
            },
          ]);
          setActiveTemplateId(activeTemplateRow.id);
          return;
        }
      }

      const fallbackTemplate = templates[0];
      setActiveTemplateId(fallbackTemplate.id);
      await supabase.from("profiles").upsert({
        id: user.id,
        active_template_id: fallbackTemplate.id,
      });
    };

    syncActiveTemplate();
  }, [activeTemplateId, supabase, templates]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProfile();
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeTab, loadProfile]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadProfile, supabase]);

  useEffect(() => {
    const handleProfileSync = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          fullName?: string;
          email?: string;
          avatarUrl?: string | null;
        }>
      ).detail;

      if (detail?.fullName) {
        setProfileName(detail.fullName);
        setProfileAvatar(
          detail.fullName
            .split(" ")
            .map((part) => part[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()
        );
      }
      if (detail?.email) {
        setUserEmail(detail.email);
      }
      if (detail?.avatarUrl) {
        resolveAvatarUrl(detail.avatarUrl).then((resolved) => {
          if (resolved) {
            setProfileImageUrl(resolved);
          }
        });
      }
    };

    window.addEventListener("revisame:profile-sync", handleProfileSync);
    return () => {
      window.removeEventListener("revisame:profile-sync", handleProfileSync);
    };
  }, [resolveAvatarUrl]);

  const handleProfileToggle = async () => {
    if (!editingProfile) {
      setProfileSnapshot({
        name: profileName,
        imageUrl: profileImageUrl,
      });
      setEditingProfile(true);
      return;
    }
    if (editingProfile) {
      const resolvedUserId = await resolveUserId();
      if (!resolvedUserId) return;
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: resolvedUserId,
        full_name: profileName,
      });
      if (profileError) {
        addToast({
          variant: "error",
          title: "Não foi possível salvar o perfil.",
          description: profileError.message || "Tente novamente em instantes.",
        });
        return;
      }

      if (pendingAvatarFile) {
        setAvatarStatus("saving");
        const inferredType = pendingAvatarFile.type || "image/jpeg";
        const rawExtension =
          inferredType.split("/")[1] ||
          pendingAvatarFile.name.split(".").pop() ||
          "jpg";
        const extension = rawExtension.split(";")[0];
        const filePath = `${resolvedUserId}/avatar.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, pendingAvatarFile, {
            upsert: true,
            contentType: inferredType,
            cacheControl: "3600",
          });
        if (uploadError) {
          setAvatarStatus("error");
          addToast({
            variant: "error",
            title: "Não foi possível enviar a foto.",
            description:
              uploadError.message || "Tente novamente em instantes.",
          });
          console.error("Erro ao enviar avatar:", uploadError.message);
          return;
        }
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: filePath })
          .eq("id", resolvedUserId);
        if (updateError) {
          setAvatarStatus("error");
          addToast({
            variant: "error",
            title: "Não foi possível salvar a foto.",
            description:
              updateError.message || "Tente novamente em instantes.",
          });
          return;
        }
        const resolved = await resolveAvatarUrl(filePath);
        if (resolved) {
          setProfileImageUrl(resolved);
        }
        setPendingAvatarFile(null);
        setPendingAvatarPreview(null);
        setAvatarStatus("saved");
      }

      addToast({
        variant: "success",
        title: "Perfil atualizado.",
        description: "Suas alterações foram salvas.",
      });
    }
    setEditingProfile(false);
    setProfileSnapshot(null);
  };

  const handleProfileCancel = () => {
    if (profileSnapshot) {
      setProfileName(profileSnapshot.name);
      setProfileImageUrl(profileSnapshot.imageUrl);
    }
    setPendingAvatarFile(null);
    setPendingAvatarPreview(null);
    setAvatarStatus("idle");
    setEditingProfile(false);
    setProfileSnapshot(null);
  };

  const handlePreferencesToggle = async () => {
    if (!editingPreferences) {
      setPreferencesSnapshot(prefMode);
      setEditingPreferences(true);
      return;
    }
    if (editingPreferences) {
      const resolvedUserId = await resolveUserId();
      if (!resolvedUserId) return;
      const { error } = await supabase
        .from("profiles")
        .update({
          theme: prefMode === "Automático" ? null : prefMode,
        })
        .eq("id", resolvedUserId);
      if (error) {
        addToast({
          variant: "error",
          title: "Não foi possível salvar as preferências.",
          description: error.message ?? "Tente novamente em instantes.",
        });
        return;
      }
      if (typeof window !== "undefined") {
        const themeDetail = prefMode === "Automático" ? null : prefMode;
        window.dispatchEvent(
          new CustomEvent("revisame:theme-change", {
            detail: { theme: themeDetail ?? "Automático" },
          })
        );
      }
      addToast({
        variant: "success",
        title: "Preferências salvas.",
        description: "As configurações foram atualizadas.",
      });
    }
    setEditingPreferences(false);
    setPreferencesSnapshot(null);
  };

  const handlePreferencesCancel = () => {
    if (preferencesSnapshot) {
      setPrefMode(preferencesSnapshot);
    }
    setEditingPreferences(false);
    setPreferencesSnapshot(null);
  };

  const handleNotificationsToggle = async () => {
    if (!editingNotifications) {
      setNotificationsSnapshot({
        notifyEmail,
        notifyApp,
        notifyDaily,
        notifyDailyTime,
        notifyWeekly,
        notifyWeeklyDay,
        notifyWeeklyTime,
        notifyOverdueTop,
        notifyPriority,
      });
      setEditingNotifications(true);
      return;
    }
    if (editingNotifications) {
      const resolvedUserId = await resolveUserId();
      if (!resolvedUserId) return;
      const { error } = await supabase.from("profiles").upsert({
        id: resolvedUserId,
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
      if (error) {
        addToast({
          variant: "error",
          title: "Não foi possível salvar notificações.",
          description: "Tente novamente em instantes.",
        });
        return;
      }
      addToast({
        variant: "success",
        title: "Notificações atualizadas.",
        description: "Suas preferências foram salvas.",
      });
    }
    setEditingNotifications(false);
    setNotificationsSnapshot(null);
  };

  const handleNotificationsCancel = () => {
    if (notificationsSnapshot) {
      setNotifyEmail(notificationsSnapshot.notifyEmail);
      setNotifyApp(notificationsSnapshot.notifyApp);
      setNotifyDaily(notificationsSnapshot.notifyDaily);
      setNotifyDailyTime(notificationsSnapshot.notifyDailyTime);
      setNotifyWeekly(notificationsSnapshot.notifyWeekly);
      setNotifyWeeklyDay(notificationsSnapshot.notifyWeeklyDay);
      setNotifyWeeklyTime(notificationsSnapshot.notifyWeeklyTime);
      setNotifyOverdueTop(notificationsSnapshot.notifyOverdueTop);
      setNotifyPriority(notificationsSnapshot.notifyPriority);
    }
    setEditingNotifications(false);
    setNotificationsSnapshot(null);
  };

  const passwordHasMinLength = newPassword.length >= minPasswordLength;
  const isSecurityPasswordValid = passwordHasMinLength;

  const handleSecurityToggle = async () => {
    if (!editingSecurity) {
      setSecuritySnapshot({ currentPassword, newPassword, confirmPassword });
      setEditingSecurity(true);
      return;
    }

    setSecurityMessage("");

    if (!currentPassword) {
      setSecurityStatus("error");
      setSecurityMessage("Informe sua senha atual.");
      addToast({
        variant: "error",
        title: "Senha atual obrigatória.",
        description: "Informe sua senha atual para continuar.",
      });
      return;
    }

    if (!newPassword || !confirmPassword) {
      setSecurityStatus("error");
      setSecurityMessage("Preencha a nova senha e a confirmação.");
      addToast({
        variant: "error",
        title: "Campos obrigatórios.",
        description: "Preencha a nova senha e a confirmação.",
      });
      return;
    }

    if (!isSecurityPasswordValid) {
      setSecurityStatus("error");
      setSecurityMessage(
        `A senha precisa ter no mínimo ${minPasswordLength} caracteres.`
      );
      addToast({
        variant: "error",
        title: "Senha fraca.",
        description: `Use no mínimo ${minPasswordLength} caracteres.`,
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityStatus("error");
      setSecurityMessage("As senhas não coincidem.");
      addToast({
        variant: "error",
        title: "As senhas não coincidem.",
        description: "Verifique e tente novamente.",
      });
      return;
    }

    setSecurityStatus("loading");
    if (!userEmail || userEmail === "—") {
      setSecurityStatus("error");
      setSecurityMessage("Não foi possível validar seu e-mail.");
      addToast({
        variant: "error",
        title: "Não foi possível validar seu e-mail.",
        description: "Tente novamente em instantes.",
      });
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    });

    if (authError) {
      setSecurityStatus("error");
      setSecurityMessage("Senha atual incorreta.");
      addToast({
        variant: "error",
        title: "Senha atual incorreta.",
        description: "Verifique e tente novamente.",
      });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      const rawMessage = error.message.toLowerCase();
      const nextMessage = rawMessage.includes("password") &&
        rawMessage.includes("least")
        ? `A senha precisa ter no mínimo ${minPasswordLength} caracteres.`
        : "Não foi possível atualizar sua senha.";
      setSecurityStatus("error");
      setSecurityMessage(nextMessage);
      addToast({
        variant: "error",
        title: "Não foi possível atualizar sua senha.",
        description:
          nextMessage === "Não foi possível atualizar sua senha."
            ? "Tente novamente em instantes."
            : nextMessage,
      });
      return;
    }

    setSecurityStatus("idle");
    setSecurityMessage("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setEditingSecurity(false);
    setSecuritySnapshot(null);
    addToast({
      variant: "success",
      title: "Senha atualizada.",
      description: "Sua senha foi alterada com sucesso.",
    });
  };

  const handleSecurityCancel = () => {
    if (securitySnapshot) {
      setCurrentPassword(securitySnapshot.currentPassword);
      setNewPassword(securitySnapshot.newPassword);
      setConfirmPassword(securitySnapshot.confirmPassword);
    } else {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setSecurityStatus("idle");
    setSecurityMessage("");
    setEditingSecurity(false);
    setSecuritySnapshot(null);
  };

  const handlePrivacyToggle = () => {
    if (!editingPrivacy) {
      setPrivacySnapshot({ confirmExport, confirmDelete });
      setEditingPrivacy(true);
      return;
    }
    setEditingPrivacy(false);
    setPrivacySnapshot(null);
  };

  const handlePrivacyCancel = () => {
    if (privacySnapshot) {
      setConfirmExport(privacySnapshot.confirmExport);
      setConfirmDelete(privacySnapshot.confirmDelete);
    }
    setEditingPrivacy(false);
    setPrivacySnapshot(null);
  };

  const handleForgotPassword = async () => {
    if (!userEmail || userEmail === "—") {
      setForgotStatus("error");
      setForgotMessage("Não foi possível encontrar seu e-mail.");
      addToast({
        variant: "error",
        title: "Não foi possível encontrar seu e-mail.",
        description: "Tente novamente em instantes.",
      });
      return;
    }
    setForgotStatus("loading");
    setForgotMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${window.location.origin}/recuperar-senha/nova`,
    });

    if (error) {
      setForgotStatus("error");
      setForgotMessage("Não foi possível enviar o link de recuperação.");
      addToast({
        variant: "error",
        title: "Não foi possível enviar o link.",
        description: "Tente novamente em instantes.",
      });
      return;
    }

    setForgotStatus("idle");
    addToast({
      variant: "success",
      title: "Link enviado.",
      description: "Confira sua caixa de entrada.",
    });
    setShowForgotModal(false);
  };

  const editableFieldClass = (isEditing: boolean) =>
    `mt-2 h-11 w-full rounded-md border px-3 text-base text-[var(--text-strong)] disabled:bg-[var(--surface-subtle)] disabled:text-[var(--text-muted)] ${
      isEditing ? "border-[var(--accent-border)] bg-[var(--surface)]" : "border-[var(--border-soft)] bg-[var(--surface-white)]"
    }`;

  const handlePlanChange = async (plan: "Gratuito" | "Premium") => {
    const resolvedUserId = await resolveUserId();
    if (!resolvedUserId) return;
    const { error } = await supabase.from("profiles").upsert({
      id: resolvedUserId,
      plan,
    });
    if (error) {
      addToast({
        variant: "error",
        title: "Não foi possível atualizar o plano.",
        description: "Tente novamente em instantes.",
      });
      return;
    }
    setActivePlan(plan);
    addToast({
      variant: "success",
      title: "Plano atualizado.",
      description: `Plano ${plan} ativo.`,
    });
  };

  return (
    <div className="page-stack">
      <header className="flex flex-col gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-[var(--text-strong)]">
            Configurações
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Ajuste tipo de estudo, matérias, templates e notificações.
          </p>
        </div>
      </header>

      <HorizontalTabsNoArrows
        className="flex w-full max-w-full items-center gap-2 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface-bright)] px-4 py-3 text-sm font-semibold text-[var(--text-medium)] pr-10 sm:pr-12"
      >
        {tabs.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setSelectedTab(item.value)}
            className={`whitespace-nowrap rounded-md px-4 py-2.5 ${
              activeTab === item.value
                ? "bg-[var(--surface-strong)] text-[var(--accent)]"
                : "hover:bg-[var(--surface-hover)]"
            }`}
          >
            <span className="flex items-center gap-2">
              {item.icon}
              {item.label}
            </span>
          </button>
        ))}
      </HorizontalTabsNoArrows>

      {activeTab === "conta" ? (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-6">
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-medium)]">
                <User className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
                Dados pessoais
              </div>
              <div className="mt-3 space-y-3">
                <div className="w-full sm:max-w-sm">
                  <label className="text-xs font-semibold text-[var(--text-muted)]">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    disabled={!editingProfile}
                    placeholder="Seu nome"
                    className={`mt-2 h-11 w-full rounded-md border px-3 text-base text-[var(--text-strong)] disabled:bg-[var(--surface-subtle)] disabled:text-[var(--text-muted)] ${
                      editingProfile
                        ? "border-[var(--accent-border)] bg-[var(--surface)]"
                        : "border-[var(--border-soft)] bg-[var(--surface-white)]"
                    }`}
                  />
                </div>
                <div className="w-full sm:max-w-sm">
                  <label className="text-xs font-semibold text-[var(--text-muted)]">
                    E-mail
                  </label>
                  <span
                    className="mt-2 block"
                    title={
                      editingProfile ? "O e-mail não pode ser alterado." : undefined
                    }
                  >
                    <input
                      type="email"
                      value={userEmail}
                      disabled
                      className="h-11 w-full rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 text-sm text-[var(--text-muted-soft)]"
                    />
                  </span>
                </div>
                <div className="flex w-full sm:max-w-sm items-center gap-3 rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-medium)]">
                  <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-white)] text-sm font-semibold text-[var(--text-muted)]">
                    {pendingAvatarPreview || profileImageUrl ? (
                      <Image
                        src={pendingAvatarPreview || profileImageUrl || ""}
                        alt="Foto do perfil"
                        fill
                        sizes="48px"
                        className="object-cover"
                        unoptimized
                        onError={() => {
                          setProfileImageUrl(null);
                          setPendingAvatarPreview(null);
                          setPendingAvatarFile(null);
                        }}
                      />
                    ) : (
                      profileAvatar
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Foto do perfil</p>
                    <label
                      className={`mt-1 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold ${
                        editingProfile
                          ? "cursor-pointer border-[var(--accent-border)] bg-[var(--surface)] text-[var(--accent)] shadow-[var(--shadow-accent-outline)]"
                          : "border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--text-muted)]"
                      }`}
                    >
                      Selecionar imagem
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={!editingProfile}
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          setPendingAvatarFile(file);
                          setAvatarStatus("idle");
                          const reader = new FileReader();
                          reader.onload = async () => {
                            if (typeof reader.result === "string") {
                              setPendingAvatarPreview(reader.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                    />
                    </label>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-[var(--text-muted)]">
                {avatarStatus === "saving" && "Salvando foto..."}
                {avatarStatus === "saved" && "Foto atualizada com sucesso."}
                {avatarStatus === "error" &&
                  "Não foi possível atualizar a foto."}
              </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    className={`min-h-[44px] rounded-md px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 ${
                      editingProfile
                        ? "bg-[var(--accent-bg)] text-[var(--text-on-accent)]"
                        : "border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--text-medium)]"
                    }`}
                    onClick={handleProfileToggle}
                  >
                    {!editingProfile ? (
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    ) : null}
                    {editingProfile ? "Salvar dados" : "Editar dados"}
                  </button>
                  {editingProfile ? (
                    <button
                      className="min-h-[44px] h-11 rounded-md border border-[var(--border)] bg-[var(--surface-neutral)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] inline-flex items-center gap-2"
                      onClick={handleProfileCancel}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                      Cancelar
                    </button>
                  ) : null}
                </div>
            </div>

            <div className="border-t border-[var(--border)] pt-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-medium)]">
                <Sun className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
                Preferências do sistema
              </div>
              <div className="mt-3 space-y-3 text-sm text-[var(--text-medium)]">
                <div className="w-full sm:max-w-sm">
                  <label className="text-xs font-semibold text-[var(--text-muted)]">
                    Tema
                  </label>
                <select
                  className={editableFieldClass(editingPreferences)}
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
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  className={`min-h-[44px] h-11 rounded-md px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 ${
                    editingPreferences
                      ? "bg-[var(--accent-bg)] text-[var(--text-on-accent)]"
                      : "border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--text-medium)]"
                  }`}
                  onClick={handlePreferencesToggle}
                >
                  {!editingPreferences ? (
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  ) : null}
                  {editingPreferences
                    ? "Salvar preferências"
                    : "Ajustar preferências"}
                </button>
                {editingPreferences ? (
                  <button
                    className="min-h-[44px] h-11 rounded-md border border-[var(--border)] bg-[var(--surface-neutral)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] inline-flex items-center gap-2"
                    onClick={handlePreferencesCancel}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    Cancelar
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "materias" ? (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-6">
          <div className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                  Matérias
                </p>
                <h2 className="text-xl font-semibold text-[var(--text-strong)]">
                  Cadastro de matérias.
                </h2>
              </div>
              <button
                className="w-full rounded-md bg-[var(--accent-bg)] px-4 py-2 text-sm font-semibold min-h-[44px] text-[var(--text-on-accent)] shadow-[var(--shadow-accent-strong)] sm:w-auto"
                onClick={() => setShowMateriaModal(true)}
              >
                Adicionar matéria
              </button>
            </div>

            <div className="grid gap-3 text-sm text-[var(--text-medium)] sm:grid-cols-2">
              <div className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-3">
                Total cadastradas: {filteredSubjects.length}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <div className="w-full">
                <label className="text-xs font-semibold text-[var(--text-muted)]">
                  Buscar matéria
                </label>
                <input
                  type="text"
                  value={materiaSearch}
                  onChange={(event) => setMateriaSearch(event.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border-soft)] bg-[var(--surface-white)] px-3 text-base text-[var(--text-strong)]"
                  placeholder="Digite para filtrar"
                />
              </div>
              <div className="w-full">
                <label className="text-xs font-semibold text-[var(--text-muted)]">
                  Status
                </label>
                <select
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border-soft)] bg-[var(--surface-white)] px-3 text-base text-[var(--text-strong)]"
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

            <div className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-4">
              <h3 className="text-sm font-semibold text-[var(--text-medium)]">
                Matérias cadastradas
              </h3>
              <div className="mt-3 space-y-2">
                {filteredSubjects.length === 0 ? (
                  <div className="flex flex-col gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-3 text-xs text-[var(--text-muted)]">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-medium)]">
                        <Smile className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="font-semibold text-[var(--text-medium)]">
                          Nenhuma matéria cadastrada.
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Comece adicionando as matérias que você estuda.
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      Passos: clique em “Adicionar matéria” e escolha as
                      matérias do seu objetivo.
                    </div>
                  </div>
                ) : (
                  filteredSubjects.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-white)] px-3 py-2 text-xs text-[var(--text-medium)]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{item.label}</span>
                        <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px] uppercase text-[var(--text-muted)]">
                          {item.isDefault ? "Padrão" : "Personalizada"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!item.isDefault ? (
                          <button
                            className="min-h-[44px] rounded-md px-3 py-2 text-xs font-semibold text-[var(--accent)]"
                            onClick={() => {
                              setMateriaBeingEdited(item);
                              setEditMateriaName(item.label);
                              setShowEditMateriaModal(true);
                            }}
                          >
                            Editar
                          </button>
                        ) : null}
                        <button
                          className="min-h-[44px] rounded-md px-3 py-2 text-xs font-semibold text-[var(--accent-warm)]"
                          onClick={() => {
                            setMateriaToDelete(item);
                            setShowDeleteMateriaModal(true);
                          }}
                        >
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
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                Templates
              </p>
              <h2 className="text-xl font-semibold text-[var(--text-strong)]">
                Ritmos prontos e personalizáveis.
              </h2>
            </div>
            <button
              className="cursor-pointer rounded-md bg-[var(--accent-bg)] px-4 py-2 text-sm font-semibold min-h-[44px] text-[var(--text-on-accent)] shadow-[var(--shadow-accent-strong)]"
              onClick={() => setShowTemplateModal(true)}
            >
              Criar template
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {orderedTemplates.map((template) => {
              const isActive = template.id === activeTemplateId;
              return (
                <div
                  key={template.id}
                  className={`rounded-md border p-4 ${
                    isActive
                      ? "border-2 border-[var(--accent-border)] bg-[var(--surface-success)] shadow-[var(--shadow-accent-soft)]"
                      : "border-[var(--border-soft)] bg-[var(--surface-subtle)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-base font-semibold text-[var(--text-strong)]">
                      {template.title}
                    </p>
                    {isActive ? (
                      <span className="rounded-full bg-[var(--accent-bg)] px-2 py-1 text-[10px] uppercase text-[var(--text-white)]">
                        Ativo
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-[var(--accent)]">
                    {template.cadence}
                  </p>
                  <p className="mt-3 text-sm text-[var(--text-muted)]">
                    {template.detail}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {isActive ? (
                      <span className="text-xs font-semibold text-[var(--accent)]">
                        Este é o template ativo.
                      </span>
                    ) : (
                      <button
                        className="min-h-[44px] rounded-md px-3 py-2 text-xs font-semibold text-[var(--accent)]"
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
                          className="min-h-[44px] rounded-md px-3 py-2 text-xs font-semibold text-[var(--text-medium)]"
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
                        <button className="min-h-[44px] rounded-md px-3 py-2 text-xs font-semibold text-[var(--accent-warm)]">
                          Excluir
                        </button>
                      </>
                    ) : (
                      <button className="min-h-[44px] rounded-md px-3 py-2 text-xs font-semibold text-[var(--text-muted)]">
                        Duplicar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-4">
            <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">
              Prévia de cadência atual
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-medium)]">
              {activeTemplate?.steps?.length ? (
                activeTemplate.steps.map((step) => (
                  <span
                    key={step}
                    className="rounded-full border border-[var(--border)] bg-[var(--surface-white)] px-3 py-1"
                  >
                    {step} {step === 1 ? "dia" : "dias"}
                  </span>
                ))
              ) : (
                <div className="flex flex-col gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-3 text-xs text-[var(--text-muted)]">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-medium)]">
                      <Smile className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-semibold text-[var(--text-medium)]">
                        Nenhum template ativo.
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Ative um template para ver a cadência aqui.
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Passos: clique em “Ativar” em um template disponível.
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "notificacoes" ? (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-6">
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-medium)]">
                <SlidersHorizontal
                  className="h-5 w-5 text-[var(--accent)]"
                  aria-hidden="true"
                />
                Canais de aviso
              </div>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Defina por onde deseja receber lembretes e alertas.
              </p>
              <div className="mt-3 grid gap-3 text-sm text-[var(--text-medium)]">
                <div className="w-full sm:max-w-sm">
                  <label className="text-xs font-semibold text-[var(--text-muted)]">
                    E-mail
                  </label>
                  <select
                    className={editableFieldClass(editingNotifications)}
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
                <div className="w-full sm:max-w-sm">
                  <label className="text-xs font-semibold text-[var(--text-muted)]">
                    Aplicativo
                  </label>
                  <select
                    className={editableFieldClass(editingNotifications)}
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

            <div className="border-t border-[var(--border)] pt-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-medium)]">
                <Calendar className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
                Rotina de lembretes
              </div>
              <div className="mt-3 grid gap-3 text-sm text-[var(--text-medium)]">
                <div className="w-full sm:max-w-sm">
                  <label className="text-xs font-semibold text-[var(--text-muted)]">
                    Lembrete diário
                  </label>
                  <select
                    className={editableFieldClass(editingNotifications)}
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
                <div className="w-full sm:max-w-sm">
                  <label className="text-xs font-semibold text-[var(--text-muted)]">
                    Horário do lembrete diário
                  </label>
                  <input
                    type="time"
                    value={notifyDailyTime}
                    onChange={(event) => setNotifyDailyTime(event.target.value)}
                    disabled={!editingNotifications}
                    className={editableFieldClass(editingNotifications)}
                  />
                </div>
                <div className="w-full sm:max-w-sm">
                  <label className="text-xs font-semibold text-[var(--text-muted)]">
                    Resumo semanal
                  </label>
                  <select
                    className={editableFieldClass(editingNotifications)}
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
                <div className="w-full sm:max-w-sm">
                  <label className="text-xs font-semibold text-[var(--text-muted)]">
                    Dia do resumo
                  </label>
                  <select
                    className={editableFieldClass(editingNotifications)}
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
                <div className="w-full sm:max-w-sm">
                  <label className="text-xs font-semibold text-[var(--text-muted)]">
                    Horário do resumo semanal
                  </label>
                  <input
                    type="time"
                    value={notifyWeeklyTime}
                    onChange={(event) => setNotifyWeeklyTime(event.target.value)}
                    disabled={!editingNotifications}
                    className={editableFieldClass(editingNotifications)}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-medium)]">
                <AlertCircle
                  className="h-5 w-5 text-[var(--accent)]"
                  aria-hidden="true"
                />
                Prioridades de alerta
              </div>
              <div className="mt-3 space-y-3 text-sm text-[var(--text-medium)]">
                <div className="w-full sm:max-w-sm">
                  <label className="text-xs font-semibold text-[var(--text-muted)]">
                    Revisões atrasadas no topo
                  </label>
                  <select
                    className={editableFieldClass(editingNotifications)}
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
                <div className="w-full sm:max-w-sm">
                  <label className="text-xs font-semibold text-[var(--text-muted)]">
                    Nível de urgência
                  </label>
                  <select
                    className={editableFieldClass(editingNotifications)}
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

            <div className="border-t border-[var(--border)] pt-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-medium)]">
                <MessageSquare
                  className="h-5 w-5 text-[var(--accent)]"
                  aria-hidden="true"
                />
                Prévia das notificações
              </div>
              <div className="mt-3 w-full sm:max-w-sm rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-medium)]">
                <p>Hoje você tem 3 revisões pendentes.</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Lembrete diário programado para {notifyDailyTime}. Resumo
                  semanal em {notifyWeeklyDay} às {notifyWeeklyTime}.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className={`min-h-[44px] rounded-md px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 ${
                  editingNotifications
                    ? "bg-[var(--accent-bg)] text-[var(--text-on-accent)]"
                    : "border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--text-medium)]"
                }`}
                onClick={handleNotificationsToggle}
              >
                {!editingNotifications ? (
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                ) : null}
                {editingNotifications
                  ? "Salvar notificações"
                  : "Editar notificações"}
              </button>
              {editingNotifications ? (
                <button
                  className="min-h-[44px] h-11 rounded-md border border-[var(--border)] bg-[var(--surface-neutral)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] inline-flex items-center gap-2"
                  onClick={handleNotificationsCancel}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Cancelar
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "seguranca" ? (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-6">
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-medium)]">
                <Shield className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
                Acesso e senha
              </div>
              <div className="mt-3 grid gap-3 text-sm text-[var(--text-medium)]">
                <div className="w-full sm:max-w-sm">
                  <label className="text-xs font-semibold text-[var(--text-muted)]">
                    Senha atual
                  </label>
                  <input
                    type="password"
                    value={editingSecurity ? currentPassword : "********"}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    disabled={!editingSecurity}
                    className={editableFieldClass(editingSecurity)}
                    placeholder={editingSecurity ? "Digite sua senha atual" : ""}
                  />
                  <button
                    className="mt-2 text-xs font-semibold text-[var(--accent)]"
                    onClick={() => setShowForgotModal(true)}
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <div className="w-full sm:max-w-sm">
                  <label className="text-xs font-semibold text-[var(--text-muted)]">
                    Nova senha
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    disabled={!editingSecurity}
                    className={editableFieldClass(editingSecurity)}
                  />
                  {editingSecurity ? (
                    <div className="mt-2 text-xs text-[var(--text-muted)]">
                      <span
                        className={
                          passwordHasMinLength ? "text-[var(--accent)]" : undefined
                        }
                      >
                        {passwordHasMinLength ? "✓" : "•"} Mínimo de{" "}
                        {minPasswordLength} caracteres
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="w-full sm:max-w-sm">
                  <label className="text-xs font-semibold text-[var(--text-muted)]">
                    Confirmar senha
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    disabled={!editingSecurity}
                    className={editableFieldClass(editingSecurity)}
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className={`min-h-[44px] rounded-md px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 ${
                    editingSecurity
                      ? "bg-[var(--accent-bg)] text-[var(--text-on-accent)] disabled:bg-[var(--accent-bg-disabled)]"
                      : "border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--text-medium)]"
                  }`}
                  onClick={handleSecurityToggle}
                  disabled={
                    securityStatus === "loading" ||
                    (editingSecurity &&
                      (!currentPassword ||
                        !newPassword ||
                        !confirmPassword ||
                        !isSecurityPasswordValid ||
                        newPassword !== confirmPassword))
                  }
                >
                {!editingSecurity ? (
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                ) : null}
                  {editingSecurity ? "Salvar segurança" : "Editar segurança"}
                </button>
                {editingSecurity ? (
                  <button
                    className="min-h-[44px] h-11 rounded-md border border-[var(--border)] bg-[var(--surface-neutral)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] inline-flex items-center gap-2"
                    onClick={handleSecurityCancel}
                    disabled={securityStatus === "loading"}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    Cancelar
                  </button>
                ) : null}
              </div>
              {securityStatus === "error" ? (
                <div className="mt-3 rounded-md border border-[var(--border-warm)] bg-[var(--surface-warm)] px-4 py-3 text-xs text-[var(--accent-warm)]">
                  {securityMessage}
                </div>
              ) : null}
            </div>

          </div>
        </section>
      ) : null}

      {activeTab === "privacidade" ? (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-6">
          <div className="space-y-4 text-sm text-[var(--text-medium)]">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-medium)]">
              <Lock className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
              Privacidade
            </div>
            <label
              className={`flex w-full sm:max-w-sm items-center gap-3 rounded-md border px-4 py-3 ${
                editingPrivacy
                  ? "border-[var(--accent-border)] bg-[var(--surface)]"
                  : "border-[var(--border-soft)] bg-[var(--surface-subtle)]"
              }`}
            >
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={confirmExport}
                onChange={(event) => setConfirmExport(event.target.checked)}
                disabled={!editingPrivacy}
              />
              Exportar todos os dados
            </label>
            <label
              className={`flex w-full sm:max-w-sm items-center gap-3 rounded-md border px-4 py-3 ${
                editingPrivacy
                  ? "border-[var(--accent-border)] bg-[var(--surface)]"
                  : "border-[var(--border-soft)] bg-[var(--surface-subtle)]"
              }`}
            >
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
                className={`min-h-[44px] rounded-md px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 ${
                  editingPrivacy
                    ? "bg-[var(--accent-bg)] text-[var(--text-on-accent)]"
                    : "border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--text-medium)]"
                }`}
                onClick={handlePrivacyToggle}
              >
                {!editingPrivacy ? (
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                ) : null}
                {editingPrivacy ? "Salvar privacidade" : "Editar privacidade"}
              </button>
              {editingPrivacy ? (
                <button
                  className="min-h-[44px] h-11 rounded-md border border-[var(--border)] bg-[var(--surface-neutral)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] inline-flex items-center gap-2"
                  onClick={handlePrivacyCancel}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Cancelar
                </button>
              ) : null}
              <button
                className="rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2 text-sm font-semibold min-h-[44px] text-[var(--text-medium)]"
                disabled={!editingPrivacy || (!confirmExport && !confirmDelete)}
              >
                Aplicar ajustes
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "planos" ? (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                Planos
              </p>
              <h2 className="text-xl font-semibold text-[var(--text-strong)]">
                Escolha o plano ideal para sua rotina.
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
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
                      ? "border-2 border-[var(--accent-border)] bg-[var(--surface-success)] shadow-[var(--shadow-accent-soft)]"
                      : "border-[var(--border-soft)] bg-[var(--surface-subtle)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-base font-semibold text-[var(--text-strong)]">
                      {plan.name}
                    </p>
                    {isActive ? (
                      <span className="rounded-full bg-[var(--accent-bg)] px-2 py-1 text-[10px] uppercase text-[var(--text-white)]">
                        Ativo
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xl font-semibold text-[var(--accent)]">
                    {plan.price}
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">{plan.desc}</p>
                  <ul className="mt-4 space-y-2 text-xs text-[var(--text-medium)]">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-bg)]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5">
                    {isActive ? (
                      <span className="text-xs font-semibold text-[var(--accent)]">
                        Este é o seu plano atual.
                      </span>
                    ) : (
                      <button
                        className="rounded-md bg-[var(--accent-bg)] px-4 py-2 text-sm font-semibold min-h-[44px] text-[var(--text-on-accent)]"
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
      <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4">
        <div className="w-full max-w-md rounded-lg bg-[var(--surface)] p-5 modal-shadow sm:p-6 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-[var(--text-strong)]">
              Adicionar matéria
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Essa matéria ficará disponível na sua conta.
            </p>
            <div className="mt-4">
              <label className="text-xs font-semibold text-[var(--text-muted)]">
                Nome da matéria
              </label>
              <input
                type="text"
                className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface-white)] px-3 text-base text-[var(--text-strong)]"
                value={novaMateria}
                onChange={(event) => setNovaMateria(event.target.value)}
                placeholder="Ex: Direito Tributário"
              />
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                className="rounded-md bg-[var(--accent-bg)] px-4 py-2 text-sm font-semibold min-h-[44px] text-[var(--text-on-accent)] disabled:cursor-not-allowed disabled:bg-[var(--accent-disabled)]"
                disabled={!novaMateria.trim()}
                onClick={async () => {
                  if (!userId) return;
                  const trimmed = novaMateria.trim();
                  if (!trimmed) return;

                  const { data: createdSubject, error } = await supabase
                    .from("subjects")
                    .insert({
                      name: trimmed,
                      is_default: false,
                      owner_user_id: userId,
                    })
                    .select("id,name,is_default")
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
                      user_id: userId,
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

                  setSubjects((prev) => [
                    ...prev,
                    {
                      id: createdSubject.id,
                      label: createdSubject.name,
                      isDefault: createdSubject.is_default,
                    },
                  ]);
                  setNovaMateria("");
                  setShowMateriaModal(false);
                  addToast({
                    variant: "success",
                    title: "Matéria cadastrada.",
                    description: "Já disponível no sistema.",
                  });
                }}
              >
                Salvar matéria
              </button>
              <button
                className="rounded-md border border-[var(--border-neutral)] bg-[var(--surface-neutral)] px-4 py-2 text-sm font-semibold min-h-[44px] h-11 text-[var(--text-muted)]"
                onClick={() => {
                  setNovaMateria("");
                  setShowMateriaModal(false);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showEditMateriaModal && materiaBeingEdited ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4">
        <div className="w-full max-w-md rounded-lg bg-[var(--surface)] p-5 modal-shadow sm:p-6 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-[var(--text-strong)]">
              Editar matéria
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Atualize o nome da matéria para manter seu banco organizado.
            </p>
            <div className="mt-4">
              <label className="text-xs font-semibold text-[var(--text-muted)]">
                Nome da matéria
              </label>
              <input
                type="text"
                className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface-white)] px-3 text-base text-[var(--text-strong)]"
                value={editMateriaName}
                onChange={(event) => setEditMateriaName(event.target.value)}
                placeholder="Ex: Direito Constitucional"
              />
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                className="rounded-md bg-[var(--accent-bg)] px-4 py-2 text-sm font-semibold min-h-[44px] text-[var(--text-on-accent)] disabled:cursor-not-allowed disabled:bg-[var(--accent-disabled)]"
                disabled={!editMateriaName.trim()}
                onClick={async () => {
                  if (!materiaBeingEdited) return;
                  if (materiaBeingEdited.isDefault) {
                    addToast({
                      variant: "error",
                      title: "Matéria padrão não pode ser editada.",
                      description: "Crie uma personalizada para editar.",
                    });
                    return;
                  }

                  const trimmed = editMateriaName.trim();
                  if (!trimmed) return;

                  const { data: updated, error } = await supabase
                    .from("subjects")
                    .update({ name: trimmed })
                    .eq("id", materiaBeingEdited.id)
                    .select("id,name")
                    .single();

                  if (error || !updated) {
                    addToast({
                      variant: "error",
                      title: "Não foi possível atualizar a matéria.",
                      description: "Tente novamente em instantes.",
                    });
                    return;
                  }

                  setSubjects((prev) =>
                    prev.map((item) =>
                      item.id === updated.id
                        ? { ...item, label: updated.name }
                        : item
                    )
                  );
                  setShowEditMateriaModal(false);
                  setMateriaBeingEdited(null);
                  setEditMateriaName("");
                  addToast({
                    variant: "success",
                    title: "Matéria atualizada.",
                    description: "O novo nome já está salvo.",
                  });
                }}
              >
                Salvar alterações
              </button>
              <button
                className="rounded-md border border-[var(--border-neutral)] bg-[var(--surface-neutral)] px-4 py-2 text-sm font-semibold min-h-[44px] h-11 text-[var(--text-muted)]"
                onClick={() => {
                  setShowEditMateriaModal(false);
                  setMateriaBeingEdited(null);
                  setEditMateriaName("");
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteMateriaModal && materiaToDelete ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4">
        <div className="w-full max-w-md rounded-lg bg-[var(--surface)] p-5 modal-shadow sm:p-6 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-[var(--text-strong)]">
              Remover matéria
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Tem certeza que deseja remover{" "}
              <span className="font-semibold text-[var(--accent)]">
                {materiaToDelete.label}
              </span>{" "}
              da sua lista?
            </p>
            <div className="mt-4 rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-medium)]">
              A matéria será removida apenas do seu perfil. Você pode cadastrar
              novamente quando precisar.
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                className="rounded-md bg-[var(--accent-warm-strong-bg)] px-4 py-2 text-sm font-semibold min-h-[44px] text-[var(--text-on-accent)]"
                onClick={async () => {
                  if (!materiaToDelete) return;
                  if (materiaToDelete.isDefault) {
                    addToast({
                      variant: "error",
                      title: "Matéria padrão não pode ser removida.",
                      description: "Crie uma personalizada para editar.",
                    });
                    return;
                  }
                  if (!userId) {
                    addToast({
                      variant: "error",
                      title: "Você precisa estar autenticado.",
                      description: "Faça login para remover matérias.",
                    });
                    return;
                  }

                  const { error } = await supabase
                    .from("user_subjects")
                    .delete()
                    .eq("user_id", userId)
                    .eq("subject_id", materiaToDelete.id);

                  if (error) {
                    addToast({
                      variant: "error",
                      title: "Não foi possível remover a matéria.",
                      description: "Tente novamente em instantes.",
                    });
                    return;
                  }

                  setSubjects((prev) =>
                    prev.filter((item) => item.id !== materiaToDelete.id)
                  );
                  setShowDeleteMateriaModal(false);
                  setMateriaToDelete(null);
                  addToast({
                    variant: "success",
                    title: "Matéria removida.",
                    description: "Ela não aparece mais na sua lista.",
                  });
                }}
              >
                Confirmar remoção
              </button>
              <button
                className="rounded-md border border-[var(--border-neutral)] bg-[var(--surface-neutral)] px-4 py-2 text-sm font-semibold min-h-[44px] h-11 text-[var(--text-muted)]"
                onClick={() => {
                  setShowDeleteMateriaModal(false);
                  setMateriaToDelete(null);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showTemplateModal ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4">
        <div className="w-full max-w-md rounded-lg bg-[var(--surface)] p-5 modal-shadow sm:p-6 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-[var(--text-strong)]">
              {templateMode === "edit" ? "Editar template" : "Criar template"}
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Defina o nome e os intervalos em dias.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)]">
                  Nome do template
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface-white)] px-3 text-base text-[var(--text-strong)]"
                  placeholder="Ex: Revisão rápida"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)]">
                  Cadência (em dias)
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    type="number"
                    min={1}
                    value={cadenceInput}
                    onChange={(event) => setCadenceInput(event.target.value)}
                    className="h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface-white)] px-3 text-base text-[var(--text-strong)]"
                    placeholder="Adicionar dias"
                  />
                  <button
                    type="button"
                    className="rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-3 text-xs font-semibold text-[var(--text-medium)]"
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
              <div className="flex flex-wrap gap-2 text-xs text-[var(--text-medium)]">
                {templateCadence.map((step) => (
                  <button
                    key={step}
                    type="button"
                    className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-white)] px-3 py-1"
                    onClick={() =>
                      setTemplateCadence((prev) =>
                        prev.filter((item) => item !== step)
                      )
                    }
                  >
                    {step}d
                    <span className="text-[10px] text-[var(--accent-warm)]">remover</span>
                  </button>
                ))}
              </div>
              <div className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2 text-xs text-[var(--text-muted)]">
                Sequência: {templateCadence.map((step) => `${step}d`).join(", ")}
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                className="cursor-pointer rounded-md bg-[var(--accent-bg)] px-4 py-2 text-sm font-semibold min-h-[44px] text-[var(--text-on-accent)] disabled:cursor-not-allowed disabled:bg-[var(--accent-disabled)]"
                disabled={!templateName.trim() || templateCadence.length === 0}
                onClick={async () => {
                  if (!userId) return;
                  const trimmed = templateName.trim();
                  if (!trimmed) return;

                  if (templateMode === "edit" && templateBeingEdited) {
                    const { data: updated, error: updateError } = await supabase
                      .from("templates")
                      .update({
                        name: trimmed,
                        cadence_days: templateCadence,
                      })
                      .eq("id", templateBeingEdited)
                      .select("id,name,cadence_days,is_default,owner_user_id")
                      .single();

                    if (updateError || !updated) {
                      addToast({
                        variant: "error",
                        title: "Não foi possível salvar o template.",
                        description: "Tente novamente em instantes.",
                      });
                      return;
                    }

                    const cadenceDays = (updated.cadence_days ??
                      []) as number[];
                    const cadenceLabel = cadenceDays
                      .map((day) => `${day}d`)
                      .join(", ");
                    const source: TemplateItem["source"] = updated.is_default
                      ? "Padrão"
                      : "Personalizado";
                    setTemplates((prev) =>
                      prev
                        .map((item) =>
                          item.id === updated.id
                            ? {
                                ...item,
                                title: updated.name,
                                cadence: cadenceLabel,
                                steps: cadenceDays,
                                source,
                                detail: updated.is_default
                                  ? "Template predefinido do sistema."
                                  : "Template personalizado.",
                              }
                            : item
                        )
                        .sort((a, b) => {
                          if (a.id === activeTemplateId) return -1;
                          if (b.id === activeTemplateId) return 1;
                          return a.title.localeCompare(b.title);
                        })
                    );
                    addToast({
                      variant: "success",
                      title: "Template atualizado.",
                      description: "As mudanças foram salvas.",
                    });
                  } else {
                    const { data: created, error: createError } = await supabase
                      .from("templates")
                      .insert({
                        name: trimmed,
                        cadence_days: templateCadence,
                        is_default: false,
                        owner_user_id: userId,
                      })
                      .select("id,name,cadence_days,is_default,owner_user_id")
                      .single();

                    if (createError || !created) {
                      addToast({
                        variant: "error",
                        title: "Não foi possível criar o template.",
                        description: "Tente novamente em instantes.",
                      });
                      return;
                    }

                    const createdCadence = (created.cadence_days ??
                      []) as number[];
                    const createdLabel = createdCadence
                      .map((day: number) => `${day}d`)
                      .join(", ");
                    const source: TemplateItem["source"] = "Personalizado";
                    setTemplates((prev) => [
                      ...prev,
                      {
                        id: created.id,
                        title: created.name,
                        cadence: createdLabel,
                        detail: "Template personalizado.",
                        source,
                        steps: createdCadence,
                      },
                    ].sort((a, b) => {
                      if (a.id === activeTemplateId) return -1;
                      if (b.id === activeTemplateId) return 1;
                      return a.title.localeCompare(b.title);
                    }));
                    addToast({
                      variant: "success",
                      title: "Template criado.",
                      description: "Já disponível para ativação.",
                    });
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
              <button
                className="cursor-pointer rounded-md border border-[var(--border-neutral)] bg-[var(--surface-neutral)] px-4 py-2 text-sm font-semibold min-h-[44px] h-11 text-[var(--text-muted)]"
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
            </div>
          </div>
        </div>
      ) : null}

      {showActivateModal && templateToActivate ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4">
        <div className="w-full max-w-md rounded-lg bg-[var(--surface)] p-5 modal-shadow sm:p-6 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-[var(--text-strong)]">
              Ativar template
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Tem certeza que deseja ativar o template{" "}
              <span className="font-semibold text-[var(--accent)]">
                {templateToActivate.title}
              </span>
              ?
            </p>
            <div className="mt-4 rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-medium)]">
              O novo template será usado nas próximas revisões. As revisões
              anteriores seguirão o template usado no momento do estudo.
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                className="cursor-pointer rounded-md bg-[var(--accent-bg)] px-4 py-2 text-sm font-semibold min-h-[44px] text-[var(--text-on-accent)]"
                onClick={async () => {
                  const resolvedUserId = await resolveUserId();
                  if (!resolvedUserId) return;
                  const { data: updatedProfile, error: updateError } =
                    await supabase
                      .from("profiles")
                      .update({ active_template_id: templateToActivate.id })
                      .eq("id", resolvedUserId)
                      .select("id")
                      .maybeSingle();

                  if (updateError) {
                    console.error(updateError);
                    addToast({
                      variant: "error",
                      title: "Não foi possível ativar o template.",
                      description: "Tente novamente em instantes.",
                    });
                    return;
                  }

                  if (!updatedProfile) {
                    const safeName =
                      profileName ||
                      (userEmail !== "—"
                        ? userEmail.split("@")[0]
                        : "Aluno");
                    const { error: insertError } = await supabase
                      .from("profiles")
                      .upsert({
                        id: resolvedUserId,
                        full_name: safeName,
                        active_template_id: templateToActivate.id,
                      });
                    if (insertError) {
                      console.error(insertError);
                      addToast({
                        variant: "error",
                        title: "Não foi possível ativar o template.",
                        description: "Tente novamente em instantes.",
                      });
                      return;
                    }
                  }

                  setActiveTemplateId(templateToActivate.id);
                  setTemplates((prev) =>
                    [...prev].sort((a, b) => {
                      if (a.id === templateToActivate.id) return -1;
                      if (b.id === templateToActivate.id) return 1;
                      return a.title.localeCompare(b.title);
                    })
                  );
                  setShowActivateModal(false);
                  setTemplateToActivate(null);
                  addToast({
                    variant: "success",
                    title: "Template ativado.",
                    description: "Passa a valer para novos estudos.",
                  });
                }}
              >
                Confirmar ativação
              </button>
              <button
                className="cursor-pointer rounded-md border border-[var(--border-neutral)] bg-[var(--surface-neutral)] px-4 py-2 text-sm font-semibold min-h-[44px] h-11 text-[var(--text-muted)]"
                onClick={() => {
                  setShowActivateModal(false);
                  setTemplateToActivate(null);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showForgotModal ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4">
        <div className="w-full max-w-md rounded-lg bg-[var(--surface)] p-5 modal-shadow sm:p-6 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-[var(--text-strong)]">
              Recuperar senha
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Deseja enviar um link de recuperação de senha para o e-mail da
              conta?
            </p>
            <div className="mt-4 rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-medium)]">
              E-mail: {userEmail}
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                className="rounded-md bg-[var(--accent-bg)] px-4 py-2 text-sm font-semibold min-h-[44px] text-[var(--text-on-accent)]"
                onClick={handleForgotPassword}
                disabled={forgotStatus === "loading"}
              >
                {forgotStatus === "loading" ? "Enviando..." : "Enviar link"}
              </button>
              <button
                className="rounded-md border border-[var(--border-neutral)] bg-[var(--surface-neutral)] px-4 py-2 text-sm font-semibold min-h-[44px] h-11 text-[var(--text-muted)]"
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotStatus("idle");
                  setForgotMessage("");
                }}
                disabled={forgotStatus === "loading"}
              >
                Cancelar
              </button>
            </div>
            {forgotStatus === "error" ? (
              <div className="mt-3 rounded-md border border-[var(--border-warm)] bg-[var(--surface-warm)] px-4 py-3 text-xs text-[var(--accent-warm)]">
                {forgotMessage}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
