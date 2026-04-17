import { Router, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getDb, run } from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const SYSTEM_PROMPT = `You are an expert agricultural advisor for small-scale farmers in KwaZulu-Natal, South Africa.
You specialize in crop management, pest and disease identification, soil health, fertilization, irrigation, and local KZN farming practices.
When analyzing images: identify crop diseases, pest damage, or nutrient deficiencies. Give a clear diagnosis with confidence level and specific treatment recommendations using locally available South African products.
Keep responses practical, concise, and actionable. Use simple language suitable for rural farmers.`;

// Models for text chat
const MODELS = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash-lite', 'gemini-2.0-flash-001'];
// Models for vision/image — gemini-1.5-flash has best free-tier vision support
const VISION_MODELS = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];

function getModel(apiKey: string, modelName: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName, systemInstruction: SYSTEM_PROMPT });
}

async function tryModels(apiKey: string, fn: (model: ReturnType<typeof getModel>) => Promise<string>): Promise<string> {
  return tryModelsWithList(apiKey, MODELS, fn);
}

async function tryModelsWithList(apiKey: string, models: string[], fn: (model: ReturnType<typeof getModel>) => Promise<string>): Promise<string> {
  let lastErr: any;
  for (const modelName of models) {
    try {
      const model = getModel(apiKey, modelName);
      const reply = await fn(model);
      if (reply) return reply;
    } catch (err: any) {
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

function logChat(userId: string, action: string, details: string) {
  getDb().then(db => {
    run(db,
      `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details)
       VALUES (?,?,?,?,?,?)`,
      [uuidv4(), userId, action, 'chat', uuidv4(), details]
    );
  }).catch(() => {});
}

// ── TEXT CHAT ────────────────────────────────────────────────
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { message, history } = req.body as {
    message: string;
    history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  };

  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    const reply = getFallbackReply(message);
    logChat(req.user!.id, 'CHAT_FALLBACK', message.slice(0, 100));
    return res.json({ reply });
  }

  try {
    const reply = await tryModels(apiKey, async (model) => {
      const chat = model.startChat({ history: history || [] });
      const result = await chat.sendMessage(message);
      return result.response.text();
    });
    logChat(req.user!.id, 'CHAT_AI', message.slice(0, 100));
    res.json({ reply });
  } catch (err: any) {
    console.error('Gemini error:', err.message);
    const reply = getFallbackReply(message);
    logChat(req.user!.id, 'CHAT_FALLBACK', message.slice(0, 100));
    res.json({ reply });
  }
});

// ── IMAGE SCAN ───────────────────────────────────────────────
router.post('/scan', authenticate, upload.single('image'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  const prompt = (req.body.prompt as string) ||
    'Analyze this farm image. Identify any crop diseases, pest damage, or nutrient deficiencies. Provide: 1) Disease/issue name, 2) Confidence level, 3) Symptoms visible, 4) Treatment steps using locally available South African products, 5) Prevention tips for a KZN farmer.';

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return res.json({ reply: '🔍 Image analysis requires a Gemini API key. Please configure GEMINI_API_KEY in server/.env' });
  }

  try {
    const imageData = { inlineData: { mimeType: req.file.mimetype as 'image/jpeg' | 'image/png' | 'image/webp', data: req.file.buffer.toString('base64') } };
    const reply = await tryModelsWithList(apiKey, VISION_MODELS, async (model) => {
      const result = await model.generateContent([prompt, imageData]);
      return result.response.text();
    });
    logChat(req.user!.id, 'IMAGE_SCAN', `Image scan: ${req.file.originalname || 'photo'}`);
    res.json({ reply });
  } catch (err: any) {
    console.error('Gemini vision error:', err.message);
    res.status(500).json({ error: `Image analysis failed: ${err.message}` });
  }
});

function getFallbackReply(msg: string): string {
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

export default router;
