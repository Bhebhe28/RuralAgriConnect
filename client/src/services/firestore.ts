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
// Note: no orderBy in queries — composite indexes not set up. Sort in memory instead.
export async function getNotifications() {
  const userId = uid();
  if (!userId) return [];

  const [userSnap, broadcastSnap] = await Promise.all([
    getDocs(query(
      collection(db, 'notifications'),
      where('user_id', '==', userId),
      limit(60)
    )),
    getDocs(query(
      collection(db, 'notifications'),
      where('user_id', '==', 'broadcast'),
      limit(30)
    )),
  ]);

  const all = [...userSnap.docs, ...broadcastSnap.docs].map(d => {
    const n = d.data();
    return {
      id:         d.id,
      title:      n.title || '',
      message:    n.message || '',
      read:       n.read || 0,
      created_at: n.created_at || '',
    };
  });

  // Deduplicate by id, sort newest first
  const seen = new Set<string>();
  return all
    .filter(n => { if (seen.has(n.id)) return false; seen.add(n.id); return true; })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 50);
}

export async function markRead(id: string) {
  await updateDoc(doc(db, 'notifications', id), { read: 1 });
}

export async function markAllRead() {
  const userId = uid();
  if (!userId) return;
  // Single where clause only — no composite index needed
  const snap_ = await getDocs(query(collection(db, 'notifications'), where('user_id', '==', userId)));
  const unread = snap_.docs.filter(d => !d.data().read);
  if (!unread.length) return;
  const batch = writeBatch(db);
  unread.forEach(d => batch.update(d.ref, { read: 1 }));
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

export async function updateMe(data: { name?: string; phone?: string; region?: string; avatar_url?: string }) {
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
  const rawReplies = repliesSnap.docs.map(d => {
    const r = d.data();
    return { reply_id: d.id, body: r.body || '', image_url: r.image_url || null, audio_url: r.audio_url || null, document_url: r.document_url || null, document_name: r.document_name || null, location: r.location || null, created_at: r.created_at || '', author_name: r.author_name || 'Farmer', author_avatar: r.author_avatar || null, user_id: r.user_id || '' };
  });

  // For any message missing an avatar, fetch the user's current avatar from Firestore
  const missingIds = [...new Set(
    rawReplies.filter(r => !r.author_avatar && r.user_id).map(r => r.user_id)
  )];
  // Also check the post author
  if (!p.author_avatar && p.user_id && !missingIds.includes(p.user_id)) missingIds.push(p.user_id);

  const avatarMap: Record<string, string | null> = {};
  await Promise.all(missingIds.map(async (uid) => {
    const uSnap = await getDoc(doc(db, 'users', uid));
    if (uSnap.exists()) avatarMap[uid] = uSnap.data().avatar_url || null;
  }));

  const replies = rawReplies.map(r => ({
    ...r,
    author_avatar: r.author_avatar || avatarMap[r.user_id] || null,
  }));

  return {
    post_id: snap_.id, title: p.title, body: p.body, category: p.category,
    image_url: p.image_url || null, likes: p.likes || 0, created_at: p.created_at,
    author_name: p.author_name, user_id: p.user_id || '',
    author_avatar: p.author_avatar || avatarMap[p.user_id] || null,
    reply_count: p.reply_count || 0, replies,
  };
}

export async function createCommunityPost(data: { title: string; body: string; category: string; authorAvatar?: string | null }) {
  const user = auth.currentUser;
  const id = uuid();
  const notifId = uuid();
  const now = new Date().toISOString();
  const author = user?.displayName || 'A farmer';

  const batch = writeBatch(db);
  batch.set(doc(db, 'community_posts', id), {
    title:        data.title,
    body:         data.body,
    category:     data.category || 'general',
    image_url:    null,
    likes:        0,
    reply_count:  0,
    user_id:      user?.uid || '',
    author_name:  author,
    author_avatar: data.authorAvatar || null,
    created_at:   now,
    updated_at:   now,
  });
  batch.set(doc(db, 'notifications', notifId), {
    user_id:    'broadcast',
    type:       'community',
    title:      `💬 New Post: ${data.title}`,
    message:    `${author} posted in ${data.category}: "${data.body.slice(0, 100)}"`,
    post_id:    id,
    read:       0,
    created_at: now,
  });
  await batch.commit();
  return { post_id: id };
}

export async function addReply(postId: string, body: string, mediaUrl?: string | null, mediaType?: 'image' | 'audio' | 'document' | 'location' | null, authorAvatar?: string | null, mediaName?: string | null) {
  const user = auth.currentUser;
  const replyId = uuid();
  const notifId = uuid();
  const now = new Date().toISOString();
  const author = user?.displayName || 'A farmer';

  const postRef = doc(db, 'community_posts', postId);
  const postSnap = await getDoc(postRef);
  const postTitle = postSnap.exists() ? postSnap.data().title : 'a post';
  const postAuthorId = postSnap.exists() ? postSnap.data().user_id : null;

  const batch = writeBatch(db);
  batch.set(doc(db, 'community_posts', postId, 'replies', replyId), {
    body,
    image_url:     mediaType === 'image'    ? (mediaUrl || null) : null,
    audio_url:     mediaType === 'audio'    ? (mediaUrl || null) : null,
    document_url:  mediaType === 'document' ? (mediaUrl || null) : null,
    document_name: mediaType === 'document' ? (mediaName || null) : null,
    location:      mediaType === 'location' ? (() => { try { return JSON.parse(mediaUrl || 'null'); } catch { return null; } })() : null,
    user_id:       user?.uid || '',
    author_name:   author,
    author_avatar: authorAvatar || null,
    created_at:    now,
  });
  if (postSnap.exists()) {
    batch.update(postRef, { reply_count: (postSnap.data().reply_count || 0) + 1 });
  }
  // Notify the post author if it's someone else's post
  const targetUserId = postAuthorId && postAuthorId !== user?.uid ? postAuthorId : 'broadcast';
  batch.set(doc(db, 'notifications', notifId), {
    user_id:    targetUserId,
    type:       'community',
    title:      `💬 New Reply on "${postTitle}"`,
    message:    `${author} replied: "${body.slice(0, 100)}"`,
    post_id:    postId,
    read:       0,
    created_at: now,
  });
  await batch.commit();
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
  const userSnap = await getDoc(doc(db, 'users', userId));
  const isAdmin = userSnap.data()?.role === 'admin';
  const q = isAdmin
    ? query(collection(db, 'yield_reports'), orderBy('reported_at', 'desc'))
    : query(collection(db, 'yield_reports'), where('farmer_id', '==', userId), orderBy('reported_at', 'desc'));
  const snap_ = await getDocs(q);
  return snap_.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createYieldReport(data: any) {
  const id = uuid();
  const userId = uid();
  const userSnap = await getDoc(doc(db, 'users', userId));
  const userData = userSnap.data() || {};
  await setDoc(doc(db, 'yield_reports', id), {
    report_id:     id,
    farmer_id:     userId,
    farmer_name:   userData.name || '',
    farmer_region: userData.region || '',
    season:        data.season,
    crop_type:     data.crop_type,
    region:        data.region,
    area_hectares: data.area_hectares,
    yield_kg:      data.yield_kg,
    quality:       data.quality || 'good',
    notes:         data.notes || '',
    reported_at:   new Date().toISOString(),
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
  const userId = uid();
  const userSnap = await getDoc(doc(db, 'users', userId));
  const userData = userSnap.data() || {};
  await setDoc(doc(db, 'subsidy_requests', id), {
    request_id:     id,
    farmer_id:      userId,
    farmer_name:    userData.name || '',
    farmer_phone:   userData.phone || '',
    farmer_region:  userData.region || '',
    resource_type:  data.resource_type,
    quantity:       data.quantity,
    reason:         data.reason,
    status:         'pending',
    created_at:     new Date().toISOString(),
    updated_at:     new Date().toISOString(),
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
  const userSnap = await getDoc(doc(db, 'users', userId));
  const isAdmin = userSnap.data()?.role === 'admin';
  const q = isAdmin
    ? query(collection(db, 'farm_fields'), orderBy('created_at', 'desc'))
    : query(collection(db, 'farm_fields'), where('farmer_id', '==', userId), orderBy('created_at', 'desc'));
  const snap_ = await getDocs(q);
  return snap_.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createFarmField(data: any) {
  const id = uuid();
  const userId = uid();
  const userSnap = await getDoc(doc(db, 'users', userId));
  const userData = userSnap.data() || {};
  await setDoc(doc(db, 'farm_fields', id), {
    field_id:      id,
    farmer_id:     userId,
    farmer_name:   userData.name || '',
    farmer_region: userData.region || '',
    ...data,
    created_at:    new Date().toISOString(),
    updated_at:    new Date().toISOString(),
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
  const userId = uid();
  const userSnap = await getDoc(doc(db, 'users', userId));
  const userData = userSnap.data() || {};
  const farmerName = userData.name || 'A farmer';
  const id = uuid();
  const notifId = uuid();
  const now = new Date().toISOString();
  const severityEmoji = data.severity === 'critical' ? '🚨' : '⚠️';
  const source = data.source || (userData.role === 'admin' ? 'admin' : 'farmer');
  const reporterName = source === 'feed' ? 'Live Feed (AI)' : farmerName;

  const batch = writeBatch(db);
  batch.set(doc(db, 'pest_outbreaks', id), {
    outbreak_id: id, ...data, reported_by: userId, reported_by_name: reporterName,
    reported_date: now, source,
  });
  batch.set(doc(db, 'notifications', notifId), {
    user_id: 'broadcast', type: 'outbreak',
    title: `${severityEmoji} Outbreak Report: ${data.pest_name || data.description?.slice(0, 40) || 'Pest Alert'}`,
    message: `${farmerName} reported a ${data.severity} outbreak in ${(data.region || '').split('—')[1]?.trim() || data.region}. Crop: ${data.crop_affected || data.crop_type}. ${data.description?.slice(0, 100) || ''}`,
    read: 0, created_at: now,
  });
  await batch.commit();
  return { id };
}

export async function deleteOutbreak(id: string) {
  await deleteDoc(doc(db, 'pest_outbreaks', id));
}

// ── CROP SCANS ───────────────────────────────────────────────
export async function saveCropScan(data: { diagnosis: string; crop_type: string; disease_name: string; has_disease: boolean; severity: string }) {
  const userId = uid();
  if (!userId) return;
  const userSnap = await getDoc(doc(db, 'users', userId));
  const userData = userSnap.data() || {};
  const region = userData.region || 'KwaZulu-Natal';
  const farmerName = userData.name || 'A farmer';
  const now = new Date().toISOString();
  const scanId = uuid();

  const batch = writeBatch(db);

  batch.set(doc(db, 'crop_scans', scanId), {
    scan_id:      scanId,
    user_id:      userId,
    user_name:    farmerName,
    region,
    diagnosis:    data.diagnosis.slice(0, 600),
    crop_type:    data.crop_type,
    disease_name: data.disease_name,
    has_disease:  data.has_disease ? 1 : 0,
    severity:     data.severity,
    created_at:   now,
  });

  if (data.has_disease && data.disease_name) {
    const severityEmoji = data.severity === 'critical' ? '🚨' : '⚠️';
    const outbreakId = uuid();
    const notifId = uuid();

    batch.set(doc(db, 'pest_outbreaks', outbreakId), {
      outbreak_id:   outbreakId,
      pest_name:     data.disease_name,
      crop_affected: data.crop_type,
      region,
      severity:      data.severity,
      reported_by:   userId,
      reported_date: now,
      source:        'ai_scan',
      description:   `AI scan detected ${data.disease_name} in ${data.crop_type}. Reported by ${farmerName} in ${region}.`,
    });

    batch.set(doc(db, 'notifications', notifId), {
      user_id:    'broadcast',
      type:       'outbreak',
      title:      `${severityEmoji} Outbreak Alert: ${data.disease_name}`,
      message:    `${farmerName} in ${region} detected ${data.disease_name} in ${data.crop_type}. Check your crops for similar symptoms.`,
      read:       0,
      created_at: now,
    });
  }

  await batch.commit();
}

export async function getCropScans() {
  const snap_ = await getDocs(query(collection(db, 'crop_scans'), orderBy('created_at', 'desc'), limit(50)));
  return snap_.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── ANALYTICS ────────────────────────────────────────────────
export async function getAnalytics() {
  const [usersSnap, advisoriesSnap, scansSnap, outbreaksSnap, yieldsSnap, fieldsSnap, subsidiesSnap, postsSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'advisories')),
    getDocs(collection(db, 'crop_scans')),
    getDocs(collection(db, 'pest_outbreaks')),
    getDocs(collection(db, 'yield_reports')),
    getDocs(collection(db, 'farm_fields')),
    getDocs(collection(db, 'subsidy_requests')),
    getDocs(collection(db, 'community_posts')),
  ]);

  const users      = usersSnap.docs.map(d => d.data());
  const advisories = advisoriesSnap.docs.map(d => d.data());
  const outbreaks  = outbreaksSnap.docs.map(d => d.data());
  const yields     = yieldsSnap.docs.map(d => d.data());
  const fields     = fieldsSnap.docs.map(d => d.data());
  const subsidies  = subsidiesSnap.docs.map(d => d.data());

  const farmersByRegion: Record<string, number> = {};
  users.filter(u => u.role === 'farmer').forEach(u => {
    const r = u.region?.split('—')[1]?.trim() || u.region || 'Unknown';
    farmersByRegion[r] = (farmersByRegion[r] || 0) + 1;
  });

  const advisoriesByCrop: Record<string, number> = {};
  advisories.forEach(a => {
    const c = a.crop_type || a.crop || 'General';
    advisoriesByCrop[c] = (advisoriesByCrop[c] || 0) + 1;
  });

  const advisoriesBySeverity: Record<string, number> = {};
  advisories.forEach(a => {
    const s = a.severity || 'info';
    advisoriesBySeverity[s] = (advisoriesBySeverity[s] || 0) + 1;
  });

  const outbreaksByRegion: Record<string, number> = {};
  outbreaks.forEach(o => {
    const r = (o.region || '').split('—')[1]?.trim() || o.region || 'Unknown';
    outbreaksByRegion[r] = (outbreaksByRegion[r] || 0) + 1;
  });

  const yieldByCrop: Record<string, { tons: number; reports: number }> = {};
  yields.forEach(y => {
    const c = y.crop_type || 'Other';
    if (!yieldByCrop[c]) yieldByCrop[c] = { tons: 0, reports: 0 };
    yieldByCrop[c].tons += (y.yield_kg || 0) / 1000;
    yieldByCrop[c].reports += 1;
  });

  const subsidiesByType: Record<string, number> = {};
  subsidies.forEach(s => {
    const t = s.resource_type || 'Other';
    subsidiesByType[t] = (subsidiesByType[t] || 0) + 1;
  });

  return {
    total_users:       usersSnap.size,
    farmers:           users.filter(u => u.role === 'farmer').length,
    admins:            users.filter(u => u.role === 'admin').length,
    total_advisories:  advisoriesSnap.size,
    total_outbreaks:   outbreaksSnap.size,
    total_scans:       scansSnap.size,
    total_yields:      yieldsSnap.size,
    total_fields:      fieldsSnap.size,
    total_subsidies:   subsidiesSnap.size,
    pending_subsidies: subsidies.filter(s => s.status === 'pending').length,
    total_posts:       postsSnap.size,
    total_hectares:    Math.round(fields.reduce((a, f) => a + (f.area_hectares || 0), 0) * 10) / 10,
    total_yield_tons:  Math.round(yields.reduce((a, y) => a + (y.yield_kg || 0) / 1000, 0) * 10) / 10,
    farmersByRegion:   Object.entries(farmersByRegion).map(([region, count]) => ({ region, count })).sort((a, b) => b.count - a.count),
    advisoriesByCrop:  Object.entries(advisoriesByCrop).map(([crop_type, count]) => ({ crop_type, count })).sort((a, b) => b.count - a.count),
    advisoriesBySeverity: Object.entries(advisoriesBySeverity).map(([severity, count]) => ({ severity, count })),
    outbreaksByRegion: Object.entries(outbreaksByRegion).map(([region, count]) => ({ region, count })).sort((a, b) => b.count - a.count),
    yieldByCrop:       Object.entries(yieldByCrop).map(([crop_type, { tons, reports }]) => ({ crop_type, tons: Math.round(tons * 10) / 10, reports })).sort((a, b) => b.tons - a.tons),
    subsidiesByType:   Object.entries(subsidiesByType).map(([resource_type, count]) => ({ resource_type, count })).sort((a, b) => b.count - a.count),
  };
}
