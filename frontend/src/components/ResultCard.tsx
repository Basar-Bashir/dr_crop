"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale } from "@/contexts/LocaleContext";
import type { MessageKey } from "@/lib/i18n";
import type {
  AirQuality,
  PredictionResult,
  Recommendation,
  FieldConditions,
} from "@/lib/types";
import { 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  Wind, 
  Thermometer, 
  Droplets, 
  Copy, 
  RotateCcw, 
  Info,
  Waves,
  Sun,
  Dna,
  Share2,
  Activity,
  Sprout
} from "lucide-react";

interface Props {
  prediction: PredictionResult;
  recommendation: Recommendation | null;
  onReset: () => void;
  preview: string | null;
  geo?: {
    coords: { lat: number; lon: number } | null;
    failed: boolean;
    source?: "gps" | "manual" | null;
  };
}

function nonEmpty(s: string | undefined | null): boolean {
  return typeof s === "string" && s.trim().length > 0;
}

function hasAirMetrics(aq: AirQuality | null | undefined): boolean {
  if (!aq) return false;
  return [
    aq.us_aqi,
    aq.european_aqi,
    aq.pm2_5,
    aq.pm10,
    aq.ozone,
    aq.nitrogen_dioxide,
    aq.sulphur_dioxide,
    aq.carbon_monoxide,
  ].some((v) => v != null && !Number.isNaN(Number(v)));
}

