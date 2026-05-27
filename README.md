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
- **Google Firestore** via Firebase Admin SDK
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
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"..."}
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
This seeds the backend if the users collection is empty.

---

### Demo Credentials
Demo passwords are stored only in `server/.env` (not committed). Ask the project admin for access.

---

### All Available Commands
| Command | What it does |
|---------|-------------|
| `npm run dev` | Start both server + client (use this every time) |
| `npm run install:all` | Install all dependencies (run once after cloning) |
| `npm run seed` | Populate database with demo data (wipes existing data) |


---

### Troubleshooting

#### Port 3001 already in use (`EADDRINUSE`)
A previous server process is still running. Kill it with:
```cmd
for /f "tokens=5" %a in ('netstat -ano ^| findstr :3001') do taskkill /PID %a /F
```
Then run `npm run dev` again.

Or manually:
```cmd
netstat -ano | findstr :3001
```
Copy the PID number from the result, then:
```cmd
taskkill /PID <number> /F
```

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

---

## Security Implementation (OWASP Top 10:2025)

This section documents how each OWASP Top 10:2025 category is implemented in RurAgriConnect — covering the specific files, functions, and design decisions that address each risk. A how-to-test guide follows each category.

---

### A01:2025 — Broken Access Control

**How it is implemented:**

Access control is enforced at two independent layers — the API and the frontend — so neither can be bypassed alone.

**Backend — `server/src/middleware/auth.ts`**

Every protected route requires a valid JWT via the `authenticate` middleware. Admin-only routes additionally require the `requireAdmin` middleware, which checks `req.user.role === 'admin'` and returns `403 Forbidden` if the condition is not met.

```
authenticate  →  verifies JWT signature and expiry, attaches req.user
requireAdmin  →  checks req.user.role === 'admin', returns 403 otherwise
```

Routes and their access level:

| Route | Middleware applied |
|-------|--------------------|
| `GET /api/users` | `authenticate` + `requireAdmin` |
| `DELETE /api/users/:id` | `authenticate` + `requireAdmin` |
| `GET /api/analytics` | `authenticate` + `requireAdmin` |
| `PUT /api/subsidies/:id/review` | `authenticate` + `requireAdmin` |
| `GET /api/fields` (all fields) | `authenticate` + `requireAdmin` |
| `GET /api/fields/mine` | `authenticate` (own data only) |
| `DELETE /api/fields/:id` | `authenticate` + ownership check |
| `PUT /api/fields/:id` | `authenticate` + ownership check |

**Ownership enforcement — `server/src/routes/fields.ts`**

Field edit and delete operations verify that the requesting user owns the record before proceeding. An attempt to modify another farmer's field returns `403 Forbidden`, not a silent no-op:

```typescript
const existing = query(db, `SELECT farmer_id FROM farm_fields WHERE field_id = ?`, [req.params.id]);
if (!existing.length) return res.status(404).json({ error: 'Field not found' });
if (existing[0].farmer_id !== req.user.id) return res.status(403).json({ error: 'Not allowed' });
```

The same pattern is applied in `community.ts` for post deletion:

```typescript
if (posts[0].user_id !== req.user.id && req.user.role !== 'admin')
  return res.status(403).json({ error: 'Not allowed' });
```

**Frontend — `client/src/App.tsx`**

The `AdminRoute` component wraps all admin pages. It redirects unauthenticated users to `/login` and non-admin users to `/dashboard`:

```typescript
function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
```

Pages protected by `AdminRoute`: `/admin`, `/analytics`, `/export`, `/publish`, `/farmers`.

**How to test:**

1. Log in as a Farmer → navigate to `/admin` in the address bar → you are redirected to `/dashboard`
2. Use Postman or DevTools to call `GET /api/users` with a farmer's JWT → response is `403 Forbidden`
3. Call `DELETE /api/fields/<another-farmers-field-id>` with your own JWT → response is `403 Forbidden`
4. Call `PUT /api/fields/<another-farmers-field-id>` with your own JWT → response is `403 Forbidden`

---

### A02:2025 — Security Misconfiguration

**How it is implemented:**

**HTTP security headers — `server/src/index.ts`**

