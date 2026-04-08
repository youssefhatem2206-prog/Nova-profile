// =======================================================
// IMPORTANT: Replace these values with your Firebase project config
// Go to: Firebase Console → Project Settings → Your apps → Web app
// =======================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyB66YeKZgtveuE_OW6gPHEwvQpUzEahIGs",
    authDomain: "myportfolio-c1054.firebaseapp.com",
    projectId: "myportfolio-c1054",
    storageBucket: "myportfolio-c1054.firebasestorage.app",
    messagingSenderId: "993747807579",
    appId: "1:993747807579:web:013de4f73d655527067e7e",
    measurementId: "G-CPSWQHGPGN"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
