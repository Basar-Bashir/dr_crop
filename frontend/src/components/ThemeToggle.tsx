"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("dr-crop-theme") as "dark" | "light" | null;
    const sysPrefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    
    // Explicitly check the current data-theme incase it's already set
    const currentTheme = document.documentElement.getAttribute("data-theme") as "dark" | "light" | null;
    const initialTheme = currentTheme || savedTheme || (sysPrefersLight ? "light" : "dark");
    
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
    
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("dr-crop-theme", newTheme);
  };

  if (!mounted) {
    return <div style={{ width: 56, height: 28 }} />;
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      style={{
        width: 52,
        height: 28,
        borderRadius: 999,
        background: isDark ? "rgba(255,255,255,0.15)" : "rgba(27, 51, 32, 0.1)",
        border: isDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(27, 51, 32, 0.15)",
        position: "relative",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        padding: 2,
        transition: "all 0.3s ease",
        outline: "none"
      }}
      aria-label="Toggle Theme"
      title="Toggle Theme"
    >
      <div 
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: isDark ? "#ffffff" : "var(--accent-500)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: isDark ? "translateX(24px)" : "translateX(0)",
          transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s",
          color: isDark ? "var(--accent-500)" : "#ffffff",
          boxShadow: isDark ? "0 2px 5px rgba(0,0,0,0.2)" : "0 2px 4px rgba(0,0,0,0.1)"
        }}
      >
        {isDark ? <Moon size={13} strokeWidth={2.5} /> : <Sun size={13} strokeWidth={2.5} />}
      </div>
    </button>
  );
}
