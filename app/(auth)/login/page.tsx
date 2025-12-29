"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const [resetStatus, setResetStatus] = useState<"idle" | "loading" | "sent">(
    "idle"
  );

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
      return;
    }

    setStatus("idle");
    router.push("/");
    router.refresh();
  };

  const handleResetPassword = async () => {
    if (!email) {
      setMessage("Informe seu e-mail para recuperar a senha.");
      setStatus("error");
      return;
    }

    setResetStatus("loading");
    setMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/recuperar-senha`,
    });

    if (error) {
      setStatus("error");
      setMessage("Não foi possível enviar o link de recuperação.");
      setResetStatus("idle");
      return;
    }

    setResetStatus("sent");
    setStatus("idle");
    setMessage("Enviamos um link de recuperação para o seu e-mail.");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#6b6357]">
          Login
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[#1f1c18]">
          Acesse sua conta.
        </h2>
        <p className="mt-2 text-sm text-[#5f574a]">
          Entre com seu e-mail e senha para continuar seus estudos.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleLogin}>
        <div>
          <label className="text-xs font-semibold text-[#6b6357]">E-mail</label>
          <input
            type="email"
            placeholder="voce@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18]"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#6b6357]">Senha</label>
          <input
            type="password"
            placeholder="Digite sua senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18]"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-[#6b6357]">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" />
              Manter conectado
            </label>
            <button
              type="button"
              onClick={handleResetPassword}
              className="font-semibold text-[#1f5b4b]"
              disabled={resetStatus === "loading"}
            >
              {resetStatus === "loading"
                ? "Enviando..."
                : "Esqueci minha senha"}
            </button>
          </div>
        </div>

        <button
          className="w-full rounded-md bg-[#1f5b4b] px-4 py-3 text-sm font-semibold text-[#fffaf2] shadow-[0_12px_30px_-20px_rgba(31,91,75,0.6)] disabled:cursor-not-allowed disabled:bg-[#9fbfb5]"
          type="submit"
          disabled={status === "loading" || !email || !password}
        >
          {status === "loading" ? "Entrando..." : "Entrar"}
        </button>
      </form>

      {status === "error" ? (
        <div className="rounded-md border border-[#f0c6b9] bg-[#fbe7df] px-4 py-3 text-xs text-[#9d4b3b]">
          {message}
        </div>
      ) : null}

      {resetStatus === "sent" && status !== "error" ? (
        <div className="rounded-md border border-[#d8eadf] bg-[#e9f4ef] px-4 py-3 text-xs text-[#2f5d4e]">
          {message}
        </div>
      ) : null}

      <div className="rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-4 py-3 text-xs text-[#6b6357]">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-[#1f5b4b]">
          Criar conta
        </Link>
      </div>
    </div>
  );
}
