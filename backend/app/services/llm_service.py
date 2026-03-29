import json

import httpx

from app.config import get_settings
from app.models.schemas import AirQuality

SYSTEM_PROMPT = """\
You are an agricultural expert AI. You receive a crop, disease diagnosis, optional research context,
and optional live field data: weather/soil estimates and/or air quality (PM, ozone, AQI) from models.

Return a single JSON object with EXACTLY these keys (all strings):
treatment, prevention, fertilizer, confidence_note,
irrigation_water, soil_health_yield, crop_practices_yield, air_quality_advice, yield_uplift_comparison.

- treatment / prevention / fertilizer: focus on the diagnosed problem (if the plant is healthy,
  give brief maintenance and monitoring tips instead of chemical treatment).
- irrigation_water: timing irrigation, drainage, rainfall — tied to weather/soil data when provided.
- soil_health_yield: organic matter, pH, compaction, mulch, nutrients for maximum yield.
- crop_practices_yield: cultivar, spacing, rotation, scouting, harvest timing for best yield.
- air_quality_advice: REQUIRED (can be brief if air data is missing). When PM2.5/PM10/ozone/AQI are
  provided, explain likely effects on THIS crop (e.g. ozone leaf injury, dust shading leaves,
  stomatal ozone uptake) and concrete steps to REDUCE harm: timing irrigation or field work,
  avoiding foliar sprays in peak ozone/PM hours, rinsing dust after wind, windbreaks/mulch,
  ground cover to limit dust, monitoring sensitive growth stages. If no air metrics were given,
  give 1–2 sentences of general best practice.
- yield_uplift_comparison: REQUIRED. In plain language, compare likely yield if the farmer IGNORES or
  delays the advice versus if they FOLLOW the treatment, prevention, and yield-related suggestions above.
  Give an indicative percentage range OR qualitative comparison (e.g. "often 15–35% more than poor control"
  for disease; smaller for healthy maintenance). Tie loosely to disease severity / confidence when relevant.
  Always state clearly that this is an indicative estimate only — not a guarantee — and that real outcomes
  depend on weather, soil, timing, and local practice.

If weather/soil or air data is missing, still give sound general advice for the crop.
Return ONLY valid JSON — no markdown fences, no extra text."""

RECOMMEND_KEYS = (
    "treatment",
    "prevention",
    "fertilizer",
    "confidence_note",
    "irrigation_water",
    "soil_health_yield",
    "crop_practices_yield",
    "air_quality_advice",
    "yield_uplift_comparison",
)


def _openai_error_body(resp: httpx.Response) -> str:
    try:
        data = resp.json()
        err = data.get("error")
        if isinstance(err, dict) and err.get("message"):
            return str(err["message"])[:400]
    except Exception:
        pass
    return ""


def _ensure_llm_ok(resp: httpx.Response) -> None:
    """Raise a clear RuntimeError on auth failures instead of a generic HTTP status."""
    if resp.status_code == 401:
        hint = _openai_error_body(resp)
        raise RuntimeError(
            f"LLM API key rejected (401 Unauthorized). {hint} "
            "Set LLM_API_KEY or OPENAI_API_KEY in backend/.env or in the repository root .env file."
        )
    resp.raise_for_status()


async def generate_recommendation(
    context: str,
    disease: str,
    crop: str,
    field_context: str = "",
    air_quality: AirQuality | None = None,
) -> dict[str, str]:
    """Call an OpenAI-compatible LLM to generate structured treatment and yield advice."""
    settings = get_settings()

    if not settings.llm_api_key:
        return _fallback_recommendation(disease, crop, field_context, air_quality)

    field_block = (
        f"\n\nField context (weather/soil and/or air quality model estimates):\n{field_context}\n"
        if field_context.strip()
        else "\n\nField weather/soil/air: not provided — give general best-practice yield and air-aware advice.\n"
    )

    user_prompt = (
        f"Crop: {crop}\nDisease / condition: {disease}\n\n"
        f"Research context:\n{context}\n"
        f"{field_block}"
        f"Respond with the JSON object using these keys: {', '.join(RECOMMEND_KEYS)}."
    )

    async with httpx.AsyncClient(timeout=45) as client:
        resp = await client.post(
            f"{settings.llm_base_url}/chat/completions",
            headers={"Authorization": f"Bearer {settings.llm_api_key}"},
            json={
                "model": settings.llm_model,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.3,
            },
        )
        _ensure_llm_ok(resp)
        content = resp.json()["choices"][0]["message"]["content"]

    try:
        raw = json.loads(content)
        return _merge_with_fallback(raw, disease, crop, field_context, air_quality)
    except json.JSONDecodeError:
        return _fallback_recommendation(disease, crop, field_context, air_quality)


