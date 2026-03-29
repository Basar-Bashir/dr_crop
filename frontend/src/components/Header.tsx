import { useLocale } from "@/contexts/LocaleContext";
import { LOCALES, type Locale } from "@/lib/i18n";
import { Activity } from "lucide-react";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  hi: "हि",
  ur: "اردو",
};

export default function Header() {
  const { locale, setLocale, t } = useLocale();

  return (
    <header className="app-header">
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
          <div className="locale-segment" role="group" aria-label="Language">
            {LOCALES.map((loc) => (
              <button
                key={loc}
                type="button"
                aria-current={locale === loc ? "true" : undefined}
                onClick={() => setLocale(loc)}
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
