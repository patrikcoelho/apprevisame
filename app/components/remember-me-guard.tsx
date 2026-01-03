"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const REMEMBER_KEY = "revisame:remember-me";
const SESSION_KEY = "revisame:session-active";

export default function RememberMeGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const remember = window.localStorage.getItem(REMEMBER_KEY);
    if (remember !== "false") return;
    if (window.sessionStorage.getItem(SESSION_KEY) === "true") return;

    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      supabase.auth.signOut();
      if (!pathname.startsWith("/login") && !pathname.startsWith("/cadastro")) {
        router.push("/login");
      }
    });
  }, [pathname, router]);

  return null;
}
