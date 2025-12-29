import { createClient } from "@/lib/supabase/server";

export default async function Relatorios() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: studies } = await supabase
    .from("studies")
    .select("questions_total,questions_correct")
    .eq("user_id", user?.id ?? "");

  const { data: subjects } = await supabase
    .from("user_subjects")
    .select("id")
    .eq("user_id", user?.id ?? "");

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
          <p className="text-xs uppercase tracking-[0.35em] text-[#6c5f4f]">
            Relatórios
          </p>
          <h1 className="text-2xl font-semibold text-[#1f1c18]">
            Visão semanal do seu progresso.
          </h1>
          <p className="text-sm text-[#5f574a]">
            Acompanhe horas estudadas, questões e taxa de acertos.
          </p>
        </div>
      </header>

      <section className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-6">
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
            <div className="rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-4 py-4 text-sm text-[#6b6357]">
              Nenhum estudo registrado ainda. Adicione estudos para gerar
              relatórios.
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
        <button className="mt-6 w-full rounded-md border border-[#e2d6c4] bg-[#f0e6d9] px-4 py-3 text-sm font-semibold text-[#4b4337]">
          Exportar relatório
        </button>
      </section>
    </div>
  );
}