def _merge_with_fallback(
    raw: dict,
    disease: str,
    crop: str,
    field_context: str,
    air_quality: AirQuality | None,
) -> dict[str, str]:
    out = _fallback_recommendation(disease, crop, field_context, air_quality)
    for key in RECOMMEND_KEYS:
        val = raw.get(key)
        if isinstance(val, str) and val.strip():
            out[key] = val.strip()
    return out


def _fallback_air_advice(air_quality: AirQuality | None) -> str:
    if air_quality is None:
        return (
            "Enable location in the app for live AQI. In general, avoid unnecessary foliar sprays "
            "during obvious smog, rinse dust from leaves after dust storms, and keep plants "
            "well-watered to reduce pollution stress."
        )
    aqi = air_quality.us_aqi
    if aqi is not None:
        if aqi > 150:
            return (
                f"US AQI is high (~{aqi:.0f}): ozone and particles can injure leaves and slow growth. "
                "Shift sensitive work to cleaner hours where possible, irrigate before midday heat on "
                "high-ozone days, delay foliar sprays until air improves, and rinse heavy dust from leaves "
                "after wind."
            )
        if aqi > 100:
            return (
                f"US AQI is unhealthy for sensitive groups (~{aqi:.0f}): crops may show extra stress. "
                "Reduce stomatal ozone uptake with timely irrigation, avoid peak-afternoon field work "
                "that raises dust, and use mulch or cover to limit soil particle lift."
            )
        if aqi > 50:
            return (
                f"Air quality is moderate (US AQI ~{aqi:.0f}): monitor leaves for dust or ozone stippling. "
                "Keep soil covered to reduce dust, and avoid spraying foliage in the hottest part of the day."
            )
        return (
            f"Air quality is relatively good (US AQI ~{aqi:.0f}). Continue scouting; rinse leaves if "
            "visible dust accumulates after dry winds."
        )
    if air_quality.ozone is not None and air_quality.ozone > 100:
        return (
            "Ozone levels appear elevated: watch for fine leaf flecking on sensitive species; "
            "reduce additional stress with steady soil moisture and avoid unnecessary foliar chemicals during heat."
        )
    if air_quality.pm2_5 is not None and air_quality.pm2_5 > 35:
        return (
            "Fine particle (PM2.5) levels are elevated: dust can settle on leaves and cut photosynthesis slightly; "
            "a gentle rinse after severe haze or wind can help, and windbreaks reduce deposition."
        )
    return (
        "Air pollutant readings are moderate or unavailable in detail; keep general protections: "
        "mulch to limit dust, timely irrigation, and scouting after wind or haze."
    )


def _fallback_yield_uplift(disease: str, crop: str) -> str:
    d = disease.lower()
    if "healthy" in d or "no disease" in d:
        return (
            f"For {crop} that already looks healthy, following soil, water, and scouting tips often helps "
            "protect yield you already have — modest gains of roughly 5–15% versus neglecting best practices "
            "are common in field studies, but season and soil matter a lot. Indicative only, not a promise."
        )
    return (
        f"If {disease} on {crop} is left unmanaged, research on similar cases often shows yield losses from "
        "about 15% to more than half the crop, depending on how early and how severe the outbreak is. "
        "Starting the suggested steps on time usually recovers much of that gap compared with doing nothing "
        "— many farmers see on the order of roughly 10–40% more yield than with late or poor control, "
        "but weather, variety, and your field will swing results. This is an indicative comparison, not a guarantee."
    )


