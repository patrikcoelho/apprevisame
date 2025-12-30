export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f6f1ea] text-[#1d1b16]">
      <div className="pointer-events-none fixed left-[-20rem] top-[-14rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(217,91,67,0.25),rgba(246,241,234,0))] blur-3xl" />
      <div className="pointer-events-none fixed right-[-18rem] top-24 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(31,91,75,0.25),rgba(246,241,234,0))] blur-3xl" />

      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-8 md:px-6 md:py-10">
        <div className="grid w-full gap-6 rounded-2xl border border-[#e6dbc9] bg-[#fffaf2] p-5 shadow-[0_18px_40px_-30px_rgba(31,91,75,0.5)] sm:p-6 md:grid-cols-[1.1fr_1fr] md:gap-8 md:p-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#1f5b4b] text-lg font-semibold text-[#fffaf2]">
                R
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#6b6357]">
                  Revisame
                </p>
                <p className="text-lg font-semibold text-[#1f1c18]">
                  Controle inteligente de estudos
                </p>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[#1f1c18]">
                Organize suas revisões com clareza.
              </h1>
              <p className="mt-2 text-sm text-[#5f574a]">
                Acompanhe seus estudos diários, veja o que está atrasado e
                mantenha o foco na rotina certa.
              </p>
            </div>
            <div className="space-y-3 text-sm text-[#4b4337]">
              {[
                "Revisões espaçadas automáticas",
                "Templates prontos para cada ritmo",
                "Painel diário com alertas visuais",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-md border border-[#efe2d1] bg-[#fdf8f1] px-4 py-3"
                >
                  <span className="h-2 w-2 rounded-full bg-[#1f5b4b]" />
                  {item}
                </div>
              ))}
            </div>
            <div className="rounded-md border border-[#d8eadf] bg-[#e9f4ef] p-4 text-sm text-[#2f5d4e]">
              <p className="text-xs font-semibold uppercase text-[#2c5b4b]">
                Destaque
              </p>
              <p className="mt-2 text-base font-semibold text-[#1f3f35]">
                Planeje o semestre inteiro em minutos.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-[#efe2d1] bg-white/70 p-5 sm:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
