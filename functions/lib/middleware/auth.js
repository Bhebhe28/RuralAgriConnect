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
exports.authenticate = void 0;
exports.authenticateFirebase = authenticateFirebase;
exports.authenticateOptional = authenticateOptional;
exports.requireAdmin = requireAdmin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const admin = __importStar(require("firebase-admin"));
// Legacy custom-JWT-only middleware — kept for reference but no longer used in routes.
// All routes now use authenticateFirebase (exported as authenticate below).
function _authenticateLegacyJWT(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token)
        return res.status(401).json({ error: 'No token provided' });
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret)
        return res.status(500).json({ error: 'Server configuration error' });
    try {
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        req.user = decoded;
        next();
    }
    catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
// Verifies either a Firebase ID token or a custom JWT — whichever the client sent.
// Firebase ID token: issued by firebase.currentUser.getIdToken()
// Custom JWT: issued by /api/auth/login using JWT_SECRET
async function authenticateFirebase(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token)
        return res.status(401).json({ error: 'No token provided' });
    // Try Firebase ID token first
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.user = {
            id: decoded.uid,
            role: decoded.role || 'farmer',
            email: decoded.email || '',
        };
        return next();
    }
    catch (firebaseErr) {
        // Log Firebase verification failure for debugging
        console.error('[AUTH] Firebase ID token verification failed:', firebaseErr.message);
        /* fall through to custom JWT */
    }
    // Fall back to custom JWT (issued by /api/auth/login)
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
            req.user = decoded;
            return next();
        }
        catch (jwtErr) {
            console.error('[AUTH] Custom JWT verification failed:', jwtErr.message);
            /* fall through */
        }
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
}
// Optional authentication — attempts to authenticate but doesn't fail if no token is provided.
// Used for endpoints like security-log that should accept both authenticated and unauthenticated requests.
async function authenticateOptional(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        // No token provided — continue without authentication
        return next();
    }
    // Try Firebase ID token first
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.user = {
            id: decoded.uid,
            role: decoded.role || 'farmer',
            email: decoded.email || '',
        };
        return next();
    }
    catch (firebaseErr) {
        // Firebase verification failed — try custom JWT
        console.error('[AUTH] Firebase ID token verification failed:', firebaseErr.message);
    }
    // Fall back to custom JWT (issued by /api/auth/login)
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
            req.user = decoded;
            return next();
        }
        catch (jwtErr) {
            console.error('[AUTH] Custom JWT verification failed:', jwtErr.message);
            // Invalid token — but still continue (don't fail)
            return next();
        }
    }
    // No JWT secret configured — continue anyway
    return next();
}
function requireAdmin(req, res, next) {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}
// All routes import `authenticate` — this alias routes them through Firebase-aware auth.
exports.authenticate = authenticateFirebase;
//# sourceMappingURL=auth.js.map