import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getCommunityPosts, getCommunityPost, createCommunityPost, addReply, likePost, createChannel, deletePost, deleteReply, muteUserInChannel, unmuteUserInChannel } from '../services/firestore';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface Post {
  post_id: string; title: string; body: string; category: string;
  image_url?: string | null; likes: number; created_at: string;
  author_name: string; author_avatar?: string | null; reply_count: number; user_id: string;
  is_channel?: boolean; channel_emoji?: string | null; muted_users?: string[];
}
interface Reply {
  reply_id: string; body: string;
  image_url?: string | null; audio_url?: string | null;
  document_url?: string | null; document_name?: string | null;
  location?: { lat: number; lng: number } | null;
  created_at: string; author_name: string; author_avatar?: string | null; user_id: string;
}
interface PostDetail extends Post { replies: Reply[]; }
type MediaType = 'image' | 'audio' | 'document' | 'location';
interface PendingMedia { url: string; type: MediaType; name?: string }

// ── Persistent read-state via localStorage ───────────────────────
const READ_KEY = 'rac_community_read';
const getStored = (): Record<string, number> => {
  try { return JSON.parse(localStorage.getItem(READ_KEY) || '{}'); } catch { return {}; }
};
const markRead = (postId: string, replyCount: number) => {
  try { localStorage.setItem(READ_KEY, JSON.stringify({ ...getStored(), [postId]: replyCount })); } catch {/**/}
};

const CATS = ['All','general','disease','weather','market','equipment','soil'];
const CAT_COLOR: Record<string,string> = {
  general:'#128C7E', disease:'#e74c3c', weather:'#3498db',
  market:'#f39c12', equipment:'#8e44ad', soil:'#27ae60',
};
const CAT_ICON: Record<string,string> = {
  general:'💬', disease:'🦠', weather:'🌦', market:'💰', equipment:'🔧', soil:'🌱',
};

function msgTime(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-ZA', { hour:'2-digit', minute:'2-digit', hour12:false });
}
function dateSep(iso: string) {
  if (!iso) return '';
  const d = new Date(iso), now = new Date();
  if (d.toDateString() === now.toDateString()) return 'TODAY';
  if (d.toDateString() === new Date(now.getTime() - 86400000).toDateString()) return 'YESTERDAY';
  return d.toLocaleDateString('en-ZA', { day:'numeric', month:'long', year:'numeric' }).toUpperCase();
}
function sameDay(a: string, b: string) { return new Date(a).toDateString() === new Date(b).toDateString(); }
function nameColor(name: string) {
  const hue = Array.from(name||'A').reduce((a,c) => a + c.charCodeAt(0), 0) % 360;
  return `hsl(${hue},55%,42%)`;
}

async function compressImg(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 900; let w = img.width, h = img.height;
      if (w > h) { h = Math.round(h*MAX/w); w = MAX; } else { w = Math.round(w*MAX/h); h = MAX; }
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = reject; img.src = url;
  });
}
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(file);
  });
}
async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(blob);
  });
}

// ── Avatar ──────────────────────────────────────────────────────
function UserAvatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  return (
    <div style={{ width:size, height:size, background: url ? undefined : nameColor(name), flexShrink:0 }}
      className="rounded-full flex items-center justify-center text-white font-bold overflow-hidden">
      {url
        ? <img src={url} alt={name} className="w-full h-full object-cover" />
        : <span style={{ fontSize:size*0.38 }}>{(name||'?').charAt(0).toUpperCase()}</span>
      }
    </div>
  );
}

// ── Voice player ─────────────────────────────────────────────────
function VoiceMsg({ src, mine }: { src: string; mine: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [dur, setDur] = useState(0);
  const [cur, setCur] = useState(0);
  const ref = useRef<HTMLAudioElement>(null);
  const pct = dur ? Math.round((cur/dur)*100) : 0;
  return (
    <div className="flex items-center gap-2.5" style={{ minWidth:180 }}>
      <button className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: mine ? 'rgba(255,255,255,0.25)' : '#128C7E22' }}
        onClick={() => { const a=ref.current!; playing?(a.pause(),setPlaying(false)):(a.play(),setPlaying(true)); }}>
        {playing ? '⏸' : '▶'}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div className="h-1 rounded-full overflow-hidden" style={{ background: mine?'rgba(255,255,255,0.3)':'#128C7E30' }}>
          <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background: mine?'#fff':'#128C7E' }}/>
        </div>
        <span style={{ fontSize:10, color: mine?'rgba(255,255,255,0.6)':'#667781' }}>
          {playing ? `${Math.floor(cur)}s` : `${Math.floor(dur)||0}s`}
        </span>
      </div>
      <span style={{ fontSize:18 }}>🎙️</span>
      <audio ref={ref} src={src}
        onLoadedMetadata={() => setDur(ref.current?.duration||0)}
        onTimeUpdate={() => setCur(ref.current?.currentTime||0)}
        onEnded={() => { setPlaying(false); setCur(0); }}/>
    </div>
  );
}

