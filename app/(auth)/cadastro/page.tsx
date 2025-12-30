"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/app/components/toast-provider";

export default function CadastroPage() {
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">(
    "idle"
  );
  const [message, setMessage] = useState("");

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage("Não foi possível criar a conta.");
      addToast({
        variant: "error",
        title: "Não foi possível criar a conta.",
        description: "Tente novamente em instantes.",
      });
      return;
    }

    if (data.session) {
      setStatus("success");
      addToast({
        variant: "success",
        title: "Conta criada.",
        description: "Vamos iniciar o onboarding.",
      });
      router.push("/onboarding");
      router.refresh();
      return;
    }

    setStatus("success");
    setMessage(
      "Conta criada. Verifique seu e-mail para confirmar o acesso."
    );
    addToast({
      variant: "success",
      title: "Conta criada.",
      description: "Confira seu e-mail para confirmar o acesso.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#6b6357]">
          Cadastro
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[#1f1c18]">
          Crie sua conta.
        </h2>
        <p className="mt-2 text-sm text-[#5f574a]">
          Comece registrando seu perfil para liberar o onboarding.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSignUp}>
        <div>
          <label className="text-xs font-semibold text-[#6b6357]">Nome</label>
          <input
            type="text"
            placeholder="Seu nome completo"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-base text-[#1f1c18]"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#6b6357]">E-mail</label>
          <input
            type="email"
            placeholder="voce@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-base text-[#1f1c18]"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#6b6357]">Senha</label>
          <input
            type="password"
            placeholder="Crie uma senha segura"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-base text-[#1f1c18]"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#6b6357]">
            Confirmar senha
          </label>
          <input
            type="password"
            placeholder="Repita a senha"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-base text-[#1f1c18]"
          />
        </div>
        <button
          className="min-h-[48px] w-full rounded-md bg-[#1f5b4b] px-4 py-3 text-base font-semibold text-[#fffaf2] shadow-[0_12px_30px_-20px_rgba(31,91,75,0.6)] disabled:cursor-not-allowed disabled:bg-[#9fbfb5]"
          type="submit"
          disabled={
            status === "loading" ||
            !fullName ||
            !email ||
            !password ||
            !confirmPassword
          }
        >
          {status === "loading" ? "Criando conta..." : "Criar conta"}
        </button>
      </form>

      {status === "error" ? (
        <div className="rounded-md border border-[#f0c6b9] bg-[#fbe7df] px-4 py-3 text-xs text-[#9d4b3b]">
          {message}
        </div>
      ) : null}

      {status === "success" && message ? (
        <div className="rounded-md border border-[#d8eadf] bg-[#e9f4ef] px-4 py-3 text-xs text-[#2f5d4e]">
          {message}
        </div>
      ) : null}

      <div className="rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-4 py-3 text-xs text-[#6b6357]">
        Ao continuar, você concorda com os termos de uso e a política de
        privacidade.
      </div>

      <div className="text-xs text-[#6b6357]">
        Já possui conta?{" "}
        <Link href="/login" className="font-semibold text-[#1f5b4b]">
          Entrar
        </Link>
      </div>
    </div>
  );
}
