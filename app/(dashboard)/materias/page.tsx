"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SubjectItem = {
  id: string;
  name: string;
  study_type: "Concurso" | "Faculdade";
};

type SubjectLinkRow = {
  subject: SubjectItem | null;
};

export default function Materias() {
  const supabase = useMemo(() => createClient(), []);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [accountType, setAccountType] = useState<"Concurso" | "Faculdade">(
    "Concurso"
  );

  const loadSubjects = useCallback(
    async (userId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("study_type")
        .eq("id", userId)
        .maybeSingle();

      const resolvedType =
        (profile?.study_type as "Concurso" | "Faculdade" | null) ?? "Concurso";
      setAccountType(resolvedType);

      const { data } = await supabase
        .from("user_subjects")
        .select("subject:subjects(id,name,study_type)")
        .eq("user_id", userId);

      const mapped = ((data as SubjectLinkRow[] | null) ?? [])
        .map((item: SubjectLinkRow) => item.subject)
        .filter((subject): subject is SubjectItem => Boolean(subject))
        .filter((subject) => subject.study_type === resolvedType);

      setSubjects(mapped);
    },
    [supabase]
  );

  const refreshSubjects = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      await loadSubjects(user.id);
    }
  }, [loadSubjects, supabase]);

  useEffect(() => {

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        await loadSubjects(user.id);
      } else {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user?.id) {
          await loadSubjects(session.user.id);
        }
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, sessionValue) => {
        if (sessionValue?.user?.id) {
          loadSubjects(sessionValue.user.id);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    };

    const cleanupPromise = init();

    return () => {
      cleanupPromise.then((cleanup) => cleanup && cleanup());
    };
  }, [loadSubjects, supabase]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      refreshSubjects();
    };
    window.addEventListener("revisame:profile-updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("revisame:profile-updated", handleProfileUpdate);
    };
  }, [refreshSubjects]);

  const materiasAtivas = useMemo(
    () => subjects.filter((item) => item.study_type === accountType),
    [subjects, accountType]
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-[#1f1c18]">Matérias</h1>
          <p className="text-sm text-[#5f574a]">
            Evite duplicações e selecione apenas o que faz sentido para você.
          </p>
        </div>
      </header>

      <section className="grid gap-6">
        <div
          className={`rounded-lg border p-4 sm:p-6 ${
            accountType === "Concurso"
              ? "border-[#e6dbc9] bg-[#fffaf2]"
              : "border-[#d8eadf] bg-[#e9f4ef]"
          }`}
        >
          <h2
            className={`text-lg font-semibold ${
              accountType === "Concurso"
                ? "text-[#1f1c18]"
                : "text-[#1f3f35]"
            }`}
          >
            {accountType === "Concurso"
              ? "Concurso público"
              : "Vestibular/Faculdade"}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {materiasAtivas.length === 0 ? (
              <div
                className={`flex flex-col gap-3 rounded-md border px-4 py-3 text-sm ${
                  accountType === "Concurso"
                    ? "border-[#e2d6c4] bg-[#fbf7f2] text-[#4b4337]"
                    : "border-[#b7d4c8] bg-[#f2fbf7] text-[#2f5d4e]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full border bg-white ${
                      accountType === "Concurso"
                        ? "border-[#e2d6c4] text-[#4b4337]"
                        : "border-[#b7d4c8] text-[#2f5d4e]"
                    }`}
                  >
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
                      Nenhuma matéria cadastrada.
                    </p>
                    <p className="text-xs">
                      Adicione matérias para iniciar seus estudos.
                    </p>
                  </div>
                </div>
                <div className="text-xs">
                  Passos: cadastre matérias no menu de configurações.
                </div>
              </div>
            ) : (
              materiasAtivas.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-md border px-4 py-3 text-sm ${
                    accountType === "Concurso"
                      ? "border-[#e2d6c4] bg-[#fdf8f1] text-[#4b4337]"
                      : "border-[#b7d4c8] bg-[#f5fbf8] text-[#2f5d4e]"
                  }`}
                >
                  {item.name}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
