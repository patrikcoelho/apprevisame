import { Suspense } from "react";
import RelatoriosClient from "./RelatoriosClient";

export default function RelatoriosPage() {
  return (
    <Suspense fallback={<div />}>
      <RelatoriosClient />
    </Suspense>
  );
}