def _fallback_recommendation(
    disease: str,
    crop: str,
    field: str = "",
    air_quality: AirQuality | None = None,
) -> dict[str, str]:
    agro_hint = (
        " Tailor irrigation to soil moisture and rainfall when you have local readings."
        if field.strip()
        else " Enable location in the app for weather- and air-informed yield tips."
    )
    return {
        "treatment": (
            f"For {disease} on {crop}: follow label directions for appropriate crop protection "
            "where needed; remove heavily infected tissue and improve airflow."
        ),
        "prevention": (
            "Rotate crops, choose resistant varieties where available, avoid prolonged leaf wetness, "
            "and scout early."
        ),
        "fertilizer": (
            f"Apply balanced nutrition based on a soil test; avoid excess N on {crop} that favors "
            "disease-prone lush growth."
        ),
        "confidence_note": (
            "Placeholder advice — add LLM_API_KEY for tailored recommendations." + agro_hint
        ),
        "irrigation_water": (
            "Irrigate deeply and less often to encourage rooting; adjust for recent rain and forecast."
            + agro_hint
        ),
        "soil_health_yield": (
            "Build organic matter with compost or cover crops, maintain pH for your crop, and "
            "minimize compaction."
        ),
        "crop_practices_yield": (
            f"Use optimal planting density for {crop}, keep field records, and time operations to "
            "reduce plant stress during heat or wet spells."
        ),
        "air_quality_advice": _fallback_air_advice(air_quality),
        "yield_uplift_comparison": _fallback_yield_uplift(disease, crop),
    }


COPILOT_SYSTEM = """You are a warm, respectful farming copilot for smallholders and rural farmers \
(including areas with limited connectivity or formal extension). \
Use simple, everyday language. Short sentences. If you must use a technical term, add one plain-language line. \
Never talk down to the farmer. Give practical steps they can try soon. \
If the question is unclear, end with one short clarifying question. \
Topics: crops, soil, water, pests, diseases (general), weather, storage, nutrients, organic options, safe chemical use. \
Do not invent government scheme amounts, dates, or subsidies — say the farmer should confirm with local extension / Krishi Kendra. \
Keep the reply under about 350 words unless a short numbered list is clearly better."""

_COPILOT_REPLY_LANG = {
    "en": "English only.",
    "hi": "Hindi only, using Devanagari script.",
    "ur": "Urdu only, using Arabic script.",
}


async def generate_copilot_answer(question: str, locale: str) -> str:
    """Fast farming Q&A in the requested interface language."""
    settings = get_settings()
    if not settings.llm_api_key:
        return _copilot_fallback_no_key(locale)

    lang_line = _COPILOT_REPLY_LANG.get(locale, _COPILOT_REPLY_LANG["en"])
    user_content = f"{lang_line}\n\nFarmer's question:\n{question.strip()}"

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{settings.llm_base_url}/chat/completions",
            headers={"Authorization": f"Bearer {settings.llm_api_key}"},
            json={
                "model": settings.llm_model,
                "messages": [
                    {"role": "system", "content": COPILOT_SYSTEM},
                    {"role": "user", "content": user_content},
                ],
                "temperature": 0.4,
            },
        )
        _ensure_llm_ok(resp)
        return (resp.json()["choices"][0]["message"]["content"] or "").strip()


def _copilot_fallback_no_key(locale: str) -> str:
    texts = {
        "en": (
            "The farming assistant needs an API key on the server. "
            "Set LLM_API_KEY or OPENAI_API_KEY in backend/.env or in the repository root .env file, then restart the API."
        ),
        "hi": (
            "फार्मिंग सहायक के लिए सर्वर पर API कुंजी चाहिए। "
            "backend/.env या रिपोज़िटरी रूट की .env में LLM_API_KEY लगाकर API फिर से चलाएँ।"
        ),
        "ur": (
            "فارمنگ معاون کے لیے سرور پر API کلید درکار ہے۔ "
            "backend/.env یا ریپوزٹری روٹ کی .env میں LLM_API_KEY لگا کر API دوبارہ چلائیں۔"
        ),
    }
    return texts.get(locale, texts["en"])
