"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAIResponse = void 0;
const functions = __importStar(require("firebase-functions"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "YOUR_OPENROUTER_KEY_HERE";
exports.generateAIResponse = functions
    .runWith({
    secrets: ["OPENROUTER_API_KEY"],
})
    .https.onCall(async (data, context) => {
    // 1. Ensure user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Қолданушы жүйеге кірмеген. (Unauthenticated)");
    }
    const apiKey = (process.env.OPENROUTER_API_KEY || OPENROUTER_API_KEY).trim();
    if (!apiKey || apiKey === "YOUR_OPENROUTER_KEY_HERE") {
        throw new functions.https.HttpsError("failed-precondition", "OpenRouter API кілті серверде бапталмаған.");
    }
    const body = data.body;
    if (!body || !body.messages) {
        throw new functions.https.HttpsError("invalid-argument", "Сұрау форматы қате. (Invalid request body)");
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
            throw new functions.https.HttpsError("internal", `AI сервері қате қайтарды (${response.status})`);
        }
        const responseData = await response.json();
        return responseData;
    }
    catch (error) {
        console.error("Function Error:", error);
        throw new functions.https.HttpsError("internal", error.message || "AI сұрауын орындау мүмкін болмады.");
    }
});
//# sourceMappingURL=index.js.map