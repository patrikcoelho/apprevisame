"use client";

import { useLayoutEffect } from "react";

const THEME_KEY = "revisame:theme";

const getSystemTheme = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export default function AuthThemeSync() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previousTheme = root.dataset.theme;
    const previousScheme = root.style.colorScheme;
    const previousPref = window.localStorage.getItem(THEME_KEY);

    const applySystem = () => {
      const system = getSystemTheme();
      root.dataset.theme = system;
      root.style.colorScheme = system;
    };

    window.localStorage.setItem(THEME_KEY, "Automático");
    window.dispatchEvent(
      new CustomEvent("revisame:theme-change", {
        detail: { theme: "Automático" },
      })
    );
    applySystem();

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applySystem();
    media.addEventListener("change", handleChange);

    return () => {
      media.removeEventListener("change", handleChange);
      if (previousPref === null) {
        window.localStorage.removeItem(THEME_KEY);
        window.dispatchEvent(
          new CustomEvent("revisame:theme-change", {
            detail: { theme: undefined },
          })
        );
      } else {
        window.localStorage.setItem(THEME_KEY, previousPref);
        window.dispatchEvent(
          new CustomEvent("revisame:theme-change", {
            detail: { theme: previousPref },
          })
        );
      }
      if (previousTheme) {
        root.dataset.theme = previousTheme;
      } else {
        delete root.dataset.theme;
      }
      if (previousScheme) {
        root.style.colorScheme = previousScheme;
      } else {
        root.style.removeProperty("color-scheme");
      }
    };
  }, []);

  return null;
}