// ── Document card ─────────────────────────────────────────────────
function DocCard({ url, name, mine }: { url: string; name: string; mine: boolean }) {
  const ext = name.split('.').pop()?.toUpperCase() || 'FILE';
  return (
    <a href={url} download={name}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl no-underline"
      style={{ background: mine ? 'rgba(255,255,255,0.15)' : '#128C7E18', minWidth:180 }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
        style={{ background:'#1BA8D5' }}>{ext}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: mine?'#fff':'#111b21' }}>{name}</p>
        <p className="text-[10px]" style={{ color: mine?'rgba(255,255,255,0.6)':'#667781' }}>Tap to download</p>
      </div>
    </a>
  );
}

// ── Location card ─────────────────────────────────────────────────
function LocCard({ lat, lng, mine }: { lat: number; lng: number; mine: boolean }) {
  const mapsUrl = `https://maps.google.com/maps?q=${lat},${lng}`;
  return (
    <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl no-underline"
      style={{ background: mine ? 'rgba(255,255,255,0.15)' : '#0AC47218', minWidth:200 }}>
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xl flex-shrink-0"
        style={{ background:'#0AC472' }}>📍</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold" style={{ color: mine?'#fff':'#111b21' }}>Location shared</p>
        <p className="text-[10px] font-mono" style={{ color: mine?'rgba(255,255,255,0.6)':'#667781' }}>
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
        <p className="text-[10px]" style={{ color: mine?'rgba(255,255,255,0.5)':'#128C7E' }}>Tap to open in Maps</p>
      </div>
    </a>
  );
}

