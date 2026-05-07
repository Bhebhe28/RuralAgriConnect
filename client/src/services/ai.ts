import { GoogleGenerativeAI } from '@google/generative-ai';
import { saveCropScan } from './firestore';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const SYSTEM_PROMPT = `You are an expert agricultural advisor for small-scale farmers in KwaZulu-Natal, South Africa.
You specialize in crop management, pest and disease identification, soil health, fertilization, irrigation, and local KZN farming practices.
When analyzing images: identify crop diseases, pest damage, or nutrient deficiencies. Give a clear diagnosis with confidence level and specific treatment recommendations using locally available South African products.
Keep responses practical, concise, and actionable. Use simple language suitable for rural farmers.`;

const MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-2.5-flash-preview-05-20',
];

function getModel(modelName: string, sysPrompt: string = SYSTEM_PROMPT) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  return genAI.getGenerativeModel({ model: modelName, systemInstruction: sysPrompt });
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function tryModels<T>(fn: (model: ReturnType<typeof getModel>) => Promise<T>, sysPrompt?: string): Promise<T> {
  const errors: string[] = [];
  for (const name of MODELS) {
    try {
      return await fn(getModel(name, sysPrompt));
    } catch (err: any) {
      const msg = `${name}: ${err.message?.slice(0, 300)}`;
      errors.push(msg);
      await sleep(1000);
    }
  }
  throw new Error(errors.join(' | '));
}

function buildSystemPrompt(language: string): string {
  let prompt = SYSTEM_PROMPT;
  if (language === 'zu') prompt += '\n\nCRITICAL LANGUAGE RULE: You MUST respond ONLY in isiZulu for every single reply, no exceptions. Never switch to English regardless of what language the farmer writes in. If unsure of an isiZulu term, use the closest equivalent.';
  if (language === 'af') prompt += '\n\nKRITIESE TAALREËL: Jy MOET altyd en uitsluitlik in Afrikaans antwoord, sonder uitsondering. Moenie oorskakel na Engels nie, maak nie saak in watter taal die boer skryf nie.';
  if (language === 'st') prompt += '\n\nMOLAO O BOHLOKOA OA PUO: O TLAMEHA ho araba feela ka Sesotho mesebetsing yohle, ho sa natsoe hore ke puo efe eo molemisi a e sebelisang.';
  return prompt;
}

// ── TEXT CHAT ────────────────────────────────────────────────
export async function sendChatMessage(
  message: string,
  history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [],
  language = 'en'
): Promise<string> {
  if (!API_KEY) return getFallback(message);

  const systemPrompt = buildSystemPrompt(language);

  try {
    return await tryModels(async (model) => {
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(message);
      return result.response.text();
    }, systemPrompt);
  } catch (err: any) {
    // Return fallback but surface quota/network errors clearly
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('429') || msg.includes('quota')) {
      return '⚠️ AI is busy right now (daily quota reached). Please try again tomorrow, or describe your issue and I\'ll give you advice from my knowledge base.\n\n' + getFallback(message);
    }
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed')) {
      return '📡 Network error — check your internet connection and try again.';
    }
    return getFallback(message);
  }
}

