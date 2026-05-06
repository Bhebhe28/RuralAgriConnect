import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { v4 as uuid } from 'uuid';

const uid = () => auth.currentUser?.uid || '';

// ── helpers ──────────────────────────────────────────────────
function snap<T>(d: DocumentData, id: string): T {
  return { id, ...d } as T;
}

// ── ADVISORIES ───────────────────────────────────────────────
export async function getAdvisories(filters?: { crop?: string; region?: string; severity?: string }) {
  let q = query(collection(db, 'advisories'), orderBy('created_at', 'desc'), limit(100));
  const snap_ = await getDocs(q);
  let items = snap_.docs.map(d => snap<any>(d.data(), d.id));
  if (filters?.crop)     items = items.filter(a => a.crop_type?.toLowerCase().includes(filters.crop!.toLowerCase()) || a.crop?.toLowerCase().includes(filters.crop!.toLowerCase()));
  if (filters?.region)   items = items.filter(a => a.region?.toLowerCase().includes(filters.region!.toLowerCase()));
  if (filters?.severity) items = items.filter(a => a.severity === filters.severity);
  return items.map(a => ({
    id:          a.advisory_id || a.id,
    title:       a.title,
    content:     a.content,
    crop:        a.crop_type || a.crop || '',
    region:      a.region || '',
    severity:    a.severity || 'info',
    author_name: a.author_name || 'Admin',
    published_at: a.created_at || a.published_at || '',
    updated_at:  a.updated_at || '',
    prevention_tips: a.prevention_tips || [],
  }));
}

export async function getAdvisory(id: string) {
  const snap_ = await getDoc(doc(db, 'advisories', id));
  if (!snap_.exists()) throw new Error('Advisory not found');
  const a = snap_.data();
  return {
    id:          snap_.id,
    title:       a.title,
    content:     a.content,
    crop:        a.crop_type || a.crop || '',
    region:      a.region || '',
    severity:    a.severity || 'info',
    author_name: a.author_name || 'Admin',
    published_at: a.created_at || a.published_at || '',
    updated_at:  a.updated_at || '',
    prevention_tips: a.prevention_tips || [],
  };
}

export async function createAdvisory(data: any) {
  const user = auth.currentUser;
  const id = uuid();
  await setDoc(doc(db, 'advisories', id), {
    advisory_id: id,
    title:       data.title,
    content:     data.content,
    crop_type:   data.crop,
    region:      data.region,
    severity:    data.severity || 'info',
    created_by:  user?.uid || '',
    author_name: user?.displayName || 'Admin',
    created_at:  new Date().toISOString(),
    updated_at:  new Date().toISOString(),
    prevention_tips: data.prevention_tips || [],
  });
  return { id };
}

export async function updateAdvisory(id: string, data: any) {
  await updateDoc(doc(db, 'advisories', id), {
    ...data,
    crop_type:  data.crop || data.crop_type,
    updated_at: new Date().toISOString(),
  });
}

export async function deleteAdvisory(id: string) {
  await deleteDoc(doc(db, 'advisories', id));
}

// ── WEATHER ──────────────────────────────────────────────────
export async function getWeatherData(region?: string) {
  let q = query(collection(db, 'weather_data'), orderBy('created_at', 'desc'), limit(50));
  const snap_ = await getDocs(q);
  let items = snap_.docs.map(d => snap<any>(d.data(), d.id));
  if (region) items = items.filter(w => w.region?.toLowerCase().includes(region.toLowerCase()));
  return items;
}

export async function getWeatherAlerts(region?: string) {
  const snap_ = await getDocs(query(collection(db, 'weather_data'), orderBy('created_at', 'desc'), limit(30)));
  let items = snap_.docs.map(d => snap<any>(d.data(), d.id));
  if (region) items = items.filter(w => w.region?.toLowerCase().includes(region.toLowerCase()));
  return items.map(w => ({
    id:        w.weather_id || w.id,
    type:      'weather',
    message:   `${w.description || 'Weather update'} — ${w.region}`,
    region:    w.region || '',
    severity:  w.temperature > 35 ? 'critical' : w.rainfall > 20 ? 'warning' : 'info',
    issued_at: w.created_at || '',
    temperature: w.temperature,
    humidity:    w.humidity,
    rainfall:    w.rainfall,
    wind_speed:  w.wind_speed,
    description: w.description,
    icon:        w.icon,
    feels_like:  w.feels_like,
    forecast_date: w.forecast_date,
  }));
}

// ── NOTIFICATIONS ────────────────────────────────────────────
export async function getNotifications() {
  const userId = uid();
  if (!userId) return [];
  const q = query(
    collection(db, 'notifications'),
    where('user_id', '==', userId),
    orderBy('created_at', 'desc'),
    limit(50)
  );
  const snap_ = await getDocs(q);
  return snap_.docs.map(d => {
    const n = d.data();
    return {
      id:         d.id,
      title:      n.title || '',
      message:    n.message || '',
      read:       n.read || 0,
      created_at: n.created_at || '',
    };
  });
}

export async function markRead(id: string) {
  await updateDoc(doc(db, 'notifications', id), { read: 1 });
}

