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
    return <div className={"h-10 w-10 rounded-full " + (className ?? "")} />;
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={theme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      title={theme === "dark" ? "Mode Terang" : "Mode Gelap"}
      className={
        "flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:text-primary-dark dark:hover:text-primary hover:bg-surface-variant/40 transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
        (className ?? "")
      }
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 transition-transform duration-200" />
      ) : (
        <Moon className="h-5 w-5 transition-transform duration-200" />
      )}
    </button>
  );
}
