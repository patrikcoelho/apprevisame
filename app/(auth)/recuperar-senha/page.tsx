"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/app/components/toast-provider";

export default function SolicitarRecuperacaoPage() {
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/recuperar-senha/nova`,
    });

    if (error) {
      setStatus("error");
      setMessage("Não foi possível enviar o link de recuperação.");
      addToast({
        variant: "error",
        title: "Não foi possível enviar o link.",
        description: "Tente novamente em instantes.",
      });
      return;
    }

    setStatus("idle");
    addToast({
      variant: "success",
      title: "Link enviado.",
      description: "Verifique seu e-mail para continuar.",
    });
    router.push(`/recuperar-senha/enviado?email=${encodeURIComponent(email)}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--text-muted)]">
          Recuperar senha
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">
          Redefina sua senha.
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Informe o e-mail associado à sua conta para receber as instruções.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleRequest}>
        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)]">
            E-mail
          </label>
          <input
            type="email"
            placeholder="voce@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border-soft)] bg-[var(--surface-white)] px-3 text-base text-[var(--text-strong)]"
            required
          />
        </div>

        <button
          type="submit"
          className="min-h-[48px] w-full rounded-md bg-[var(--accent-bg)] px-4 py-3 text-base font-semibold text-[var(--text-on-accent)] shadow-[var(--shadow-accent)] disabled:cursor-not-allowed disabled:bg-[var(--accent-disabled)]"
          disabled={status === "loading" || !email}
        >
          {status === "loading" ? "Enviando..." : "Enviar instruções"}
        </button>
      </form>

      {status === "error" ? (
        <div className="rounded-md border border-[var(--border-warm)] bg-[var(--surface-warm)] px-4 py-3 text-xs text-[var(--accent-warm)]">
          {message}
        </div>
      ) : null}
    </div>
  );
}
