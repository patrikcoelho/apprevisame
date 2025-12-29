import { createClient } from "@/lib/supabase/server";

type TemplateItem = {
  id: string;
  name: string;
  cadence_days: number[];
  is_default: boolean;
  owner_user_id: string | null;
};

const detailByName: Record<string, string> = {
  Essencial: "Base ideal para quem estuda todo dia.",
  Intensivo: "Ritmo acelerado para provas próximas.",
  "Longo prazo": "Pensado para memórias duradouras.",
};

const formatCadence = (cadence: number[]) =>
  cadence.map((item) => `${item}d`).join(", ");

export default async function Templates() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("study_type,active_template_id")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const { data: templatesData } = await supabase
    .from("templates")
    .select("id,name,cadence_days,is_default,owner_user_id")
    .eq("study_type", profile?.study_type ?? "Concurso")
    .order("created_at", { ascending: true });

  const templates = (templatesData ?? []) as TemplateItem[];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.35em] text-[#6c5f4f]">
            Templates
          </p>
          <h1 className="text-2xl font-semibold text-[#1f1c18]">
            Ritmos prontos e personalizáveis.
          </h1>
          <p className="text-sm text-[#5f574a]">
            Ajuste os intervalos de revisão para cada matéria ou assunto.
          </p>
        </div>
      </header>

      <section className="rounded-lg border border-[#e6dbc9] bg-[#fffaf2] p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-[#6b6357]">
              Revisões espaçadas
            </p>
            <div className="mt-2 flex items-center gap-2">
              <svg
                aria-hidden="true"
                className="h-5 w-5 text-[#1f5b4b]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <path d="M8 6h10v10H8z" />
                <path d="M6 8H4v10h10v-2" strokeLinecap="round" />
              </svg>
              <h2 className="text-xl font-semibold text-[#1f1c18]">
                Escolha o template ideal para o seu ritmo.
              </h2>
            </div>
          </div>
          <button className="rounded-full border border-[#e2d6c4] bg-[#f0e6d9] px-5 py-2 text-sm font-semibold text-[#4b4337]">
            Criar template
          </button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {templates.length === 0 ? (
            <div className="rounded-md border border-[#efe2d1] bg-[#fdf8f1] p-5 text-sm text-[#6b6357]">
              Nenhum template cadastrado ainda.
            </div>
          ) : (
            templates.map((template) => {
              const isActive = template.id === profile?.active_template_id;
              return (
                <div
                  key={template.id}
                  className={`rounded-md border p-5 ${
                    isActive
                      ? "border-2 border-[#1f5b4b] bg-[#e9f4ef]"
                      : "border-[#efe2d1] bg-[#fdf8f1]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold text-[#1f1c18]">
                      {template.name}
                    </p>
                    {isActive ? (
                      <span className="rounded-full bg-[#1f5b4b] px-2 py-1 text-[10px] uppercase text-white">
                        Ativo
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-[#1f5b4b]">
                    {formatCadence(template.cadence_days)}
                  </p>
                  <p className="mt-3 text-sm text-[#5f574a]">
                    {detailByName[template.name] ??
                      (template.is_default
                        ? "Template predefinido."
                        : "Template personalizado.")}
                  </p>
                  <button className="mt-4 text-sm font-semibold text-[#1f5b4b]">
                    Usar este template
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
