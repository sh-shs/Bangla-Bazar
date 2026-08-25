// Firebase Configuration and Initialization Module for Bangla Bazar
// Import standard SDK modules from Firebase CDN (v10 JS ESM)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    addDoc,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    deleteDoc,
    serverTimestamp,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
    getStorage,
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Default or window injected Firebase config object
const firebaseConfig = window.firebaseConfig || {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "bangla-bazar-kushtia.firebaseapp.com",
    projectId: "bangla-bazar-kushtia",
    storageBucket: "bangla-bazar-kushtia.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export {
    app,
    auth,
    db,
    storage,
    googleProvider,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    updateProfile,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    addDoc,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    deleteDoc,
    serverTimestamp,
    onSnapshot,
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject
};
