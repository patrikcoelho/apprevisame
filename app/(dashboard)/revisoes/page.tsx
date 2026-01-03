import { Suspense } from "react";
import RevisoesClient from "./RevisoesClient";

export default function RevisoesPage() {
  return (
    <Suspense fallback={null}>
      <RevisoesClient />
    </Suspense>
  );
}
