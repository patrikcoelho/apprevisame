"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/app/components/toast-provider";

export default function NovaSenhaClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { addToast } = useToast();
  const minPasswordLength = 6;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [hasSession, setHasSession] = useState(true);
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const passwordHasMinLength = password.length >= minPasswordLength;
  const isPasswordValid = passwordHasMinLength;

  useEffect(() => {
    let isMounted = true;
    let resolved = false;
    const finalize = (session: boolean) => {
      if (!isMounted || resolved) return;
      resolved = true;
      setHasSession(session);
      setIsSessionReady(true);
    };

    const errorParam =
      searchParams.get("error_description") ?? searchParams.get("error");
    if (errorParam) {
      setExchangeError(
        decodeURIComponent(errorParam).replace(/\+/g, " ") ||
          "Não foi possível validar o link."
      );
      finalize(false);
      return () => {
        isMounted = false;
      };
    }

    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const type = hashParams.get("type");

    if (accessToken && refreshToken && type === "recovery") {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (!isMounted) return;
          if (error) {
            setExchangeError("Não foi possível validar o link.");
            finalize(false);
          } else {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        });
    }

    const code = searchParams.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!isMounted) return;
        if (error) {
          setExchangeError("Não foi possível validar o link.");
          finalize(false);
        }
      });
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        finalize(true);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        finalize(true);
      }
    });

    const timeoutId = window.setTimeout(() => {
      finalize(false);
    }, 800);

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
      window.clearTimeout(timeoutId);
    };
  }, [searchParams, supabase]);

  if (isSessionReady && !hasSession) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--text-muted)]">
            Link expirado
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">
            Solicite um novo link.
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {exchangeError ??
              "O link para redefinir sua senha expirou ou já foi utilizado."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/recuperar-senha")}
          className="min-h-[48px] w-full rounded-md bg-[var(--accent-bg)] px-4 py-3 text-base font-semibold text-[var(--text-on-accent)] shadow-[var(--shadow-accent)]"
        >
          Solicitar novo link
        </button>
      </div>
    );
  }

  const handleUpdatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!isPasswordValid) {
      setStatus("error");
      setMessage(`A senha precisa ter no mínimo ${minPasswordLength} caracteres.`);
      addToast({
        variant: "error",
        title: "Senha fraca.",
        description: `Use no mínimo ${minPasswordLength} caracteres.`,
      });
      return;
    }

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("As senhas não coincidem.");
      addToast({
        variant: "error",
        title: "As senhas não coincidem.",
        description: "Verifique e tente novamente.",
      });
      return;
    }

    setStatus("loading");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setStatus("error");
      setMessage("Sessão inválida. Solicite um novo link.");
      addToast({
        variant: "error",
        title: "Sessão inválida.",
        description: "Solicite um novo link para continuar.",
      });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("error");
      const rawMessage = error.message.toLowerCase();
      const nextMessage =
        rawMessage.includes("password") && rawMessage.includes("least")
          ? `A senha precisa ter no mínimo ${minPasswordLength} caracteres.`
          : "Não foi possível atualizar sua senha.";
      setMessage(nextMessage);
      addToast({
        variant: "error",
        title: "Não foi possível atualizar sua senha.",
        description:
          nextMessage === "Não foi possível atualizar sua senha."
            ? "Tente novamente em instantes."
            : nextMessage,
      });
      return;
    }

    setStatus("idle");
    addToast({
      variant: "success",
      title: "Senha atualizada.",
      description: "Faça login com sua nova senha.",
    });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--text-muted)]">
          Criar nova senha
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">
          Defina uma senha segura.
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          A senha deve ter no mínimo {minPasswordLength} caracteres.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleUpdatePassword}>
        <div>
          <label className="text-sm font-semibold text-[var(--text-medium)]">
            Nova senha
          </label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 h-12 w-full rounded-md border border-[var(--border)] bg-[var(--surface-white)] px-4 text-base text-[var(--text-strong)]"
            placeholder="Digite sua nova senha"
          />
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {passwordHasMinLength
              ? "Boa! Sua senha atende ao tamanho mínimo."
              : `Use pelo menos ${minPasswordLength} caracteres.`}
          </p>
        </div>

        <div>
          <label className="text-sm font-semibold text-[var(--text-medium)]">
            Confirmar senha
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="mt-2 h-12 w-full rounded-md border border-[var(--border)] bg-[var(--surface-white)] px-4 text-base text-[var(--text-strong)]"
            placeholder="Repita sua nova senha"
          />
          {message ? (
            <p className="mt-2 text-xs text-[var(--accent-warm)]">{message}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={status === "loading" || !isPasswordValid}
          className="min-h-[48px] w-full rounded-md bg-[var(--accent-bg)] px-4 py-3 text-base font-semibold text-[var(--text-on-accent)] shadow-[var(--shadow-accent)] disabled:cursor-not-allowed disabled:bg-[var(--accent-bg-disabled)]"
        >
          {status === "loading" ? "Atualizando..." : "Atualizar senha"}
        </button>
      </form>
    </div>
  );
}
