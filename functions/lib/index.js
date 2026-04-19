"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Init Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}
const auth_1 = __importDefault(require("./routes/auth"));
const advisories_1 = __importDefault(require("./routes/advisories"));
const weather_1 = __importDefault(require("./routes/weather"));
const users_1 = __importDefault(require("./routes/users"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const sync_1 = __importDefault(require("./routes/sync"));
const chat_1 = __importDefault(require("./routes/chat"));
const outbreaks_1 = __importDefault(require("./routes/outbreaks"));
const community_1 = __importDefault(require("./routes/community"));
const yields_1 = __importDefault(require("./routes/yields"));
const subsidies_1 = __importDefault(require("./routes/subsidies"));
const calendar_1 = __importDefault(require("./routes/calendar"));
const fields_1 = __importDefault(require("./routes/fields"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:5173',
        'http://localhost:4173',
        'https://ruralagriconnect-15c7c.web.app',
        'https://ruralagriconnect-15c7c.firebaseapp.com',
    ],
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, max: 10,
    message: { error: 'Too many attempts, please try again in 15 minutes.' },
});
app.use('/auth', authLimiter, auth_1.default);
app.use('/advisories', advisories_1.default);
app.use('/weather', weather_1.default);
app.use('/users', users_1.default);
app.use('/notifications', notifications_1.default);
app.use('/sync', sync_1.default);
app.use('/chat', chat_1.default);
app.use('/outbreaks', outbreaks_1.default);
app.use('/community', community_1.default);
app.use('/yields', yields_1.default);
app.use('/subsidies', subsidies_1.default);
app.use('/calendar', calendar_1.default);
app.use('/fields', fields_1.default);
app.use('/analytics', analytics_1.default);
app.get('/health', (_, res) => res.json({ status: 'ok', db: 'firestore', timestamp: new Date().toISOString() }));
exports.api = functions
    .region('us-central1')
    .runWith({ memory: '512MB', timeoutSeconds: 60 })
    .https.onRequest(app);
//# sourceMappingURL=index.js.map