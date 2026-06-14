import { onCall, HttpsError } from "firebase-functions/v2/https";
import fetch from "node-fetch";

// We'll read the secret from environment variables
// In production, you would set this via Firebase CLI:
// firebase functions:secrets:set OPENROUTER_API_KEY
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "YOUR_OPENROUTER_KEY_HERE";

export const generateAIResponse = onCall(
  {
    cors: true,
    secrets: ["OPENROUTER_API_KEY"],
  },
  async (request) => {
    // 1. Ensure user is authenticated
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Қолданушы жүйеге кірмеген. (Unauthenticated)"
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY || OPENROUTER_API_KEY;

    if (!apiKey || apiKey === "YOUR_OPENROUTER_KEY_HERE") {
      throw new HttpsError(
        "failed-precondition",
        "OpenRouter API кілті серверде бапталмаған."
      );
    }

    const { body } = request.data;

    if (!body || !body.messages) {
      throw new HttpsError(
        "invalid-argument",
        "Сұрау форматы қате. (Invalid request body)"
      );
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://natije-ai.web.app",
          "X-Title": "Natije AI",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenRouter error:", response.status, errorText);
        throw new HttpsError(
          "internal",
          `AI сервері қате қайтарды (${response.status})`
        );
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error("Function Error:", error);
      throw new HttpsError("internal", error.message || "AI сұрауын орындау мүмкін болмады.");
    }
  }
);
