"use client";

import { useTheme } from "./ThemeProvider";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={"h-9 w-9 rounded-xl " + (className ?? "")} />;
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={theme === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      title={theme === "dark" ? "Mode Terang" : "Mode Gelap"}
      className={
        "flex h-9 w-9 items-center justify-center rounded-xl border border-outline-variant bg-surface text-on-surface hover:bg-surface-container transition-colors " +
        (className ?? "")
      }
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-primary" />
      ) : (
        <Moon className="h-4 w-4 text-on-surface-variant" />
      )}
    </button>
  );
}
