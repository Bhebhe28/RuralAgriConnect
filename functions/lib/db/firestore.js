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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFirestore = getFirestore;
exports.getDoc = getDoc;
exports.getDocs = getDocs;
exports.setDoc = setDoc;
exports.updateDoc = updateDoc;
exports.deleteDoc = deleteDoc;
exports.addDoc = addDoc;
exports.countDocs = countDocs;
exports.now = now;
const admin = __importStar(require("firebase-admin"));
function getFirestore() {
    return admin.firestore();
}
async function getDoc(collection, id) {
    const doc = await admin.firestore().collection(collection).doc(id).get();
    if (!doc.exists)
        return null;
    return { id: doc.id, ...doc.data() };
}
async function getDocs(collection, filters = [], orderBy, limitN) {
    let q = admin.firestore().collection(collection);
    for (const [field, op, val] of filters)
        q = q.where(field, op, val);
    if (orderBy)
        q = q.orderBy(orderBy.field, orderBy.dir || 'desc');
    if (limitN)
        q = q.limit(limitN);
    const snap = await q.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function setDoc(collection, id, data) {
    await admin.firestore().collection(collection).doc(id).set(data);
}
async function updateDoc(collection, id, data) {
    await admin.firestore().collection(collection).doc(id).update(data);
}
async function deleteDoc(collection, id) {
    await admin.firestore().collection(collection).doc(id).delete();
}
async function addDoc(collection, data) {
    const ref = await admin.firestore().collection(collection).add(data);
    return ref.id;
}
async function countDocs(collection, filters = []) {
    const docs = await getDocs(collection, filters);
    return docs.length;
}
function now() {
    return new Date().toISOString();
}
//# sourceMappingURL=firestore.js.map