export async function markAllRead() {
  const userId = uid();
  if (!userId) return;
  const q = query(collection(db, 'notifications'), where('user_id', '==', userId), where('read', '==', 0));
  const snap_ = await getDocs(q);
  const batch = writeBatch(db);
  snap_.docs.forEach(d => batch.update(d.ref, { read: 1 }));
  await batch.commit();
}

// ── USERS ────────────────────────────────────────────────────
export async function getMe() {
  const userId = uid();
  if (!userId) throw new Error('Not authenticated');
  const snap_ = await getDoc(doc(db, 'users', userId));
  if (!snap_.exists()) return null;
  const u = snap_.data();
  return { id: userId, name: u.name, email: u.email, phone: u.phone, role: u.role, region: u.region, avatar_url: u.avatar_url };
}

export async function updateMe(data: { name?: string; phone?: string; region?: string }) {
  const userId = uid();
  if (!userId) throw new Error('Not authenticated');
  await updateDoc(doc(db, 'users', userId), { ...data, updated_at: new Date().toISOString() });
}

export async function getUsers() {
  const snap_ = await getDocs(collection(db, 'users'));
  return snap_.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteUser(id: string) {
  await deleteDoc(doc(db, 'users', id));
}

// ── COMMUNITY ────────────────────────────────────────────────
export async function getCommunityPosts(category?: string) {
  const q = query(collection(db, 'community_posts'), orderBy('created_at', 'desc'), limit(50));
  const snap_ = await getDocs(q);
  let posts = snap_.docs.map(d => {
    const p = d.data();
    return {
      post_id:      d.id,
      title:        p.title || '',
      body:         p.body || '',
      category:     p.category || 'general',
      image_url:    p.image_url || null,
      likes:        p.likes || 0,
      created_at:   p.created_at || '',
      author_name:  p.author_name || 'Farmer',
      author_avatar: p.author_avatar || null,
      reply_count:  p.reply_count || 0,
      user_id:      p.user_id || '',
    };
  });
  if (category && category !== 'all') posts = posts.filter(p => p.category === category);
  return posts;
}

export async function getCommunityPost(id: string) {
  const snap_ = await getDoc(doc(db, 'community_posts', id));
  if (!snap_.exists()) throw new Error('Post not found');
  const p = snap_.data();

  const repliesSnap = await getDocs(
    query(collection(db, 'community_posts', id, 'replies'), orderBy('created_at', 'asc'))
  );
  const replies = repliesSnap.docs.map(d => {
    const r = d.data();
    return { reply_id: d.id, body: r.body, image_url: r.image_url || null, created_at: r.created_at, author_name: r.author_name, author_avatar: r.author_avatar || null };
  });

  return {
    post_id: snap_.id, title: p.title, body: p.body, category: p.category,
    image_url: p.image_url || null, likes: p.likes || 0, created_at: p.created_at,
    author_name: p.author_name, author_avatar: p.author_avatar || null, reply_count: p.reply_count || 0, replies,
  };
}

export async function createCommunityPost(data: { title: string; body: string; category: string }) {
  const user = auth.currentUser;
  const id = uuid();
  await setDoc(doc(db, 'community_posts', id), {
    title:        data.title,
    body:         data.body,
    category:     data.category || 'general',
    image_url:    null,
    likes:        0,
    reply_count:  0,
    user_id:      user?.uid || '',
    author_name:  user?.displayName || 'Farmer',
    author_avatar: null,
    created_at:   new Date().toISOString(),
    updated_at:   new Date().toISOString(),
  });
  return { post_id: id };
}

export async function addReply(postId: string, body: string) {
  const user = auth.currentUser;
  const replyId = uuid();
  await setDoc(doc(db, 'community_posts', postId, 'replies', replyId), {
    body,
    image_url:    null,
    user_id:      user?.uid || '',
    author_name:  user?.displayName || 'Farmer',
    author_avatar: null,
    created_at:   new Date().toISOString(),
  });
  // Increment reply count
  const postRef = doc(db, 'community_posts', postId);
  const postSnap = await getDoc(postRef);
  if (postSnap.exists()) {
    await updateDoc(postRef, { reply_count: (postSnap.data().reply_count || 0) + 1 });
  }
}

export async function likePost(postId: string) {
  const postRef = doc(db, 'community_posts', postId);
  const snap_ = await getDoc(postRef);
  if (snap_.exists()) {
    await updateDoc(postRef, { likes: (snap_.data().likes || 0) + 1 });
  }
}

// ── YIELD REPORTS ────────────────────────────────────────────
export async function getYieldReports() {
  const userId = uid();
  if (!userId) return [];
  const q = query(collection(db, 'yield_reports'), where('farmer_id', '==', userId), orderBy('reported_at', 'desc'));
  const snap_ = await getDocs(q);
  return snap_.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createYieldReport(data: any) {
  const id = uuid();
  await setDoc(doc(db, 'yield_reports', id), {
    report_id:    id,
    farmer_id:    uid(),
    season:       data.season,
    crop_type:    data.crop_type,
    region:       data.region,
    area_hectares: data.area_hectares,
    yield_kg:     data.yield_kg,
    quality:      data.quality || 'good',
    notes:        data.notes || '',
    reported_at:  new Date().toISOString(),
  });
  return { id };
}

export async function deleteYieldReport(id: string) {
  await deleteDoc(doc(db, 'yield_reports', id));
}

// ── SUBSIDY REQUESTS ─────────────────────────────────────────
export async function getSubsidyRequests() {
  const userId = uid();
  if (!userId) return [];
  const isAdmin = (await getDoc(doc(db, 'users', userId))).data()?.role === 'admin';
  const q = isAdmin
    ? query(collection(db, 'subsidy_requests'), orderBy('created_at', 'desc'))
    : query(collection(db, 'subsidy_requests'), where('farmer_id', '==', userId), orderBy('created_at', 'desc'));
  const snap_ = await getDocs(q);
  return snap_.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createSubsidyRequest(data: any) {
  const id = uuid();
  await setDoc(doc(db, 'subsidy_requests', id), {
    request_id:    id,
    farmer_id:     uid(),
    resource_type: data.resource_type,
    quantity:      data.quantity,
    reason:        data.reason,
    status:        'pending',
    created_at:    new Date().toISOString(),
    updated_at:    new Date().toISOString(),
  });
  return { id };
}

export async function updateSubsidyStatus(id: string, status: string, notes?: string) {
  await updateDoc(doc(db, 'subsidy_requests', id), {
    status, review_notes: notes || '', reviewed_by: uid(), updated_at: new Date().toISOString(),
  });
}

// ── CROP CALENDAR ────────────────────────────────────────────
export async function getCropCalendar() {
  const snap_ = await getDocs(query(collection(db, 'crop_calendar'), orderBy('month_start', 'asc')));
  return snap_.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createCalendarEntry(data: any) {
  const id = uuid();
  await setDoc(doc(db, 'crop_calendar', id), {
    calendar_id: id, ...data, created_by: uid(), created_at: new Date().toISOString(),
  });
}

export async function deleteCalendarEntry(id: string) {
  await deleteDoc(doc(db, 'crop_calendar', id));
}

// ── FARM FIELDS ──────────────────────────────────────────────
export async function getFarmFields() {
  const userId = uid();
  if (!userId) return [];
  const q = query(collection(db, 'farm_fields'), where('farmer_id', '==', userId), orderBy('created_at', 'desc'));
  const snap_ = await getDocs(q);
  return snap_.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createFarmField(data: any) {
  const id = uuid();
  await setDoc(doc(db, 'farm_fields', id), {
    field_id: id, farmer_id: uid(), ...data,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });
  return { id };
}

export async function updateFarmField(id: string, data: any) {
  await updateDoc(doc(db, 'farm_fields', id), { ...data, updated_at: new Date().toISOString() });
}

export async function deleteFarmField(id: string) {
  await deleteDoc(doc(db, 'farm_fields', id));
}

// ── OUTBREAKS ────────────────────────────────────────────────
export async function getOutbreaks() {
  const snap_ = await getDocs(query(collection(db, 'pest_outbreaks'), orderBy('reported_date', 'desc'), limit(50)));
  return snap_.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createOutbreak(data: any) {
  const id = uuid();
  await setDoc(doc(db, 'pest_outbreaks', id), {
    outbreak_id: id, ...data, reported_by: uid(), reported_date: new Date().toISOString(), source: 'admin',
  });
}

// ── CROP SCANS ───────────────────────────────────────────────
export async function saveCropScan(data: { diagnosis: string; crop_type: string; disease_name: string; has_disease: boolean; severity: string }) {
  const userId = uid();
  if (!userId) return;
  const userSnap = await getDoc(doc(db, 'users', userId));
  const userData = userSnap.data() || {};
  const id = uuid();
  await setDoc(doc(db, 'crop_scans', id), {
    scan_id:      id,
    user_id:      userId,
    user_name:    userData.name || 'Farmer',
    region:       userData.region || 'KwaZulu-Natal',
    diagnosis:    data.diagnosis.slice(0, 600),
    crop_type:    data.crop_type,
    disease_name: data.disease_name,
    has_disease:  data.has_disease ? 1 : 0,
    severity:     data.severity,
    created_at:   new Date().toISOString(),
  });
}

export async function getCropScans() {
  const snap_ = await getDocs(query(collection(db, 'crop_scans'), orderBy('created_at', 'desc'), limit(50)));
  return snap_.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── ANALYTICS ────────────────────────────────────────────────
export async function getAnalytics() {
  const [usersSnap, advisoriesSnap, scansSnap, outbreaksSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'advisories')),
    getDocs(collection(db, 'crop_scans')),
    getDocs(collection(db, 'pest_outbreaks')),
  ]);
  return {
    total_users:      usersSnap.size,
    total_advisories: advisoriesSnap.size,
    total_scans:      scansSnap.size,
    total_outbreaks:  outbreaksSnap.size,
    farmers:          usersSnap.docs.filter(d => d.data().role === 'farmer').length,
    admins:           usersSnap.docs.filter(d => d.data().role === 'admin').length,
  };
}
