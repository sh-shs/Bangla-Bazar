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

// -------------------------------------------------------------
// 1. Settings CRUD Functions
// -------------------------------------------------------------
export async function fetchAdminSettings() {
  try {
    const deliverySnap = await getDoc(doc(db, 'settings', 'delivery'));
    const paymentSnap = await getDoc(doc(db, 'settings', 'payment'));
    const generalSnap = await getDoc(doc(db, 'settings', 'general'));

    return {
      delivery: deliverySnap.exists() ? deliverySnap.data() : { insideKushtia: 100, outsideKushtia: 160 },
      payment: paymentSnap.exists() ? paymentSnap.data() : { bKashNumber: '01342697743', codEnabled: true },
      general: generalSnap.exists() ? generalSnap.data() : { siteName: 'Bangla Bazar', hotline: '+8809658183506', supportEmail: 'saripofficialsupport@gmail.com' }
    };
  } catch (err) {
    console.error('Error fetching admin settings:', err);
    return {
      delivery: { insideKushtia: 100, outsideKushtia: 160 },
      payment: { bKashNumber: '01342697743', codEnabled: true },
      general: { siteName: 'Bangla Bazar', hotline: '+8809658183506', supportEmail: 'saripofficialsupport@gmail.com' }
    };
  }
}

export async function saveAdminDeliverySettings(insideKushtia, outsideKushtia) {
  await setDoc(doc(db, 'settings', 'delivery'), {
    insideKushtia: Number(insideKushtia),
    outsideKushtia: Number(outsideKushtia),
    updatedAt: new Date()
  }, { merge: true });
}

export async function saveAdminPaymentSettings(bKashNumber, codEnabled) {
  await setDoc(doc(db, 'settings', 'payment'), {
    bKashNumber,
    codEnabled: Boolean(codEnabled),
    updatedAt: new Date()
  }, { merge: true });
}

export async function saveAdminGeneralSettings(data) {
  await setDoc(doc(db, 'settings', 'general'), {
    ...data,
    updatedAt: new Date()
  }, { merge: true });
}

// -------------------------------------------------------------
// 2. Category CRUD Functions
// -------------------------------------------------------------
export async function createCategory(name, iconClass, description = '') {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  await setDoc(doc(db, 'categories', id), {
    name,
    icon: iconClass || 'fa-folder',
    description: description.trim(),
    createdAt: new Date()
  });
}

export async function updateCategory(catId, data) {
  await updateDoc(doc(db, 'categories', catId), {
    ...data,
    updatedAt: new Date()
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

// -------------------------------------------------------------
// 3. Sellers & Customers Management Functions
// -------------------------------------------------------------
export async function fetchUsersFromDB() {
  const snap = await getDocs(collection(db, 'users'));
  const users = [];
  snap.forEach(d => users.push({ id: d.id, ...d.data() }));
  return users;
}

export async function updateSellerStatus(userId, status) {
  await updateDoc(doc(db, 'users', userId), {
    sellerStatus: status, // 'approved', 'rejected', 'suspended', 'pending'
    role: status === 'approved' ? 'seller' : 'customer',
    updatedAt: new Date()
  });
}

export async function updateUserProfile(userId, data) {
  await updateDoc(doc(db, 'users', userId), {
    ...data,
    updatedAt: new Date()
  });
}

export async function deleteUserDoc(userId) {
  await deleteDoc(doc(db, 'users', userId));
}

// -------------------------------------------------------------
// 4. Order Management Functions
// -------------------------------------------------------------
export async function fetchOrdersFromDB() {
  const snap = await getDocs(collection(db, 'orders'));
  const orders = [];
  snap.forEach(d => orders.push({ id: d.id, ...d.data() }));
  return orders;
}

export async function updateOrderStatus(orderId, orderStatus) {
  await updateDoc(doc(db, 'orders', orderId), {
    orderStatus,
    updatedAt: new Date()
  });
}

export async function updatePaymentStatus(orderId, paymentStatus) {
  await updateDoc(doc(db, 'orders', orderId), {
    paymentStatus,
    updatedAt: new Date()
  });
}

export async function deleteOrderDoc(orderId) {
  await deleteDoc(doc(db, 'orders', orderId));
}

// -------------------------------------------------------------
// 5. Coupon CRUD Functions
// -------------------------------------------------------------
export async function createCoupon(code, discountPercent, flatDiscount, minSpend, isActive = true) {
  await addDoc(collection(db, 'coupons'), {
    code: code.toUpperCase().trim(),
    discountPercent: Number(discountPercent || 0),
    flatDiscount: Number(flatDiscount || 0),
    minSpend: Number(minSpend || 0),
    isActive: Boolean(isActive),
    createdAt: new Date()
  });
}

export async function updateCoupon(couponId, data) {
  await updateDoc(doc(db, 'coupons', couponId), {
    ...data,
    updatedAt: new Date()
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

export async function toggleCouponStatus(couponId, currentStatus) {
  await updateDoc(doc(db, 'coupons', couponId), {
    isActive: !currentStatus,
    updatedAt: new Date()
  });
}

// -------------------------------------------------------------
// 6. Banner Management Functions
// -------------------------------------------------------------
export async function addBanner(title, subtitle, imageFile, linkTo = 'shop.html') {
  let imageUrl = 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80';
  if (imageFile) {
    const fileName = `banners/${Date.now()}_${imageFile.name}`;
    const storageRef = ref(storage, fileName);
    const snap = await uploadBytesResumable(storageRef, imageFile);
    imageUrl = await getDownloadURL(snap.ref);
  }
  await addDoc(collection(db, 'banners'), {
    title: title.trim(),
    subtitle: subtitle ? subtitle.trim() : '',
    image: imageUrl,
    linkTo: linkTo ? linkTo.trim() : 'shop.html',
    isActive: true,
    createdAt: new Date()
  });
}

export async function updateBanner(bannerId, data, newImageFile = null) {
  let updatePayload = { ...data, updatedAt: new Date() };
  if (newImageFile) {
    const fileName = `banners/${Date.now()}_${newImageFile.name}`;
    const storageRef = ref(storage, fileName);
    const snap = await uploadBytesResumable(storageRef, newImageFile);
    updatePayload.image = await getDownloadURL(snap.ref);
  }
  await updateDoc(doc(db, 'banners', bannerId), updatePayload);
}

export async function fetchBannersFromDB() {
  const snap = await getDocs(collection(db, 'banners'));
  const banners = [];
  snap.forEach(d => banners.push({ id: d.id, ...d.data() }));
  return banners;
}

export async function deleteBannerFromDB(bannerId) {
  await deleteDoc(doc(db, 'banners', bannerId));
}

export async function toggleBannerVisibility(bannerId, currentStatus) {
  await updateDoc(doc(db, 'banners', bannerId), {
    isActive: !currentStatus,
    updatedAt: new Date()
  });
}
