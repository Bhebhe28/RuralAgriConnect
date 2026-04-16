import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDate, timeAgo } from '../utils';

interface Post {
  post_id: string;
  title: string;
  body: string;
  category: string;
  image_url?: string;
  likes: number;
  created_at: string;
  author_name: string;
  author_avatar?: string;
  reply_count: number;
}

interface Reply {
  reply_id: string;
  body: string;
  image_url?: string;
  created_at: string;
  author_name: string;
  author_avatar?: string;
}

interface PostDetail extends Post { replies: Reply[]; }

const CATEGORIES = ['All', 'general', 'disease', 'weather', 'market', 'equipment', 'soil'];
const CAT_ICONS: Record<string, string> = {
  general: '💬', disease: '🦠', weather: '🌦', market: '💰', equipment: '🔧', soil: '🌱'
};

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts]         = useState<Post[]>([]);
  const [selected, setSelected]   = useState<PostDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [catFilter, setCatFilter] = useState('All');
  const [showForm, setShowForm]   = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [form, setForm] = useState({ title: '', body: '', category: 'general' });
  const [postImage, setPostImage] = useState<File | null>(null);
  const [saved, setSaved] = useState('');

  const load = () => api.get('/community').then(r => { setPosts(r.data); setLoading(false); }).catch(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openPost = async (id: string) => {
    const r = await api.get(`/community/${id}`);
    setSelected(r.data);
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('body', form.body);
      formData.append('category', form.category);
      if (postImage) {
        formData.append('image', postImage);
      }

      await api.post('/community', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setShowForm(false);
      setForm({ title: '', body: '', category: 'general' });
      setPostImage(null);
      setSaved('✅ Post shared with the community!');
      load();
      setTimeout(() => setSaved(''), 3000);
    } catch {}
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selected) return;
    
    const formData = new FormData();
    formData.append('body', replyText);
    if (replyImage) {
      formData.append('image', replyImage);
    }

    await api.post(`/community/${selected.post_id}/replies`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    setReplyText('');
    setReplyImage(null);
    openPost(selected.post_id);
  };

  const handleLike = async (id: string) => {
    await api.post(`/community/${id}/like`);
    load();
    if (selected?.post_id === id) openPost(id);
  };

  const filtered = catFilter === 'All' ? posts : posts.filter(p => p.category === catFilter);

  if (selected) {
    return (
      <div className="p-4 md:p-7 animate-fade-in">
        <button onClick={() => setSelected(null)} className="btn-outline mb-5 text-sm">← Back to Forum</button>
        <div className="card max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{CAT_ICONS[selected.category] || '💬'}</span>
            <span className="badge badge-blue capitalize">{selected.category}</span>
          </div>
          <h2 className="font-serif text-xl mb-2">{selected.title}</h2>
          <div className="flex gap-3 text-xs text-muted mb-4">
            <div className="flex items-center gap-1">
              {selected.author_avatar ? (
                <img 
                  src={`${selected.author_avatar}`}
                  alt={selected.author_name}
                  className="w-4 h-4 rounded-full object-cover"
                />
              ) : (
                <span>👤</span>
              )}
              <span>{selected.author_name}</span>
            </div>
            <span>🕐 {formatDate(selected.created_at)}</span>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap mb-3">{selected.body}</p>
          {selected.image_url && (
            <div className="mb-5">
              <img 
                src={`${selected.image_url}`}
                alt="Post image"
                className="max-w-full h-auto rounded-lg shadow-sm"
              />
            </div>
          )}
          <div className="flex items-center gap-3 pb-5 border-b border-sand">
            <button onClick={() => handleLike(selected.post_id)}
              className="flex items-center gap-1.5 text-sm text-muted hover:text-forest transition-colors bg-transparent border-0 cursor-pointer">
              ❤️ {selected.likes} likes
            </button>
            <span className="text-muted text-sm">💬 {selected.replies.length} replies</span>
          </div>

          {/* Replies */}
          <div className="mt-4 space-y-4">
            {selected.replies.map(r => (
              <div key={r.reply_id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-moss/20 flex items-center justify-center text-sm flex-shrink-0 font-bold text-forest overflow-hidden">
                  {r.author_avatar ? (
                    <img 
                      src={`${r.author_avatar}`}
                      alt={r.author_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    r.author_name.charAt(0)
                  )}
                </div>
                <div className="flex-1 bg-cream rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-forest mb-1">{r.author_name}</p>
                  <p className="text-sm leading-relaxed mb-2">{r.body}</p>
                  {r.image_url && (
                    <div className="mb-2">
                      <img 
                        src={`${r.image_url}`}
                        alt="Reply image"
                        className="max-w-full h-auto rounded-lg shadow-sm max-h-48 object-cover"
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted">{timeAgo(r.created_at)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Reply input */}
          <div className="mt-5">
            <div className="flex gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-forest flex items-center justify-center text-white text-sm flex-shrink-0 font-bold overflow-hidden">
                {user?.avatar_url ? (
                  <img 
                    src={`${user.avatar_url}`}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user?.name?.charAt(0)
                )}
              </div>
              <div className="flex-1">
                <textarea 
                  className="input resize-none w-full" 
                  rows={2}
                  placeholder="Write a reply…"
                  value={replyText} 
                  onChange={e => setReplyText(e.target.value)}
                />
              </div>
            </div>
            
            {replyImage && (
              <div className="mb-2 ml-10">
                <div className="relative inline-block">
                  <img 
                    src={URL.createObjectURL(replyImage)}
                    alt="Reply preview"
                    className="max-w-32 h-auto rounded-lg shadow-sm"
                  />
                  <button 
                    onClick={() => setReplyImage(null)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex gap-2 ml-10">
              <label className="btn-outline px-3 py-2 cursor-pointer text-sm">
                📷 Photo
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => setReplyImage(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              <button 
                onClick={handleReply} 
                disabled={!replyText.trim()} 
                className="btn-primary px-4 py-2 disabled:opacity-50 text-sm"
              >
                Reply
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-7 animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-serif">💬 Farmer Community</h2>
          <p className="text-sm text-muted mt-0.5">Ask questions, share experiences, help each other</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="btn-primary">
          {showForm ? '✕ Cancel' : '+ New Post'}
        </button>
      </div>

      {saved && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 mb-5 text-sm">{saved}</div>}

      {showForm && (
        <div className="card animate-scale-in mb-6">
          <h3 className="font-serif text-lg mb-4">📝 Share with the Community</h3>
          <form onSubmit={handlePost} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.filter(c => c !== 'All').map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({ ...f, category: c }))}
                    className={`px-3 py-1.5 rounded-xl text-sm border-2 transition-all cursor-pointer ${
                      form.category === c ? 'bg-forest text-white border-forest' : 'bg-white border-sand text-muted hover:border-moss'
                    }`}>
                    {CAT_ICONS[c]} {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Title</label>
              <input className="input" placeholder="What's your question or topic?" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Details</label>
              <textarea className="input resize-none" rows={4}
                placeholder="Describe your situation, question, or experience in detail…"
                value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} required />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Photo (Optional)</label>
              <div className="flex items-center gap-3">
                <label className="btn-outline cursor-pointer">
                  📷 Choose Photo
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={e => setPostImage(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                {postImage && (
                  <div className="relative">
                    <img 
                      src={URL.createObjectURL(postImage)}
                      alt="Post preview"
                      className="w-16 h-16 object-cover rounded-lg shadow-sm"
                    />
                    <button 
                      onClick={() => setPostImage(null)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
            <button type="submit" className="btn-primary w-full py-3">Share Post</button>
          </form>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all cursor-pointer flex-shrink-0 ${
              catFilter === c ? 'bg-forest text-white border-forest' : 'bg-white border-sand text-muted hover:border-moss'
            }`}>
            {c === 'All' ? '🌐 All' : `${CAT_ICONS[c]} ${c}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card text-center py-12 text-muted">Loading posts…</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">💬</p>
          <p className="text-muted">No posts yet. Be the first to share!</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4">Start a Discussion</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <div key={p.post_id} onClick={() => openPost(p.post_id)}
              className="card mb-0 cursor-pointer hover:-translate-y-0.5 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-forest flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                  {p.author_avatar ? (
                    <img 
                      src={`${p.author_avatar}`}
                      alt={p.author_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    p.author_name.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-bold text-muted">{CAT_ICONS[p.category] || '💬'}</span>
                    <span className="badge badge-blue capitalize text-xs">{p.category}</span>
                  </div>
                  <h3 className="font-semibold text-dark text-sm leading-snug mb-1">{p.title}</h3>
                  <p className="text-xs text-muted line-clamp-2 mb-2">{p.body}</p>
                  {p.image_url && (
                    <div className="mb-2">
                      <img 
                        src={`${p.image_url}`}
                        alt="Post image"
                        className="w-20 h-16 object-cover rounded-lg shadow-sm"
                      />
                    </div>
                  )}
                  <div className="flex gap-4 mt-2 text-xs text-muted">
                    <span>👤 {p.author_name}</span>
                    <span>❤️ {p.likes}</span>
                    <span>💬 {p.reply_count} replies</span>
                    <span>🕐 {timeAgo(p.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
