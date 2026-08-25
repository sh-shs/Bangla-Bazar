// Bangla Bazar Authentication & User State Module
import {
  auth,
  db,
  googleProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from './firebase-config.js';

export const SUPER_ADMIN_EMAIL = 'banglabazaroffical@gmail.com';

export let currentUser = null;
export let userProfile = null;

// Helper to notify subscribers on auth changes
const authStateListeners = [];
export function onAuthStateUpdate(callback) {
  authStateListeners.push(callback);
}

function notifyAuthStateListeners() {
  authStateListeners.forEach(cb => cb(currentUser, userProfile));
}

// Initialize Auth Listener
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    const isSuperAdmin = (user.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());

    // Fetch user profile document from Firestore
    const userDocRef = doc(db, 'users', user.uid);
    let snap = await getDoc(userDocRef);

    if (!snap.exists()) {
      // Create user record if missing
      const initialData = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email.split('@')[0],
        photoURL: user.photoURL || '',
        role: isSuperAdmin ? 'admin' : 'customer',
        sellerStatus: isSuperAdmin ? 'approved' : 'none', // none, pending, approved, suspended
        wishlist: [],
        createdAt: serverTimestamp()
      };
      await setDoc(userDocRef, initialData);
      userProfile = initialData;
    } else {
      userProfile = snap.data();
      // Ensure super admin role is enforced
      if (isSuperAdmin && userProfile.role !== 'admin') {
        await updateDoc(userDocRef, { role: 'admin', sellerStatus: 'approved' });
        userProfile.role = 'admin';
        userProfile.sellerStatus = 'approved';
      }
    }
  } else {
    userProfile = null;
  }

  updateHeaderAuthUI();
  notifyAuthStateListeners();
});

// Update Header UI based on user auth state (using relative paths for GitHub Pages compatibility)
function updateHeaderAuthUI() {
  const accountBtns = document.querySelectorAll('.account-icon-btn, .account-link');
  accountBtns.forEach(btn => {
    if (currentUser) {
      btn.href = userProfile && userProfile.role === 'admin' ? 'admin.html' : 'profile.html';
    } else {
      btn.href = 'login.html';
    }
  });

  // Update wishlist count badge
  const wishlistBadges = document.querySelectorAll('.wishlist-count-badge');
  const wishlistCount = (userProfile && userProfile.wishlist) ? userProfile.wishlist.length : getLocalWishlist().length;
  wishlistBadges.forEach(badge => {
    badge.textContent = wishlistCount;
  });
}

// Wishlist Helpers (supports logged in sync + guest local storage)
export function getLocalWishlist() {
  return JSON.parse(localStorage.getItem('bb_wishlist') || '[]');
}

export async function toggleWishlist(productId) {
  if (currentUser && userProfile) {
    let wishlist = userProfile.wishlist || [];
    if (wishlist.includes(productId)) {
      wishlist = wishlist.filter(id => id !== productId);
    } else {
      wishlist.push(productId);
    }
    userProfile.wishlist = wishlist;
    await updateDoc(doc(db, 'users', currentUser.uid), { wishlist });
  } else {
    let wishlist = getLocalWishlist();
    if (wishlist.includes(productId)) {
      wishlist = wishlist.filter(id => id !== productId);
    } else {
      wishlist.push(productId);
    }
    localStorage.setItem('bb_wishlist', JSON.stringify(wishlist));
  }
  updateHeaderAuthUI();
  return isProductInWishlist(productId);
}

export function isProductInWishlist(productId) {
  if (userProfile && userProfile.wishlist) {
    return userProfile.wishlist.includes(productId);
  }
  return getLocalWishlist().includes(productId);
}

// Auth Actions
export async function registerWithEmail(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  const isSuperAdmin = (email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());
  const initialData = {
    uid: cred.user.uid,
    email: email,
    displayName: displayName,
    photoURL: '',
    role: isSuperAdmin ? 'admin' : 'customer',
    sellerStatus: isSuperAdmin ? 'approved' : 'none',
    wishlist: [],
    createdAt: serverTimestamp()
  };
  await setDoc(doc(db, 'users', cred.user.uid), initialData);
  return cred.user;
}

export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function resetPassword(email) {
  return await sendPasswordResetEmail(auth, email);
}

export async function logoutUser() {
  await signOut(auth);
  window.location.href = 'index.html';
}
