"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle({ initialTheme = "DARK" }: { initialTheme?: "SYSTEM" | "DARK" | "LIGHT" }) {
  const [light, setLight] = useState(initialTheme === "LIGHT");

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const applyTheme = () => {
      const shouldUseLight = initialTheme === "LIGHT" || (initialTheme === "SYSTEM" && media.matches);
      setLight(shouldUseLight);
      document.documentElement.classList.toggle("light", shouldUseLight);
    };
    const frame = window.requestAnimationFrame(applyTheme);
    if (initialTheme === "SYSTEM") media.addEventListener("change", applyTheme);
    return () => {
      window.cancelAnimationFrame(frame);
      media.removeEventListener("change", applyTheme);
    };
  }, [initialTheme]);

  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    void fetch("/api/account", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ theme: next ? "LIGHT" : "DARK" }),
    });
  }

  return (
    <button className="icon-button" type="button" onClick={toggle} aria-label={`Switch to ${light ? "dark" : "light"} theme`}>
      {light ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
    </button>
  );
}
