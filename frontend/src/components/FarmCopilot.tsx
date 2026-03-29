"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { speechLangChainFor } from "@/lib/i18n";
import { askFarmCopilot } from "@/services/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  MessageSquare, 
  Mic, 
  MicOff, 
  Send, 
  Loader2, 
  Sparkles,
  AlertCircle
} from "lucide-react";

export default function FarmCopilot() {
  const { t, locale, isRtl } = useLocale();
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appendVoice = useCallback((chunk: string) => {
    setQ((prev) => {
      const p = prev.trimEnd();
      return p ? `${p} ${chunk}` : chunk;
    });
  }, []);

  const speechLangChain = useMemo(() => speechLangChainFor(locale), [locale]);
  const {
    listening,
    interim,
    supported,
    lastError,
    clearError,
    toggle,
    stop: stopVoice,
  } = useSpeechRecognition(speechLangChain, appendVoice);

  useEffect(() => {
    stopVoice();
  }, [locale, stopVoice]);

  const voiceErrorLabel = useMemo(() => {
    if (!lastError) return null;
    if (lastError === "unsupported") return t("copilotVoiceNotSupported");
    if (lastError === "not-allowed") return t("copilotVoicePermission");
    if (lastError === "network") return t("copilotVoiceNetwork");
    if (lastError === "audio-capture") return t("copilotVoiceMic");
    if (lastError === "failed-start") return t("copilotVoiceStartFail");
    if (lastError === "language-not-supported") return t("copilotVoiceLangUnsupported");
    return t("copilotVoiceError");
  }, [lastError, t]);

  const submit = async () => {
    const text = q.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    stopVoice();
    try {
      const a = await askFarmCopilot(text, locale);
      setAnswer(a);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Show the real message from /api/copilot (e.g. Vercel env instructions). Do not map "llm"/"api key"
      // to a generic string — that hid the correct setup steps.
      setError(msg.trim() || t("copilotError"));
    } finally {
      setLoading(false);
    }
  };

  const onVoiceClick = () => {
    clearError();
    toggle();
  };

  return (
    <section
      id="farm-copilot"
      className="glass-card animate-fade-in-up delay-100"
      style={{ padding: 24, marginBottom: 20, borderLeft: "4px solid var(--emerald-500)" }}
    >
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <MessageSquare size={20} className="text-emerald-400" />
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
            {t("copilotTitle")}
          </h2>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
          {t("copilotSubtitle")}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "stretch",
          marginBottom: 10,
          flexDirection: isRtl ? "row-reverse" : "row",
        }}
      >
        <textarea
          dir={isRtl ? "rtl" : "ltr"}
          value={q}
          onChange={(e) => {
            if (listening) stopVoice();
            setQ(e.target.value);
          }}
          placeholder={t("copilotPlaceholder")}
          rows={3}
          disabled={loading}
          className="copilot-textarea"
          style={{
            flex: 1,
            resize: "none",
            minHeight: 100,
            padding: 16,
            borderRadius: 16,
            border: "1px solid var(--border)",
            background: "rgba(0,0,0,0.2)",
            color: "var(--text-primary)",
            fontSize: 14,
            lineHeight: 1.6,
            fontWeight: 500
          }}
        />
        <button
          type="button"
          title={listening ? t("copilotVoiceStop") : t("copilotVoiceStart")}
          onClick={onVoiceClick}
          disabled={loading || !supported}
          className={listening ? "btn-secondary" : "btn-ghost"}
          style={{
            flexShrink: 0,
            width: 64,
            borderRadius: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            border: listening ? "1px solid rgba(248,113,113,0.3)" : "1px solid var(--border)",
            background: listening ? "rgba(248,113,113,0.05)" : "rgba(255,255,255,0.02)",
            opacity: !supported ? 0.3 : 1,
            transition: "all 0.2s"
          }}
          aria-pressed={listening}
        >
          {listening ? <MicOff size={20} className="text-danger" /> : <Mic size={20} className="text-emerald-400" />}
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: listening ? "var(--danger)" : "var(--text-dim)" }}>
            {listening ? t("copilotVoiceStop") : t("copilotVoiceStart")}
          </span>
        </button>
      </div>

      {listening && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: interim ? 6 : 12 }}>
          <div className="pulse-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--emerald-400)" }} />
          <p style={{ fontSize: 12, color: "var(--emerald-400)", fontWeight: 700, margin: 0 }}>
            {t("copilotVoiceListening")}
          </p>
        </div>
      )}
      {listening && interim.trim() ? (
        <p
          dir={isRtl ? "rtl" : "ltr"}
          style={{
            fontSize: 13,
            color: "var(--text-dim)",
            fontStyle: "italic",
            marginBottom: 12,
            marginTop: 0,
            lineHeight: 1.5,
            padding: "0 10px",
            borderLeft: "2px solid rgba(255,255,255,0.1)"
          }}
        >
          "{interim}"
        </p>
      ) : null}

      {voiceErrorLabel && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: "var(--warning)" }}>
          <AlertCircle size={14} />
          <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>{voiceErrorLabel}</p>
        </div>
      )}

      <button
        type="button"
        className="btn-primary"
        style={{ height: 48, padding: "0 28px", borderRadius: 12, gap: 10 }}
        disabled={loading || !q.trim()}
        onClick={submit}
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        {loading ? t("copilotThinking") : t("copilotSend")}
      </button>

      {error && (
        <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 12, background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.2)", display: "flex", gap: 10, color: "var(--danger)" }}>
          <AlertCircle size={16} />
          <p style={{ fontSize: 13, fontWeight: 500, margin: 0, lineHeight: 1.5 }}>{error}</p>
        </div>
      )}

      {answer && (
        <div
          className="animate-fade-in"
          style={{
            marginTop: 20,
            padding: 20,
            borderRadius: 20,
            background: "rgba(16, 185, 129, 0.03)",
            border: "1px solid var(--border)",
            boxShadow: "inset 0 2px 10px rgba(0,0,0,0.2)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Sparkles size={16} className="text-emerald-400" />
            <p style={{ fontSize: 12, fontWeight: 800, color: "var(--emerald-400)", margin: 0, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Expert Recommendation
            </p>
          </div>
          <div
            dir={isRtl ? "rtl" : "ltr"}
            style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              lineHeight: 1.8,
              whiteSpace: "pre-wrap",
              fontWeight: 500
            }}
          >
            {answer}
          </div>
        </div>
      )}
    </section>
  );
}
