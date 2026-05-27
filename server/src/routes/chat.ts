import { Router, Response } from 'express';
import OpenAI from 'openai';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getDb, run, query } from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { validate, ChatSchema } from '../middleware/validate';
import { validateUploadedFile, imageFileFilter } from '../middleware/uploadSecurity';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../middleware/logger';
import { scanLimiter } from '../middleware/rateLimiter';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: imageFileFilter });

const SYSTEM_PROMPT = `You are Mr Mgabhi, an expert AI agricultural advisor for small-scale farmers in KwaZulu-Natal, South Africa. You represent RuralAgriConnect.
You specialize in crop management, pest and disease identification, soil health, fertilization, irrigation, and local KZN farming practices.
IDENTITY RULE: Whenever anyone asks who you are, your name, or your identity — always introduce yourself as Mr Mgabhi from RuralAgriConnect. Never mention OpenAI, GPT, or any AI provider name.
When analyzing images: identify crop diseases, pest damage, or nutrient deficiencies. Give a clear diagnosis with confidence level and specific treatment recommendations using locally available South African products.
Keep responses practical, concise, and actionable. Use simple language suitable for rural farmers.`;

const LANG_CONFIG: Record<string, string> = {
  zu: 'CRITICAL: Respond ONLY in isiZulu. Do NOT use English under any circumstance.',
  af: 'KRITIEKE TAALREËL: Jy MOET altyd en uitsluitlik in Afrikaans antwoord.',
  st: 'MOLAO O BOHLOKOA: O TLAMEHA ho araba feela ka Sesotho.',
};

function buildSystemPrompt(language = 'en') {
  const extra = LANG_CONFIG[language];
  return extra ? `${SYSTEM_PROMPT}\n\n${extra}` : SYSTEM_PROMPT;
}

