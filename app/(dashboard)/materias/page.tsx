"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Smile } from "lucide-react";
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
    <div className="page-stack">
      <header className="flex flex-col gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-[var(--text-strong)]">Matérias</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Evite duplicações e selecione apenas o que faz sentido para você.
          </p>
        </div>
      </header>

      <section className="grid gap-6">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-6">
          <h2 className="text-lg font-semibold text-[var(--text-strong)]">
            Matérias cadastradas
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {subjects.length === 0 ? (
              <div className="flex flex-col gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-medium)]">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-white)] text-[var(--text-medium)]">
                    <Smile className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-semibold text-[var(--text-medium)]">
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
                  className="rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-medium)]"
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