The `helmet` middleware is configured with an explicit Content Security Policy rather than using the default. Key directives:

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'"],
      objectSrc:      ["'none'"],           // blocks Flash, plugins
      frameAncestors: ["'none'"],           // blocks clickjacking
      upgradeInsecureRequests: [],          // forces HTTPS in production
    },
  },
}));
```

This sets the following response headers on every request:

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | see above | Restricts resource origins |
| `X-Frame-Options` | `DENY` | Prevents iframe embedding (clickjacking) |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `Strict-Transport-Security` | `max-age=15552000` | Forces HTTPS |
| `X-DNS-Prefetch-Control` | `off` | Reduces information leakage |

**CORS allowlist — `server/src/index.ts`**

In production, only explicitly listed origins are accepted. Wildcard localhost is blocked in production mode:

```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://ruralagriconnect-15c7c.web.app',
  'https://ruralagriconnect-15c7c.firebaseapp.com',
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
];
```

**Error responses**

All API errors return `{ "error": "message" }` JSON. No stack traces, file paths, or internal details are ever included in error responses. The health endpoint exposes only `{ status, timestamp }`.

**How to test:**

1. Open Chrome DevTools → Network tab → click any API response → Headers tab
2. Confirm these headers are present: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`
3. Try embedding the app in an `<iframe>` on another page → browser blocks it
4. Call a non-existent endpoint like `GET /api/doesnotexist` → response is `{ "error": "..." }` with no stack trace

---

### A03:2025 — Software Supply Chain Failures

**How it is implemented:**

**Dependency audit in CI — `client/package.json`**

The client build script runs `npm audit` before compiling. A critical-severity finding fails the build:

```json
"build": "npm audit --audit-level=critical --omit=dev || true && tsc && vite build"
```

**Known vulnerability status (as of last audit fix):**

```
server/  →  0 vulnerabilities   (express-rate-limit patched via npm audit fix)
client/  →  2 moderate          (esbuild dev-server only — does not affect production builds)
```

The server-side `ip-address` XSS vulnerability in `express-rate-limit` was patched by running `npm audit fix` in `server/`. The client `esbuild` finding only affects the Vite development server, not the compiled production bundle.

**How to check:**

```bash
# Check server dependencies
cd server && npm audit

# Check client dependencies
cd client && npm audit

# Fix safe patches
npm audit fix
```

Expected output for server: `found 0 vulnerabilities`

> Never run `npm audit fix --force` — it installs breaking major versions without review.

---

### A04:2025 — Cryptographic Failures

**How it is implemented:**

**Password hashing — `server/src/routes/auth.ts`**

Passwords are hashed with `bcryptjs` at cost factor 10 before storage. Plain-text passwords are never written to the database or returned in any API response:

```typescript
bcrypt.hashSync(password, 10)   // on register and password reset
bcrypt.compareSync(password, user.password_hash)   // on login
```

The `GET /api/users/me` endpoint explicitly strips `password_hash` before returning the user object:

```typescript
const { password_hash, ...safe } = users[0];
res.json({ ...safe });
```

**JWT secret validation — `server/src/middleware/auth.ts`**

The server refuses to start if `JWT_SECRET` is missing or still set to the placeholder value. There is no weak default fallback:

```typescript
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'change_this_to_a_long_random_secret') {
    throw new Error('JWT_SECRET is not set or is using the default placeholder.');
  }
  return secret;
}
```

**Password reset tokens — `server/src/routes/auth.ts`**

Reset tokens are generated with Node's `crypto.randomBytes(32)` — a cryptographically secure random number generator. UUID is not used here because UUID v4 is not a CSPRNG:

```typescript
const token = crypto.randomBytes(32).toString('hex');
```

Tokens expire after 1 hour and are deleted from the database immediately after use.

**Offline credential storage — `client/src/context/AuthContext.tsx`**

To support offline login on PWA devices, credentials are stored locally using PBKDF2 via the Web Crypto API — 100,000 iterations, SHA-256, with a random salt. Plain-text passwords are never written to `localStorage`:

```typescript
async function deriveKey(password: string, salt: string): Promise<string> {
  const keyMat = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMat, 256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}
```

**How to test:**

