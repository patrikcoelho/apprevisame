"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function EnviadoClient() {
  const params = useSearchParams();
  const email = params.get("email");

  return (
    <div className="space-y-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] text-2xl">
        ✉️
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--text-muted)]">
          E-mail enviado
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">
          Confira sua caixa de entrada.
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Enviamos um link para redefinir sua senha
          {email ? ` em ${email}` : ""}. Caso não encontre, verifique o spam.
        </p>
      </div>

      <div className="space-y-3">
        <a
          href="mailto:"
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-md bg-[var(--accent-bg)] px-4 py-3 text-base font-semibold text-[var(--text-on-accent)] shadow-[var(--shadow-accent)]"
        >
          Abrir app de e-mail
        </a>
        <Link
          href="/recuperar-senha"
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-white)] px-4 py-3 text-base font-semibold text-[var(--text-strong)]"
        >
          Tentar outro e-mail
        </Link>
      </div>

      <div className="text-xs text-[var(--text-muted)]">
        Voltar para{" "}
        <Link href="/login" className="font-semibold text-[var(--accent)]">
          login
        </Link>
      </div>
    </div>
  );
}
