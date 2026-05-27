import { auth } from '../firebase';
import { saveCropScan } from './firestore';

// ── Auth token helper ────────────────────────────────────────
async function getIdToken(): Promise<string | null> {
  try { return (await auth.currentUser?.getIdToken()) ?? null; } catch { return null; }
}

// ── A03: Strip credential-like patterns from AI output ───────
function sanitizeAIOutput(text: string): string {
  return text.replace(/\b(VITE_|API_KEY|SECRET|TOKEN|PASSWORD)\s*[=:]\s*\S+/gi, '[REDACTED]');
}

// ── TEXT CHAT ────────────────────────────────────────────────
export async function sendChatMessage(
  message: string,
  history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [],
  language = 'en'
): Promise<string> {
  try {
    const token = await getIdToken();
    if (!token) return getFallback(message);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message, history, language }),
    });
    if (!res.ok) throw new Error(`Backend ${res.status}`);
    const data = await res.json();
    return sanitizeAIOutput(data.reply as string);
  } catch (err: any) {
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

// ── Scan image thumbnail (canvas compress → base64) ──────────
function compressScanThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 500;
      let w = img.width, h = img.height;
      if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
      else       { w = Math.round(w * MAX / h); h = MAX; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('compress failed')); };
    img.src = url;
  });
}

// ── OFFLINE SCAN QUEUE ───────────────────────────────────────
const SCAN_QUEUE_KEY = 'rac_scan_queue';

type QueuedScan = {
  id: string;
  base64: string;
  mimeType: string;
  fileName: string;
  language: string;
  queuedAt: string;
};

function readQueue(): QueuedScan[] {
  try { return JSON.parse(localStorage.getItem(SCAN_QUEUE_KEY) || '[]'); } catch { return []; }
}
function writeQueue(q: QueuedScan[]) {
  try { localStorage.setItem(SCAN_QUEUE_KEY, JSON.stringify(q)); } catch {}
}
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function getPendingScanCount(): number {
  return readQueue().length;
}

export async function processScanQueue(): Promise<void> {
  const queue = readQueue();
  if (queue.length === 0) return;
  const token = await getIdToken();
  if (!token) return;

  const remaining: QueuedScan[] = [];
  for (const item of queue) {
    try {
      const blob = await (await fetch(`data:${item.mimeType};base64,${item.base64}`)).blob();
      const file = new File([blob], item.fileName, { type: item.mimeType });
      const formData = new FormData();
      formData.append('image', file);
      formData.append('language', item.language);
      const res = await fetch('/api/chat/scan', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        const reply = sanitizeAIOutput(data.reply as string);
        const meta = parseScan(reply);
        saveCropScan({
          diagnosis: reply, crop_type: meta.crop_type,
          disease_name: meta.diseaseName, has_disease: meta.hasDisease, severity: meta.severity,
        }).catch(() => {});
      } else {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }
  writeQueue(remaining);
}

// ── IMAGE SCAN ───────────────────────────────────────────────
export async function scanImage(
  file: File,
  prompt?: string,
  language = 'en'
): Promise<{ reply: string; hasDisease: boolean; diseaseName: string; severity: string }> {
  const heicTypes  = ['image/heic', 'image/heif'];
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

  // Compress thumbnail BEFORE the API call so we always have the image to save
  let thumbnail: string | undefined;
  try { thumbnail = await compressScanThumbnail(file); } catch {}

  const token = await getIdToken();

  try {
    if (!token) throw new Error('Not authenticated');

    const formData = new FormData();
    formData.append('image', file);
    if (prompt) formData.append('prompt', prompt);
    formData.append('language', language);

    const res = await fetch('/api/chat/scan', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error(`Backend ${res.status}`);
    const data = await res.json();
    const reply = sanitizeAIOutput(data.reply as string);

    if (data.scanFailed) {
      // Server processed the request but AI was unavailable (quota, etc.) — save as failed
      saveCropScan({
        diagnosis: reply, crop_type: 'Unknown', disease_name: '',
        has_disease: false, severity: 'info', image_url: thumbnail, status: 'failed',
      }).catch(() => {});
      return { reply, hasDisease: false, diseaseName: '', severity: 'info' };
    }

    const meta = parseScan(reply);
    saveCropScan({
      diagnosis: reply, crop_type: meta.crop_type, disease_name: meta.diseaseName,
      has_disease: meta.hasDisease, severity: meta.severity, image_url: thumbnail, status: 'success',
    }).catch((e) => console.error('[ScanSave]', e));
    return { reply, ...meta };
  } catch (err: any) {
    const isOfflineError = !navigator.onLine ||
      ['fetch', 'network', 'failed to fetch'].some(k => (err?.message || '').toLowerCase().includes(k));

    if (isOfflineError && !navigator.onLine) {
      try {
        const base64 = await fileToBase64(file);
        const queue = readQueue();
        queue.push({
          id: Date.now().toString(),
          base64,
          mimeType: file.type || 'image/jpeg',
          fileName: file.name || 'crop.jpg',
          language,
          queuedAt: new Date().toISOString(),
        });
        writeQueue(queue);
        return {
          reply: '📴 You\'re offline — your scan has been saved and will be processed automatically when you reconnect.',
          hasDisease: false, diseaseName: '', severity: 'info',
        };
      } catch {}
    }

    // Save the failed attempt so it shows in scan history with the photo
    if (token) {
      saveCropScan({
        diagnosis: 'Scan failed — AI service temporarily unavailable. This is usually a quota issue that resets daily.',
        crop_type: 'Unknown',
        disease_name: '',
        has_disease: false,
        severity: 'info',
        image_url: thumbnail,
        status: 'failed',
      }).catch(() => {});
    }

    return {
      reply: '🔍 I could not analyse this image right now. Please describe what you see (yellowing leaves, spots, wilting, etc.) and I\'ll advise you based on your description.',
      hasDisease: false, diseaseName: '', severity: 'info',
    };
  }
}

// ── Scan result parser ────────────────────────────────────────
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

  // Extract the DISEASE NAME header so "healthy" in treatment/prevention text
  // doesn't falsely mark a diseased plant as healthy
  const diseaseHeaderMatch = text.match(/\*\*[^*]*DISEASE[^*]*:\*\*\s*([^\n]+)/i);
  const diseaseHeader = diseaseHeaderMatch
    ? diseaseHeaderMatch[1].trim().replace(/\*+/g, '').trim()
    : null;

  const isHealthy = diseaseHeader
    ? /^healthy\s*plant$/i.test(diseaseHeader) || /^no\s+disease/i.test(diseaseHeader) || /^normal\s+growth/i.test(diseaseHeader)
    : HEALTHY_TERMS.some(k => lower.slice(0, 300).includes(k));

  const isNonPathogen = NON_DISEASE_TERMS.some(k => lower.includes(k));
  const isCritical    = CRITICAL_TERMS.some(k => lower.includes(k));
  const isWarning     = WARNING_TERMS.some(k => lower.includes(k));
  const hasDisease    = !isHealthy && !isNonPathogen && (
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
    diseaseName: name,
    severity: (isCritical ? 'critical' : 'warning') as string,
    crop_type: cropMatch ? cropMatch[1] : 'Crops',
  };
}

// ── Offline fallback ─────────────────────────────────────────
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
