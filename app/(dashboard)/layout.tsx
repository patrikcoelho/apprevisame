"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profileName, setProfileName] = useState("—");
  const [profileEmail, setProfileEmail] = useState("—");
  const [timerOffset, setTimerOffset] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const navItems = [
    {
      label: "Inicio",
      href: "/",
      icon: (
        <svg
          aria-hidden="true"
          className="h-4 w-4 text-[#6b6357]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path d="M3 11l9-7 9 7" strokeLinecap="round" />
          <path d="M5 10v9h14v-9" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Revisões",
      href: "/revisoes",
      icon: (
        <svg
          aria-hidden="true"
          className="h-4 w-4 text-[#6b6357]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 3v4M16 3v4M7 11h4M7 15h8" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Adicionar",
      href: "/adicionar",
      icon: (
        <svg
          aria-hidden="true"
          className="h-4 w-4 text-[#6b6357]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M12 8v8M8 12h8" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Relatórios",
      href: "/relatorios",
      icon: (
        <svg
          aria-hidden="true"
          className="h-4 w-4 text-[#6b6357]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path d="M4 19V5" strokeLinecap="round" />
          <path d="M8 19V10" strokeLinecap="round" />
          <path d="M12 19V7" strokeLinecap="round" />
          <path d="M16 19v-5" strokeLinecap="round" />
          <path d="M20 19v-9" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Configurações",
      href: "/configuracoes",
      icon: (
        <svg
          aria-hidden="true"
          className="h-4 w-4 text-[#6b6357]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path d="M4 7h10M4 17h16M14 7h6M4 12h16" strokeLinecap="round" />
          <circle cx="14" cy="7" r="2" />
          <circle cx="8" cy="12" r="2" />
          <circle cx="18" cy="17" r="2" />
        </svg>
      ),
    },
  ];
  const homeHref = navItems[0]?.href ?? "/";

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

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#f6f1ea] text-[#1d1b16]">
      <div className="pointer-events-none fixed left-[-20rem] top-[-14rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(217,91,67,0.25),rgba(246,241,234,0))] blur-3xl" />
      <div className="pointer-events-none fixed right-[-18rem] top-24 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(246,241,234,0),rgba(246,241,234,0))] blur-3xl" />

      <div className="flex min-h-screen w-full">
        <header className="fixed left-0 top-0 z-40 flex w-full items-center justify-between border-b border-[#e6dbc9] bg-[#fffaf2]/95 px-4 py-3 backdrop-blur lg:hidden">
          <Link href={homeHref} className="flex items-center gap-3">
            <img
              src="/images/logo-revisame.png"
              alt="Revisame"
              className="h-9 w-9"
            />
            <div className="text-left">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#6b6357]">
              Revisame
            </p>
            <p className="text-base font-semibold text-[#1f1c18]">
              Painel do aluno
            </p>
            </div>
          </Link>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center text-[#1f5b4b]"
            aria-label="Abrir menu"
            onClick={() => setIsMenuOpen(true)}
          >
            <svg
              aria-hidden="true"
              className="h-8 w-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
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
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />
          <aside
            className={`absolute right-0 top-0 flex h-full w-[82%] max-w-xs flex-col justify-between border-l border-[#e6dbc9] bg-[#fffaf2] p-5 transition-transform ${
              isMenuOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src="/images/logo-revisame.png"
                    alt="Revisame"
                    className="h-10 w-10"
                  />
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-[#6b6357]">
                      Revisame
                    </p>
                    <p className="text-base font-semibold text-[#1f1c18]">
                      Painel do aluno
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-md border border-[#e2d6c4] text-[#6b6357]"
                  aria-label="Fechar menu"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M6 6l12 12M18 6l-12 12"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
              <nav className="space-y-1 text-sm font-medium text-[#6b6357]">
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={`flex items-center justify-between rounded-md px-3 py-3 transition ${
                      isActive(item.href)
                        ? "bg-[#f0e6d9] text-[#1f3f35] pointer-events-none"
                        : "hover:bg-[#f6efe4]"
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
            <div className="rounded-md border border-[#e6dbc9] bg-[#fdf8f1] p-4 text-sm text-[#4b4337]">
              <p className="font-semibold text-[#1f1c18]">{profileName}</p>
              <p className="text-xs text-[#6b6357]">{profileEmail}</p>
              <div className="mt-4">
                <button
                  type="button"
                  className="min-h-[36px] w-full rounded-md border border-[#e2d6c4] bg-white px-3 py-2 text-xs font-semibold text-[#6b6357]"
                  onClick={handleLogout}
                >
                  Sair da conta
                </button>
              </div>
            </div>
          </aside>
        </div>

        <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col justify-between border-r border-[#e6dbc9] bg-[#fffaf2] p-6 lg:flex">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white">
                <img
                  src="/images/logo-revisame.png"
                  alt="Revisame"
                  className="h-10 w-10"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#6b6357]">
                  Revisame
                </p>
                <p className="text-lg font-semibold text-[#1f1c18]">
                  Painel do aluno
                </p>
              </div>
            </div>
            <nav className="space-y-1 text-sm font-medium text-[#6b6357]">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`flex items-center justify-between rounded-md px-3 py-2 transition ${
                    isActive(item.href)
                      ? "bg-[#f0e6d9] text-[#1f3f35] pointer-events-none"
                      : "hover:bg-[#f6efe4]"
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
            className="rounded-md border border-[#e6dbc9] bg-[#fdf8f1] p-4 text-sm text-[#4b4337]"
            style={{
              marginBottom: timerOffset ? `calc(${timerOffset}px - 44px)` : 0,
            }}
          >
            <p className="font-semibold text-[#1f1c18]">{profileName}</p>
            <p className="text-xs text-[#6b6357]">{profileEmail}</p>
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                className="min-h-[36px] w-full rounded-md border border-[#e2d6c4] bg-white px-3 py-2 text-xs font-semibold text-[#6b6357]"
                onClick={handleLogout}
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

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e6dbc9] bg-[#fffaf2]/95 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 gap-1 px-3 py-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`min-h-[52px] flex flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-[11px] font-semibold ${
                isActive(item.href)
                  ? "bg-[#1f3f35] text-white shadow-[0_8px_20px_-18px_rgba(31,91,75,0.6)] [&_svg]:text-white pointer-events-none"
                  : "text-[#6b6357]"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
