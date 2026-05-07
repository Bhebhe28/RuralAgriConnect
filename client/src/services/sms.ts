// Africa's Talking SMS — best gateway for rural Africa, CORS-enabled REST API
// Signup free at africastalking.com | Sandbox = free testing | Production = ~R0.03/SMS

const AT_USERNAME = import.meta.env.VITE_AT_USERNAME || '';
const AT_KEY      = import.meta.env.VITE_AT_KEY      || '';
const SANDBOX     = import.meta.env.VITE_AT_SANDBOX  !== 'false'; // default sandbox

const AT_URL = SANDBOX
  ? 'https://api.sandbox.africastalking.com/version1/messaging'
  : 'https://api.africastalking.com/version1/messaging';

// Normalise South African numbers → +27XXXXXXXXX
function normaliseSAPhone(raw: string): string {
  const clean = raw.replace(/[\s\-()]/g, '');
  if (clean.startsWith('+')) return clean;
  if (clean.startsWith('27')) return '+' + clean;
  if (clean.startsWith('0')) return '+27' + clean.slice(1);
  return '+27' + clean;
}

export async function sendSMS(phone: string, message: string): Promise<void> {
  if (!AT_USERNAME || !AT_KEY || !phone.trim()) return;

  const to = normaliseSAPhone(phone.trim());

  try {
    await fetch(AT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': AT_KEY,
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        username: AT_USERNAME,
        to,
        message: message.slice(0, 160), // standard SMS length
        from: 'RurAgriCon',             // sender ID max 11 chars
      }),
    });
  } catch {
    // SMS is best-effort — never block the main action
  }
}

// Send SMS to a specific Firestore user by their UID
export async function sendSMSToUser(
  userId: string,
  message: string,
  db: import('firebase/firestore').Firestore,
): Promise<void> {
  if (!userId || userId === 'broadcast') return;
  try {
    const { getDoc, doc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) return;
    const phone: string = snap.data().phone || '';
    if (phone) await sendSMS(phone, message);
  } catch { /* silently skip */ }
}

// Send SMS to ALL farmers who have a phone number (for broadcast alerts)
export async function sendSMSBroadcast(
  message: string,
  db: import('firebase/firestore').Firestore,
  regionFilter?: string,
): Promise<void> {
  try {
    const { getDocs, collection, query, where } = await import('firebase/firestore');
    const q = regionFilter
      ? query(collection(db, 'users'), where('role', '==', 'farmer'), where('region', '==', regionFilter))
      : query(collection(db, 'users'), where('role', '==', 'farmer'));
    const snap = await getDocs(q);
    const phones = snap.docs
      .map(d => d.data().phone as string)
      .filter(Boolean);
    // Send in small batches to avoid overwhelming the API
    for (const phone of phones) {
      await sendSMS(phone, message);
    }
  } catch { /* silently skip */ }
}
