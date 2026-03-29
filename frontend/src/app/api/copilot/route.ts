import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const COPILOT_SYSTEM = `You are a warm, respectful farming copilot for smallholders and rural farmers \
(including areas with limited connectivity or formal extension). \
Use simple, everyday language. Short sentences. If you must use a technical term, add one plain-language line. \
Never talk down to the farmer. Give practical steps they can try soon. \
If the question is unclear, end with one short clarifying question. \
Topics: crops, soil, water, pests, diseases (general), weather, storage, nutrients, organic options, safe chemical use. \
Do not invent government scheme amounts, dates, or subsidies — say the farmer should confirm with local extension / Krishi Kendra. \
Keep the reply under about 350 words unless a short numbered list is clearly better.`;

const COPILOT_LANG: Record<string, string> = {
  en: "English only.",
  hi: "Hindi only, using Devanagari script.",
  ur: "Urdu only, using Arabic script.",
};

function noKeyMessage(locale: string): string {
  const messages: Record<string, string> = {
    en:
      "Add LLM_API_KEY or OPENAI_API_KEY in Vercel: Project → Settings → Environment Variables, then redeploy. " +
      "For local dev, put the same keys in frontend/.env.local (never commit this file).",
    hi:
      "Vercel में Project → Settings → Environment Variables में LLM_API_KEY लगाएँ और फिर deploy करें। " +
      "लोकल के लिए frontend/.env.local में कुंजी रखें।",
    ur:
      "Vercel میں Project → Settings → Environment Variables میں LLM_API_KEY لگائیں اور دوبارہ deploy کریں۔ " +
      "لوکل کے لیے frontend/.env.local میں کلید رکھیں۔",
  };
  return messages[locale] ?? messages.en;
}

type Body = { question?: string; locale?: string };

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const question = String(body.question ?? "").trim();
  const locale = body.locale === "hi" || body.locale === "ur" ? body.locale : "en";

  if (!question || question.length > 2000) {
    return NextResponse.json({ detail: "Invalid or empty question" }, { status: 400 });
  }

  const apiKey = (process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    return NextResponse.json({ detail: noKeyMessage(locale) }, { status: 503 });
  }

  const baseUrl = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.LLM_MODEL || "gpt-4o-mini";
  const langLine = COPILOT_LANG[locale] ?? COPILOT_LANG.en;
  const userContent = `${langLine}\n\nFarmer's question:\n${question}`;

  try {
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: COPILOT_SYSTEM },
          { role: "user", content: userContent },
        ],
        temperature: 0.4,
      }),
    });

    if (resp.status === 401) {
      let hint = "";
      try {
        const err = (await resp.json()) as { error?: { message?: string } };
        hint = err?.error?.message ? ` ${err.error.message}` : "";
      } catch {
        /* ignore */
      }
      return NextResponse.json(
        {
          detail: `LLM API key rejected (401).${hint} Check LLM_API_KEY in Vercel env or frontend/.env.local.`,
        },
        { status: 503 }
      );
    }

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json(
        { detail: `LLM request failed (${resp.status}): ${text.slice(0, 500)}` },
        { status: 503 }
      );
    }

    const data = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const answer = (data.choices?.[0]?.message?.content ?? "").trim();
    if (!answer) {
      return NextResponse.json({ detail: "Empty response from model" }, { status: 503 });
    }
    return NextResponse.json({ answer });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ detail: `Copilot request failed: ${msg}` }, { status: 503 });
  }
}