// ── IMAGE SCAN ───────────────────────────────────────────────
export async function scanImage(
  file: File,
  prompt?: string,
  language = 'en'
): Promise<{ reply: string; hasDisease: boolean; diseaseName: string; severity: string }> {
  // Accept all common types + HEIC/HEIF from iPhone. Empty type also treated as JPEG.
  const heicTypes = ['image/heic', 'image/heif'];
  const supported  = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const isHeic     = heicTypes.includes(file.type.toLowerCase());
  const isEmpty    = !file.type;
  const isSupported = supported.includes(file.type.toLowerCase());

  if (!isHeic && !isEmpty && !isSupported) {
    return {
      reply: '📸 Please upload a JPEG, PNG, or WebP image. iPhone HEIC photos can be converted by taking a screenshot first.',
      hasDisease: false, diseaseName: '', severity: 'info',
    };
  }

  // Use jpeg as fallback mimeType for HEIC or unknown types — Gemini handles the raw bytes
  const mimeType = isSupported ? file.type : 'image/jpeg';

  const base64 = await fileToBase64(file);
  const imageData = { inlineData: { mimeType, data: base64 } };
  const scanPrompt = prompt || 'Analyze this farm image. Identify any crop diseases, pest damage, or nutrient deficiencies. Provide: 1) Disease/issue name, 2) Confidence level, 3) Symptoms visible, 4) Treatment steps using locally available South African products, 5) Prevention tips for a KZN farmer.';

  const scanSystemPrompt = buildSystemPrompt(language);

  try {
    const reply = await tryModels(async (model) => {
      const result = await model.generateContent([scanPrompt, imageData]);
      return result.response.text();
    }, scanSystemPrompt);

    const meta = parseScan(reply);
    saveCropScan({
      diagnosis:    reply,
      crop_type:    meta.crop_type,
      disease_name: meta.diseaseName,
      has_disease:  meta.hasDisease,
      severity:     meta.severity,
    }).catch(() => {});
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

const CRITICAL_TERMS    = ['armyworm', 'locust', 'bacterial wilt', 'late blight', 'stem borer', 'mosaic virus'];
const WARNING_TERMS     = ['blight', 'rust', 'rot', 'mildew', 'fungal', 'aphid', 'whitefly', 'thrips'];
const HEALTHY_TERMS     = ['healthy', 'no disease', 'no sign of disease', 'no pest', 'normal growth'];
const NON_DISEASE_TERMS = ['not a disease', 'not a pest', 'not caused by', 'nutrient deficiency',
                           'calcium deficiency', 'deficiency', 'not an infectious', 'abiotic'];
const CROP_MAP: [string, string][] = [
  ['maize','Maize'],['corn','Maize'],['tomato','Vegetables'],['potato','Root Crops'],
  ['bean','Legumes'],['soybean','Legumes'],['cabbage','Vegetables'],['spinach','Vegetables'],
];

function parseScan(text: string) {
  const lower = text.toLowerCase();
  const isHealthy     = HEALTHY_TERMS.some(k => lower.includes(k));
  const isNonPathogen = NON_DISEASE_TERMS.some(k => lower.includes(k));
  const isCritical    = CRITICAL_TERMS.some(k => lower.includes(k));
  const isWarning     = WARNING_TERMS.some(k => lower.includes(k));
  const hasDisease    = !isHealthy && !isNonPathogen &&
                        (isCritical || isWarning || lower.includes('infection') ||
                         (lower.includes('disease') && !lower.includes('no disease')));
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
  if (lower.includes('maize') || lower.includes('corn'))
    return '🌽 Maize in KZN: plant at 75cm row spacing after first rains (Oct–Nov). Apply 2:3:2 basal fertilizer at planting, top-dress with LAN at 6 weeks. Scout for fall armyworm weekly — treat with Coragen or Ampligo if >8 larvae per 100 plants.';
  if (lower.includes('armyworm'))
    return '🐛 Fall armyworm: spray Coragen (chlorantraniliprole) or Ampligo early morning before heat. Scout weekly. Biological option: apply Bacillus thuringiensis (Bt) products. Check inside the whorl for larvae.';
  if (lower.includes('pest') || lower.includes('insect') || lower.includes('bug'))
    return '🐛 Common KZN pests: fall armyworm (maize), aphids (vegetables), thrips (tomatoes), red spider mite (dry conditions). Identify the pest first, then apply targeted pesticide. Avoid broad-spectrum sprays that kill beneficial insects.';
  if (lower.includes('tomato') || lower.includes('blight'))
    return '🍅 Tomato blight: apply copper oxychloride or mancozeb fungicide every 7–14 days preventatively. Stake plants, avoid overhead irrigation, remove infected leaves. For bacterial wilt, remove and destroy infected plants immediately.';
  if (lower.includes('season') || lower.includes('plant') || lower.includes('when'))
    return '📅 KZN planting guide:\n• Maize: Oct–Nov (summer rains)\n• Tomatoes: Aug–Sep (transplant seedlings)\n• Beans: Oct–Nov\n• Butternut/pumpkin: Sep–Oct\n• Spinach/kale: year-round with irrigation\nAlways check your last frost date — KZN coastal areas are frost-free.';
  if (lower.includes('soil') || lower.includes('ph'))
    return '🌱 Healthy soil pH is 5.5–6.5 for most crops. Apply agricultural lime (dolomitic) if pH is below 5.5. Test soil every season before planting. Add compost to improve structure — 2–4 tonnes per hectare.';
  if (lower.includes('water') || lower.includes('irrigat') || lower.includes('drought'))
    return '💧 Water management: drip irrigation saves 50% water vs flood. Water deeply 2–3× per week rather than lightly every day. Mulch around plants to retain moisture. In drought, prioritise young plants in first 3 weeks after transplant.';
  if (lower.includes('fertilizer') || lower.includes('npk') || lower.includes('nutrient'))
    return '🧪 KZN fertilizer guide:\n• Maize: 2:3:2 (22) at 200kg/ha at planting, LAN top-dress at 6 weeks\n• Vegetables: 3:2:1 or similar balanced fertilizer\n• Always test soil first\n• Organic option: chicken manure at 5 tonnes/ha, compost at 3–4 tonnes/ha';
  if (lower.includes('disease') || lower.includes('sick') || lower.includes('yellow') || lower.includes('spot') || lower.includes('rot'))
    return '🔬 To diagnose a plant disease: upload a photo using the 📷 camera button for AI diagnosis. Common signs:\n• Yellow leaves = nutrient deficiency or virus\n• Brown spots = fungal disease (apply fungicide)\n• Wilting with green leaves = bacterial wilt or root rot\n• Holes in leaves = pest damage';
  if (lower.includes('chicken') || lower.includes('poultry') || lower.includes('livestock'))
    return '🐔 Poultry in KZN: vaccinate against Newcastle disease and Marek\'s disease. Provide 120g feed/bird/day for layers. Biosecurity is key — clean coops weekly, isolate new birds for 2 weeks. Report any mass die-offs to your local vet immediately.';
  if (lower.includes('weather') || lower.includes('rain') || lower.includes('frost'))
    return '🌤️ Check the Weather tab for live KZN district forecasts. KZN typically gets summer rainfall (Oct–Mar). Protect crops from hail with shade nets. Frost risk is highest May–Aug in midlands — cover seedlings overnight.';
  if (lower.includes('hi') || lower.includes('hello') || lower.includes('help'))
    return '👋 Hello! I can help with:\n• Crop diseases and pest identification\n• What to plant this season in KZN\n• Fertilizer and soil advice\n• Irrigation tips\n• Fall armyworm and other pest control\n\nType your question, or use the 📷 button to upload a photo of a sick plant for AI diagnosis!';
  return '🌿 I can help with KZN crops, pests, diseases, soil and irrigation. Try asking:\n• "What crops should I plant in KZN?"\n• "How do I treat fall armyworm?"\n• "My maize leaves are yellow — what\'s wrong?"\n\nOr upload a crop photo with 📷 for instant diagnosis.';
}
