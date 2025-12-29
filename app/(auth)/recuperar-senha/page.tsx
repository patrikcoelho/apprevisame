"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarSenhaPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleUpdatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("As senhas não coincidem.");
      return;
    }

    setStatus("loading");
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("error");
      setMessage("Não foi possível atualizar sua senha.");
      return;
    }

    setStatus("idle");
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#6b6357]">
          Recuperar senha
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[#1f1c18]">
          Defina uma nova senha.
        </h2>
        <p className="mt-2 text-sm text-[#5f574a]">
          Escolha uma senha segura para continuar seus estudos.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleUpdatePassword}>
        <div>
          <label className="text-xs font-semibold text-[#6b6357]">
            Nova senha
          </label>
          <input
            type="password"
            placeholder="Digite a nova senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18]"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#6b6357]">
            Confirmar senha
          </label>
          <input
            type="password"
            placeholder="Repita a nova senha"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-[#efe2d1] bg-white px-3 text-sm text-[#1f1c18]"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-[#1f5b4b] px-4 py-3 text-sm font-semibold text-[#fffaf2] shadow-[0_12px_30px_-20px_rgba(31,91,75,0.6)] disabled:cursor-not-allowed disabled:bg-[#9fbfb5]"
          disabled={status === "loading" || !password || !confirmPassword}
        >
          {status === "loading" ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>

      {status === "error" ? (
        <div className="rounded-md border border-[#f0c6b9] bg-[#fbe7df] px-4 py-3 text-xs text-[#9d4b3b]">
          {message}
        </div>
      ) : null}
    </div>
  );
}