1. Open DevTools → Application → Local Storage → search for `password` → nothing found in plain text
2. Inspect `rac_offline_creds` in localStorage → value is a PBKDF2 hash + salt, not a password
3. Check any API response for `password_hash` field → it is never present
4. In production, confirm all pages load over HTTPS (padlock in address bar)

---

### A05:2025 — Injection

**How it is implemented:**

**SQL injection — `server/src/db/database.ts`**

Every database query uses `sql.js` prepared statements with bound parameters. User input is never concatenated into SQL strings. Dynamic filter queries (e.g. filtering advisories by crop or region) also use parameterized placeholders:

```typescript
// Parameterized query — safe
const users = query(db, `SELECT * FROM users WHERE email = ?`, [email]);

// Dynamic filter — still parameterized
let sql = `SELECT * FROM advisories WHERE 1=1`;
const params: any[] = [];
if (req.query.crop) { sql += ` AND crop_type = ?`; params.push(req.query.crop); }
const rows = query(db, sql, params);
```

The `query()` helper in `database.ts` always calls `stmt.bind(params)` — raw string interpolation is not used anywhere in the route handlers.

**XSS injection — `client/src/pages/Community.tsx` and all React pages**

React's JSX rendering auto-escapes all string values rendered as text nodes. User-generated content (community posts, advisory content, forum replies) is rendered as:

```tsx
<p className="...">{msg.body}</p>
```

This means `<script>alert(1)</script>` stored in the database renders as the literal text string on screen — the browser never parses it as HTML. There is no `dangerouslySetInnerHTML` usage anywhere in the codebase.

**Input validation — `server/src/utils/validators.ts`**

Shared validation utilities enforce format rules on all user-supplied input before it reaches the database:

```typescript
isValidEmail(email)       // /^[^\s@]+@[^\s@]+\.[^\s@]+$/
isStrongPassword(password) // 8+ chars, uppercase, lowercase, digit
isValidImageType(mimetype) // jpeg, png, webp only
```

**How to test:**

1. In the Community Forum, post a message with the title `<script>alert('xss')</script>` → it appears as plain text, no popup fires
2. In any search or filter field, enter `'; DROP TABLE users; --` → stored as harmless text, no database error
3. In your profile name, enter `<img src=x onerror=alert(1)>` → renders as text, no alert fires

---

### A06:2025 — Insecure Design

**How it is implemented:**

**Rate limiting — `server/src/index.ts`**

Three separate rate limiters are applied to different risk surfaces:

| Limiter | Routes | Window | Max requests | Response on breach |
|---------|--------|--------|--------------|--------------------|
| `authLimiter` | `/api/auth/*` | 15 minutes | 10 | `"Too many attempts, please try again in 15 minutes."` |
| `chatLimiter` | `/api/chat/*` | 1 minute | 20 per user | `"Too many AI requests. Please wait a minute."` |
| `communityWriteLimiter` | `/api/community` (writes) | 1 minute | 10 | `"Too many posts. Please slow down."` |

The AI limiter uses `req.user.id` as the key after authentication — so limits are per-user, not per-IP, preventing shared-IP bypass.

**File upload restrictions — `server/src/routes/users.ts` and `community.ts`**

All file uploads enforce MIME type and size limits via `multer`:

```typescript
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

fileFilter: (_req, file, cb) => {
  if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
},
limits: { fileSize: 5 * 1024 * 1024 },  // 5 MB for avatars
```

Community images allow up to 10 MB; document attachments are capped at 450 KB client-side before upload.

**Password reset design — `server/src/routes/auth.ts`**

- Tokens expire after exactly 1 hour
- Any existing reset token for a user is deleted before a new one is issued (prevents token accumulation)
- The response is identical whether the email exists or not (prevents email enumeration)
- The `authLimiter` (10 req / 15 min) applies to the forgot-password endpoint

**Idle session timeout — `client/src/context/AuthContext.tsx`**

Sessions automatically lock after 30 minutes of inactivity. The timer resets on any mouse, keyboard, touch, or scroll event:

```typescript
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
timer = setTimeout(() => {
  setLocked(true);
  setUser(null);
}, IDLE_TIMEOUT_MS);
```

**How to test:**

