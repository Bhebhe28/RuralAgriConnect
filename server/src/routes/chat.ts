import { Router, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getDb, run, query } from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const SYSTEM_PROMPT = `You are an expert agricultural advisor for small-scale farmers in KwaZulu-Natal, South Africa.
You specialize in crop management, pest and disease identification, soil health, fertilization, irrigation, and local KZN farming practices.
When analyzing images: identify crop diseases, pest damage, or nutrient deficiencies. Give a clear diagnosis with confidence level and specific treatment recommendations using locally available South African products.
Keep responses practical, concise, and actionable. Use simple language suitable for rural farmers.`;

const LANG_CONFIG: Record<string, { name: string; instruction: string }> = {
  en: { name: 'English', instruction: '' },
  zu: {
    name: 'isiZulu',
    instruction: 'CRITICAL: Respond ONLY in isiZulu (Zulu language spoken in KwaZulu-Natal). Do NOT use English, Sesotho, or Afrikaans. Write every word in isiZulu.',
  },
  af: {
    name: 'Afrikaans',
    instruction: 'CRITICAL: Respond ONLY in Afrikaans (die Afrikaanse taal). Afrikaans is NOT English — do not respond in English. Write every single word in Afrikaans. Example greeting: "Goeie dag, hoe kan ek jou help?"',
  },
  st: {
    name: 'Sesotho',
    instruction: 'CRITICAL: Respond ONLY in Sesotho (Southern Sotho / Sesotho sa Borwa). Sesotho is NOT isiZulu and NOT English. Do not respond in Zulu or English. Write every word in Sesotho. Example greeting: "Dumela, ke thusa joang?"',
  },
};

function buildSystemPrompt(language = 'en') {
  const cfg = LANG_CONFIG[language] || LANG_CONFIG['en'];
  if (language === 'en') return SYSTEM_PROMPT;
  return `${SYSTEM_PROMPT}\n\n${cfg.instruction}`;
}

const MODELS = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash-lite', 'gemini-2.0-flash-001'];
const VISION_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash-001'];

function getModel(apiKey: string, modelName: string, language = 'en') {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName, systemInstruction: buildSystemPrompt(language) });
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function tryModelsWithList(apiKey: string, models: string[], language: string, fn: (model: ReturnType<typeof getModel>) => Promise<string>, retryAll = false): Promise<string> {
  let lastErr: any;
  for (const modelName of models) {
    try {
      const model = getModel(apiKey, modelName, language);
      const reply = await fn(model);
      if (reply) return reply;
    } catch (err: any) {
      lastErr = err;
      const msg = err.message || '';
      const isRateLimit = msg.includes('429') || msg.includes('quota') || msg.includes('high demand') || msg.includes('overloaded') || msg.includes('503');
      const is404 = msg.includes('404');
      if (is404 && !retryAll) throw err;
      if (!isRateLimit && !retryAll) throw err;
      console.warn(`⚠️  ${modelName} failed (${msg.slice(0, 60)}), trying next model...`);
      await sleep(is404 ? 500 : 3000);
    }
  }
  throw lastErr;
}

async function logChat(userId: string, action: string, details: string) {
  try {
    const db = await getDb();
    run(db, `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?)`,
      [uuidv4(), userId, action, 'chat', uuidv4(), details]);
  } catch { /* non-critical */ }
}

// ── Disease detection helpers ────────────────────────────────────────────────
const CRITICAL_TERMS = ['armyworm', 'locust', 'bacterial wilt', 'late blight', 'stem borer', 'mosaic virus', 'fusarium wilt', 'crown rot'];
const WARNING_TERMS  = ['blight', 'rust', 'rot', 'mildew', 'fungal', 'anthracnose', 'mite', 'aphid', 'whitefly', 'thrips', 'leaf miner', 'bollworm', 'nematode', 'cercospora'];
const HEALTHY_TERMS  = ['healthy', 'no disease', 'no sign of disease', 'no pest', 'normal growth', 'no issue detected'];
const CROP_MAP: [string, string][] = [
  ['maize','Maize'],['corn','Maize'],['tomato','Vegetables'],['potato','Root Crops'],
  ['bean','Legumes'],['soybean','Legumes'],['cabbage','Vegetables'],['spinach','Vegetables'],
  ['carrot','Root Crops'],['pepper','Vegetables'],['onion','Vegetables'],['wheat','Maize'],
  ['sunflower','Other'],['cassava','Root Crops'],['sugarcane','Other'],
];

function parseScan(text: string) {
  const lower = text.toLowerCase();
  const isHealthy  = HEALTHY_TERMS.some(k => lower.includes(k));
  const isCritical = CRITICAL_TERMS.some(k => lower.includes(k));
  const isWarning  = WARNING_TERMS.some(k => lower.includes(k));
  const hasDisease = !isHealthy && (isCritical || isWarning || lower.includes('disease') || lower.includes('infection') || lower.includes('pest damage'));
  const cropMatch  = CROP_MAP.find(([k]) => lower.includes(k));
  const cropType   = cropMatch ? cropMatch[1] : 'Crops';
  const nameMatch  = text.match(/(?:disease\/issue name|identified as|diagnosis)[:\s*]+([^\n.]+)/i)
                  || text.match(/\*\*([^*]{5,50})\*\*/);
  const diseaseName = nameMatch ? nameMatch[1].trim().replace(/\*+/g, '').slice(0, 60) : 'Disease/Pest Detected';
  return { hasDisease, cropType, severity: isCritical ? 'critical' : 'warning' as const, diseaseName };
}

