"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const generative_ai_1 = require("@google/generative-ai");
const auth_1 = require("../middleware/auth");
const firestore_1 = require("../db/firestore");
const uuid_1 = require("uuid");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const SYSTEM_PROMPT = `You are an expert agricultural advisor for small-scale farmers in KwaZulu-Natal, South Africa.
You specialize in crop management, pest and disease identification, soil health, fertilization, irrigation, and local KZN farming practices.
When analyzing images: identify crop diseases, pest damage, or nutrient deficiencies. Give a clear diagnosis with confidence level and specific treatment recommendations using locally available South African products.
Keep responses practical, concise, and actionable. Use simple language suitable for rural farmers.`;
// Models for text chat
const MODELS = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash-lite', 'gemini-2.0-flash-001'];
// Models for vision/image — gemini-1.5-flash has best free-tier vision support
const VISION_MODELS = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
function getModel(apiKey, modelName) {
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: modelName, systemInstruction: SYSTEM_PROMPT });
}
async function tryModels(apiKey, fn) {
    return tryModelsWithList(apiKey, MODELS, fn);
}
async function tryModelsWithList(apiKey, models, fn) {
    let lastErr;
    for (const modelName of models) {
        try {
            const model = getModel(apiKey, modelName);
            const reply = await fn(model);
            if (reply)
                return reply;
        }
        catch (err) {
            lastErr = err;
            const msg = err.message || '';
            if (msg.includes('404') || (!msg.includes('503') && !msg.includes('429') && !msg.includes('quota') && !msg.includes('high demand') && !msg.includes('overloaded'))) {
                throw err;
            }
            console.warn(`⚠️  ${modelName} unavailable, trying next model...`);
        }
    }
    throw lastErr;
}
function logChat(userId, action, details) {
    (0, firestore_1.setDoc)('activity_logs', (0, uuid_1.v4)(), {
        user_id: userId, action,
        entity_type: 'chat', entity_id: (0, uuid_1.v4)(),
        details, created_at: (0, firestore_1.now)(),
    }).catch(() => { });
}
// ── TEXT CHAT ────────────────────────────────────────────────
router.post('/', auth_1.authenticate, async (req, res) => {
    const { message, history } = req.body;
    if (!message?.trim())
        return res.status(400).json({ error: 'Message is required' });
    const apiKey = (process.env.GEMINI_API_KEY || '').replace(/^=+/, '').trim();
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        const reply = getFallbackReply(message);
        logChat(req.user.id, 'CHAT_FALLBACK', message.slice(0, 100));
        return res.json({ reply });
    }
    try {
        const reply = await tryModels(apiKey, async (model) => {
            const chat = model.startChat({ history: history || [] });
            const result = await chat.sendMessage(message);
            return result.response.text();
        });
        logChat(req.user.id, 'CHAT_AI', message.slice(0, 100));
        res.json({ reply });
    }
    catch (err) {
        console.error('Gemini error:', err.message);
        const reply = getFallbackReply(message);
        logChat(req.user.id, 'CHAT_FALLBACK', message.slice(0, 100));
        res.json({ reply });
    }
});
// ── IMAGE SCAN ───────────────────────────────────────────────
router.post('/scan', auth_1.authenticate, upload.single('image'), async (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: 'No image uploaded' });
    const prompt = req.body.prompt ||
        'Analyze this farm image. Identify any crop diseases, pest damage, or nutrient deficiencies. Provide: 1) Disease/issue name, 2) Confidence level, 3) Symptoms visible, 4) Treatment steps using locally available South African products, 5) Prevention tips for a KZN farmer.';
    const apiKey = (process.env.GEMINI_API_KEY || '').replace(/^=+/, '').trim();
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        return res.json({ reply: '🔍 Image analysis requires a Gemini API key. Please configure GEMINI_API_KEY in server/.env' });
    }
    try {
        const imageData = { inlineData: { mimeType: req.file.mimetype, data: req.file.buffer.toString('base64') } };
        const reply = await tryModelsWithList(apiKey, VISION_MODELS, async (model) => {
            const result = await model.generateContent([prompt, imageData]);
            return result.response.text();
        });
        logChat(req.user.id, 'IMAGE_SCAN', `Image scan: ${req.file.originalname || 'photo'}`);
        res.json({ reply });
    }
    catch (err) {
        console.error('Gemini vision error:', err.message);
        res.status(500).json({ error: `Image analysis failed: ${err.message}` });
    }
});
function getFallbackReply(msg) {
    const lower = msg.toLowerCase();
    if (lower.includes('maize') || lower.includes('corn'))
        return '🌽 For maize: plant at 75cm row spacing, apply 2:3:2 basal fertilizer at planting, scout for fall armyworm weekly. Top-dress with LAN at 6 weeks.';
    if (lower.includes('armyworm') || lower.includes('pest'))
        return '🐛 For fall armyworm: apply Coragen or Ampligo early morning. Scout weekly and treat when >8 moths/trap/week. Use pheromone traps for monitoring.';
    if (lower.includes('tomato') || lower.includes('blight'))
        return '🍅 For tomato blight: apply copper oxychloride fungicide preventatively. Avoid overhead irrigation. Remove infected leaves immediately.';
    if (lower.includes('soil') || lower.includes('ph'))
        return '🌱 Healthy soil pH is 5.5–6.5. Apply agricultural lime if acidic. Test soil every season at your local extension office.';
    if (lower.includes('water') || lower.includes('irrigat'))
        return '💧 Water deeply and infrequently. Drip irrigation saves up to 50% water vs flood irrigation. Water early morning to reduce fungal risk.';
    if (lower.includes('fertilizer') || lower.includes('npk'))
        return '🧪 Apply 2:3:2 (22) at 200kg/ha for maize. Top-dress with LAN at 6 weeks. Avoid over-fertilizing — it promotes fungal disease.';
    if (lower.includes('vegetable') || lower.includes('cabbage'))
        return '🥬 For vegetables: use drip irrigation, apply copper fungicide preventatively, rotate crops every season, and remove diseased leaves immediately.';
    return "🌿 I'm your AI farm advisor. Ask me about crops, pests, diseases, soil health, or weather. You can also upload a photo of a sick plant for instant diagnosis!";
}
exports.default = router;
//# sourceMappingURL=chat.js.map