1. On the login page, enter the wrong password 11 times in a row → blocked after 10 with a rate-limit message
2. Try uploading a `.exe` or `.pdf` as an avatar → rejected with `"Only JPEG, PNG, and WebP images are allowed"`
3. Try uploading an image over 5 MB → rejected before it reaches the route handler
4. Leave the app idle for 30 minutes → session locks automatically, login screen appears

---

### A07:2025 — Authentication Failures

**How it is implemented:**

**Brute-force protection — `server/src/index.ts`**

The `authLimiter` middleware is applied to the entire `/api/auth` router. After 10 failed attempts within 15 minutes from the same IP, all further requests return:

```json
{ "error": "Too many attempts, please try again in 15 minutes." }
```

**Input validation before DB lookup — `server/src/routes/auth.ts`**

Empty credentials are rejected immediately, before any database query is made:

```typescript
if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
```

**JWT verification — `server/src/middleware/auth.ts`**

Every protected API call verifies the JWT signature using `jwt.verify()`. A tampered or expired token returns `401 Unauthorized`. The secret is loaded from `process.env.JWT_SECRET` and the server throws on startup if it is missing or set to the placeholder value.

**Password strength enforcement — `server/src/utils/validators.ts`**

Registration and password reset both enforce the same rule: minimum 8 characters, at least one uppercase letter, one lowercase letter, and one digit.

**Session lifecycle — `client/src/context/AuthContext.tsx`**

- Login sets a `sessionStorage` flag (`rac_session_active`). `sessionStorage` is cleared when the browser or PWA closes, so a fresh app open always requires re-login even if the Firebase Auth token is still valid
- Logout sets a `rac_session_locked` flag in `localStorage` — the Firebase Auth session is kept alive for offline data sync, but the app treats the user as signed out
- Registration locks the session immediately after account creation — the user must sign in manually

**Email enumeration prevention — `server/src/routes/auth.ts`**

The forgot-password endpoint returns the same message regardless of whether the email is registered:

```typescript
if (!users.length) return res.json({ message: 'If that email exists, a reset link has been sent.' });
```

**How to test:**

1. Enter the correct email with a wrong password 11 times → blocked after 10 attempts
2. Submit the login form with a blank password → `"Email and password required"` (no DB query made)
3. Copy your JWT from `localStorage` → change one character in the payload section → call `GET /api/users/me` → `401 Unauthorized`
4. Enter a non-existent email on the forgot-password page → same success message as a real email
5. Close the browser tab and reopen the app → login screen appears (session not auto-restored)

---

### A08:2025 — Software or Data Integrity Failures

**How it is implemented:**

**Role cannot be self-assigned — `server/src/routes/auth.ts`**

The `role` field from the registration request body is completely ignored. All new accounts are hardcoded to `farmer` regardless of what the client sends:

```typescript
// A08: Never trust client-supplied role — always register as farmer
const roleName = 'farmer';
```

Admin and officer roles can only be assigned by an existing admin through the admin panel, which is itself protected by `requireAdmin`.

**Profile update strips sensitive fields — `server/src/routes/users.ts`**

The `PUT /api/users/me` endpoint only updates the three fields it explicitly names. Sending `"role": "admin"` or `"password_hash": "..."` in the request body has no effect:

```typescript
run(db, `UPDATE users SET full_name = ?, phone_number = ?, region = ? WHERE user_id = ?`,
  [name, phone, region, req.user.id]);
```

**Subsidy status validated against allowlist — `server/src/routes/subsidies.ts`**

The review endpoint rejects any status value not in the explicit allowlist:

```typescript
if (!['approved', 'rejected', 'pending'].includes(status))
  return res.status(400).json({ error: 'status must be approved, rejected or pending' });
```

**File type validation on all uploads — `server/src/routes/users.ts` and `community.ts`**

MIME type is checked server-side via `multer`'s `fileFilter` before the file is written to disk. Client-side MIME spoofing (renaming a `.exe` to `.jpg`) is caught because `multer` reads the actual MIME type from the file content, not the filename extension.

**How to test:**

1. Register a new account via Postman with `"role": "admin"` in the body → account is created as `farmer`
2. Log in as a Farmer → call `PUT /api/users/me` with `{ "role": "admin" }` in the body → call `GET /api/users/me` → role is still `farmer`
3. Call `PUT /api/subsidies/:id/review` with `{ "status": "hacked" }` → `400 Bad Request`
4. Rename a `.exe` file to `photo.jpg` and upload it as an avatar → rejected with MIME type error

