import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Sticky Nav ────────────────────────────────────────────────────────────────
function Nav() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled ? 'bg-white shadow-md' : 'bg-forest/60 backdrop-blur-md border-b border-white/10'
    }`} style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <div className="w-9 h-9 bg-white/20 border border-white/30 rounded-xl flex items-center justify-center text-lg shadow">🌿</div>
          <div className="leading-tight">
            <span className={`font-serif font-bold text-base block leading-none ${scrolled ? 'text-forest' : 'text-white'}`}>
              RurAgriConnect
            </span>
            <span className={`text-xs ${scrolled ? 'text-muted' : 'text-white/70'}`}>KwaZulu-Natal</span>
          </div>
        </div>

        {/* Desktop nav links */}
        <div className={`hidden md:flex items-center gap-6 text-sm font-medium`}>
          {[['features','Features'],['knowledge','Knowledge Hub'],['gallery','Gallery'],['pricing','Pricing']].map(([id, label]) => (
            <button key={id} onClick={() => scrollTo(id)}
              className={`transition-colors bg-transparent border-0 cursor-pointer font-medium ${
                scrolled ? 'text-dark/70 hover:text-forest' : 'text-white/90 hover:text-white'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="hidden md:flex items-center gap-2">
          {token ? (
            <>
              <span className={`text-sm ${scrolled ? 'text-muted' : 'text-white/70'}`}>
                👋 {user?.name?.split(' ')[0]}
              </span>
              <button onClick={() => navigate('/dashboard')}
                className={`text-sm font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer border-2 ${
                  scrolled
                    ? 'bg-forest text-white border-forest hover:bg-forest-mid'
                    : 'bg-white text-forest border-white hover:bg-mint hover:border-mint'
                }`}>
                Go to Dashboard →
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/login')}
                className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors bg-transparent border-0 cursor-pointer ${
                  scrolled ? 'text-dark/70 hover:text-forest' : 'text-white hover:text-white/80'
                }`}>
                Sign In
              </button>
              <button onClick={() => navigate('/login')}
                className={`text-sm font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer border-2 ${
                  scrolled
                    ? 'bg-forest text-white border-forest hover:bg-forest-mid'
                    : 'bg-white text-forest border-white hover:bg-mint hover:border-mint'
                }`}>
                Get Started Free
              </button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className={`md:hidden bg-transparent border-0 cursor-pointer text-2xl ${scrolled ? 'text-dark' : 'text-white'}`}
          onClick={() => setMenuOpen(o => !o)}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-sand px-6 py-4 flex flex-col gap-4 text-sm font-medium shadow-lg">
          {[['features','Features'],['knowledge','Knowledge Hub'],['gallery','Gallery'],['pricing','Pricing']].map(([id, label]) => (
            <button key={id} onClick={() => scrollTo(id)}
              className="text-left text-dark/70 hover:text-forest bg-transparent border-0 cursor-pointer">
              {label}
            </button>
          ))}
          <div className="flex gap-3 pt-2 border-t border-sand">
            {token ? (
              <button onClick={() => navigate('/dashboard')} className="flex-1 py-2.5 bg-forest text-white rounded-xl font-semibold hover:bg-forest-mid border-0 cursor-pointer">
                Go to Dashboard →
              </button>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="flex-1 py-2.5 border-2 border-sand rounded-xl text-dark font-semibold hover:border-forest bg-transparent cursor-pointer">Sign In</button>
                <button onClick={() => navigate('/login')} className="flex-1 py-2.5 bg-forest text-white rounded-xl font-semibold hover:bg-forest-mid border-0 cursor-pointer">Get Started</button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  const navigate = useNavigate();
  const [scanStep, setScanStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setScanStep(s => (s + 1) % 4), 1800);
    return () => clearInterval(t);
  }, []);

  const scanLabels = [
    { label: 'Scanning leaf surface…', color: 'text-amber-400', icon: '🔍' },
    { label: 'Analysing patterns…',    color: 'text-blue-300',  icon: '🧠' },
    { label: '⚠ Early Blight Detected', color: 'text-red-400',  icon: '🚨' },
    { label: '✅ Treatment ready',      color: 'text-mint',      icon: '💊' },
  ];
  const current = scanLabels[scanStep];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Clean gradient background — no photo behind text */}
      <div className="absolute inset-0 bg-gradient-to-br from-forest via-forest-mid to-moss" />
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'radial-gradient(circle at 15% 50%, #95D5B2 0%, transparent 45%), radial-gradient(circle at 85% 20%, #C8963C 0%, transparent 35%)' }} />

      <div className="relative max-w-6xl mx-auto px-4 md:px-6 pb-12 md:pb-20 grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center w-full"
           style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 5rem)' }}>
        {/* Left copy */}
        <div className="text-white text-center lg:text-left">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5 text-xs md:text-sm mb-5">
            <span className="w-2 h-2 rounded-full bg-mint animate-pulse flex-shrink-0" />
            Used by rural farmers across KwaZulu-Natal — no internet required
          </div>
          <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl leading-tight mb-4 md:mb-6">
            Offline Farm<br />
            <span className="text-mint">Advisory System</span><br />
            for Rural Farmers
          </h1>
          <p className="text-white/75 text-sm md:text-lg leading-relaxed mb-6 md:mb-8 max-w-lg mx-auto lg:mx-0">
            Get expert crop advisories, disease alerts, and AI diagnosis — even with no signal.
            Built for remote KZN fields where connectivity is unreliable.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
            <button onClick={() => navigate('/login')}
              className="bg-white text-forest font-bold px-6 py-3 rounded-xl hover:bg-mint transition-colors text-sm border-0 cursor-pointer shadow-lg">
              Get Free Advisory Access →
            </button>
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="border-2 border-white/50 text-white font-semibold px-6 py-3 rounded-xl hover:border-white hover:bg-white/10 transition-all text-sm bg-transparent cursor-pointer">
              See How It Works
            </button>
          </div>
          <div className="flex gap-6 md:gap-10 mt-8 text-sm text-white/60 justify-center lg:justify-start">
            <div><span className="text-white font-bold text-xl md:text-2xl block">100%</span>Works offline</div>
            <div><span className="text-white font-bold text-xl md:text-2xl block">200+</span>Crop diseases covered</div>
            <div><span className="text-white font-bold text-xl md:text-2xl block">Free</span>For all farmers</div>
          </div>
        </div>

        {/* Right — scan mockup card — hidden on small phones */}
        <div className="hidden sm:flex justify-center lg:justify-end">
          <div className="bg-white rounded-3xl shadow-2xl w-64 md:w-72 overflow-hidden border border-white/20">
            <div className="bg-forest px-4 md:px-5 py-3 md:py-3.5 flex items-center justify-between">
              <span className="text-white font-semibold text-sm">🌿 Field Scanner</span>
              <span className="flex items-center gap-1.5 text-xs text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
                Live
              </span>
            </div>
            <div className="relative h-40 md:h-44 overflow-hidden">
              <img src="/img-tomatoes.jpg" alt="crop scan" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-forest/20" />
              <div className="absolute inset-x-6 top-4 bottom-8 border-2 border-white/80 rounded-xl" />
              <div className="absolute inset-x-8 top-6 h-0.5 bg-mint animate-pulse" />
              {/* Label always visible at bottom */}
              <div className="absolute bottom-0 left-0 right-0 bg-forest/70 py-1.5 flex justify-center">
                <span className="text-xs text-white font-medium tracking-wide">
                  📷 Point camera at leaves or fruit
                </span>
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{current.icon}</span>
                <span className={`text-sm font-semibold ${current.color} transition-all`}>{current.label}</span>
              </div>
              <div className="space-y-2 text-xs text-muted">
                <div className="flex justify-between"><span>Field:</span><span className="font-semibold text-dark">North Field A</span></div>
                <div className="flex justify-between"><span>Crop:</span><span className="font-semibold text-dark">Tomatoes</span></div>
                <div className="flex justify-between"><span>GPS:</span><span className="font-semibold text-moss">Active</span></div>
              </div>
              <div className="mt-4 h-1.5 bg-sand rounded-full overflow-hidden">
                <div className="h-full bg-moss rounded-full transition-all duration-700"
                  style={{ width: `${(scanStep + 1) * 25}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wave divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 60Z" fill="#F8F4EE"/>
        </svg>
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '📴',
    title: 'Fully Offline-First',
    desc: 'All advisories, alerts, and AI responses are cached to your device. No signal? No problem — the app works exactly the same.',
  },
  {
    icon: '📋',
    title: 'Expert Crop Advisories',
    desc: 'Agricultural officers publish region-specific advisories for KZN crops — maize, vegetables, poultry and more — with step-by-step prevention tips.',
  },
  {
    icon: '🤖',
    title: 'AI Disease Diagnosis',
    desc: 'Snap a photo of a sick plant and get an instant diagnosis from Gemini AI, trained on South African farming conditions.',
  },
  {
    icon: '🔔',
    title: 'Offline Alert Sync',
    desc: 'Critical weather and disease alerts are synced to your phone automatically. You get notified even when you reconnect after being offline.',
  },
  {
    icon: '🌦',
    title: 'Weather for Your Region',
    desc: 'Live weather conditions and forecasts for all KZN regions — eThekwini, uMgungundlovu, iLembe, Zululand and more.',
  },
  {
    icon: '🌍',
    title: 'Multilingual Support',
    desc: 'Available in English, isiZulu, Afrikaans, and Sesotho — so every farmer can access advice in their home language.',
  },
];

function Features() {
  return (
    <section id="features" className="py-20 bg-cream">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="font-serif text-3xl md:text-4xl text-dark mb-3">Built for Rural Farmers, Not Just Connectivity</h2>
          <p className="text-muted text-lg max-w-xl mx-auto">Everything you need to protect your crops — designed to work in remote KZN fields with or without internet</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-moss/10 rounded-xl flex items-center justify-center text-2xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-dark text-base mb-2">{f.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Photo Gallery ─────────────────────────────────────────────────────────────
function Gallery() {
  const navigate = useNavigate();
  const images = [
    { src: '/img-tomatoes.jpg',    label: 'Tomato Disease Detection',   tag: 'Disease ID' },
    { src: '/img-planting.webp',   label: 'Maize Planting Season',      tag: 'Crop Management' },
    { src: '/img-maize-field.jpg', label: 'Maize Field Monitoring',     tag: 'Field Scanning' },
    { src: '/img-farmers.jpg',     label: 'Farmers in the Field',       tag: 'Community' },
    { src: '/img-root-crops.jpg',  label: 'Root Crop Health',           tag: 'Pest Detection' },
    { src: '/img-groundnut.jpg',   label: 'Bambara Groundnut Harvest',  tag: 'Harvest Analytics' },
  ];

  return (
    <section id="gallery" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="font-serif text-3xl md:text-4xl text-dark mb-3">From the Fields of KwaZulu-Natal</h2>
          <p className="text-muted text-lg max-w-xl mx-auto">The crops our farmers grow — and the advisories that protect them, online or offline</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((img, i) => (
            <div
              key={img.src}
              onClick={() => navigate('/login')}
              className={`relative overflow-hidden rounded-2xl cursor-pointer group ${i === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}
              style={{ height: i === 0 ? '380px' : '180px' }}
            >
              <img
                src={img.src}
                alt={img.label}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <span className="text-xs font-bold text-mint uppercase tracking-wide">{img.tag}</span>
                <p className="text-white font-semibold text-sm mt-0.5">{img.label}</p>
              </div>
              <div className="absolute top-3 left-3">
                <span className="bg-forest/80 text-white text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
                  {img.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <button onClick={() => navigate('/login')} className="btn-primary px-8 py-3.5 text-sm">
            Start Scanning Your Crops →
          </button>
        </div>
      </div>
    </section>
  );
}


function HowItWorks() {
  const navigate = useNavigate();
  const steps = [
    { n: '01', icon: '📲', title: 'Install on Your Phone', desc: 'Add RurAgriConnect to your home screen — it works like a native app, no app store needed.' },
    { n: '02', icon: '🔄', title: 'Sync While Connected', desc: 'When you have signal, the app automatically downloads the latest advisories, alerts, and weather data.' },
    { n: '03', icon: '📴', title: 'Use It Offline in the Field', desc: 'Head out to remote fields — all your data is cached. Browse advisories, get AI help, and check alerts without internet.' },
    { n: '04', icon: '🔔', title: 'Get Alerts When You Reconnect', desc: 'Critical disease and weather alerts are waiting for you the moment you come back online.' },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="font-serif text-3xl md:text-4xl text-dark mb-3">How the Offline Advisory Works</h2>
          <p className="text-muted text-lg">Sync once, use anywhere — even deep in the field with no signal</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {steps.map((s, i) => (
            <div key={s.n} className="relative text-center">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[60%] w-full h-0.5 bg-sand z-0" />
              )}
              <div className="relative z-10 w-16 h-16 bg-forest rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-md">
                {s.icon}
              </div>
              <span className="text-xs font-bold text-moss tracking-widest">{s.n}</span>
              <h3 className="font-semibold text-dark mt-1 mb-2">{s.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center">
          <button onClick={() => navigate('/login')} className="btn-primary px-8 py-3.5 text-sm">
            Get Started — It's Free →
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Knowledge Hub ─────────────────────────────────────────────────────────────
const ARTICLES = [
  {
    img: '/img-tomatoes.jpg',
    tag: 'Disease Prevention',
    title: 'Early Blight & Tomato Disease Guide',
    desc: 'Identify early blight, late blight, and bacterial wilt in tomatoes. Includes offline-ready prevention tips for KZN conditions.',
    link: 'Read Advisory →',
  },
  {
    img: '/img-maize-field.jpg',
    tag: 'Maize Advisory',
    title: 'Maize Season Advisory — KZN',
    desc: 'Planting schedules, fertiliser recommendations, and fall armyworm alerts for KwaZulu-Natal maize farmers.',
    link: 'View Advisory →',
  },
  {
    img: '/img-planting.webp',
    tag: 'Pest Alert',
    title: 'Fall Armyworm Outbreak Alert',
    desc: 'Active outbreak reported in uMgungundlovu. Treatment thresholds, scouting methods, and approved pesticides.',
    link: 'See Alert →',
  },
  {
    img: '/img-root-crops.jpg',
    tag: 'Root Crops',
    title: 'Root Crop Disease & Soil Health',
    desc: 'Prevent root rot, nematode damage, and nutrient deficiency in potatoes, carrots, and beetroot.',
    link: 'Read Guide →',
  },
  {
    img: '/img-farmers.jpg',
    tag: 'Community',
    title: 'Farmer-to-Farmer Advisory Network',
    desc: 'Connect with agricultural extension officers and fellow farmers across KZN to share field observations.',
    link: 'Join Network →',
  },
  {
    img: '/img-groundnut.jpg',
    tag: 'Legumes',
    title: 'Groundnut & Legume Crop Care',
    desc: 'Rosette virus, leaf spot, and aflatoxin prevention for Bambara groundnut and soybean growers in KZN.',
    link: 'Read Advisory →',
  },
];

function KnowledgeHub() {
  const navigate = useNavigate();
  return (
    <section id="knowledge" className="py-20 bg-cream">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="font-serif text-3xl md:text-4xl text-dark mb-3">Advisory Knowledge Hub</h2>
          <p className="text-muted text-lg max-w-xl mx-auto">
            Practical guides for KZN farmers — disease prevention, pest control, soil health, and more. All available offline.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {ARTICLES.map(a => (
            <div key={a.title} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:-translate-y-1 hover:shadow-md transition-all">
              <div className="relative h-40 overflow-hidden">
                <img src={a.img} alt={a.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-forest/30" />
                <span className="absolute top-3 left-3 bg-forest/80 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                  {a.tag}
                </span>
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-dark mb-2">{a.title}</h3>
                <p className="text-muted text-sm leading-relaxed mb-4">{a.desc}</p>
                <button onClick={() => navigate('/login')}
                  className="text-sm font-semibold text-moss hover:text-forest transition-colors bg-transparent border-0 cursor-pointer">
                  {a.link}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center">
          <button onClick={() => navigate('/login')} className="btn-outline px-8 py-3 text-sm">
            View All Articles →
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    stars: 5,
    quote: 'I was in a remote field with no signal when I spotted something wrong with my maize. I opened RurAgriConnect, got the advisory offline, and treated it the same day.',
    name: 'Sipho Dlamini',
    role: 'Smallholder Farmer, uMgungundlovu — KZN',
    avatar: '👨🏾‍🌾',
  },
  {
    stars: 5,
    quote: 'As an extension officer, I publish advisories and they reach farmers instantly — even those in areas with no internet. The offline sync is exactly what rural KZN needed.',
    name: 'Nomvula Khumalo',
    role: 'Agricultural Extension Officer, iLembe District',
    avatar: '👩🏾‍💼',
  },
  {
    stars: 5,
    quote: 'The multilingual support means my farmers can read advisories in isiZulu. That alone has made a huge difference in how quickly they respond to disease alerts.',
    name: 'Dr. Thabo Nkosi',
    role: 'Agricultural Scientist, KZN Dept. of Agriculture',
    avatar: '👨🏾‍🔬',
  },
];

function Testimonials() {
  return (
    <section id="testimonials" className="py-20 relative overflow-hidden">
      {/* Background — planting image with dark overlay */}
      <div className="absolute inset-0">
        <img src="/img-farmers.jpg" alt="farmers" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-forest/88" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="font-serif text-3xl md:text-4xl text-white mb-3">Heard from the Fields</h2>
          <p className="text-white/60 text-lg">Real farmers, real results — from across KwaZulu-Natal</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <span key={i} className="text-amber-400 text-lg">★</span>
                ))}
              </div>
              <p className="text-white/90 text-sm leading-relaxed mb-6 italic">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">{t.avatar}</div>
                <div>
                  <p className="text-white font-semibold text-sm">{t.name}</p>
                  <p className="text-white/50 text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────
const PLANS = [
  {
    icon: '🌾',
    name: 'Farmer',
    price: 'Free',
    period: '',
    desc: 'For individual smallholder farmers — always free',
    features: [
      'Full offline advisory access',
      'AI crop disease diagnosis',
      'Weather alerts for your region',
      'Disease prevention tips',
      'isiZulu, Afrikaans & Sesotho support',
      'Push alerts when reconnected',
    ],
    cta: 'Get Started Free',
    highlight: false,
  },
  {
    icon: '👩🏾‍💼',
    name: 'Extension Officer',
    price: 'Free',
    period: '',
    desc: 'For agricultural officers publishing advisories',
    features: [
      'Everything in Farmer plan',
      'Publish crop advisories',
      'Manage farmer accounts',
      'Send region-wide alerts',
      'View farmer activity',
      'Priority support',
    ],
    cta: 'Register as Officer',
    highlight: true,
  },
  {
    icon: '🏛️',
    name: 'Department / NGO',
    price: 'Custom',
    period: '',
    desc: 'For government departments and agricultural NGOs',
    features: [
      'Unlimited officers & farmers',
      'Custom region configuration',
      'Bulk SMS alert integration',
      'Analytics & reporting',
      'White-label option',
      'Dedicated onboarding',
    ],
    cta: 'Contact Us',
    highlight: false,
  },
];

function Pricing() {
  const navigate = useNavigate();
  return (
    <section id="pricing" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="font-serif text-3xl md:text-4xl text-dark mb-3">Simple, Transparent Pricing</h2>
          <p className="text-muted text-lg">Free for individual farmers — always</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map(p => (
            <div key={p.name} className={`rounded-2xl p-7 relative ${
              p.highlight
                ? 'bg-forest text-white shadow-2xl scale-105 ring-4 ring-moss/30'
                : 'bg-white border-2 border-sand'
            }`}>
              {p.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-moss text-white text-xs font-bold px-4 py-1.5 rounded-full">
                  Most Popular
                </div>
              )}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 ${
                p.highlight ? 'bg-white/20' : 'bg-moss/10'
              }`}>{p.icon}</div>
              <h3 className={`font-serif text-xl mb-1 ${p.highlight ? 'text-white' : 'text-dark'}`}>{p.name}</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className={`text-3xl font-bold ${p.highlight ? 'text-white' : 'text-dark'}`}>{p.price}</span>
                <span className={`text-sm ${p.highlight ? 'text-white/60' : 'text-muted'}`}>{p.period}</span>
              </div>
              <p className={`text-sm mb-6 ${p.highlight ? 'text-white/70' : 'text-muted'}`}>{p.desc}</p>
              <ul className="space-y-2.5 mb-7">
                {p.features.map(f => (
                  <li key={f} className={`flex items-center gap-2.5 text-sm ${p.highlight ? 'text-white/90' : 'text-dark/80'}`}>
                    <span className={`text-base ${p.highlight ? 'text-mint' : 'text-moss'}`}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/login')}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer border-0 ${
                  p.highlight
                    ? 'bg-white text-forest hover:bg-mint'
                    : 'bg-forest text-white hover:bg-forest-mid'
                }`}
              >
                {p.cta} →
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA Banner ────────────────────────────────────────────────────────────────
function CTABanner() {
  const navigate = useNavigate();
  return (
    <section className="py-20 bg-gradient-to-r from-moss to-forest-mid">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="font-serif text-3xl md:text-4xl text-white mb-4">Advisory Access for Every KZN Farmer</h2>
        <p className="text-white/75 text-lg mb-8">
          No internet? No problem. Register now and get expert crop advisories, disease alerts, and AI diagnosis — free, offline, in your language.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <button onClick={() => navigate('/login')}
            className="bg-white text-forest font-bold px-8 py-3.5 rounded-xl hover:bg-mint transition-colors text-sm cursor-pointer border-0">
            Register as a Farmer →
          </button>
          <button onClick={() => navigate('/login')}
            className="border-2 border-white/50 text-white font-semibold px-8 py-3.5 rounded-xl hover:border-white transition-colors text-sm bg-transparent cursor-pointer">
            I'm an Extension Officer
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  const navigate = useNavigate();
  return (
    <footer className="bg-dark text-white/60 py-14">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-forest rounded-lg flex items-center justify-center text-white text-base">🌿</div>
              <span className="font-serif text-white font-bold">RurAgriConnect</span>
            </div>
            <p className="text-sm leading-relaxed mb-4">
              AI-powered crop disease detection and advisory platform for KwaZulu-Natal farmers.
            </p>
            <div className="flex gap-3 text-lg">
              {['📘', '🐦', '📸', '▶️'].map((icon, i) => (
                <button key={i} className="hover:text-white transition-colors bg-transparent border-0 cursor-pointer">{icon}</button>
              ))}
            </div>
          </div>

          {/* Products */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Products</h4>
            <ul className="space-y-2.5 text-sm">
              {['AI Crop Scanning', 'Pest Detection', 'Weather Alerts', 'Advisory Dashboard', 'Mobile App'].map(item => (
                <li key={item}>
                  <button onClick={() => navigate('/login')}
                    className="hover:text-white transition-colors bg-transparent border-0 cursor-pointer text-left">{item}</button>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-2.5 text-sm">
              {['About Us', 'Knowledge Hub', 'Help Center', 'Community Forum', 'Case Studies'].map(item => (
                <li key={item}>
                  <button onClick={() => navigate('/login')}
                    className="hover:text-white transition-colors bg-transparent border-0 cursor-pointer text-left">{item}</button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2"><span>✉️</span><span>support@ruragriconnect.co.za</span></li>
              <li className="flex items-start gap-2"><span>📞</span><span>+27 (0) 31 AGRI-KZN</span></li>
              <li className="flex items-start gap-2"><span>📍</span><span>Pietermaritzburg, KwaZulu-Natal, South Africa</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <span>© 2026 RurAgriConnect. All rights reserved.</span>
          <div className="flex gap-6">
            <button className="hover:text-white transition-colors bg-transparent border-0 cursor-pointer">Privacy Policy</button>
            <button className="hover:text-white transition-colors bg-transparent border-0 cursor-pointer">Terms of Service</button>
            <button className="hover:text-white transition-colors bg-transparent border-0 cursor-pointer">Cookie Policy</button>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Page Assembly ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="font-sans" style={{ overscrollBehaviorX: 'none' }}>
      <Nav />
      <Hero />
      <Features />
      <Gallery />
      <HowItWorks />
      <KnowledgeHub />
      <Testimonials />
      <Pricing />
      <CTABanner />
      <Footer />
    </div>
  );
}
