import React, { useState, useRef, useEffect } from 'react';
import api from '../api/client';
import { useLanguage } from '../context/LanguageContext';

interface Message {
  role: 'user' | 'bot';
  text: string;
  image?: string; // base64 preview
}

interface GeminiHistory {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export default function Chatbot() {
  const { t } = useLanguage();
  const SUGGESTIONS = [
    t.chatSuggestion1,
    t.chatSuggestion2,
    t.chatSuggestion3,
    t.chatSuggestion4,
  ];
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: t.chatGreeting },
  ]);
  const [history, setHistory] = useState<GeminiHistory[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const sendImage = async () => {
    if (!imageFile || typing) return;
    const preview = imagePreview!;
    const prompt = input.trim() || 'Analyze this image. What disease, pest, or issue do you see? What should I do?';

    setMessages(prev => [...prev, { role: 'user', text: prompt, image: preview }]);
    setInput('');
    clearImage();
    setTyping(true);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('prompt', prompt);
      const { data } = await api.post('/chat/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessages(prev => [...prev, { role: 'bot', text: data.reply }]);
    } catch (err: any) {
      const msg = err.response?.data?.error || t.chatImageError;
      setMessages(prev => [...prev, { role: 'bot', text: `❌ ${msg}` }]);
    } finally {
      setTyping(false);
    }
  };

  const sendText = async (text: string) => {
    if (!text.trim() || typing) return;

    // If there's an image attached, send as image scan
    if (imageFile) { sendImage(); return; }

    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setTyping(true);

    try {
      const { data } = await api.post('/chat', { message: text, history });
      setHistory(prev => [
        ...prev,
        { role: 'user',  parts: [{ text }] },
        { role: 'model', parts: [{ text: data.reply }] },
      ]);
      setMessages(prev => [...prev, { role: 'bot', text: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: t.chatOfflineError }]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="p-4 md:p-7 animate-fade-in">
      <h2 className="text-2xl font-serif mb-1">{t.chatTitle}</h2>
      <p className="text-sm text-muted mb-4">
        {t.chatSubtitle}
      </p>

      <div className="card max-w-2xl !mb-0">
        {/* Chat window */}
        <div className="h-[45vh] md:h-96 overflow-y-auto border border-sand rounded-xl p-3 md:p-4 bg-cream mb-3 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-base
                ${m.role === 'bot' ? 'bg-forest text-white' : 'bg-earth text-white'}`}>
                {m.role === 'bot' ? '🤖' : '👤'}
              </div>
              <div className={`max-w-xs md:max-w-sm rounded-2xl text-sm leading-relaxed overflow-hidden
                ${m.role === 'user'
                  ? 'bg-forest text-white rounded-br-sm'
                  : 'bg-white border border-sand rounded-bl-sm'}`}>
                {m.image && (
                  <img src={m.image} alt="uploaded crop" className="w-full max-h-48 object-cover rounded-t-2xl" />
                )}
                <p className="px-4 py-3 whitespace-pre-wrap">{m.text}</p>
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex gap-2.5">
              <div className="w-9 h-9 rounded-full bg-forest flex items-center justify-center">🤖</div>
              <div className="bg-white border border-sand rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Image preview bar */}
        {imagePreview && (
          <div className="flex items-center gap-3 bg-sand rounded-xl px-3 py-2 mb-3">
            <img src={imagePreview} alt="preview" className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-forest">{t.chatImageReady}</p>
              <p className="text-xs text-muted truncate">{imageFile?.name}</p>
            </div>
            <button onClick={clearImage} className="text-muted hover:text-red-500 text-xl bg-transparent border-0 cursor-pointer">✕</button>
          </div>
        )}

        {/* Suggestions */}
        {!imagePreview && (
          <div className="flex flex-wrap gap-2 mb-3">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => sendText(s)} disabled={typing}
                className="text-xs bg-sand hover:bg-mint/30 text-dark px-3 py-1.5 rounded-full transition-colors border-0 cursor-pointer disabled:opacity-50">
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          <button
            onClick={() => fileRef.current?.click()}
            title="Upload crop photo for diagnosis"
            className="btn-outline px-3 text-xl flex-shrink-0"
          >
            📷
          </button>

          <input
            className="input flex-1"
            placeholder={imagePreview ? t.chatImagePlaceholder : t.chatPlaceholder}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (imageFile ? sendImage() : sendText(input))}
            disabled={typing}
          />
          <button
            onClick={() => imageFile ? sendImage() : sendText(input)}
            disabled={typing || (!input.trim() && !imageFile)}
            className="btn-primary px-5 disabled:opacity-50"
          >
            {imageFile ? t.chatScan : t.chatSend}
          </button>
        </div>

        <p className="text-xs text-muted mt-2 text-center">{t.chatImageHint}</p>
      </div>
    </div>
  );
}