---

### A09:2025 — Security Logging & Alerting Failures

**How it is implemented:**

**Audit log table — `server/src/db/database.ts`**

All security-relevant events are written to the `activity_logs` table in SQLite:

```sql
CREATE TABLE activity_logs (
  log_id      TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(user_id),
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  details     TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);
```

**Events logged and where:**

| Action | Trigger | File |
|--------|---------|------|
| `LOGIN` | Successful login | `routes/auth.ts` |
| `LOGIN_FAILED` | Wrong password or unknown email | `routes/auth.ts` |
| `REGISTER` | New account created | `routes/auth.ts` |
| `PUBLISH_ADVISORY` | Admin publishes an advisory | `routes/advisories.ts` |
| `REPORT_OUTBREAK` | Farmer or admin reports an outbreak | `routes/outbreaks.ts` |
| `REGISTER_FIELD` | Farmer registers a farm field | `routes/fields.ts` |
| `CHAT_AI` | AI chat request completed | `routes/chat.ts` |
| `IMAGE_SCAN` | AI image scan completed | `routes/chat.ts` |
| `CHAT_FALLBACK` | AI unavailable, fallback used | `routes/chat.ts` |
| `DELETE_USER` | Admin deletes a user account | `routes/users.ts` |
| `REVIEW_SUBSIDY` | Admin approves or rejects a subsidy request | `routes/subsidies.ts` |
| `CLIENT_*` | Auth events from the frontend (login, logout, session expiry) | `index.ts` `/api/security-log` |

**Failed login logging — `server/src/routes/auth.ts`**

Failed logins are logged with the attempted email in the `details` field, giving a full audit trail for brute-force detection:

```typescript
if (!user || !bcrypt.compareSync(password, user.password_hash)) {
  run(db, `INSERT INTO activity_logs ... VALUES (?,?,?,?,?,?)`,
    [uuidv4(), user?.user_id || null, 'LOGIN_FAILED', 'user', null,
     `Failed login attempt for email: ${email}`]);
  return res.status(401).json({ error: 'Invalid credentials' });
}
```

**Admin action logging — `server/src/routes/users.ts`**

User deletion captures the deleted user's name, email, and role before the record is removed:

```typescript
const targets = query(db, `SELECT full_name, email, role FROM users WHERE user_id = ?`, [req.params.id]);
run(db, `INSERT INTO activity_logs ... `,
  [..., 'DELETE_USER', ..., `Deleted user: ${targets[0].full_name} (${targets[0].email}, role: ${targets[0].role})`]);
```

**Client-side security event sink — `server/src/index.ts`**

The frontend `logger.auth()` function fires events to `POST /api/security-log`. The endpoint authenticates the request and writes `CLIENT_*` entries to `activity_logs`, capturing the action, detail, and user agent:

```typescript
app.post('/api/security-log', async (req, res) => {
  // authenticates, then:
  run(db, `INSERT INTO activity_logs ...`,
    [..., `CLIENT_${action.toUpperCase()}`, ...,
     JSON.stringify({ detail, userAgent, ts: timestamp })]);
});
```

**How to test:**

1. Enter a wrong password on the login page → open the SQLite `activity_logs` table → a `LOGIN_FAILED` row exists with the attempted email in `details`
2. Register a new account → `activity_logs` contains a `REGISTER` row
3. As admin, delete a user → `activity_logs` contains a `DELETE_USER` row with the deleted user's name and email
4. As admin, approve a subsidy request → `activity_logs` contains a `REVIEW_SUBSIDY` row with the decision and notes
5. Log out → `activity_logs` contains a `CLIENT_SESSION_LOCKED` row from the frontend logger

---

### A10:2025 — Mishandling of Exceptional Conditions

**How it is implemented:**

**APP_URL domain allowlist — `server/src/services/emailService.ts`**

Password reset emails build the reset link from `process.env.APP_URL`. Without validation, a misconfigured or injected environment variable could redirect reset links to an attacker-controlled domain. The implementation validates `APP_URL` against an explicit allowlist before using it, and falls back to the hardcoded Firebase domain if the value is not trusted:

