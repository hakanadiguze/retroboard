import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, update, onValue, off, push, query, orderByChild } from "firebase/database";
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

const app  = initializeApp(firebaseConfig);
export const db   = getDatabase(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const uid    = () => Math.random().toString(36).slice(2, 10);
export const nowISO = () => new Date().toISOString();
export const roomRef  = (id) => ref(db, `rooms/${id}`);
export const teamsRef = ()   => ref(db, "teams");

export async function fbGet(id)       { const s=await get(roomRef(id)); return s.exists()?s.val():null; }
export async function fbSet(id, data) { await set(roomRef(id), data); }

export async function getAllRooms() {
  const s = await get(ref(db,"rooms"));
  if(!s.exists()) return [];
  return Object.values(s.val()).sort((a,b)=>b.createdAt?.localeCompare(a.createdAt||"")||0);
}

export async function getAllTeams() {
  const s = await get(ref(db,"teams"));
  if(!s.exists()) return [];
  return Object.entries(s.val()).map(([id,t])=>({id,...t}));
}

export async function saveTeam(team) {
  const id = team.id || uid();
  await set(ref(db,`teams/${id}`), { ...team, id, updatedAt: nowISO() });
  return id;
}

export function signInWithGoogle() { return signInWithPopup(auth, googleProvider); }
export function signOutUser()      { return signOut(auth); }
export function onAuth(cb)         { return onAuthStateChanged(auth, cb); }
