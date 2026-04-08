// =======================================================
// Noventiq Data & AI Team — Firebase Configuration
// Replace the values below with your Firebase project config:
// Firebase Console → Project Settings → Your apps → Web app → SDK setup
// =======================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getAuth }      from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getStorage }   from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAc38YwY1fER4qOW9LL6k6etVo5C1Z_YKw",
  authDomain: "noventiq-data-ai.firebaseapp.com",
  projectId: "noventiq-data-ai",
  storageBucket: "noventiq-data-ai.firebasestorage.app",
  messagingSenderId: "397335565732",
  appId: "1:397335565732:web:67cca059a0b06cea6a1d31",
  measurementId: "G-1SK90G719Y"
};

const app = initializeApp(firebaseConfig);

export const db      = getFirestore(app);
export const auth    = getAuth(app);
export const storage = getStorage(app);
