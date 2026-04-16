# 🌿 RurAgriConnect — Offline Mobile Farm Advisory System

![CI](https://github.com/your-username/ruragriconnect/actions/workflows/ci.yml/badge.svg)

> **Empowering rural KwaZulu-Natal farmers with expert crop advisories, AI disease diagnosis, and real-time weather alerts — even with no internet connection.**

---

## What Problem Does It Solve?

Smallholder farmers in rural KwaZulu-Natal face a critical challenge: **they need agricultural expertise exactly when they're in the field** — far from extension offices, often with no mobile data signal. Disease outbreaks, pest infestations, and extreme weather events can destroy an entire season's crop if not caught early.

RurAgriConnect bridges this gap by delivering a **fully offline-capable progressive web app (PWA)** that works like a native mobile app, syncs expert content when connected, and keeps working when the signal drops.

---

## Core Solutions for Farmers

### 📴 Offline-First Advisory Access
- All crop advisories, disease guides, and prevention tips are **cached to the device** on first sync
- Farmers can browse, read, and act on advisories with **zero internet connection**
- Data syncs automatically the moment connectivity is restored
- Works in the most remote fields of eThekwini, uMgungundlovu, iLembe, Zululand, and uThukela

### 🤖 AI Crop Disease Diagnosis (Gemini 2.0)
- **Photo scan**: Farmer takes a photo of a sick plant → AI identifies the disease, pest, or deficiency with confidence level
- **Text chat**: Describe symptoms in plain language → get a diagnosis and treatment plan
- Powered by Google Gemini 2.0 Flash with automatic fallback to Gemini 2.5 Flash
- Fallback responses work even when AI is unavailable
- Covers 200+ plant diseases, pests, and nutrient deficiencies

### 🛡️ Disease Prevention Tips
- Every advisory includes **6 crop-specific prevention steps**
- Covers: Maize, Vegetables, Poultry, Pest management, General crops
- Tips use locally available South African products (Coragen, Copper Oxychloride, etc.)
- Displayed in a numbered, easy-to-follow format

### 🔔 Offline Alert Sync
- Critical weather and disease alerts are **pre-cached** to the device
- When farmer reconnects, new alerts are synced and a push notification is shown
- Cached alerts remain visible in the Notifications page even without internet
- Background sync runs every 15 minutes when online

### 🌦 Live Weather for KZN Regions
- Real-time weather conditions for all 5 KZN districts via OpenWeatherMap API
- Auto-generates alerts for: heavy rainfall (>20mm), heatwaves (>35°C), high winds (>50km/h)
- Weather data cached offline for field use
- Auto-refreshes every 30 minutes

### 🌍 Multilingual Support
- Available in **4 languages**: English, isiZulu (ZU), Afrikaans (AF), Sesotho (ST)
- Language preference saved per device
- Ensures every farmer can access advice in their home language

### 📋 Expert Crop Advisories
- Published by agricultural extension officers and admins
- Filterable by crop type, region, and severity (info / warning / critical)
- Full detail view with prevention tips section
- Searchable offline

---

## Additional Features (Municipality-Grade)

### 🌾 Crop Yield Reporting
- Farmers log their harvest: season, crop type, hectares, total kg, quality rating
- Municipality gets aggregate food production data per region and season
- Summary table: total farms reporting, total hectares, total tons, average yield per hectare
- Feeds directly into municipal food security planning and reporting

### 📦 Resource / Subsidy Request System
- Farmers submit requests for seeds, fertilizer, pesticide, equipment, or animal feed
- Officers review and approve or reject with a note — farmer gets notified
- Replaces paper forms entirely with a full digital audit trail
- Admin sees all pending requests with farmer contact details and region

### 📅 Crop Calendar
- Region-specific planting and harvesting schedule for KZN
- Visual month-by-month grid showing what to do each month
- Covers Maize, Vegetables, Legumes, and Poultry
- Highlights current month activities — farmers always know what to do now
- Officers can add custom calendar entries

### 💬 Farmer Community Forum
- Farmers post questions, share experiences, and help each other
- Categories: general, disease, weather, market, equipment, soil
- Full thread view with replies and likes
- Municipality can see trending issues across the farming community

### 🦠 Pest & Disease Outbreak Dashboard
- Officers report active outbreaks with region, crop, severity, and description
- Regional overview cards show at a glance which districts are affected
- Farmers see active outbreaks in their area with treatment guidance
- Critical for early warning and coordinated municipal response

### 🗺️ Farm Field Registration
- Farmers register their fields: name, crop, hectares, soil type, irrigation method
- GPS coordinates captured automatically from the device
- Municipality sees total farmland under cultivation per district
- Regional land-use summary table for planning purposes

### 📊 Municipality Analytics Dashboard
- 12 KPI cards: users, farmers, advisories, alerts, outbreaks, fields, hectares, yield, requests, AI usage
- Bar charts: farmers by region, advisories by crop, yield by crop, severity breakdown
- Outbreak map by region, resource requests by type
- Live activity feed showing recent system actions
- Designed for municipal council reporting

### 📤 Export Reports (PDF / CSV)
- 6 report types: Farmer Register, Advisory Report, Yield Report, Resource Requests, Outbreak Report, Field Registration
- CSV download works instantly — opens in Excel
- PDF print opens a formatted professional report with RurAgriConnect header
- Municipality officers use these for council meetings and government reporting

---

## Role-Based Access

| Feature | Farmer | Admin / Officer |
|---------|--------|----------------|
| Browse advisories (offline) | ✅ | ✅ |
| AI chat & image scan | ✅ | ✅ |
| Weather alerts | ✅ | ✅ |
| Crop calendar | ✅ | ✅ |
| Community forum | ✅ | ✅ |
| Pest outbreak alerts | ✅ | ✅ |
| Log yield reports | ✅ | ✅ |
| Register farm fields | ✅ | ✅ |
| Submit resource requests | ✅ | ✅ |
| Publish advisories | ❌ | ✅ |
| Report outbreaks | ❌ | ✅ |
| Review subsidy requests | ❌ | ✅ |
| Manage farmers | ❌ | ✅ |
| Analytics dashboard | ❌ | ✅ |
| Export reports | ❌ | ✅ |
| Admin panel | ❌ | ✅ |

---

## Understanding the Roles

### 🌾 Farmer
A registered smallholder farmer in KZN. Uses the app to receive advisories, get AI diagnosis, log harvests, register fields, and request resources. The primary beneficiary of the system.

### ⚙️ Admin
The system administrator — typically a **municipality IT officer or department head**. Has full access to everything: publish advisories, manage all users, view analytics, export reports, approve subsidy requests, and configure the system. There is usually **one admin per municipality deployment**.

### 👩🏾‍💼 Officer (Agricultural Extension Officer)
This is the **field-level government worker** — the person who physically visits farms, advises farmers, and acts as the link between the municipality and the farming community. In South Africa, these are called **Agricultural Extension Officers** or **Field Officers** employed by the Department of Agriculture.

**Why Officer is separate from Admin:**
- An officer works in the field with farmers — they need to publish advisories and report outbreaks but should NOT have access to system settings, delete users, or view all financial data
- A municipality may have **10–20 extension officers** covering different regions, but only **1–2 admins**
- Officers are accountable to the admin — their activity is logged and visible to the admin
- This separation follows real government structure: the admin is the department manager, officers are the field staff

**In practice for your deployment:**
- If you are the only person running the system → use **Admin** (you have everything)
- When real extension officers join → register them as **Officer** so they can publish advisories for their region without touching system settings

---

## AI Models Used

RurAgriConnect uses **Google Gemini AI** for all artificial intelligence features. The system automatically tries models in order — if the first is overloaded, it falls back to the next one seamlessly.

### Model Cascade (tried in this order)

| Priority | Model | Type | Used For |
|----------|-------|------|----------|
| 1st | **Gemini 2.0 Flash** | Latest stable | Primary model for all requests |
| 2nd | **Gemini 2.5 Flash** | Latest experimental | Fallback if 2.0 is overloaded |
| 3rd | **Gemini Flash Latest** | Auto-latest | Second fallback |
| 4th | **Gemini 2.0 Flash Lite** | Lightweight | Third fallback |
| 5th | **Gemini 2.0 Flash 001** | Pinned version | Final fallback |
| Last | **Built-in responses** | No AI needed | Works fully offline |

### What the AI Does

**Text Chat (`/chatbot` page)**
- Multi-turn conversation — remembers what you said earlier in the chat
- Answers questions about crops, pests, soil, fertilizer, irrigation
- Trained with a KZN-specific system prompt so answers are relevant to South African farming conditions and locally available products

**Image Scan (`📷` button in chatbot)**
- Upload a photo of a sick plant, damaged crop, or soil
- AI identifies: disease name, confidence level, visible symptoms, treatment steps using SA products, prevention tips
- Supports JPEG, PNG, and WebP images up to 10MB

**Why you see different quality responses:**
- When **Gemini 2.0 Flash** answers → fast, detailed, excellent (this is what gave you the tomato diagnosis)
- When **built-in fallback** answers → shorter, pre-written responses (happens when all Gemini models are temporarily overloaded)
- The system always tries the best model first and only falls back when necessary

### API Key
All models use the same **Google Gemini API key** set in `server/.env`:
```env
GEMINI_API_KEY=your_key_here
```
Get a free key at: https://aistudio.google.com/app/apikey

---

### Frontend (PWA)
- **React 18** + TypeScript + Vite
- **Tailwind CSS** with custom KZN-themed design tokens
- **Service Worker** — network-first for API, cache-first for assets
- **localStorage** sync cache — advisories, alerts, last sync timestamp
- **Progressive Web App** — installable on Android/iOS home screen
- Responsive design — mobile-first, works on all screen sizes

### Backend (API)
- **Node.js** + Express + TypeScript
- **SQL.js** (SQLite in-memory, persisted to file) — no external DB required
- **JWT authentication** with bcrypt password hashing
- **Google Gemini 2.0 Flash** — text chat + image vision analysis (auto-fallback to 2.5 Flash)
- **OpenWeatherMap API** — live weather for 5 KZN regions
- Auto-weather refresh every 30 minutes

### Database Tables (17 total)
| Table | Purpose |
|-------|---------|
| roles | System roles (admin, farmer, officer) |
| users | All user accounts |
| user_roles | Many-to-many user-role mapping |
| officers | Extension officer profiles |
| farmers | Farmer profiles with region and crop preferences |
| advisories | Published crop advisories |
| alerts | Weather and pest alerts |
| weather_data | Live weather observations per region |
| pest_outbreaks | Reported pest/disease outbreaks |
| community_posts | Farmer discussion posts |
| community_replies | Replies to community posts |
| sms_notifications | SMS alert queue for farmers |
| notification_log | In-app notification history |
| activity_logs | Full audit trail of all user actions |
| yield_reports | Farmer harvest data per season |
| subsidy_requests | Resource/subsidy requests with approval status |
| crop_calendar | Monthly farming activity schedule |
| farm_fields | Registered farm fields with GPS coordinates |

### Key API Endpoints
| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/login` | Login |
| `POST /api/auth/register` | Register new account |
| `GET /api/advisories` | List advisories with prevention tips |
| `GET /api/weather/alerts` | Active weather alerts |
| `POST /api/chat` | AI text chat |
| `POST /api/chat/scan` | AI image disease scan |
| `GET /api/sync/pull` | Offline data sync |
| `GET /api/yields` | Yield reports |
| `GET /api/yields/summary` | Municipal yield summary |
| `GET /api/subsidies` | Resource requests |
| `PUT /api/subsidies/:id/review` | Approve/reject request |
| `GET /api/calendar` | Crop calendar |
| `GET /api/fields` | Farm field registrations |
| `GET /api/fields/summary` | Regional land use summary |
| `GET /api/community` | Community forum posts |
| `GET /api/outbreaks` | Pest outbreak reports |
| `GET /api/analytics` | Full municipality analytics |

---

## Getting Started

### Prerequisites
- [Node.js 18+](https://nodejs.org) — download and install if you don't have it
- npm (comes with Node.js)
- A terminal / command prompt

---

### Step 1 — Clone the project
```bash
git clone https://github.com/your-username/ruragriconnect.git
cd ruragriconnect
```
Or if you already have the folder, just open a terminal in the `RuralAgriConnect` root folder.

---

### Step 2 — Install all dependencies (run once)
```bash
npm run install:all
```
This installs both the server and client dependencies in one go. You only need to do this once, or after pulling new changes.

---

### Step 3 — Configure environment variables
Open `server/.env` and fill in your API keys:
```env
PORT=3001
JWT_SECRET=ruragriconnect_secret_change_in_production
DB_PATH=./data/ruragriconnect.db
GEMINI_API_KEY=your_gemini_api_key_here
OPENWEATHER_API_KEY=your_openweather_api_key_here
```

> **Get a free Gemini API key** → https://aistudio.google.com/app/apikey
> **Get a free OpenWeather key** → https://openweathermap.org/api

The app works without these keys — it falls back to mock data and pre-written responses.

---

### Step 4 — Run the app (one command)
```bash
npm run dev
```
This starts **both** the server and client at the same time in one terminal.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API Server | http://localhost:3001 |

Open **http://localhost:5173** in your browser. You'll see the landing page first.

---

### Step 5 — Seed the database (optional)
If you want demo data (sample farmers, advisories, alerts):
```bash
npm run seed
```
This creates demo accounts you can log in with immediately. **Note: this wipes existing data.**

---

### Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@farm.co.za | Admin@123 |
| Farmer | sipho@farm.co.za | Farmer@123 |
| Farmer | nomvula@farm.co.za | Farmer@123 |

---

### All Available Commands
| Command | What it does |
|---------|-------------|
| `npm run dev` | Start both server + client (use this every time) |
| `npm run install:all` | Install all dependencies (run once after cloning) |
| `npm run seed` | Populate database with demo data (wipes existing data) |

---

### Installing on Your Phone (PWA)
1. Make sure your phone is on the same WiFi as your computer
2. Find your computer's local IP (run `ipconfig` on Windows, look for IPv4)
3. Open `http://YOUR_IP:5173` in Chrome on your phone
4. Tap the browser menu → **"Add to Home Screen"**
5. The app installs like a native app — works fully offline after first load

---

## Crop Coverage

| Crop | Diseases Covered | Prevention Tips | Calendar |
|------|-----------------|-----------------|---------|
| Maize | Fall armyworm, grey leaf spot, stalk rot | ✅ 6 tips | ✅ |
| Vegetables | Early blight, late blight, bacterial wilt | ✅ 6 tips | ✅ |
| Poultry | Newcastle, Marek's, IBD | ✅ 6 tips | ✅ |
| Legumes | Rosette virus, leaf spot, aflatoxin | ✅ 6 tips | ✅ |
| Root Crops | Root rot, nematodes, nutrient deficiency | ✅ via AI | — |
| General Pest | Armyworm, aphids, whitefly | ✅ 6 tips | — |

---

## KZN Regions Supported
- KwaZulu-Natal — eThekwini
- KwaZulu-Natal — uMgungundlovu
- KwaZulu-Natal — iLembe
- KwaZulu-Natal — Zululand
- KwaZulu-Natal — uThukela

---

*Built for the farmers of KwaZulu-Natal 🌿*
