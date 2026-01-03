"use client";

import Image from "next/image";
import logoRevisame from "@/public/images/logo-revisame.svg";
import logoRevisameDark from "@/public/images/logo-revisame-dark.svg";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarCheck,
  Home,
  Menu,
  Settings,
  SquarePlus,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ReviewTimerBar from "@/app/components/review-timer-bar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [menuState, setMenuState] = useState(() => ({
    open: false,
    pathname,
  }));
  const [profileName, setProfileName] = useState("—");
  const [profileEmail, setProfileEmail] = useState("—");
  const [timerOffset, setTimerOffset] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const navItems = [
    {
      label: "Inicio",
      href: "/",
      icon: <Home className="h-5 w-5 text-[var(--text-muted)]" aria-hidden="true" />,
    },
    {
      label: "Revisões",
      href: "/revisoes",
      icon: (
        <CalendarCheck className="h-5 w-5 text-[var(--text-muted)]" aria-hidden="true" />
      ),
    },
    {
      label: "Adicionar",
      href: "/adicionar",
      icon: (
        <SquarePlus className="h-5 w-5 text-[var(--text-muted)]" aria-hidden="true" />
      ),
    },
    {
      label: "Relatórios",
      href: "/relatorios",
      icon: (
        <BarChart3 className="h-5 w-5 text-[var(--text-muted)]" aria-hidden="true" />
      ),
    },
    {
      label: "Configurações",
      href: "/configuracoes",
      icon: (
        <Settings className="h-5 w-5 text-[var(--text-muted)]" aria-hidden="true" />
      ),
    },
  ];
  const homeHref = navItems[0]?.href ?? "/";
  const isMenuOpen = menuState.open && menuState.pathname === pathname;
  const openMenu = () => setMenuState({ open: true, pathname });
  const closeMenu = () => setMenuState({ open: false, pathname });

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        setProfileEmail(user.email);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name,avatar_url,theme")
        .eq("id", user?.id ?? "")
        .maybeSingle();

      const fallbackName =
        profile?.full_name ||
        (user?.user_metadata?.full_name as string | undefined) ||
        user?.email?.split("@")[0];

      if (fallbackName) {
        setProfileName(fallbackName);
      }
      if (typeof window !== "undefined") {
        if (profile?.theme || profile?.theme === null) {
          const themeValue = profile?.theme ?? "Automático";
          window.dispatchEvent(
            new CustomEvent("revisame:theme-change", {
              detail: { theme: themeValue },
            })
          );
        }
        window.dispatchEvent(
          new CustomEvent("revisame:profile-sync", {
            detail: {
              fullName: fallbackName ?? "",
              email: user?.email ?? "",
              avatarUrl: profile?.avatar_url ?? null,
            },
          })
        );
      }
    };

    loadProfile();
  }, [supabase]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 1024px)");
    const handleChange = () => setIsDesktop(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const handleOffset = (event: Event) => {
      const detail = (event as CustomEvent<{ offset: number }>).detail;
      setTimerOffset(detail?.offset ?? 0);
    };
    window.addEventListener("revisame:review-timer-offset", handleOffset);
    return () =>
      window.removeEventListener("revisame:review-timer-offset", handleOffset);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleLogoutConfirm = async () => {
    await handleLogout();
    setShowLogoutModal(false);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="pointer-events-none fixed left-[-20rem] top-[-14rem] h-[28rem] w-[28rem] rounded-full bg-[var(--gradient-warm-glow)] blur-3xl" />
      <div className="pointer-events-none fixed right-[-18rem] top-24 h-[30rem] w-[30rem] rounded-full bg-[var(--gradient-neutral-glow)] blur-3xl" />

      <div className="flex min-h-screen w-full">
        <header className="fixed left-0 top-0 z-40 flex w-full items-center justify-between border-b border-[var(--border)] bg-[var(--surface-bar)] px-4 py-3 backdrop-blur lg:hidden">
          <Link href={homeHref} className="flex items-center gap-3">
            <Image
              src={logoRevisame}
              alt="Revisame"
              width={36}
              height={36}
              className="logo-variant--light h-9 w-9"
            />
            <Image
              src={logoRevisameDark}
              alt="Revisame"
              width={36}
              height={36}
              className="logo-variant--dark h-9 w-9"
            />
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                Revisame
              </p>
              <p className="text-base font-semibold text-[var(--text-strong)]">
                Painel do aluno
              </p>
            </div>
          </Link>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center text-[var(--accent)]"
            aria-label="Abrir menu"
            onClick={openMenu}
          >
            <Menu className="h-8 w-8" aria-hidden="true" />
          </button>
        </header>

        <ReviewTimerBar />

        <div
          className={`fixed inset-0 z-50 lg:hidden ${
            isMenuOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <div
            className={`absolute inset-0 bg-black/65 transition-opacity ${
              isMenuOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeMenu}
            aria-hidden="true"
          />
          <aside
            className={`absolute right-0 top-0 flex h-full w-[82%] max-w-xs flex-col justify-between border-l border-[var(--border)] bg-[var(--surface)] p-5 transition-transform ${
              isMenuOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image
                    src={logoRevisame}
                    alt="Revisame"
                    width={40}
                    height={40}
                    className="logo-variant--light h-10 w-10"
                  />
                  <Image
                    src={logoRevisameDark}
                    alt="Revisame"
                    width={40}
                    height={40}
                    className="logo-variant--dark h-10 w-10"
                  />
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                      Revisame
                    </p>
                    <p className="text-base font-semibold text-[var(--text-strong)]">
                      Painel do aluno
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-muted)]"
                  aria-label="Fechar menu"
                  onClick={closeMenu}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <nav className="space-y-1 text-sm font-medium text-[var(--text-muted)]">
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={closeMenu}
                    aria-current={isActive(item.href) ? "page" : undefined}
                  className={`nav-vertical-item flex w-full items-center justify-between rounded-md px-3 py-3 transition ${
                    isActive(item.href)
                      ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] font-semibold [&_svg]:text-[var(--nav-active-text)] pointer-events-none"
                      : "hover:bg-[var(--nav-hover-bg)]"
                  }`}
                  >
                    <span className="flex items-center gap-3">
                      {item.icon}
                      {item.label}
                    </span>
                  </Link>
                ))}
              </nav>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] p-4 text-sm text-[var(--text-medium)]">
              <p className="font-semibold text-[var(--text-strong)]">{profileName}</p>
              <p className="text-xs text-[var(--text-muted)]">{profileEmail}</p>
              <div className="mt-4">
                <button
                  type="button"
                  className="logout-button min-h-[36px] w-full rounded-md border border-[var(--border)] bg-[var(--surface-white)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)]"
                  onClick={() => setShowLogoutModal(true)}
                >
                  Sair da conta
                </button>
              </div>
            </div>
          </aside>
        </div>

        <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col justify-between border-r border-[var(--border)] bg-[var(--surface)] p-6 lg:flex">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md">
                <Image
                  src={logoRevisame}
                  alt="Revisame"
                  width={40}
                  height={40}
                  className="logo-variant--light h-10 w-10"
                />
                <Image
                  src={logoRevisameDark}
                  alt="Revisame"
                  width={40}
                  height={40}
                  className="logo-variant--dark h-10 w-10"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                  Revisame
                </p>
                <p className="text-lg font-semibold text-[var(--text-strong)]">
                  Painel do aluno
                </p>
              </div>
            </div>
            <nav className="space-y-1 text-sm font-medium text-[var(--text-muted)]">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`nav-vertical-item flex items-center justify-between rounded-md px-3 py-2 transition ${
                    isActive(item.href)
                      ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] font-semibold [&_svg]:text-[var(--nav-active-text)] pointer-events-none"
                      : "hover:bg-[var(--nav-hover-bg)]"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    {item.icon}
                    {item.label}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
          <div
            className="rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] p-4 text-sm text-[var(--text-medium)]"
            style={{
              marginBottom: timerOffset ? `calc(${timerOffset}px - 44px)` : 0,
            }}
          >
            <p className="font-semibold text-[var(--text-strong)]">{profileName}</p>
            <p className="text-xs text-[var(--text-muted)]">{profileEmail}</p>
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                className="logout-button min-h-[36px] w-full rounded-md border border-[var(--border)] bg-[var(--surface-white)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)]"
                onClick={() => setShowLogoutModal(true)}
              >
                Sair da conta
              </button>
            </div>
          </div>
        </aside>

        <main
          className="flex-1 space-y-6 overflow-x-hidden px-4 pt-20 md:px-6 lg:ml-64 lg:pt-6"
          style={{
            paddingBottom: `calc(${isDesktop ? 24 : 144}px + ${timerOffset}px)`,
          }}
        >
          {children}
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--surface-bar)] backdrop-blur lg:hidden">
        <div className="flex items-stretch gap-2 px-3 py-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`mobile-nav-item flex min-h-[52px] min-w-0 basis-0 flex-1 flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-[11px] font-semibold ${
                isActive(item.href)
                  ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] text-xs font-semibold [&_svg]:text-[var(--nav-active-text)] pointer-events-none"
                  : "text-[var(--text-muted)]"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {showLogoutModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4">
          <div className="w-full max-w-md rounded-lg bg-[var(--surface)] p-5 modal-shadow sm:p-6 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-[var(--text-strong)]">
              Sair da conta
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Tem certeza que deseja sair da sua conta agora?
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                className="rounded-md border border-[var(--border-neutral)] bg-[var(--surface-neutral)] px-4 py-2 text-sm font-semibold min-h-[44px] text-[var(--text-muted)]"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancelar
              </button>
              <button
                className="rounded-md bg-[var(--accent-bg)] px-4 py-2 text-sm font-semibold min-h-[44px] text-[var(--text-on-accent)]"
                onClick={handleLogoutConfirm}
              >
                Sair agora
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