// ════════════════════════════════════════════════════════════════
export default function Community() {
  const { user, isAdmin } = useAuth();
  const { isDark } = useTheme();
  const [posts, setPosts]           = useState<Post[]>([]);
  const [selected, setSelected]     = useState<PostDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [cat, setCat]               = useState('All');
  const [msgText, setMsgText]       = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recording, setRecording]   = useState(false);
  const [recSecs, setRecSecs]       = useState(0);
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [newPost, setNewPost]       = useState({ title:'', body:'', category:'general' });
  const [readPosts, setReadPosts]   = useState<Set<string>>(new Set());
  const [locLoading, setLocLoading] = useState(false);
  const [sendError, setSendError]   = useState('');
  const [attachError, setAttachError] = useState('');

  // Admin
  const [createChOpen, setCreateChOpen] = useState(false);
  const [newCh, setNewCh]               = useState({ name: '', emoji: '💬', description: '' });
  const [manageOpen, setManageOpen]     = useState(false);

  const endRef    = useRef<HTMLDivElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);
  const camRef    = useRef<HTMLInputElement>(null);
  const docRef    = useRef<HTMLInputElement>(null);
  const mrRef     = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const bg      = isDark ? '#0b141a' : '#efeae2';
  const header  = isDark ? '#202c33' : '#128C7E';
  const bubble  = { me: isDark ? '#005c4b' : '#dcf8c6', them: isDark ? '#202c33' : '#ffffff' };
  const panelBg = isDark ? '#111b21' : '#ffffff';
  const inputBg = isDark ? '#202c33' : '#ffffff';
  const textCol = isDark ? '#e9edef' : '#111b21';
  const mutedCol= isDark ? '#8696a0' : '#667781';
  const divider = isDark ? '#313d44' : '#e0e0e0';

  const load = useCallback(() => {
    getCommunityPosts().then(d => { setPosts(d as Post[]); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (selected) endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [selected]);

  // Sync readPosts with localStorage whenever posts list updates
  useEffect(() => {
    if (posts.length === 0) return;
    const stored = getStored();
    setReadPosts(new Set(posts.filter(p => (stored[p.post_id] ?? -1) >= p.reply_count).map(p => p.post_id)));
  }, [posts]);

  const openPost = useCallback(async (id: string) => {
    try {
      const d = await getCommunityPost(id);
      const detail = d as PostDetail;
      setSelected(detail);
      setReadPosts(prev => { const s = new Set(prev); s.add(id); return s; });
      markRead(id, detail.reply_count);
    } catch (err) {
      console.error('Failed to open post:', err);
    }
  }, []);

  // ── Send ──────────────────────────────────────────────────────
  const handleSend = async () => {
    if ((!msgText.trim() && !pendingMedia) || !selected || submitting) return;
    // Mute check — user has been removed from this channel by admin
    if (selected.muted_users?.includes(user?.id || '')) {
      setSendError('You have been removed from this group by the admin.');
      return;
    }
    setSubmitting(true);
    setSendError('');
    try {
      const pm = pendingMedia;
      const bodyMap: Record<MediaType, string> = {
        image: '📷 Photo', audio: '🎙️ Voice message',
        document: `📄 ${pm?.name || 'Document'}`, location: '📍 Location',
      };
      const txt = msgText.trim() || (pm ? bodyMap[pm.type] : '');
      // Pass title + authorId so addReply doesn't need to pre-fetch the post
      await addReply(selected.post_id, txt, pm?.url, pm?.type, user?.avatar_url, pm?.name, selected.title, selected.user_id);
      setMsgText(''); setPendingMedia(null);
      await openPost(selected.post_id);
    } catch (err: any) {
      setSendError(navigator.onLine ? 'Failed to send. Please try again.' : 'No internet — message will send when back online.');
      console.error('Send failed:', err);
    } finally { setSubmitting(false); }
  };

  // ── Image / Camera ────────────────────────────────────────────
  const handleImgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setShowAttach(false);
    try { setPendingMedia({ url: await compressImg(file), type:'image' }); } catch {/**/}
    if (e.target) e.target.value = '';
  };

  // ── Document ──────────────────────────────────────────────────
  const handleDocFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setShowAttach(false);
    if (file.size > 450 * 1024) {
      setAttachError('File too large. Max 450 KB for documents.');
      if (e.target) e.target.value = ''; return;
    }
    setAttachError('');
    try { setPendingMedia({ url: await fileToDataUrl(file), type:'document', name: file.name }); } catch {/**/}
    if (e.target) e.target.value = '';
  };

  // ── Location ──────────────────────────────────────────────────
  const handleLocation = () => {
    setShowAttach(false);
    if (!navigator.geolocation) { setAttachError('Location not supported on this device.'); return; }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocLoading(false);
        setAttachError('');
        const { latitude: lat, longitude: lng } = pos.coords;
        setPendingMedia({ url: JSON.stringify({ lat, lng }), type:'location' });
      },
      () => { setLocLoading(false); setAttachError('Could not get location. Check that location permission is allowed for this app.'); }
    );
  };

  // ── Voice recording ───────────────────────────────────────────
  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mr = new MediaRecorder(stream, { mimeType:mime });
      mrRef.current = mr; chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(200); setRecording(true); setRecSecs(0);
      timerRef.current = setInterval(() => setRecSecs(s => { if (s >= 59) { stopRec(true); return 59; } return s+1; }), 1000);
    } catch {/**/}
  };
  const stopRec = (send: boolean) => {
    clearInterval(timerRef.current!); setRecording(false); setRecSecs(0);
    const mr = mrRef.current; if (!mr) return;
    mr.stream.getTracks().forEach(t => t.stop());
    if (!send) { mr.stop(); return; }
    mr.onstop = async () => {
      const mime = chunksRef.current[0]?.type || 'audio/webm';
      try { setPendingMedia({ url: await blobToDataUrl(new Blob(chunksRef.current, { type:mime })), type:'audio' }); } catch {/**/}
    };
    mr.stop();
  };

  // ── New post ──────────────────────────────────────────────────
  const handleNewPost = async (e: React.FormEvent) => {
    e.preventDefault(); if (submitting) return; setSubmitting(true);
    try {
      await createCommunityPost({ ...newPost, authorAvatar: user?.avatar_url });
      setNewPostOpen(false); setNewPost({ title:'', body:'', category:'general' }); load();
    } finally { setSubmitting(false); }
  };

  // ── Admin handlers ─────────────────────────────────────────
  const handleDeleteMsg = async (replyId: string, isRoot: boolean) => {
    if (!selected) return;
    if (!window.confirm('Delete this message?')) return;
    try {
      if (isRoot) { await deletePost(selected.post_id); setSelected(null); load(); }
      else { await deleteReply(selected.post_id, replyId); await openPost(selected.post_id); }
    } catch { /* silent */ }
  };

  const handleMuteUser = async (userId: string, userName: string) => {
    if (!selected?.is_channel) return;
    if (!window.confirm(`Remove ${userName} from this group? They will no longer be able to reply.`)) return;
    await muteUserInChannel(selected.post_id, userId);
    await openPost(selected.post_id);
  };

  const handleUnmute = async (userId: string) => {
    if (!selected) return;
    await unmuteUserInChannel(selected.post_id, userId);
    await openPost(selected.post_id);
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await createChannel(newCh.name.trim(), newCh.emoji, newCh.description.trim());
      setCreateChOpen(false);
      setNewCh({ name: '', emoji: '💬', description: '' });
      load();
    } finally { setSubmitting(false); }
  };

  const channels = posts.filter(p => p.is_channel);
  const filtered = (cat === 'All' ? posts : posts.filter(p => p.category === cat)).filter(p => !p.is_channel);

  // Flat message list: root post + replies
  const messages: (Reply & { isRoot?: boolean })[] = selected ? [
    {
      reply_id:    `${selected.post_id}__root`,
      body:        selected.body,
      image_url:   selected.image_url || null,
      audio_url:   null,
      document_url: null, document_name: null, location: null,
      created_at:  selected.created_at,
      author_name: selected.author_name,
      author_avatar: selected.author_avatar || null,
      user_id:     selected.user_id,
      isRoot:      true,
    },
    ...selected.replies,
  ] : [];

  const isMine = (uid: string) => uid === user?.id;

  // ════════════════════════════════════════════════════════════════
  return (
    <>
      {/* ── New Discussion modal ───────────────────────────────── */}
      {newPostOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: isDark ? '#202c33' : '#fff' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ background:'#128C7E' }}>
              <span className="text-white font-semibold">New Discussion</span>
              <button onClick={() => setNewPostOpen(false)} className="text-white text-xl">✕</button>
            </div>
            <form onSubmit={handleNewPost} className="p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {CATS.filter(c => c !== 'All').map(c => (
                  <button key={c} type="button" onClick={() => setNewPost(f => ({ ...f, category:c }))}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{ background: newPost.category===c ? CAT_COLOR[c] : (isDark?'#2a3942':'#f0f2f5'), color: newPost.category===c?'#fff':mutedCol }}>
                    {CAT_ICON[c]} {c}
                  </button>
                ))}
              </div>
              <input className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: isDark?'#2a3942':'#f0f2f5', color:textCol }}
                placeholder="Topic title" value={newPost.title}
                onChange={e => setNewPost(f => ({ ...f, title:e.target.value }))} required />
              <textarea className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ background: isDark?'#2a3942':'#f0f2f5', color:textCol }}
                placeholder="What's on your mind?" rows={4} value={newPost.body}
                onChange={e => setNewPost(f => ({ ...f, body:e.target.value }))} required />
              <button type="submit" disabled={submitting}
                className="w-full py-2.5 rounded-full text-white font-semibold text-sm disabled:opacity-60"
                style={{ background:'#128C7E' }}>
                {submitting ? 'Sharing…' : 'Share with Community'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Create Channel modal (admin) ──────────────────────── */}
      {createChOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ background: isDark ? '#202c33' : '#fff' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ background:'#075E54' }}>
              <span className="text-white font-semibold">Create Group</span>
              <button onClick={() => setCreateChOpen(false)} className="text-white text-xl">✕</button>
            </div>
            <form onSubmit={handleCreateChannel} className="p-4 space-y-3">
              <div className="flex gap-2">
                {['💬','🌾','🦠','🌦','💰','🔧','🌱','👨‍🌾','📢'].map(e => (
                  <button key={e} type="button" onClick={() => setNewCh(f => ({ ...f, emoji: e }))}
                    className={`text-xl w-9 h-9 rounded-full transition-all ${newCh.emoji === e ? 'bg-forest scale-110' : (isDark ? 'bg-night-card' : 'bg-sand')}`}>
                    {e}
                  </button>
                ))}
              </div>
              <input className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: isDark?'#2a3942':'#f0f2f5', color: isDark?'#e9edef':'#111b21' }}
                placeholder="Group name (e.g. Maize Farmers KZN)" value={newCh.name}
                onChange={e => setNewCh(f => ({ ...f, name: e.target.value }))} required maxLength={60} />
              <textarea className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ background: isDark?'#2a3942':'#f0f2f5', color: isDark?'#e9edef':'#111b21' }}
                placeholder="Group description" rows={3} value={newCh.description}
                onChange={e => setNewCh(f => ({ ...f, description: e.target.value }))} maxLength={200} />
              <button type="submit" disabled={submitting || !newCh.name.trim()}
                className="w-full py-2.5 rounded-full text-white font-semibold text-sm disabled:opacity-60"
                style={{ background:'#075E54' }}>
                {submitting ? 'Creating…' : 'Create Group'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Manage Group modal (admin) ─────────────────────────── */}
      {manageOpen && selected?.is_channel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl" style={{ background: isDark ? '#202c33' : '#fff' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ background:'#075E54' }}>
              <span className="text-white font-semibold">{selected.channel_emoji || '💬'} {selected.title}</span>
              <button onClick={() => setManageOpen(false)} className="text-white text-xl">✕</button>
            </div>
            <div className="p-4">
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: isDark?'#8696a0':'#667781' }}>
                Muted Members ({selected.muted_users?.length || 0})
              </p>
              {(selected.muted_users?.length || 0) === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: isDark?'#8696a0':'#667781' }}>No muted members</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {selected.muted_users?.map(uid => (
                    <div key={uid} className="flex items-center justify-between px-3 py-2 rounded-xl"
                      style={{ background: isDark?'#2a3942':'#f0f2f5' }}>
                      <span className="text-sm" style={{ color: isDark?'#e9edef':'#111b21' }}>User {uid.slice(0,8)}…</span>
                      <button onClick={() => handleUnmute(uid)}
                        className="text-xs px-3 py-1 rounded-full text-white" style={{ background:'#25D366' }}>
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={async () => { if (window.confirm('Delete this group and all its messages?')) { await deletePost(selected.post_id); setSelected(null); setManageOpen(false); load(); } }}
                className="w-full py-2 rounded-xl text-white text-sm font-semibold" style={{ background:'#e53935' }}>
                🗑️ Delete Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main two-panel layout ─────────────────────────────── */}
      <div className="flex overflow-hidden flex-1 min-h-0">

        {/* ═══ LEFT: Conversation list ════════════════════════════ */}
        <div className={`flex flex-col flex-shrink-0 min-h-0 border-r ${selected ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96`}
          style={{ borderColor:divider, background:panelBg }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background:header }}>
            <div className="flex items-center gap-3">
              <UserAvatar name={user?.name||'?'} url={user?.avatar_url} size={38} />
              <span className="text-white font-bold text-base">Community</span>
            </div>
            <div className="flex items-center gap-1">
              {isAdmin && (
                <button onClick={() => setCreateChOpen(true)} title="Create Group"
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white font-bold text-lg">
                  +
                </button>
              )}
              <button onClick={() => setNewPostOpen(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10">
                <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                  <path d="M20.71 7.04c.39-.39.39-1.04 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75M3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25z"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Category chips */}
          <div className="flex gap-1.5 px-3 py-2 overflow-x-auto flex-shrink-0"
            style={{ background: isDark?'#1d2b32':'#f0f2f5', borderBottom:`1px solid ${divider}` }}>
            {CATS.map(c => (
              <button key={c} onClick={() => setCat(c)}
                className="px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 transition-all"
                style={{ background: cat===c?'#128C7E':(isDark?'#2a3942':'#fff'), color: cat===c?'#fff':mutedCol, border:`1px solid ${cat===c?'#128C7E':divider}` }}>
                {c === 'All' ? 'All' : `${CAT_ICON[c]} ${c}`}
              </button>
            ))}
          </div>

          {/* ── Admin Groups ── */}
          {channels.length > 0 && (
            <div style={{ borderBottom: `1px solid ${divider}` }}>
              <p className="px-4 pt-2 pb-1 text-[10px] uppercase font-bold tracking-widest" style={{ color: mutedCol }}>Groups</p>
              {channels.map(ch => (
                <button key={ch.post_id} onClick={() => openPost(ch.post_id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/5"
                  style={{ background: selected?.post_id === ch.post_id ? (isDark?'rgba(255,255,255,0.04)':'#f5f5f5') : 'transparent' }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: '#075E54' }}>
                    {ch.channel_emoji || '💬'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm truncate" style={{ color: textCol }}>{ch.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-bold" style={{ background:'#075E54' }}>GROUP</span>
                    </div>
                    <span className="text-xs truncate block" style={{ color: mutedCol }}>{ch.reply_count} messages</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-sm animate-pulse" style={{ color:mutedCol }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <span className="text-5xl">💬</span>
                <p className="text-sm" style={{ color:mutedCol }}>No discussions yet</p>
                <button onClick={() => setNewPostOpen(true)} className="px-5 py-2 rounded-full text-white text-sm" style={{ background:'#128C7E' }}>Start one</button>
              </div>
            ) : (
              filtered.map(p => {
                const stored = getStored();
                const newCount = Math.max(0, p.reply_count - (stored[p.post_id] ?? 0));
                const unread = newCount > 0 && !readPosts.has(p.post_id);
                return (
                  <button key={p.post_id} onClick={() => openPost(p.post_id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/5"
                    style={{ borderBottom:`1px solid ${isDark?'#1f2c33':'#f0f0f0'}`, background: selected?.post_id===p.post_id?(isDark?'rgba(255,255,255,0.04)':'#f5f5f5'):'transparent' }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: CAT_COLOR[p.category]||'#128C7E' }}>
                      {CAT_ICON[p.category]||'💬'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm truncate" style={{ color: unread ? textCol : mutedCol, fontWeight: unread ? 700 : 500 }}>{p.title}</span>
                        <span className="text-xs flex-shrink-0 ml-1" style={{ color: unread ? '#25D366' : mutedCol }}>{msgTime(p.created_at)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs truncate" style={{ color:mutedCol }}>{p.author_name}: {p.body}</span>
                        {unread && (
                          <span className="ml-2 flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-white font-bold"
                            style={{ fontSize:10, background:'#25D366' }}>
                            {newCount > 99 ? '99+' : newCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ═══ RIGHT: Chat view ════════════════════════════════════ */}
        <div className={`flex-1 flex-col min-h-0 ${selected ? 'flex' : 'hidden md:flex'}`}>
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 h-full"
              style={{ background: isDark?'#222e35':'#f0f2f5' }}>
              <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl" style={{ background:'#128C7E18' }}>💬</div>
              <p className="font-semibold text-lg" style={{ color:textCol }}>Farmer Community</p>
              <p className="text-sm" style={{ color:mutedCol }}>Select a discussion to open the chat</p>
              <button onClick={() => setNewPostOpen(true)} className="mt-2 px-6 py-2.5 rounded-full text-white font-medium text-sm" style={{ background:'#128C7E' }}>+ New Discussion</button>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">

              {/* Chat header */}
              <div className="flex items-center gap-3 px-3 py-2.5 flex-shrink-0" style={{ background:header }}>
                <button className="md:hidden text-white mr-1 text-xl" onClick={() => setSelected(null)}>←</button>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: CAT_COLOR[selected.category]||'#075E54' }}>
                  {CAT_ICON[selected.category]||'💬'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{selected.title}</p>
                  <p className="text-white/65 text-xs">{selected.author_name} · {selected.reply_count} replies</p>
                </div>
                {isAdmin && selected.is_channel && (
                  <button onClick={() => setManageOpen(true)} title="Manage Group"
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/80 text-lg">
                    ⚙️
                  </button>
                )}
                <button onClick={() => likePost(selected.post_id).then(load)}
                  className="flex items-center gap-1 px-3 py-1 rounded-full hover:bg-white/10 text-white/80 text-sm">
                  ❤️ {selected.likes}
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 space-y-0.5"
                style={{ background:bg, backgroundImage: isDark?'none':`url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23bbb' fill-opacity='0.08'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10S0 25.523 0 20s4.477-10 10-10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}>
                {messages.map((msg, idx) => {
                  const mine       = isMine(msg.user_id);
                  const prev       = messages[idx-1];
                  const showDate   = idx === 0 || !sameDay(msg.created_at, prev.created_at);
                  const grpBreak   = showDate || prev?.author_name !== msg.author_name;
                  const showAvatar = !mine && grpBreak;
                  const showName   = !mine && grpBreak;
                  const bubbleBg   = mine ? bubble.me : bubble.them;
                  const timeColor  = mine ? (isDark?'rgba(255,255,255,0.55)':'#6c9b7c') : mutedCol;
                  const loc        = msg.location as { lat:number; lng:number } | null | undefined;

                  return (
                    <React.Fragment key={msg.reply_id}>
                      {showDate && (
                        <div className="flex justify-center my-4">
                          <span className="px-3 py-1 rounded-full text-xs font-medium shadow-sm"
                            style={{ background: isDark?'#182229':'rgba(255,255,255,0.85)', color:mutedCol }}>
                            {dateSep(msg.created_at)}
                          </span>
                        </div>
                      )}
                      {!showDate && grpBreak && <div className="h-2"/>}

                      <div className={`flex items-end gap-1.5 ${mine?'justify-end':'justify-start'} ${grpBreak?'mt-1':'mt-0.5'}`}>
                        {!mine && (
                          <div className="w-7 flex-shrink-0 self-end mb-0.5">
                            {showAvatar
                              ? <UserAvatar name={msg.author_name} url={msg.author_avatar} size={28}/>
                              : <div style={{ width:28 }}/>
                            }
                          </div>
                        )}
                        <div className={`flex flex-col ${mine?'items-end':'items-start'} max-w-[72%] md:max-w-[58%] group/msg`}>
                          {showName && (
                            <span className="text-xs font-semibold px-1 mb-0.5" style={{ color:nameColor(msg.author_name) }}>
                              {msg.author_name}
                            </span>
                          )}
                          <div className="relative px-3 pt-2 pb-1.5 shadow-sm"
                            style={{ background:bubbleBg, borderRadius: mine?(grpBreak?'16px 4px 16px 16px':'16px 16px 4px 16px'):(grpBreak?'4px 16px 16px 16px':'16px 16px 16px 4px') }}>

                            {/* Image */}
                            {msg.image_url && (
                              <img src={msg.image_url} alt="Photo" className="rounded-xl mb-1.5 block cursor-pointer"
                                style={{ maxWidth:'100%', maxHeight:240, objectFit:'cover' }}
                                onClick={() => window.open(msg.image_url!, '_blank')}/>
                            )}
                            {/* Voice */}
                            {msg.audio_url && <div className="mb-1"><VoiceMsg src={msg.audio_url} mine={mine}/></div>}
                            {/* Document */}
                            {msg.document_url && <div className="mb-1"><DocCard url={msg.document_url} name={msg.document_name||'Document'} mine={mine}/></div>}
                            {/* Location */}
                            {loc && <div className="mb-1"><LocCard lat={loc.lat} lng={loc.lng} mine={mine}/></div>}
                            {/* Text */}
                            {msg.body &&
                              !(msg.body==='📷 Photo' && msg.image_url) &&
                              !(msg.body==='🎙️ Voice message' && msg.audio_url) &&
                              !(msg.body.startsWith('📄') && msg.document_url) &&
                              !(msg.body==='📍 Location' && loc) && (
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: isDark?'#e9edef':'#111b21' }}>
                                {msg.body}
                              </p>
                            )}
                            {/* Timestamp + admin/owner delete */}
                            <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5">
                              <span style={{ fontSize:10, color:timeColor }}>{msgTime(msg.created_at)}</span>
                              {mine && <span style={{ fontSize:12, color: isDark?'#53bdeb':'#4fc3f7' }}>✓✓</span>}
                              {(isAdmin || mine) && (
                                <button onClick={() => handleDeleteMsg(msg.reply_id, !!msg.isRoot)}
                                  className="ml-1 opacity-0 group-hover/msg:opacity-100 transition-opacity text-[10px] leading-none"
                                  style={{ color: isDark?'rgba(255,255,255,0.4)':'rgba(0,0,0,0.3)' }} title="Delete">
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                          {/* Admin: remove user from channel (non-own messages in channels) */}
                          {isAdmin && !mine && selected?.is_channel && (
                            <button onClick={() => handleMuteUser(msg.user_id, msg.author_name)}
                              className="opacity-0 group-hover/msg:opacity-100 transition-opacity text-[10px] mt-0.5 px-1.5 py-0.5 rounded"
                              style={{ color:'#e53935', background:'rgba(229,57,53,0.08)' }}>
                              Remove from group
                            </button>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={endRef} className="h-2"/>
              </div>

              {/* Pending media preview */}
              {pendingMedia && (
                <div className="px-4 py-2 flex-shrink-0 flex items-center gap-3 border-t"
                  style={{ background: isDark?'#1d2b32':'#fff', borderColor:divider }}>
                  {pendingMedia.type === 'image' && (
                    <img src={pendingMedia.url} alt="Preview" className="w-16 h-16 rounded-xl object-cover flex-shrink-0"/>
                  )}
                  {pendingMedia.type === 'audio' && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: isDark?'#2a3942':'#f0f2f5' }}>
                      <span className="text-lg">🎙️</span><span className="text-xs" style={{ color:'#128C7E' }}>Voice message ready</span>
                    </div>
                  )}
                  {pendingMedia.type === 'document' && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: isDark?'#2a3942':'#f0f2f5' }}>
                      <span className="text-lg">📄</span><span className="text-xs truncate max-w-48" style={{ color:'#1BA8D5' }}>{pendingMedia.name}</span>
                    </div>
                  )}
                  {pendingMedia.type === 'location' && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: isDark?'#2a3942':'#f0f2f5' }}>
                      <span className="text-lg">📍</span><span className="text-xs" style={{ color:'#0AC472' }}>Location ready to share</span>
                    </div>
                  )}
                  <button onClick={() => setPendingMedia(null)} className="ml-auto w-7 h-7 rounded-full flex items-center justify-center text-sm"
                    style={{ background:'#ff000020', color:'#e53935' }}>✕</button>
                </div>
              )}

              {/* Attachment panel */}
              {showAttach && (
                <div className="px-4 pt-3 pb-4 flex-shrink-0 border-t"
                  style={{ background: isDark?'#1d2b32':'#f0f2f5', borderColor:divider }}>
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { icon:'🖼️', label:'Photos',   bg:'#7C60DF', action:() => { fileRef.current?.click(); setShowAttach(false); } },
                      { icon:'📷', label:'Camera',   bg:'#FF6B6B', action:() => { camRef.current?.click();  setShowAttach(false); } },
                      { icon:'📄', label:'Document', bg:'#1BA8D5', action:() => { docRef.current?.click();  setShowAttach(false); } },
                      { icon:'📍', label:'Location', bg:'#0AC472', action: handleLocation },
                    ].map(item => (
                      <button key={item.label} onClick={item.action}
                        className={`flex flex-col items-center gap-1.5 ${item.label==='Location'&&locLoading?'opacity-60':''}`}
                        disabled={item.label==='Location'&&locLoading}>
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl text-white shadow-sm"
                          style={{ background:item.bg }}>
                          {item.label==='Location'&&locLoading ? <span className="animate-spin text-sm">⏳</span> : item.icon}
                        </div>
                        <span className="text-xs" style={{ color:mutedCol }}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Attach error */}
              {attachError && (
                <div className="px-4 py-1.5 flex-shrink-0 text-center text-xs flex items-center justify-between gap-2" style={{ background:'#ff000015', color:'#e53935' }}>
                  <span>{attachError}</span>
                  <button onClick={() => setAttachError('')} className="text-xs opacity-70">✕</button>
                </div>
              )}

              {/* Send error */}
              {sendError && (
                <div className="px-4 py-1.5 flex-shrink-0 text-center text-xs" style={{ background:'#ff000015', color:'#e53935' }}>
                  {sendError}
                </div>
              )}

              {/* Muted warning */}
              {selected.muted_users?.includes(user?.id || '') && (
                <div className="px-4 py-3 flex-shrink-0 text-center text-sm font-medium" style={{ background:'#ff000015', color:'#e53935' }}>
                  🚫 You have been removed from this group by the admin
                </div>
              )}

              {/* Input bar */}
              <div className="flex items-end gap-2 px-2 py-2 flex-shrink-0" style={{ background: isDark?'#0b141a':'#f0f2f5' }}>
                {!recording && (
                  <button onClick={() => setShowAttach(s => !s)}
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xl"
                    style={{ background:inputBg, color: showAttach?'#128C7E':mutedCol }}>
                    📎
                  </button>
                )}
                {recording ? (
                  <div className="flex-1 flex items-center gap-3 h-10 px-4 rounded-full" style={{ background:inputBg }}>
                    <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse"/>
                    <span className="font-mono text-sm" style={{ color:'#e53935' }}>
                      {String(Math.floor(recSecs/60)).padStart(2,'0')}:{String(recSecs%60).padStart(2,'0')}
                    </span>
                    <span className="flex-1 text-xs" style={{ color:mutedCol }}>Recording…</span>
                    <button onClick={() => stopRec(false)} className="text-xs" style={{ color:mutedCol }}>✕ Cancel</button>
                  </div>
                ) : (
                  <div className="flex-1 flex items-end rounded-3xl overflow-hidden min-h-[40px]" style={{ background:inputBg }}>
                    <textarea rows={1} className="flex-1 px-4 py-2.5 text-sm bg-transparent outline-none resize-none"
                      style={{ color:textCol, maxHeight:120 }} placeholder="Type a message"
                      value={msgText} onChange={e => setMsgText(e.target.value)}
                      onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); handleSend(); } }}/>
                  </div>
                )}
                <button disabled={submitting || selected.muted_users?.includes(user?.id || '')}
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-white shadow-md active:scale-95 disabled:opacity-50"
                  style={{ background:'#128C7E' }}
                  onClick={() => { if (recording){stopRec(true);return;} if(msgText.trim()||pendingMedia){handleSend();return;} startRec(); }}>
                  {recording
                    ? <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                    : msgText.trim()||pendingMedia
                      ? <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                      : <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                  }
                </button>
              </div>

              {/* Hidden inputs */}
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleImgFile}/>
              <input ref={camRef}  type="file" accept="image/*" capture="environment" className="sr-only" onChange={handleImgFile}/>
              <input ref={docRef}  type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" className="sr-only" onChange={handleDocFile}/>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
