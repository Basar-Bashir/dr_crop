import type { Locale } from "@/lib/i18n";
import type {
  PredictionResult,
  Recommendation,
  FullDiagnosisResponse,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function coordsPayload(coords?: { latitude: number; longitude: number } | null) {
  if (
    coords == null ||
    typeof coords.latitude !== "number" ||
    typeof coords.longitude !== "number"
  ) {
    return {};
  }
  return { latitude: coords.latitude, longitude: coords.longitude };
}

export async function predictDisease(
  file: File,
  coords?: { latitude: number; longitude: number } | null
): Promise<FullDiagnosisResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const predRes = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    body: formData,
  });

  if (!predRes.ok) {
    let detail = predRes.statusText;
    try {
      const errBody = await predRes.json();
      if (errBody?.detail) {
        detail =
          typeof errBody.detail === "string"
            ? errBody.detail
            : JSON.stringify(errBody.detail);
      }
    } catch {
      /* ignore */
    }
    throw new Error(`Prediction failed (${predRes.status}): ${detail}`);
  }

  const prediction: PredictionResult = await predRes.json();

  const recRes = await fetch(`${API_BASE}/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      disease: prediction.disease,
      crop: prediction.crop,
      ...coordsPayload(coords),
    }),
  });

  let recommendation: Recommendation;
  if (recRes.ok) {
    recommendation = await recRes.json();
  } else {
    recommendation = {
      treatment: "Unable to fetch recommendations at this time.",
      prevention: "N/A",
      fertilizer: "N/A",
      confidence_note: "Recommendation service unavailable.",
      irrigation_water: "",
      soil_health_yield: "",
      crop_practices_yield: "",
      air_quality_advice: "",
      yield_uplift_comparison: "",
      field_conditions: null,
      air_quality: null,
    };
  }

  return { prediction, recommendation };
}

/** Farm Copilot uses the Next.js route `/api/copilot` so `LLM_API_KEY` can live in Vercel env or frontend/.env.local (server-only). */
export async function askFarmCopilot(question: string, locale: Locale): Promise<string> {
  const res = await fetch("/api/copilot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, locale }),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const errBody = await res.json();
      if (errBody?.detail) {
        detail =
          typeof errBody.detail === "string"
            ? errBody.detail
            : JSON.stringify(errBody.detail);
      }
    } catch {
      /* ignore */
    }
    throw new Error(`Copilot failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as { answer: string };
  return data.answer;
}
