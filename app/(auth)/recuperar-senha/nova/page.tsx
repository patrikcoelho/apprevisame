import { Suspense } from "react";
import NovaSenhaClient from "./NovaSenhaClient";

export default function NovaSenhaPage() {
  return (
    <Suspense fallback={null}>
      <NovaSenhaClient />
    </Suspense>
  );
}