export default function ResultCard({
  prediction,
  recommendation,
  onReset,
  preview,
  geo,
}: Props) {
  const { t } = useLocale();

  const confidencePercent = Math.round(prediction.confidence * 100);
  const isHealthy = prediction.disease.toLowerCase().includes("healthy");
  const [activeTab, setActiveTab] = useState<"treatment" | "prevention" | "fertilizer">("treatment");
  const [copied, setCopied] = useState(false);

  const fc = recommendation?.field_conditions;
  const hasField =
    fc &&
    (fc.temperature_c != null ||
      fc.soil_moisture_0_7cm != null ||
      fc.soil_temperature_0_7cm_c != null);

  const yI = recommendation?.irrigation_water;
  const yS = recommendation?.soil_health_yield;
  const yC = recommendation?.crop_practices_yield;
  const yA = recommendation?.air_quality_advice;
  const yU = recommendation?.yield_uplift_comparison;
  const aq = recommendation?.air_quality;
  const hasYieldPlan = nonEmpty(yI) || nonEmpty(yS) || nonEmpty(yC);
  const showAirSection = hasAirMetrics(aq) || nonEmpty(yA);

  const severityLabel =
    confidencePercent >= 80 ? t("severityHigh") : confidencePercent >= 50 ? t("severityMedium") : t("severityLow");

  const handleCopyReport = () => {
    const lines = [
      `Dr. Crop Analysis Report`,
      `=======================`,
      `${t("cropType")}: ${prediction.crop}`,
      `${t("condition")}: ${isHealthy ? t("noDisease") : prediction.disease}`,
      `${t("confidenceLabel")}: ${confidencePercent}%`,
      ``,
    ];
    if (geo?.coords) {
      lines.splice(
        4,
        0,
        `${t("geoLatLon", { lat: geo.coords.lat.toFixed(2), lon: geo.coords.lon.toFixed(2) })} (${geo.source === "manual" ? t("geoSourceManual") : t("geoSourceGps")})`
      );
    }
    if (recommendation && !isHealthy) {
      lines.push(
        `[${t("tabTreatment")}]`,
        `${recommendation.treatment}`,
        ``,
        `[${t("tabPrevention")}]`,
        `${recommendation.prevention}`,
        ``,
        `[${t("tabFertilizer")}]`,
        `${recommendation.fertilizer}`
      );
    }
    if (recommendation && (hasYieldPlan || nonEmpty(yA))) {
      lines.push(``, `--- Precision Agriculture Advice ---`);
      if (nonEmpty(yI)) lines.push(`${yI}`, ``);
      if (nonEmpty(yS)) lines.push(`${yS}`, ``);
      if (nonEmpty(yC)) lines.push(`${yC}`, ``);
      if (nonEmpty(yA)) lines.push(`${yA}`);
    }
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const severityColor =
    confidencePercent >= 80 ? "var(--danger)" : confidencePercent >= 50 ? "var(--warning)" : "var(--success)";

  return (
    <div className="animate-fade-in-up" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="glass-card" style={{ padding: 24, borderLeft: `4px solid ${isHealthy ? "var(--success)" : "var(--danger)"}` }}>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          {preview && (
            <div style={{ position: "relative", width: 88, height: 88, borderRadius: 16, overflow: "hidden", border: "2px solid var(--border-bright)", flexShrink: 0 }}>
              <Image
                src={preview}
                alt="Prediction source"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                {t("resultTitle")}
              </h3>
              <div className={`badge ${isHealthy ? "badge-success" : "badge-danger"}`} style={{ gap: 6, padding: "6px 14px", borderRadius: 10 }}>
                {isHealthy ? <CheckCircle size={14} strokeWidth={3} /> : <AlertCircle size={14} strokeWidth={3} />}
                {isHealthy ? t("resultHealthyBadge") : t("resultDiseaseBadge")}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <InfoRow label={t("cropType")} value={prediction.crop} />
              <InfoRow
                label={t("condition")}
                value={isHealthy ? t("noDisease") : prediction.disease}
                highlight={!isHealthy}
              />
            </div>
          </div>
        </div>

        {geo?.coords && (
          <p style={{ fontSize: 11, color: "var(--accent-400)", marginTop: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <Dna size={12} />
            {t("geoLatLon", { lat: geo.coords.lat.toFixed(2), lon: geo.coords.lon.toFixed(2) })} — {t("geoStatusUsed")}{" "}
            ({geo.source === "manual" ? t("geoSourceManual") : t("geoSourceGps")})
          </p>
        )}

        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("confidenceLabel")}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "var(--accent-400)" }}>
              {confidencePercent}%
            </span>
          </div>
          <div className="confidence-track" style={{ height: 8 }}>
            <div className="confidence-fill" style={{ width: `${confidencePercent}%` }} />
          </div>
        </div>

        {!isHealthy && (
          <div style={{ marginTop: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div className="feature-pill" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
              <div
                style={{ width: 8, height: 8, borderRadius: "50%", background: severityColor }}
              />
              {t("matchLabel")}: <span style={{ color: severityColor }}>{severityLabel}</span>
            </div>
            <div className="feature-pill" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
              <ActivityIcon /> {t("pipelineBadge")}
            </div>
          </div>
        )}
      </div>

      {recommendation && nonEmpty(yU) && (
        <div
          className="glass-card animate-fade-in-up"
          style={{
            padding: 24,
            borderLeft: "4px solid var(--warning)",
            background: "rgba(245, 158, 11, 0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <TrendingUp size={20} className="text-warning" />
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--warning)", letterSpacing: "-0.01em" }}>
              {t("yieldUpliftTitle")}
            </h3>
          </div>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0, fontWeight: 500 }}>
            {yU}
          </p>
          <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 12, fontWeight: 600 }}>
            {t("yieldUpliftHint")}
          </p>
        </div>
      )}

      {hasField && fc && (
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Thermometer size={18} className="text-[var(--accent-400)]" />
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
              {t("fieldTitle")}
            </h3>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 16, fontWeight: 600 }}>{t("fieldHint")}</p>
          <FieldGrid conditions={fc} t={t} />
        </div>
      )}

      {recommendation && showAirSection && (
        <div
          className="glass-card"
          style={{ padding: 24, borderLeft: "4px solid #60a5fa", background: "rgba(96, 165, 250, 0.04)" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Wind size={18} className="text-blue-400" />
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
              {t("airTitle")}
            </h3>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 16, fontWeight: 600 }}>{t("airHint")}</p>
          {hasAirMetrics(aq) && <AirQualityGrid aq={aq!} t={t} />}
          {nonEmpty(yA) && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--accent-400)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {t("airAdviceTitle")}
              </div>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0, fontWeight: 500 }}>
                {yA}
              </p>
            </div>
          )}
        </div>
      )}

      {recommendation && !isHealthy && (
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", marginBottom: 16, letterSpacing: "-0.01em" }}>
            {t("diseaseMgmt")}
          </h3>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 20,
              background: "rgba(0,0,0,0.2)",
              padding: 6,
              borderRadius: 16,
            }}
          >
            {(["treatment", "prevention", "fertilizer"] as const).map((tab) => (
              <button
                key={tab}
                id={`tab-${tab}`}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  background: activeTab === tab ? "var(--accent-600)" : "transparent",
                  color: activeTab === tab ? "#fff" : "var(--text-muted)",
                  boxShadow: activeTab === tab ? "0 4px 12px rgba(196, 154, 82, 0.25)" : "none"
                }}
              >
                {tab === "treatment" ? t("tabTreatment") : tab === "prevention" ? t("tabPrevention") : t("tabFertilizer")}
              </button>
            ))}
          </div>

          <div
            className="animate-fade-in"
            key={activeTab}
            style={{
              background: "rgba(196, 154, 82, 0.03)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: 20,
              fontSize: 14,
              color: "var(--text-secondary)",
              lineHeight: 1.8,
              fontWeight: 500
            }}
          >
            {activeTab === "treatment" && recommendation.treatment}
            {activeTab === "prevention" && recommendation.prevention}
            {activeTab === "fertilizer" && recommendation.fertilizer}
          </div>

          {recommendation.confidence_note && (
            <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.02)", display: "flex", gap: 10 }}>
              <Info size={14} className="text-[var(--accent-400)] mt-0.5" />
              <p style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 500, lineHeight: 1.5, margin: 0 }}>
                {recommendation.confidence_note}
              </p>
            </div>
          )}
        </div>
      )}

      {recommendation && hasYieldPlan && (
        <div className="glass-card" style={{ padding: 24, borderLeft: "4px solid var(--accent-500)" }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--accent-400)", marginBottom: 6, letterSpacing: "-0.01em" }}>
            {t("yieldTitle")}
          </h3>
          <p style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 20, fontWeight: 600 }}>{t("yieldHint")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {nonEmpty(yI) && <YieldBlock icon={<Waves size={18} />} title={t("yieldWater")} text={yI!} />}
            {nonEmpty(yS) && <YieldBlock icon={<Sun size={18} />} title={t("yieldSoil")} text={yS!} />}
            {nonEmpty(yC) && <YieldBlock icon={<Sprout size={18} />} title={t("yieldCrop")} text={yC!} />}
          </div>
        </div>
      )}

      {isHealthy && (
        <div
          className="glass-card animate-fade-in-up delay-100"
          style={{
            padding: 32,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--success-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-400)", marginBottom: 16 }}>
            <CheckCircle size={32} strokeWidth={3} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--accent-400)", marginBottom: 8 }}>
            {t("healthyCardTitle")}
          </h3>
          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 300 }}>
            {t("healthyCardDesc")}
          </p>
        </div>
      )}

      <div className="result-actions" style={{ gap: 12 }}>
        <button id="btn-scan-another" type="button" onClick={onReset} className="btn-primary" style={{ flex: 2, height: 56 }}>
          <RotateCcw size={20} />
          {t("scanAnother")}
        </button>
        <button id="btn-copy-report" type="button" onClick={handleCopyReport} className="btn-ghost" style={{ flex: 1, height: 56 }}>
          {copied ? <><CheckCircle size={18} /> {t("copied")}</> : <><Share2 size={18} /> {t("copyReport")}</>}
        </button>
      </div>
    </div>
  );
}

