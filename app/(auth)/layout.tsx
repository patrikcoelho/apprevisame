import Image from "next/image";
import Link from "next/link";
import logoRevisame from "@/public/images/logo-revisame.svg";
import logoRevisameDark from "@/public/images/logo-revisame-dark.svg";
import AuthThemeSync from "@/app/(auth)/auth-theme-sync";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <AuthThemeSync />
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        <div className="absolute inset-0 bg-[var(--background)]" />
        <div
          className="absolute inset-0 opacity-90"
          style={{
            backgroundImage:
              "radial-gradient(circle at 16% 20%, var(--auth-bg-glow-1), transparent 45%), radial-gradient(circle at 82% 28%, var(--auth-bg-glow-2), transparent 42%), radial-gradient(circle at 78% 75%, var(--auth-bg-glow-3), transparent 40%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "radial-gradient(var(--auth-bg-dot) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-md items-center justify-between px-4 pt-3 lg:max-w-6xl lg:px-8 lg:pt-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md">
            <Image
              src={logoRevisame}
              alt="Revisame"
              width={36}
              height={36}
              className="logo-variant--light h-9 w-9"
            />
            <Image
              src={logoRevisameDark}
              alt="Revisame"
              width={36}
              height={36}
              className="logo-variant--dark h-9 w-9"
            />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--text-muted)]">
              Revisame
            </p>
            <p className="text-sm font-semibold text-[var(--text-strong)]">
              Controle inteligente de estudos
            </p>
          </div>
        </Link>
        <div className="hidden items-center gap-3 text-sm font-semibold lg:flex">
          <Link
            href="/cadastro"
            className="rounded-full border border-[var(--border)] px-4 py-2 text-[var(--text-strong)]"
          >
            Cadastrar
          </Link>
          <Link
            href="/cadastro"
            className="rounded-full bg-[var(--accent-bg)] px-4 py-2 text-[var(--text-on-accent)] shadow-[var(--shadow-accent-soft)]"
          >
            Seja Pro
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex min-h-screen items-start justify-center px-4 pb-6 pt-8 lg:items-center lg:px-10 lg:py-16">
        <div className="w-full max-w-md lg:max-w-lg">
          <div className="rounded-2xl border-0 bg-transparent p-6 shadow-none lg:border lg:border-[var(--border)] lg:bg-[var(--surface)] lg:p-8 lg:shadow-[var(--shadow-accent-wide)]">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
