import { createClient } from "@/lib/supabase/server";

type SubjectItem = {
  id: string;
  name: string;
  study_type: "Concurso" | "Faculdade";
};

export default async function Materias() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("user_subjects")
    .select("subject:subjects(id,name,study_type)")
    .eq("user_id", user?.id ?? "");

  const subjects = (data ?? [])
    .map((item) => item.subject as SubjectItem | null)
    .filter(Boolean) as SubjectItem[];

  const materiasConcurso = subjects.filter(
    (item) => item.study_type === "Concurso"
  );
  const materiasFaculdade = subjects.filter(
    (item) => item.study_type === "Faculdade"
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.35em] text-[#6c5f4f]">
            Matérias
          </p>
          <h1 className="text-2xl font-semibold text-[#1f1c18]">
            Banco predefinido por tipo de estudo.
          </h1>
          <p className="text-sm text-[#5f574a]">
            Evite duplicações e selecione apenas o que faz sentido para você.
          </p>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-6">
          <h2 className="text-lg font-semibold text-[#1f1c18]">
            Concurso público
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {materiasConcurso.length === 0 ? (
              <div className="rounded-md border border-[#e2d6c4] bg-[#fdf8f1] px-4 py-3 text-sm text-[#4b4337]">
                Nenhuma matéria cadastrada para concurso.
              </div>
            ) : (
              materiasConcurso.map((item) => (
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
        <div className="rounded-lg border border-[#d8eadf] bg-[#e9f4ef] p-6">
          <h2 className="text-lg font-semibold text-[#1f3f35]">Faculdade</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {materiasFaculdade.length === 0 ? (
              <div className="rounded-md border border-[#b7d4c8] bg-[#f5fbf8] px-4 py-3 text-sm text-[#2f5d4e]">
                Nenhuma matéria cadastrada para faculdade.
              </div>
            ) : (
              materiasFaculdade.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border border-[#b7d4c8] bg-[#f5fbf8] px-4 py-3 text-sm text-[#2f5d4e]"
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
