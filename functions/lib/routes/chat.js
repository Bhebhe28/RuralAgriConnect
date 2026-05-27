"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const openai_1 = __importDefault(require("openai"));
const generative_ai_1 = require("@google/generative-ai");
const auth_1 = require("../middleware/auth");
const firestore_1 = require("../db/firestore");
const uuid_1 = require("uuid");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const SYSTEM_PROMPT = `You are Mr Mgabhi, an expert AI agricultural advisor for small-scale farmers in KwaZulu-Natal, South Africa. You represent RuralAgriConnect.
You specialize in crop management, pest and disease identification, soil health, fertilization, irrigation, and local KZN farming practices.
IDENTITY RULE: Whenever anyone asks who you are, your name, or your identity — in any language — always introduce yourself as Mr Mgabhi from RuralAgriConnect. Never mention Gemini, Google, Groq, Llama, or any AI provider name.
When analyzing images: identify crop diseases, pest damage, or nutrient deficiencies. Give a clear diagnosis with confidence level and specific treatment recommendations using locally available South African products.
Keep responses practical, concise, and actionable. Use simple language suitable for rural farmers.`;
function buildSystemPrompt(language = 'en') {
    if (language === 'zu')
        return SYSTEM_PROMPT + '\n\nCRITICAL LANGUAGE RULE: You MUST respond ONLY in isiZulu for every single reply, no exceptions.';
    if (language === 'af')
        return SYSTEM_PROMPT + '\n\nKRITIESE TAALREËL: Jy MOET altyd en uitsluitlik in Afrikaans antwoord, sonder uitsondering.';
    if (language === 'st')
        return SYSTEM_PROMPT + '\n\nMOLAO O BOHLOKOA OA PUO: O TLAMEHA ho araba feela ka Sesotho mesebetsing yohle.';
    return SYSTEM_PROMPT;
}
// ── AI client — Groq primary, Gemini fallback ──────────────────
function getGroqClient() {
    const key = (process.env.GROQ_API_KEY || '').trim();
    if (!key)
        return null;
    return {
        client: new openai_1.default({ apiKey: key, baseURL: 'https://api.groq.com/openai/v1' }),
        textModel: 'llama-3.3-70b-versatile',
        visionModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
    };
}
function getGeminiKey() {
    return (process.env.GEMINI_API_KEY || '').replace(/^=+/, '').trim();
}
// ── parseScan — same logic as Express server ───────────────────
const HEALTHY_TERMS = ['healthy plant', 'no disease', 'normal growth', 'no pest', 'good condition', 'no issues'];
const CRITICAL_TERMS = ['blight', 'wilt', 'rot', 'mosaic virus', 'rust', 'mildew', 'canker', 'scab', 'smut', 'anthracnose', 'armyworm', 'aphid', 'thrip', 'nematode', 'leaf curl', 'yellowing', 'chlorosis'];
const WARNING_TERMS = ['early stage', 'mild infection', 'slight damage', 'minor pest', 'potential', 'monitor', 'watch for'];
const NON_DISEASE_TERMS = ['nutrient deficiency', 'irrigation', 'drought stress', 'mechanical damage', 'wind damage', 'frost damage'];
const CROP_MAP = [
    ['maize', 'Maize'], ['corn', 'Maize'], ['tomato', 'Tomatoes'], ['potato', 'Potatoes'],
    ['wheat', 'Wheat'], ['soybean', 'Legumes'], ['bean', 'Legumes'], ['cabbage', 'Vegetables'],
    ['spinach', 'Vegetables'], ['sugarcane', 'Other'], ['cassava', 'Root Crops'],
];
function parseScan(text) {
    const lower = text.toLowerCase();
    const diseaseHeaderMatch = text.match(/\*\*[^*]*DISEASE[^*]*:\*\*\s*([^\n]+)/i);
    const diseaseHeader = diseaseHeaderMatch
        ? diseaseHeaderMatch[1].trim().replace(/\*+/g, '').trim()
        : null;
    const isHealthy = diseaseHeader
        ? /^healthy\s*plant$/i.test(diseaseHeader) || /^no\s+disease/i.test(diseaseHeader) || /^normal\s+growth/i.test(diseaseHeader)
        : HEALTHY_TERMS.some(k => lower.slice(0, 300).includes(k));
    const isCritical = CRITICAL_TERMS.some(k => lower.includes(k));
    const isWarning = WARNING_TERMS.some(k => lower.includes(k));
    const hasDisease = !isHealthy && (isCritical || isWarning ||
        (diseaseHeader && !/healthy/i.test(diseaseHeader)) ||
        lower.includes('infection') || lower.includes('pest damage'));
    const cropMatch = CROP_MAP.find(([k]) => lower.includes(k));
    const diseaseName = diseaseHeader && diseaseHeader.length > 2
        ? diseaseHeader.slice(0, 60)
        : (text.match(/(?:disease\/issue name|identified as|diagnosis)[:\s*]+([^\n.]+)/i)?.[1] || 'Disease/Pest Detected').trim().replace(/\*+/g, '').slice(0, 60);
    return {
        hasDisease,
        diseaseName: hasDisease ? diseaseName : '',
        severity: isCritical ? 'critical' : isWarning ? 'warning' : 'info',
        crop_type: cropMatch ? cropMatch[1] : 'General',
    };
}
function logChat(userId, action, details) {
    (0, firestore_1.setDoc)('activity_logs', (0, uuid_1.v4)(), {
        user_id: userId, action,
        entity_type: 'chat', entity_id: (0, uuid_1.v4)(),
        details, created_at: (0, firestore_1.now)(),
    }).catch(() => { });
}
// ── TEXT CHAT ──────────────────────────────────────────────────
router.post('/', auth_1.authenticateFirebase, async (req, res) => {
    const { message, history, language } = req.body;
    if (!message?.trim())
        return res.status(400).json({ error: 'Message is required' });
    if (message.length > 4000)
        return res.status(400).json({ error: 'Message too long' });
    const sysPrompt = buildSystemPrompt(language || 'en');
    // Try Groq first
    const groq = getGroqClient();
    if (groq) {
        try {
            const openaiHistory = (history || []).map(h => ({
                role: (h.role === 'model' ? 'assistant' : 'user'),
                content: h.parts.map(p => p.text).join(''),
            }));
            const completion = await groq.client.chat.completions.create({
                model: groq.textModel,
                messages: [{ role: 'system', content: sysPrompt }, ...openaiHistory, { role: 'user', content: message }],
                max_tokens: 1024,
            });
            const reply = completion.choices[0].message.content || getFallbackReply(message);
            logChat(req.user.id, 'CHAT_AI', message.slice(0, 100));
            return res.json({ reply });
        }
        catch (err) {
            console.error('Groq text error:', err.message);
        }
    }
    // Fallback: Gemini
    const geminiKey = getGeminiKey();
    if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
        try {
            const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];
            for (const modelName of GEMINI_MODELS) {
                try {
                    const genAI = new generative_ai_1.GoogleGenerativeAI(geminiKey);
                    const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: sysPrompt });
                    const chat = model.startChat({ history: history || [] });
                    const result = await chat.sendMessage(message);
                    const reply = result.response.text();
                    logChat(req.user.id, 'CHAT_AI', message.slice(0, 100));
                    return res.json({ reply });
                }
                catch (e) {
                    if (!e.message?.includes('503') && !e.message?.includes('429'))
                        throw e;
                }
            }
        }
        catch (err) {
            console.error('Gemini text error:', err.message);
        }
    }
    const reply = getFallbackReply(message);
    logChat(req.user.id, 'CHAT_FALLBACK', message.slice(0, 100));
    return res.json({ reply });
});
// ── IMAGE SCAN ─────────────────────────────────────────────────
router.post('/scan', auth_1.authenticateFirebase, upload.single('image'), async (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: 'No image uploaded' });
    const language = req.body.language || 'en';
    const userContext = (req.body.prompt || '').slice(0, 300).trim();
    const sysPrompt = buildSystemPrompt(language);
    const scanPrompt = `Analyze this farm image for a KZN farmer.${userContext ? ` Farmer asks: "${userContext}".` : ''} You MUST respond using ONLY these 5 headers in this exact format:\n\n**🦠 DISEASE NAME:** [name, or "Healthy Plant"]\n**📊 CONFIDENCE:** [Low / Medium / High]\n**🌿 SYMPTOMS:** [1-2 sentences describing visible symptoms]\n**💊 TREATMENT:** [numbered steps using South African products]\n**🛡️ PREVENTION:** [2-3 tips for KZN farming]\n\nUse all 5 headers every time, even for healthy plants.`;
    // Try Groq vision first
    const groq = getGroqClient();
    if (groq) {
        try {
            const base64 = req.file.buffer.toString('base64');
            const mimeType = req.file.mimetype;
            const completion = await groq.client.chat.completions.create({
                model: groq.visionModel,
                messages: [
                    { role: 'system', content: sysPrompt },
                    {
                        role: 'user',
                        content: [
                            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
                            { type: 'text', text: scanPrompt },
                        ],
                    },
                ],
                max_tokens: 1024,
            });
            const reply = completion.choices[0].message.content || '🔍 Could not analyse the image.';
            logChat(req.user.id, 'IMAGE_SCAN', `Image scan: ${req.file.originalname || 'photo'}`);
            const meta = parseScan(reply);
            return res.json({ reply, hasDisease: meta.hasDisease, diseaseName: meta.diseaseName, severity: meta.severity });
        }
        catch (err) {
            console.error('Groq vision error:', err.message);
        }
    }
    // Fallback: Gemini vision
    const geminiKey = getGeminiKey();
    if (!geminiKey || geminiKey === 'your_gemini_api_key_here') {
        return res.status(503).json({ error: '🔍 AI scanner not configured. Please contact the administrator.' });
    }
    try {
        const VISION_MODELS = ['gemini-1.5-flash', 'gemini-2.0-flash'];
        const imageData = { inlineData: { mimeType: req.file.mimetype, data: req.file.buffer.toString('base64') } };
        for (const modelName of VISION_MODELS) {
            try {
                const genAI = new generative_ai_1.GoogleGenerativeAI(geminiKey);
                const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: sysPrompt });
                const result = await model.generateContent([scanPrompt, imageData]);
                const reply = result.response.text();
                logChat(req.user.id, 'IMAGE_SCAN', `Image scan: ${req.file.originalname || 'photo'}`);
                const meta = parseScan(reply);
                return res.json({ reply, hasDisease: meta.hasDisease, diseaseName: meta.diseaseName, severity: meta.severity });
            }
            catch (e) {
                if (!e.message?.includes('503') && !e.message?.includes('429'))
                    throw e;
            }
        }
    }
    catch (err) {
        console.error('Gemini vision error:', err.message);
        return res.status(500).json({ error: `Image analysis failed: ${err.message}` });
    }
    return res.status(503).json({ error: '🔍 AI scanner is temporarily unavailable. Please try again.' });
});
function getFallbackReply(msg) {
    const lower = msg.toLowerCase();
    if (lower.includes('maize') || lower.includes('corn'))
        return '🌽 For maize: plant at 75cm row spacing, apply 2:3:2 basal fertilizer at planting, scout for fall armyworm weekly. Top-dress with LAN at 6 weeks.';
    if (lower.includes('armyworm') || lower.includes('pest'))
        return '🐛 For fall armyworm: apply Coragen or Ampligo early morning. Scout weekly and treat when >8 moths/trap/week.';
    if (lower.includes('tomato') || lower.includes('blight'))
        return '🍅 For tomato blight: apply copper oxychloride fungicide preventatively. Avoid overhead irrigation. Remove infected leaves immediately.';
    if (lower.includes('soil') || lower.includes('ph'))
        return '🌱 Healthy soil pH is 5.5–6.5. Apply agricultural lime if acidic. Test soil every season at your local extension office.';
    if (lower.includes('water') || lower.includes('irrigat'))
        return '💧 Water deeply and infrequently. Drip irrigation saves up to 50% water vs flood irrigation. Water early morning to reduce fungal risk.';
    if (lower.includes('fertilizer') || lower.includes('npk'))
        return '🧪 Apply 2:3:2 (22) at 200kg/ha for maize. Top-dress with LAN at 6 weeks.';
    return "🌿 I'm Mr Mgabhi, your AI farm advisor. Ask me about crops, pests, diseases, soil health, or weather. You can also upload a photo of a sick plant for instant diagnosis!";
}
exports.default = router;
//# sourceMappingURL=chat.js.map