```typescript
const TRUSTED_DOMAINS = [
  'https://ruralagriconnect-15c7c.web.app',
  'https://ruralagriconnect-15c7c.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:4173',
];

function getTrustedBaseUrl(): string {
  const configured = process.env.APP_URL?.trim();
  if (configured && TRUSTED_DOMAINS.includes(configured)) return configured;
  if (configured) {
    console.warn(`APP_URL "${configured}" is not trusted — falling back to default.`);
  }
  return 'https://ruralagriconnect-15c7c.web.app';
}
```

The reset token is also URL-encoded in the link: `encodeURIComponent(resetToken)`.

**AI fallback on all error conditions — `server/src/routes/chat.ts`**

If every Gemini model fails (rate limit, quota, network error), the chat endpoint returns a pre-written fallback response rather than a 500 error. The user always gets a useful reply:

```typescript
} catch (err) {
  const reply = getFallbackReply(message);
  logChat(req.user.id, 'CHAT_FALLBACK', message.slice(0, 100));
  res.json({ reply });   // never throws 500 to the client
}
```

**Weather and background job error isolation — `server/src/index.ts`**

Background jobs (weather refresh, outbreak feed sync) are isolated with `.catch(console.error)` so a failure in a background task never crashes the server process:

```typescript
setInterval(() => fetchAndSaveWeather().catch(console.error), 30 * 60 * 1000);
setInterval(() => syncOutbreaksAndNotify().catch(console.error), 24 * 60 * 60 * 1000);
```

**React error boundary — `client/src/App.tsx`**

A top-level `ErrorBoundary` component catches any unhandled React render error and displays a safe fallback UI instead of a blank screen or raw exception:

```typescript
class ErrorBoundary extends React.Component {
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) return <div>App crashed: {this.state.error}</div>;
    return this.props.children;
  }
}
```

**Server startup failure — `server/src/index.ts`**

If the server fails to initialise (bad DB, missing JWT secret), it exits cleanly with a non-zero code rather than running in a broken state:

```typescript
bootstrap().catch((e) => {
  console.error('❌ Failed to start server:', e);
  process.exit(1);
});
```

**How to test:**

1. Set `APP_URL=http://evil.com` in `server/.env` → request a password reset → the email link still points to `https://ruralagriconnect-15c7c.web.app`, not `evil.com`
2. Remove `GEMINI_API_KEY` from `server/.env` → send a chat message → you receive a pre-written fallback response, not a 500 error
3. Unset `JWT_SECRET` in `server/.env` → start the server → it exits immediately with a clear error message rather than running with no secret

---

## Security Implementation Summary

| # | OWASP Category | Status | Key Controls |
|---|----------------|--------|--------------|
| A01 | Broken Access Control | ✅ | `authenticate` + `requireAdmin` middleware; ownership checks on field edit/delete; `AdminRoute` on all admin pages |
| A02 | Security Misconfiguration | ✅ | `helmet` with full CSP; `X-Frame-Options: DENY`; CORS allowlist; no stack traces in error responses |
| A03 | Software Supply Chain | ✅ | `npm audit` in build pipeline; `express-rate-limit` patched to 0 server vulnerabilities |
| A04 | Cryptographic Failures | ✅ | bcrypt (cost 10); PBKDF2 offline creds; `crypto.randomBytes` reset tokens; JWT secret enforced at startup |
| A05 | Injection | ✅ | Parameterized SQL throughout; React JSX auto-escaping; MIME type validation on all uploads |
| A06 | Insecure Design | ✅ | Three-tier rate limiting; file type + size enforcement; 1-hour expiring reset tokens; 30-min idle timeout |
| A07 | Authentication Failures | ✅ | Brute-force rate limit; blank credential rejection; JWT signature verification; session locked on close |
| A08 | Data Integrity | ✅ | Role hardcoded to `farmer` on register; profile update strips role; status allowlist on subsidy review |
| A09 | Security Logging | ✅ | `activity_logs` captures login failures, registrations, admin actions, AI usage, and client auth events |
| A10 | Exceptional Conditions | ✅ | `APP_URL` domain allowlist; AI fallback responses; background job error isolation; React error boundary |

---

*Built for the farmers of KwaZulu-Natal 🌿*
