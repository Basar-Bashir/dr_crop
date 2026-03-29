"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { CloudSun, MapPin, Navigation } from "lucide-react";

export type WeatherLocMode = "gps" | "manual";

type Props = {
  mode: WeatherLocMode;
  onModeChange: (m: WeatherLocMode) => void;
  manualLat: string;
  manualLon: string;
  onManualLat: (v: string) => void;
  onManualLon: (v: string) => void;
  disabled?: boolean;
};

export default function WeatherLocationPicker({
  mode,
  onModeChange,
  manualLat,
  manualLon,
  onManualLat,
  onManualLon,
  disabled,
}: Props) {
  const { t } = useLocale();

  return (
    <div
      className="glass-card"
      style={{
        padding: 20,
        marginBottom: 16,
        borderLeft: "4px solid var(--accent-400)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <CloudSun size={18} className="text-[var(--accent-400)]" />
        <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
          {t("weatherLocTitle")}
        </div>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 16, fontWeight: 500 }}>
        {t("weatherLocHint")}
      </p>

      <div className="locale-segment" style={{ marginBottom: 16, width: "100%", maxWidth: 1000, background: "rgba(0,0,0,0.2)", padding: 4, borderRadius: 14 }}>
        <button
          type="button"
          aria-current={mode === "gps" ? "true" : undefined}
          disabled={disabled}
          onClick={() => onModeChange("gps")}
          style={{ flex: 1, borderRadius: 10, fontSize: 12, fontWeight: 700, gap: 8 }}
        >
          <Navigation size={14} />
          {t("weatherLocGps")}
        </button>
        <button
          type="button"
          aria-current={mode === "manual" ? "true" : undefined}
          disabled={disabled}
          onClick={() => onModeChange("manual")}
          style={{ flex: 1, borderRadius: 10, fontSize: 12, fontWeight: 700, gap: 8 }}
        >
          <MapPin size={14} />
          {t("weatherLocManual")}
        </button>
      </div>

      {mode === "manual" && (
        <div className="animate-fade-in" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <label style={{ flex: "1 1 140px", display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("weatherLat")}</span>
            <input
              type="text"
              inputMode="decimal"
              disabled={disabled}
              placeholder="e.g. 28.61"
              value={manualLat}
              onChange={(e) => onManualLat(e.target.value)}
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "rgba(0,0,0,0.2)",
                color: "var(--text-primary)",
                fontSize: 14,
                width: "100%",
                fontWeight: 600
              }}
            />
          </label>
          <label style={{ flex: "1 1 140px", display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("weatherLon")}</span>
            <input
              type="text"
              inputMode="decimal"
              disabled={disabled}
              value={manualLon}
              placeholder="e.g. 77.21"
              onChange={(e) => onManualLon(e.target.value)}
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "rgba(0,0,0,0.2)",
                color: "var(--text-primary)",
                fontSize: 14,
                width: "100%",
                fontWeight: 600
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