async function triggerScanOutbreak(userId: string, reply: string) {
  try {
    const db  = await getDb();
    const parsed = parseScan(reply);

    // Get farmer's name and region
    const userRows = query<any>(db, `SELECT full_name, region FROM users WHERE user_id = ?`, [userId]);
    const userName   = userRows[0]?.full_name  || 'A farmer';
    const userRegion = userRows[0]?.region     || 'KwaZulu-Natal — KZN';

    // Save scan to history
    run(db, `INSERT INTO crop_scans (scan_id, user_id, user_name, region, diagnosis, crop_type, disease_name, has_disease, severity, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [uuidv4(), userId, userName, userRegion, reply.slice(0, 600),
       parsed.cropType, parsed.diseaseName, parsed.hasDisease ? 1 : 0, parsed.severity, new Date().toISOString()]);

    if (!parsed.hasDisease) return;

    // Create outbreak
    const district = userRegion.split('— ')[1] || userRegion;
    const now = new Date().toISOString();
    run(db, `INSERT INTO pest_outbreaks (outbreak_id, region, crop_type, description, severity, reported_by, reported_date, source) VALUES (?,?,?,?,?,?,?,?)`,
      [uuidv4(), userRegion, parsed.cropType,
       `🔬 ${parsed.diseaseName} detected via crop scan near ${district}. Reported by ${userName}. Inspect your ${parsed.cropType.toLowerCase()} crops immediately.`,
       parsed.severity, userId, now, 'scan']);

    // Notify ALL other farmers
    const farmers = query<any>(db, `SELECT user_id FROM users WHERE role = 'farmer' AND user_id != ?`, [userId]);
    const title = `🚨 HIGH ALERT — ${parsed.diseaseName} near ${district}`;
    const message = `A farmer's crop scan detected ${parsed.diseaseName} in ${parsed.cropType} crops near ${district}. Inspect your crops immediately.`;
    for (const f of farmers) {
      run(db, `INSERT INTO notifications (notif_id, user_id, title, message, channel, status, read, created_at) VALUES (?,?,?,?,?,?,?,?)`,
        [uuidv4(), f.user_id, title, message, 'app', 'pending', 0, now]);
    }
    console.log(`[Outbreak] Scan-triggered: ${parsed.diseaseName} in ${district} — ${farmers.length} farmers notified`);
  } catch (e) {
    console.error('triggerScanOutbreak error:', e);
  }
}

// ── TEXT CHAT ────────────────────────────────────────────────
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { message, history, language = 'en' } = req.body as {
    message: string;
    history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
    language?: string;
  };

  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

  const apiKey = (process.env.GEMINI_API_KEY || '').replace(/^=+/, '').trim();
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    const reply = getFallbackReply(message);
    logChat(req.user!.id, 'CHAT_FALLBACK', message.slice(0, 100));
    return res.json({ reply });
  }

  try {
    const reply = await tryModelsWithList(apiKey, MODELS, language, async (model) => {
      const chat = model.startChat({ history: history || [] });
      const result = await chat.sendMessage(message);
      return result.response.text();
    });
    logChat(req.user!.id, 'CHAT_AI', message.slice(0, 100));
    res.json({ reply });
  } catch (err: any) {
    console.error('Gemini text error:', err.message);
    const reply = getFallbackReply(message);
    logChat(req.user!.id, 'CHAT_FALLBACK', message.slice(0, 100));
    res.json({ reply });
  }
});

// ── IMAGE SCAN ───────────────────────────────────────────────
router.post('/scan', authenticate, upload.single('image'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  const language = (req.body.language as string) || 'en';
  const prompt = (req.body.prompt as string) ||
    'Analyze this farm image. Identify any crop diseases, pest damage, or nutrient deficiencies. Provide: 1) Disease/issue name, 2) Confidence level, 3) Symptoms visible, 4) Treatment steps using locally available South African products, 5) Prevention tips for a KZN farmer.';

  const apiKey = (process.env.GEMINI_API_KEY || '').replace(/^=+/, '').trim();
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return res.json({ reply: '🔍 Image analysis requires a Gemini API key. Please configure GEMINI_API_KEY in server/.env' });
  }

  try {
    const mimeType = req.file.mimetype;
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
    const safeMime = supportedTypes.includes(mimeType) ? mimeType : 'image/jpeg';

    const imageData = {
      inlineData: {
        mimeType: safeMime as 'image/jpeg' | 'image/png' | 'image/webp',
        data: req.file.buffer.toString('base64'),
      },
    };
    const reply = await tryModelsWithList(apiKey, VISION_MODELS, language, async (model) => {
      const result = await model.generateContent([prompt, imageData]);
      return result.response.text();
    }, true);
    logChat(req.user!.id, 'IMAGE_SCAN', `Image scan: ${req.file.originalname || 'photo'}`);
    triggerScanOutbreak(req.user!.id, reply).catch(console.error);
    const scanMeta = parseScan(reply);
    res.json({ reply, hasDisease: scanMeta.hasDisease, diseaseName: scanMeta.diseaseName, severity: scanMeta.severity });
  } catch (err: any) {
    console.error('Gemini vision error:', err.message);
    const fallback = '🔍 I could not analyse this image right now — the vision AI is temporarily unavailable. Please describe what you see (yellowing leaves, spots, wilting, etc.) and I\'ll advise you based on your description.';
    res.json({ reply: fallback, hasDisease: false, diseaseName: '', severity: 'info' });
  }
});

function getFallbackReply(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('zulu') || lower.includes('isizulu') || lower.includes('afrikaans') || lower.includes('sotho'))
    return '⚠️ Ngiyaxolisa — i-AI ayitholakali manje. Zama futhi ngemuva kwesikhashana. (AI is temporarily unavailable. Please try again in a moment.)';
  if (lower.includes('translate') || lower.includes('in ') || lower.match(/\b(english|french|portuguese)\b/))
    return '⚠️ Translation is unavailable right now — the AI is temporarily rate-limited. Please try again in a moment.';
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
