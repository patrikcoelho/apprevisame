"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [profileName, setProfileName] = useState("—");
  const [profileEmail, setProfileEmail] = useState("—");
  const [studyType, setStudyType] = useState("—");

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

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
        .select("full_name,study_type")
        .eq("id", user?.id ?? "")
        .maybeSingle();

      if (profile?.full_name) {
        setProfileName(profile.full_name);
      }
      if (profile?.study_type) {
        setStudyType(
          profile.study_type === "Concurso"
            ? "Concurso público"
            : "Faculdade"
        );
      }
    };

    loadProfile();
  }, [supabase]);

  return (
    <div className="min-h-screen bg-[#f6f1ea] text-[#1d1b16]">
      <div className="pointer-events-none fixed left-[-20rem] top-[-14rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(217,91,67,0.25),rgba(246,241,234,0))] blur-3xl" />
      <div className="pointer-events-none fixed right-[-18rem] top-24 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(246,241,234,0),rgba(246,241,234,0))] blur-3xl" />

      <div className="flex min-h-screen w-full">
        <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col justify-between border-r border-[#e6dbc9] bg-[#fffaf2] p-6 lg:flex">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#1f5b4b] text-lg font-semibold text-[#fffaf2]">
                R
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
            <nav className="space-y-1 text-sm font-medium text-[#4e473c]">
              {[
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
                  label: "Adicionar estudo",
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
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center justify-between rounded-md px-3 py-2 transition hover:bg-[#f6efe4] ${
                    isActive(item.href)
                      ? "bg-[#f0e6d9] text-[#1f3f35]"
                      : ""
                  }`}
                >
                  <span className="flex items-center gap-3">
                    {item.icon}
                    {item.label}
                  </span>
                </Link>
              ))}
            </nav>
            <div className="rounded-md border border-[#d8eadf] bg-[#e9f4ef] p-4 text-sm text-[#2f5d4e]">
              <p className="text-xs font-semibold uppercase text-[#2c5b4b]">
                Tipo de estudo
              </p>
              <p className="mt-2 text-base font-semibold text-[#1f3f35]">
                {studyType}
              </p>
              <button className="mt-3 w-full rounded-md border border-[#b7d4c8] bg-[#f5fbf8] px-3 py-2 text-xs font-semibold text-[#2c5b4b]">
                Alterar tipo
              </button>
            </div>
          </div>
          <div className="rounded-md border border-[#e6dbc9] bg-[#fdf8f1] p-4 text-sm text-[#4b4337]">
            <p className="font-semibold text-[#1f1c18]">
              Aluno: {profileName}
            </p>
            <p className="text-xs text-[#6b6357]">{profileEmail}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-[#6b6357]">Modo</span>
              <div className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-full bg-[#1f5b4b]" />
                Claro
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 space-y-6 px-6 py-6 lg:ml-64">
          {children}
        </main>
      </div>
    </div>
  );
}
