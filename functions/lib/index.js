"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAIResponse = void 0;
const https_1 = require("firebase-functions/v2/https");
const node_fetch_1 = __importDefault(require("node-fetch"));
// We'll read the secret from environment variables
// In production, you would set this via Firebase CLI:
// firebase functions:secrets:set OPENROUTER_API_KEY
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "YOUR_OPENROUTER_KEY_HERE";
exports.generateAIResponse = (0, https_1.onCall)({
    cors: true,
    secrets: ["OPENROUTER_API_KEY"],
}, async (request) => {
    // 1. Ensure user is authenticated
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Қолданушы жүйеге кірмеген. (Unauthenticated)");
    }
    const apiKey = process.env.OPENROUTER_API_KEY || OPENROUTER_API_KEY;
    if (!apiKey || apiKey === "YOUR_OPENROUTER_KEY_HERE") {
        throw new https_1.HttpsError("failed-precondition", "OpenRouter API кілті серверде бапталмаған.");
    }
    const { body } = request.data;
    if (!body || !body.messages) {
        throw new https_1.HttpsError("invalid-argument", "Сұрау форматы қате. (Invalid request body)");
    }
    try {
        const response = await (0, node_fetch_1.default)("https://openrouter.ai/api/v1/chat/completions", {
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
            throw new https_1.HttpsError("internal", `AI сервері қате қайтарды (${response.status})`);
        }
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.error("Function Error:", error);
        throw new https_1.HttpsError("internal", error.message || "AI сұрауын орындау мүмкін болмады.");
    }
});
//# sourceMappingURL=index.js.map