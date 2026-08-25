// Super Admin Management Module
import {
  db,
  storage,
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  ref,
  uploadBytesResumable,
  getDownloadURL
} from './firebase-config.js';
import { SUPER_ADMIN_EMAIL, currentUser, userProfile } from './auth.js';

export function isSuperAdminUser(user, profile) {
  if (!user) return false;
  if (user.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) return true;
  return profile && profile.role === 'admin';
}

// Admin: Save Delivery Charge Settings
export async function saveAdminDeliverySettings(insideKushtia, outsideKushtia) {
  await setDoc(doc(db, 'settings', 'delivery'), {
    insideKushtia: Number(insideKushtia),
    outsideKushtia: Number(outsideKushtia),
    updatedAt: new Date()
  });
}

// Admin: Save Payment Settings
export async function saveAdminPaymentSettings(bKashNumber, codEnabled) {
  await setDoc(doc(db, 'settings', 'payment'), {
    bKashNumber,
    codEnabled,
    updatedAt: new Date()
  });
}

// Admin: Manage Seller Approval (Approve/Reject/Suspend)
export async function updateSellerStatus(userId, status) {
  await updateDoc(doc(db, 'users', userId), {
    sellerStatus: status, // 'approved', 'rejected', 'suspended'
    updatedAt: new Date()
  });
}

// Admin: Update Order Status
export async function updateOrderStatus(orderId, orderStatus) {
  await updateDoc(doc(db, 'orders', orderId), {
    orderStatus,
    updatedAt: new Date()
  });
}

// Admin: Coupon CRUD
export async function createCoupon(code, discountPercent, flatDiscount, minSpend) {
  await addDoc(collection(db, 'coupons'), {
    code: code.toUpperCase(),
    discountPercent: Number(discountPercent || 0),
    flatDiscount: Number(flatDiscount || 0),
    minSpend: Number(minSpend || 0),
    createdAt: new Date()
  });
}

export async function fetchCoupons() {
  const snap = await getDocs(collection(db, 'coupons'));
  const coupons = [];
  snap.forEach(d => coupons.push({ id: d.id, ...d.data() }));
  return coupons;
}

export async function deleteCoupon(couponId) {
  await deleteDoc(doc(db, 'coupons', couponId));
}

// Admin: Category CRUD
export async function createCategory(name, iconClass) {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  await setDoc(doc(db, 'categories', id), {
    name,
    icon: iconClass || 'fa-folder',
    createdAt: new Date()
  });
}

export async function fetchCategoriesFromDB() {
  const snap = await getDocs(collection(db, 'categories'));
  const list = [];
  snap.forEach(d => list.push({ id: d.id, ...d.data() }));
  return list;
}

export async function deleteCategoryFromDB(catId) {
  await deleteDoc(doc(db, 'categories', catId));
}

// Admin: Banner Management
export async function addBanner(title, subtitle, imageFile) {
  let imageUrl = 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80';
  if (imageFile) {
    const fileName = `banners/${Date.now()}_${imageFile.name}`;
    const storageRef = ref(storage, fileName);
    const snap = await uploadBytesResumable(storageRef, imageFile);
    imageUrl = await getDownloadURL(snap.ref);
  }
  await addDoc(collection(db, 'banners'), {
    title,
    subtitle,
    image: imageUrl,
    createdAt: new Date()
  });
}
