import { createClient } from "@/lib/supabase/server";
import { Layers, Smile } from "lucide-react";

type TemplateItem = {
  id: string;
  name: string;
  cadence_days: number[];
  is_default: boolean;
  owner_user_id: string | null;
};

type TemplateRow = TemplateItem;

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
    .select("active_template_id")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const { data: defaultTemplates } = await supabase
    .from("templates")
    .select("id,name,cadence_days,is_default,owner_user_id")
    .eq("is_default", true)
    .order("created_at", { ascending: true });

  const { data: userTemplates } = await supabase
    .from("templates")
    .select("id,name,cadence_days,is_default,owner_user_id")
    .eq("owner_user_id", user?.id ?? "")
    .order("created_at", { ascending: true });

  const templates = [
    ...new Map(
      ([...(defaultTemplates ?? []), ...(userTemplates ?? [])] as TemplateRow[]).map(
        (item) => [item.id, item]
      )
    ).values(),
  ].sort((a, b) => {
    if (a.id === profile?.active_template_id) return -1;
    if (b.id === profile?.active_template_id) return 1;
    return 0;
  });

  return (
    <div className="page-stack">
      <header className="flex flex-col gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-[var(--text-strong)]">Templates</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Ajuste os intervalos de revisão para cada matéria ou assunto.
          </p>
        </div>
      </header>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">
              Revisões espaçadas
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Layers className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
              <h2 className="text-xl font-semibold text-[var(--text-strong)]">
                Escolha o template ideal para o seu ritmo.
              </h2>
            </div>
          </div>
          <button className="min-h-[44px] rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-5 py-2 text-sm font-semibold text-[var(--text-medium)]">
            Criar template
          </button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {templates.length === 0 ? (
            <div className="flex flex-col gap-3 rounded-md border border-[var(--border-soft)] bg-[var(--surface-soft)] p-5 text-sm text-[var(--text-muted)]">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-white)] text-[var(--text-medium)]">
                  <Smile className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-[var(--text-medium)]">
                    Nenhum template cadastrado.
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Crie um ritmo para organizar suas revisões.
                  </p>
                </div>
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                Passos: clique em “Criar template” e defina os intervalos.
              </div>
            </div>
          ) : (
            templates.map((template) => {
              const isActive = template.id === profile?.active_template_id;
              return (
                <div
                  key={template.id}
                  className={`rounded-md border p-5 ${
                    isActive
                      ? "border-2 border-[var(--accent-border)] bg-[var(--surface-success)]"
                      : "border-[var(--border-soft)] bg-[var(--surface-subtle)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold text-[var(--text-strong)]">
                      {template.name}
                    </p>
                    {isActive ? (
                      <span className="rounded-full bg-[var(--accent-bg)] px-2 py-1 text-[10px] uppercase text-[var(--text-white)]">
                        Ativo
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-[var(--accent)]">
                    {formatCadence(template.cadence_days)}
                  </p>
                  <p className="mt-3 text-sm text-[var(--text-muted)]">
                    {detailByName[template.name] ??
                      (template.is_default
                        ? "Template predefinido."
                        : "Template personalizado.")}
                  </p>
                  <button className="mt-4 min-h-[44px] text-sm font-semibold text-[var(--accent)]">
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
