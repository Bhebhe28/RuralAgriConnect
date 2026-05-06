import { GoogleGenerativeAI } from '@google/generative-ai';
import { saveCropScan } from './firestore';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const SYSTEM_PROMPT = `You are an expert agricultural advisor for small-scale farmers in KwaZulu-Natal, South Africa.
You specialize in crop management, pest and disease identification, soil health, fertilization, irrigation, and local KZN farming practices.
When analyzing images: identify crop diseases, pest damage, or nutrient deficiencies. Give a clear diagnosis with confidence level and specific treatment recommendations using locally available South African products.
Keep responses practical, concise, and actionable. Use simple language suitable for rural farmers.`;

const MODELS = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];

function getModel(modelName: string) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  return genAI.getGenerativeModel({ model: modelName, systemInstruction: SYSTEM_PROMPT });
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function tryModels<T>(fn: (model: ReturnType<typeof getModel>) => Promise<T>): Promise<T> {
  let lastErr: any;
  for (const name of MODELS) {
    try {
      return await fn(getModel(name));
    } catch (err: any) {
      lastErr = err;
      console.warn(`${name} failed:`, err.message?.slice(0, 80));
      await sleep(1000);
    }
  }
  throw lastErr;
}

// ── TEXT CHAT ────────────────────────────────────────────────
export async function sendChatMessage(
  message: string,
  history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [],
  language = 'en'
): Promise<string> {
  if (!API_KEY) return getFallback(message);

  let systemPrompt = SYSTEM_PROMPT;
  if (language === 'zu') systemPrompt += '\n\nCRITICAL: Respond ONLY in isiZulu.';
  if (language === 'af') systemPrompt += '\n\nCRITICAL: Respond ONLY in Afrikaans.';
  if (language === 'st') systemPrompt += '\n\nCRITICAL: Respond ONLY in Sesotho.';

  try {
    return await tryModels(async (model) => {
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(message);
      return result.response.text();
    });
  } catch {
    return getFallback(message);
  }
}

// ── IMAGE SCAN ───────────────────────────────────────────────
export async function scanImage(
  file: File,
  prompt?: string,
  language = 'en'
): Promise<{ reply: string; hasDisease: boolean; diseaseName: string; severity: string }> {
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!supportedTypes.includes(file.type)) {
    return {
      reply: '📸 Please upload a JPEG, PNG, or WebP image. iPhone HEIC photos can be converted by taking a screenshot first.',
      hasDisease: false, diseaseName: '', severity: 'info',
    };
  }

  const base64 = await fileToBase64(file);
  const imageData = { inlineData: { mimeType: file.type, data: base64 } };
  const scanPrompt = prompt || 'Analyze this farm image. Identify any crop diseases, pest damage, or nutrient deficiencies. Provide: 1) Disease/issue name, 2) Confidence level, 3) Symptoms visible, 4) Treatment steps using locally available South African products, 5) Prevention tips for a KZN farmer.';

  try {
    const reply = await tryModels(async (model) => {
      const result = await model.generateContent([scanPrompt, imageData]);
      return result.response.text();
    });

    const meta = parseScan(reply);
    // Save scan to Firestore (non-blocking)
    saveCropScan({ diagnosis: reply, ...meta }).catch(console.error);
    return { reply, ...meta };
  } catch {
    return {
      reply: '🔍 I could not analyse this image right now. Please describe what you see (yellowing leaves, spots, wilting, etc.) and I\'ll advise you based on your description.',
      hasDisease: false, diseaseName: '', severity: 'info',
    };
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // strip data:image/...;base64,
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const CRITICAL_TERMS = ['armyworm', 'locust', 'bacterial wilt', 'late blight', 'stem borer', 'mosaic virus'];
const WARNING_TERMS  = ['blight', 'rust', 'rot', 'mildew', 'fungal', 'aphid', 'whitefly', 'thrips'];
const HEALTHY_TERMS  = ['healthy', 'no disease', 'no sign of disease', 'no pest', 'normal growth'];
const CROP_MAP: [string, string][] = [
  ['maize','Maize'],['corn','Maize'],['tomato','Vegetables'],['potato','Root Crops'],
  ['bean','Legumes'],['soybean','Legumes'],['cabbage','Vegetables'],['spinach','Vegetables'],
];

function parseScan(text: string) {
  const lower = text.toLowerCase();
  const isHealthy  = HEALTHY_TERMS.some(k => lower.includes(k));
  const isCritical = CRITICAL_TERMS.some(k => lower.includes(k));
  const isWarning  = WARNING_TERMS.some(k => lower.includes(k));
  const hasDisease = !isHealthy && (isCritical || isWarning || lower.includes('disease') || lower.includes('infection'));
  const cropMatch  = CROP_MAP.find(([k]) => lower.includes(k));
  const nameMatch  = text.match(/(?:disease\/issue name|identified as|diagnosis)[:\s*]+([^\n.]+)/i) || text.match(/\*\*([^*]{5,50})\*\*/);
  return {
    hasDisease,
    diseaseName: nameMatch ? nameMatch[1].trim().replace(/\*+/g, '').slice(0, 60) : 'Disease/Pest Detected',
    severity: (isCritical ? 'critical' : 'warning') as string,
    crop_type: cropMatch ? cropMatch[1] : 'Crops',
  };
}

function getFallback(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('maize') || lower.includes('corn')) return '🌽 For maize: plant at 75cm row spacing, apply 2:3:2 basal fertilizer at planting, scout for fall armyworm weekly.';
  if (lower.includes('armyworm') || lower.includes('pest')) return '🐛 For fall armyworm: apply Coragen or Ampligo early morning. Scout weekly and treat when >8 moths/trap/week.';
  if (lower.includes('tomato') || lower.includes('blight')) return '🍅 For tomato blight: apply copper oxychloride fungicide preventatively. Avoid overhead irrigation.';
  if (lower.includes('soil') || lower.includes('ph')) return '🌱 Healthy soil pH is 5.5–6.5. Apply agricultural lime if acidic. Test soil every season.';
  if (lower.includes('water') || lower.includes('irrigat')) return '💧 Water deeply and infrequently. Drip irrigation saves up to 50% water vs flood irrigation.';
  if (lower.includes('fertilizer') || lower.includes('npk')) return '🧪 Apply 2:3:2 (22) at 200kg/ha for maize. Top-dress with LAN at 6 weeks.';
  return "🌿 I'm your AI farm advisor. Ask me about crops, pests, diseases, soil health, or weather. You can also upload a photo of a sick plant for instant diagnosis!";
}
