"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SubjectItem = {
  id: string;
  name: string;
};

type SubjectLinkRow = {
  subject: SubjectItem | null;
};

const isNonNullable = <T,>(value: T | null | undefined): value is T =>
  value != null;

export default function Materias() {
  const supabase = useMemo(() => createClient(), []);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  const loadSubjects = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from("user_subjects")
        .select("subject:subjects(id,name)")
        .eq("user_id", userId);

      const mapped = ((data as SubjectLinkRow[] | null) ?? [])
        .map((item: SubjectLinkRow) => item.subject)
        .filter(isNonNullable);

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
        <div className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-3 sm:p-6">
          <h2 className="text-lg font-semibold text-[#1f1c18]">
            Matérias cadastradas
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {subjects.length === 0 ? (
              <div className="flex flex-col gap-3 rounded-md border border-[#e2d6c4] bg-[#fbf7f2] px-4 py-3 text-sm text-[#4b4337]">
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
              subjects.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border border-[#e2d6c4] bg-[#fdf8f1] px-4 py-3 text-sm text-[#4b4337]"
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
