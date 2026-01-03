"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/app/components/toast-provider";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();
  const [rememberMe, setRememberMe] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("revisame:remember-me");
    if (stored === "false") {
      setRememberMe(false);
    }
  }, []);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatus("error");
      setMessage("E-mail ou senha inválidos.");
      addToast({
        variant: "error",
        title: "E-mail ou senha inválidos.",
        description: "Confira seus dados e tente novamente.",
      });
      return;
    }

    setStatus("idle");
    if (rememberMe) {
      window.localStorage.setItem("revisame:remember-me", "true");
      window.sessionStorage.removeItem("revisame:session-active");
    } else {
      window.localStorage.setItem("revisame:remember-me", "false");
      window.sessionStorage.setItem("revisame:session-active", "true");
    }
    addToast({
      variant: "success",
      title: "Login realizado.",
      description: "Bem-vindo de volta.",
    });
    router.push("/");
    router.refresh();
  };

  const handleResetPassword = () => {
    router.push("/recuperar-senha");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--text-muted)]">
          Login
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">
          Acesse sua conta.
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Entre com seu e-mail e senha para continuar seus estudos.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleLogin}>
        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)]">E-mail</label>
          <input
            type="email"
            placeholder="voce@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border-soft)] bg-[var(--surface-white)] px-3 text-base text-[var(--text-strong)]"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)]">Senha</label>
          <input
            type="password"
            placeholder="Digite sua senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border-soft)] bg-[var(--surface-white)] px-3 text-base text-[var(--text-strong)]"
          />
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              Manter conectado
            </label>
            <button
              type="button"
              onClick={handleResetPassword}
              className="font-semibold text-[var(--accent)]"
            >
              Esqueci minha senha
            </button>
          </div>
        </div>

        <button
          className="min-h-[48px] w-full rounded-md bg-[var(--accent-bg)] px-4 py-3 text-base font-semibold text-[var(--text-on-accent)] shadow-[var(--shadow-accent)] disabled:cursor-not-allowed disabled:bg-[var(--accent-disabled)]"
          type="submit"
          disabled={status === "loading" || !email || !password}
        >
          {status === "loading" ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <div className="space-y-4">
        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <span className="h-px flex-1 bg-[var(--border)]" />
          ou
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>
        <button
          type="button"
          aria-disabled="true"
          className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-white)] px-4 text-sm font-semibold text-[var(--text-strong)]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-bold text-[var(--text-strong)]">
            G
          </span>
          Entrar com Google
        </button>
      </div>

      {status === "error" ? (
        <div className="rounded-md border border-[var(--border-warm)] bg-[var(--surface-warm)] px-4 py-3 text-xs text-[var(--accent-warm)]">
          {message}
        </div>
      ) : null}

      <div className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-3 text-xs text-[var(--text-muted)]">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-[var(--accent)]">
          Criar conta
        </Link>
      </div>
    </div>
  );
}
