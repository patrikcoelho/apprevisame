import { createClient } from "@/lib/supabase/server";

export default async function Relatorios() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("study_type")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const resolvedStudyType =
    (profile?.study_type as "Concurso" | "Faculdade" | null) ?? "Concurso";

  const { data: studies } = await supabase
    .from("studies")
    .select("questions_total,questions_correct,subject:subjects(study_type)")
    .eq("user_id", user?.id ?? "")
    .eq("subject.study_type", resolvedStudyType);

  const { data: subjects } = await supabase
    .from("user_subjects")
    .select("subject:subjects(id,study_type)")
    .eq("user_id", user?.id ?? "")
    .eq("subject.study_type", resolvedStudyType);

  const totalQuestions =
    studies?.reduce((sum, item) => sum + (item.questions_total ?? 0), 0) ?? 0;
  const totalCorrect =
    studies?.reduce((sum, item) => sum + (item.questions_correct ?? 0), 0) ?? 0;
  const accuracy = totalQuestions
    ? Math.round((totalCorrect / totalQuestions) * 100)
    : 0;

  const hasData = (studies?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-[#1f1c18]">Relatórios</h1>
          <p className="text-sm text-[#5f574a]">
            Acompanhe horas estudadas, questões e taxa de acertos.
          </p>
        </div>
      </header>

      <section className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-4 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1f1c18]">
          <svg
            aria-hidden="true"
            className="h-5 w-5 text-[#1f5b4b]"
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
          Resumo da semana
        </h2>
        <div className="space-y-3 text-sm text-[#4b4337]">
          {!hasData ? (
            <div className="flex flex-col gap-3 rounded-md border border-[#efe2d1] bg-[#fbf7f2] px-4 py-4 text-sm text-[#6b6357]">
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
                    Nenhum estudo registrado ainda.
                  </p>
                  <p className="text-xs text-[#6b6357]">
                    Os relatórios aparecem quando você registra estudos.
                  </p>
                </div>
              </div>
              <div className="text-xs text-[#6b6357]">
                Passos: adicione um estudo e volte para acompanhar seu
                desempenho.
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span>Horas estudadas</span>
                <span className="font-semibold text-[#1f5b4b]">—</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Questões resolvidas</span>
                <span className="font-semibold text-[#1f5b4b]">
                  {totalQuestions}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Taxa de acertos</span>
                <span className="font-semibold text-[#1f5b4b]">
                  {accuracy}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Matérias ativas</span>
                <span className="font-semibold text-[#1f5b4b]">
                  {subjects?.length ?? 0}
                </span>
              </div>
            </>
          )}
        </div>
        <button className="mt-6 min-h-[48px] w-full rounded-md border border-[#e2d6c4] bg-[#f0e6d9] px-4 py-3 text-sm font-semibold text-[#4b4337]">
          Exportar relatório
        </button>
      </section>
    </div>
  );
}
