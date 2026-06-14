import * as functions from "firebase-functions";
import fetch from "node-fetch";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "YOUR_OPENROUTER_KEY_HERE";

export const generateAIResponse = functions
  .runWith({
    secrets: ["OPENROUTER_API_KEY"],
  })
  .https.onCall(async (data, context) => {
    // 1. Ensure user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Қолданушы жүйеге кірмеген. (Unauthenticated)"
      );
    }

    const apiKey = (process.env.OPENROUTER_API_KEY || OPENROUTER_API_KEY).trim();

    if (!apiKey || apiKey === "YOUR_OPENROUTER_KEY_HERE") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "OpenRouter API кілті серверде бапталмаған."
      );
    }

    const body = data.body;

    if (!body || !body.messages) {
      throw new functions.https.HttpsError(
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
        throw new functions.https.HttpsError(
          "internal",
          `AI сервері қате қайтарды (${response.status})`
        );
      }

      const responseData = await response.json();
      return responseData;
    } catch (error: any) {
      console.error("Function Error:", error);
      throw new functions.https.HttpsError("internal", error.message || "AI сұрауын орындау мүмкін болмады.");
    }
  });
