"use client";

import { useEffect } from "react";

const THEME_KEY = "revisame:theme";
type ThemePref = "Claro" | "Escuro" | "Automático";

const resolveSystemTheme = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const applyTheme = (pref?: ThemePref | null) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (pref === "Claro") {
    root.dataset.theme = "light";
    root.style.colorScheme = "light";
    return;
  }
  if (pref === "Escuro") {
    root.dataset.theme = "dark";
    root.style.colorScheme = "dark";
    return;
  }
  const systemTheme = resolveSystemTheme();
  root.dataset.theme = systemTheme;
  root.style.colorScheme = systemTheme;
};

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY) as ThemePref | null;
    applyTheme(stored);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      const current = window.localStorage.getItem(THEME_KEY) as ThemePref | null;
      if (!current || current === "Automático") {
        applyTheme(current);
      }
    };
    media.addEventListener("change", handleSystemChange);

    const handleThemeChange = (event: Event) => {
      const detail = (event as CustomEvent<{ theme?: ThemePref }>).detail;
      const next = detail?.theme ?? null;
      if (next) {
        window.localStorage.setItem(THEME_KEY, next);
      } else {
        window.localStorage.removeItem(THEME_KEY);
      }
      applyTheme(next);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_KEY) return;
      const next = (event.newValue as ThemePref | null) ?? null;
      applyTheme(next);
    };

    window.addEventListener("revisame:theme-change", handleThemeChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("revisame:theme-change", handleThemeChange);
      window.removeEventListener("storage", handleStorage);
      media.removeEventListener("change", handleSystemChange);
    };
  }, []);

  return children;
}
