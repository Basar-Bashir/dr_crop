import { useLocale } from "@/contexts/LocaleContext";
import { LOCALES, type Locale } from "@/lib/i18n";
import { Activity } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  hi: "हि",
  ur: "اردو",
};

export default function Header() {
  const { locale, setLocale, t } = useLocale();

  return (
    <header className="app-header" dir="ltr">
      <div className="app-header__inner">
        {/* Left Capsule */}
        <div className="glass-capsule left-capsule">
          <div className="app-header__brand">
            <h1 className="app-header__title">
              Dr. Crop <span className="title-dot"></span>
            </h1>
          </div>
          
          <nav className="app-header__nav">
            <a href="#farm-copilot" className="app-header__link">
              {t("navCopilot")}
            </a>
            <a href="#how-it-works" className="app-header__link">
              {t("navHow")}
            </a>
            <a href="#crops" className="app-header__link">
              {t("navDiseases")}
            </a>
          </nav>
        </div>

        {/* Right Capsule */}
        <div className="glass-capsule glass-capsule-padding">
          <ThemeToggle />
          
          <div 
            role="group" 
            aria-label="Language"
            style={{ 
              position: "relative", 
              display: "flex", 
              background: "rgba(255,255,255,0.1)", 
              borderRadius: 999, 
              padding: 2 
            }}
          >
            {/* Sliding Active Pill */}
            <div 
              style={{
                position: "absolute",
                top: 2,
                left: 2,
                width: 42,
                height: "calc(100% - 4px)",
                background: "#ffffff",
                borderRadius: 999,
                transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: `translateX(${LOCALES.indexOf(locale) * 42}px)`,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}
            />
            {LOCALES.map((loc) => (
              <button
                key={loc}
                type="button"
                aria-current={locale === loc ? "true" : undefined}
                onClick={() => setLocale(loc)}
                style={{
                  width: 42,
                  textAlign: "center",
                  position: "relative",
                  background: "transparent",
                  border: "none",
                  color: locale === loc ? "var(--accent-500)" : "#ffffff",
                  fontSize: 13,
                  fontWeight: locale === loc ? 600 : 500,
                  cursor: "pointer",
                  padding: "6px 0",
                  zIndex: 1,
                  transition: "color 0.3s"
                }}
              >
                {LOCALE_LABELS[loc]}
              </button>
            ))}
          </div>
          
          <button className="btn-get-started">
            <Activity size={14} strokeWidth={2.5} />
            {t("badgeOnline")}
          </button>
        </div>
      </div>
    </header>
  );
}
