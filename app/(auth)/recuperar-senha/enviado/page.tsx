import { Suspense } from "react";
import EnviadoClient from "./EnviadoClient";

export default function RecuperacaoEnviadaPage() {
  return (
    <Suspense fallback={null}>
      <EnviadoClient />
    </Suspense>
  );
}