function getClient() {
  const groqKey = (process.env.GROQ_API_KEY || '').trim();
  if (groqKey) {
    return { client: new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' }), textModel: 'llama-3.3-70b-versatile', visionModel: 'meta-llama/llama-4-scout-17b-16e-instruct' };
  }
  const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (openaiKey && openaiKey !== 'your_openai_api_key_here') {
    return { client: new OpenAI({ apiKey: openaiKey }), textModel: 'gpt-4o-mini', visionModel: 'gpt-4o-mini' };
  }
  return null;
}

// Convert Gemini-format history to OpenAI messages
function buildMessages(systemPrompt: string, message: string, history: Array<{ role: string; parts: Array<{ text: string }> }> = []) {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.map(h => ({
      role: (h.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: h.parts?.[0]?.text || '',
    })),
    { role: 'user', content: message },
  ];
  return messages;
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

  // Extract the DISEASE NAME header value so "healthy" in treatment/prevention text
  // doesn't falsely mark a diseased plant as healthy
  const diseaseHeaderMatch = text.match(/\*\*[^*]*DISEASE[^*]*:\*\*\s*([^\n]+)/i);
  const diseaseHeader = diseaseHeaderMatch
    ? diseaseHeaderMatch[1].trim().replace(/\*+/g, '').trim()
    : null;

  // Only mark as healthy when the DISEASE NAME field explicitly says so
  const isHealthy = diseaseHeader
    ? /^healthy\s*plant$/i.test(diseaseHeader) || /^no\s+disease/i.test(diseaseHeader) || /^normal\s+growth/i.test(diseaseHeader)
    : HEALTHY_TERMS.some(k => lower.slice(0, 300).includes(k));

  const isCritical = CRITICAL_TERMS.some(k => lower.includes(k));
  const isWarning  = WARNING_TERMS.some(k => lower.includes(k));
  const hasDisease = !isHealthy && (
    isCritical || isWarning ||
    (diseaseHeader && !/healthy/i.test(diseaseHeader)) ||
    lower.includes('infection') || lower.includes('pest damage')
  );

  const cropMatch = CROP_MAP.find(([k]) => lower.includes(k));
  const name = diseaseHeader && diseaseHeader.length > 2
    ? diseaseHeader.slice(0, 60)
    : (text.match(/(?:disease\/issue name|identified as|diagnosis)[:\s*]+([^\n.]+)/i)?.[1] || 'Disease/Pest Detected').trim().replace(/\*+/g, '').slice(0, 60);

  return {
    hasDisease,
    cropType:    cropMatch ? cropMatch[1] : 'Crops',
    severity:    (isCritical ? 'critical' : 'warning') as string,
    diseaseName: name,
  };
}

async function triggerScanOutbreak(userId: string, reply: string) {
  try {
    const db = await getDb();
    const parsed = parseScan(reply);
    const userRows = query<any>(db, `SELECT full_name, region FROM users WHERE user_id = ?`, [userId]);
    const userName   = userRows[0]?.full_name || 'A farmer';
    const userRegion = userRows[0]?.region    || 'KwaZulu-Natal — KZN';

    run(db, `INSERT INTO crop_scans (scan_id, user_id, user_name, region, diagnosis, crop_type, disease_name, has_disease, severity, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [uuidv4(), userId, userName, userRegion, reply.slice(0, 600),
       parsed.cropType, parsed.diseaseName, parsed.hasDisease ? 1 : 0, parsed.severity, new Date().toISOString()]);

    if (!parsed.hasDisease) return;

    const district = userRegion.split('— ')[1] || userRegion;
    const now = new Date().toISOString();
    run(db, `INSERT INTO pest_outbreaks (outbreak_id, region, crop_type, description, severity, reported_by, reported_date, source) VALUES (?,?,?,?,?,?,?,?)`,
      [uuidv4(), userRegion, parsed.cropType,
       `🔬 ${parsed.diseaseName} detected via crop scan near ${district}. Reported by ${userName}. Inspect your ${parsed.cropType.toLowerCase()} crops immediately.`,
       parsed.severity, userId, now, 'scan']);

    const farmers = query<any>(db, `SELECT user_id FROM users WHERE role = 'farmer' AND user_id != ?`, [userId]);
    const title   = `🚨 HIGH ALERT — ${parsed.diseaseName} near ${district}`;
    const message = `A farmer's crop scan detected ${parsed.diseaseName} in ${parsed.cropType} crops near ${district}. Inspect your crops immediately.`;
    for (const f of farmers) {
      run(db, `INSERT INTO notifications (notif_id, user_id, title, message, channel, status, read, created_at) VALUES (?,?,?,?,?,?,?,?)`,
        [uuidv4(), f.user_id, title, message, 'app', 'pending', 0, now]);
    }
  } catch (e) {
    logger.error('triggerScanOutbreak error', { error: String(e) });
  }
}

// ── TEXT CHAT ────────────────────────────────────────────────────────────────
router.post('/', authenticate, validate(ChatSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { message, history, language = 'en' } = req.body as {
    message: string;
    history?: Array<{ role: string; parts: Array<{ text: string }> }>;
    language?: string;
  };

  const ai = getClient();
  if (!ai) {
    logChat(req.user!.id, 'CHAT_FALLBACK', message.slice(0, 100));
    return res.json({ reply: getFallbackReply(message) });
  }

  try {
    const completion = await ai.client.chat.completions.create({
      model: ai.textModel,
      messages: buildMessages(buildSystemPrompt(language), message, history),
      max_tokens: 800,
    });
    const reply = completion.choices[0].message.content || getFallbackReply(message);
    logChat(req.user!.id, 'CHAT_AI', message.slice(0, 100));
    res.json({ reply });
  } catch (err: any) {
    logger.error('OpenAI text error', { message: err.message });
    logChat(req.user!.id, 'CHAT_FALLBACK', message.slice(0, 100));
    res.json({ reply: getFallbackReply(message) });
  }
}));

// ── IMAGE SCAN ───────────────────────────────────────────────────────────────
router.post('/scan', authenticate, scanLimiter, upload.single('image'), asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  const fileValidation = validateUploadedFile(req.file);
  if (!fileValidation.valid) {
    return res.status(400).json({ error: 'Invalid image file. Only JPEG, PNG, and WebP are accepted.' });
  }

  const language  = (req.body.language as string) || 'en';
  const rawPrompt = (req.body.prompt as string) || '';
  const userContext = rawPrompt.slice(0, 300).trim();
  const prompt = `Analyze this farm image for a KZN farmer.${userContext ? ` Farmer asks: "${userContext}".` : ''} You MUST respond using ONLY these 5 headers in this exact format:\n\n**🦠 DISEASE NAME:** [name, or "Healthy Plant"]\n**📊 CONFIDENCE:** [Low / Medium / High]\n**🌿 SYMPTOMS:** [1-2 sentences describing visible symptoms]\n**💊 TREATMENT:** [numbered steps using South African products]\n**🛡️ PREVENTION:** [2-3 tips for KZN farming]\n\nUse all 5 headers every time, even for healthy plants.`;

  const ai = getClient();
  if (!ai) {
    return res.json({
      reply: '🔍 Image analysis requires an API key. Please configure GROQ_API_KEY in server/.env',
      scanFailed: true,
    });
  }

  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!supportedTypes.includes(req.file.mimetype)) {
    return res.json({
      reply: '📸 Please upload a JPEG, PNG, or WebP image. iPhone HEIC photos can be converted by taking a screenshot first.',
      hasDisease: false, diseaseName: '', severity: 'info',
    });
  }

  try {
    const base64 = req.file.buffer.toString('base64');
    const imageUrl = `data:${req.file.mimetype};base64,${base64}`;

    const completion = await ai.client.chat.completions.create({
      model: ai.visionModel,
      messages: [
        { role: 'system', content: buildSystemPrompt(language) },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const reply = completion.choices[0].message.content || '🔍 Could not analyse the image. Please describe what you see.';
    logChat(req.user!.id, 'IMAGE_SCAN', `Image scan: ${req.file.originalname || 'photo'}`);
    triggerScanOutbreak(req.user!.id, reply).catch(() => {});
    const scanMeta = parseScan(reply);
    res.json({ reply, hasDisease: scanMeta.hasDisease, diseaseName: scanMeta.diseaseName, severity: scanMeta.severity });
  } catch (err: any) {
    logger.error('OpenAI vision error', { message: err.message });
    const isQuota = (err.message || '').includes('429') || (err.message || '').includes('quota') || (err.message || '').includes('insufficient_quota');
    res.json({
      reply: isQuota
        ? '⚠️ AI quota reached. Please try again later or describe what you see and I\'ll advise from the knowledge base.'
        : '🔍 Could not analyse this image right now. Please describe what you see (yellowing, spots, wilting, etc.) and I\'ll advise you.',
      hasDisease: false, diseaseName: '', severity: 'info', scanFailed: true,
    });
  }
}));

function getFallbackReply(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('maize') || lower.includes('corn'))
    return '🌽 For maize: plant at 75cm row spacing, apply 2:3:2 basal fertilizer at planting, scout for fall armyworm weekly. Top-dress with LAN at 6 weeks.';
  if (lower.includes('armyworm') || lower.includes('pest'))
    return '🐛 For fall armyworm: apply Coragen or Ampligo early morning. Scout weekly and treat when >8 moths/trap/week.';
  if (lower.includes('tomato') || lower.includes('blight'))
    return '🍅 For tomato blight: apply copper oxychloride fungicide preventatively. Avoid overhead irrigation. Remove infected leaves immediately.';
  if (lower.includes('soil') || lower.includes('ph'))
    return '🌱 Healthy soil pH is 5.5–6.5. Apply agricultural lime if acidic. Test soil every season.';
  if (lower.includes('water') || lower.includes('irrigat'))
    return '💧 Water deeply and infrequently. Drip irrigation saves up to 50% water. Water early morning to reduce fungal risk.';
  if (lower.includes('fertilizer') || lower.includes('npk'))
    return '🧪 Apply 2:3:2 (22) at 200kg/ha for maize. Top-dress with LAN at 6 weeks.';
  return "🌿 I'm Mr Mgabhi, your AI farm advisor. Ask me about crops, pests, diseases, soil health, or upload a photo for instant diagnosis!";
}

export default router;
