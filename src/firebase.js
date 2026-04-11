import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, update, onValue, off, remove } from "firebase/database";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

export const firebaseConfig = {
  apiKey:            "AIzaSyCohdiGyd9fInWrrp846knAEFFFSxANUY8",
  authDomain:        "retroboard-hakan.firebaseapp.com",
  databaseURL:       "https://retroboard-hakan-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "retroboard-hakan",
  storageBucket:     "retroboard-hakan.firebasestorage.app",
  messagingSenderId: "529524880401",
  appId:             "1:529524880401:web:1a04e6c40c67b19b4eadb0",
};

const app = initializeApp(firebaseConfig);
export const db   = getDatabase(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const uid    = () => Math.random().toString(36).slice(2, 10);
export const nowISO = () => new Date().toISOString();
export const roomRef = (id) => ref(db, `rooms/${id}`);

export async function fbGet(id)       { const s=await get(roomRef(id)); return s.exists()?s.val():null; }
export async function fbSet(id, data) { await set(roomRef(id), data); }

// ── Rooms — filtered by createdBy uid ────────────────────────────────────────
export async function getAllRooms(adminUid) {
  const s = await get(ref(db,"rooms"));
  if(!s.exists()) return [];
  return Object.values(s.val())
    .filter(r => !r.createdBy || r.createdBy === adminUid)
    .sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));
}

export async function deleteRoom(id) {
  await remove(ref(db,`rooms/${id}`));
}

// ── Teams — filtered by createdBy uid ────────────────────────────────────────
export async function getAllTeams(adminUid) {
  const s = await get(ref(db,"teams"));
  if(!s.exists()) return [];
  return Object.entries(s.val())
    .map(([id,t])=>({id,...t}))
    .filter(t => !t.createdBy || t.createdBy === adminUid)
    .sort((a,b)=>(a.name||"").localeCompare(b.name||""));
}

export async function saveTeam(team) {
  const id = team.id || uid();
  await set(ref(db,`teams/${id}`), { ...team, id, updatedAt: nowISO() });
  return id;
}

export async function deleteTeam(id) {
  await remove(ref(db,`teams/${id}`));
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export function signInWithGoogle() { return signInWithPopup(auth, googleProvider); }
export function signOutUser()      { return signOut(auth); }
export function onAuth(cb)         { return onAuthStateChanged(auth, cb); }
