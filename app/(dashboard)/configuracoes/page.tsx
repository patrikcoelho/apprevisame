import { Suspense } from "react";
import ConfiguracoesClient from "./ConfiguracoesClient";

export default function ConfiguracoesPage() {
  return (
    <Suspense fallback={<div />}>
      <ConfiguracoesClient />
    </Suspense>
  );
}