function AirQualityGrid({
  aq,
  t,
}: {
  aq: AirQuality;
  t: (key: MessageKey) => string;
}) {
  const rows: { label: string; value: string }[] = [];
  const u = t("airUgm3");
  if (aq.us_aqi != null) rows.push({ label: t("airUsAqi"), value: `${Math.round(aq.us_aqi)}` });
  if (aq.european_aqi != null)
    rows.push({ label: t("airEuAqi"), value: `${Math.round(aq.european_aqi)}` });
  if (aq.pm2_5 != null) rows.push({ label: t("airPm25"), value: `${aq.pm2_5.toFixed(1)} ${u}` });
  if (aq.pm10 != null) rows.push({ label: t("airPm10"), value: `${aq.pm10.toFixed(1)} ${u}` });
  if (aq.ozone != null) rows.push({ label: t("airOzone"), value: `${aq.ozone.toFixed(1)} ${u}` });
  if (aq.nitrogen_dioxide != null)
    rows.push({ label: t("airNo2"), value: `${aq.nitrogen_dioxide.toFixed(1)} ${u}` });
  if (aq.sulphur_dioxide != null)
    rows.push({ label: t("airSo2"), value: `${aq.sulphur_dioxide.toFixed(1)} ${u}` });
  if (aq.carbon_monoxide != null)
    rows.push({ label: t("airCo"), value: `${aq.carbon_monoxide.toFixed(1)} ${u}` });
  if (aq.time_utc) rows.push({ label: t("timeUtc"), value: aq.time_utc });

  if (rows.length === 0) return null;

  return (
    <dl style={{ display: "grid", gap: 10, fontSize: 13 }}>
      {rows.map((r) => (
        <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <dt style={{ color: "var(--text-muted)", fontWeight: 500 }}>{r.label}</dt>
          <dd style={{ fontWeight: 700, textAlign: "right", color: "var(--text-primary)" }}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function FieldGrid({
  conditions,
  t,
}: {
  conditions: FieldConditions;
  t: (key: MessageKey) => string;
}) {
  const rows: { label: string; value: string; icon: React.ReactNode }[] = [];
  if (conditions.temperature_c != null) {
    rows.push({ label: t("airTemp"), value: `${conditions.temperature_c.toFixed(1)} °C`, icon: <Thermometer size={14} /> });
  }
  if (conditions.relative_humidity_pct != null) {
    rows.push({ label: t("humidity"), value: `${Math.round(conditions.relative_humidity_pct)}%`, icon: <Waves size={14} /> });
  }
  if (conditions.soil_moisture_0_7cm != null) {
    rows.push({ label: t("soilMoist07"), value: `${conditions.soil_moisture_0_7cm.toFixed(3)} m³/m³`, icon: <Droplets size={14} /> });
  }
  
  if (rows.length === 0) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {rows.map((r) => (
        <div key={r.label} style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}>
           <div style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
            {r.icon} {r.label}
          </div>
          <div style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 700 }}>
            {r.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function YieldBlock({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8, display: "flex", alignItems: "center", gap: 8, color: "var(--accent-500)" }}>
        {icon} <span style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</span>
      </div>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0, fontWeight: 500 }}>
        {text}
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: highlight ? "var(--danger)" : "var(--accent-400)",
          maxWidth: "60%",
          textAlign: "right",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function ActivityIcon() {
  return <Activity size={12} strokeWidth={3} />;
}
