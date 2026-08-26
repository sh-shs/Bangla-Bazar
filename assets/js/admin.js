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
export function generateCategorySlug(name) {
  return (name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export async function createCategory(categoryData) {
  // Accepts object or positional arguments for backward compatibility
  let name, icon, description, slug, image, isActive;
  if (typeof categoryData === 'string') {
    name = categoryData;
    icon = arguments[1] || 'fa-folder';
    description = arguments[2] || '';
    slug = generateCategorySlug(name);
    image = '';
    isActive = true;
  } else {
    name = categoryData.name;
    slug = categoryData.slug;
    description = categoryData.description;
    image = categoryData.image;
    icon = categoryData.icon;
    isActive = categoryData.isActive;
  }

  name = (name || '').trim();
  if (!name) {
    throw new Error('Category name is required.');
  }

  slug = (slug || '').trim();
  if (!slug) {
    slug = generateCategorySlug(name);
  } else {
    slug = generateCategorySlug(slug);
  }

  if (!slug) {
    throw new Error('Valid category slug is required.');
  }

  // Check unique slug in Firestore
  const q = query(collection(db, 'categories'), where('slug', '==', slug));
  const snap = await getDocs(q);
  if (!snap.empty) {
    throw new Error('This category slug already exists. Please use a unique slug.');
  }

  const docId = slug;
  const docRef = doc(db, 'categories', docId);
  const existingDoc = await getDoc(docRef);
  if (existingDoc.exists()) {
    throw new Error('This category already exists.');
  }

  const payload = {
    name,
    slug,
    description: (description || '').trim(),
    image: (image || '').trim(),
    icon: (icon || 'fa-folder').trim(),
    isActive: isActive !== false,
    createdAt: new Date()
  };

  await setDoc(docRef, payload);
  return { id: docId, ...payload };
}

export async function updateCategory(catId, categoryData) {
  const name = (categoryData.name || '').trim();
  if (!name) {
    throw new Error('Category name is required.');
  }

  let slug = (categoryData.slug || '').trim();
  if (!slug) {
    slug = generateCategorySlug(name);
  } else {
    slug = generateCategorySlug(slug);
  }

  // Check unique slug if slug matches another document
  const q = query(collection(db, 'categories'), where('slug', '==', slug));
  const snap = await getDocs(q);
  const duplicate = snap.docs.find(d => d.id !== catId);
  if (duplicate) {
    throw new Error('This category slug already exists on another category.');
  }

  const payload = {
    name,
    slug,
    description: (categoryData.description || '').trim(),
    image: (categoryData.image || '').trim(),
    icon: (categoryData.icon || 'fa-folder').trim(),
    isActive: categoryData.isActive !== false,
    updatedAt: new Date()
  };

  await updateDoc(doc(db, 'categories', catId), payload);
}

export async function toggleCategoryStatus(catId, currentStatus) {
  await updateDoc(doc(db, 'categories', catId), {
    isActive: !currentStatus,
    updatedAt: new Date()
  });
}

export async function fetchCategoriesFromDB() {
  try {
    const snap = await getDocs(collection(db, 'categories'));
    const list = [];
    snap.forEach(d => {
      const data = d.data();
      list.push({
        id: d.id,
        slug: data.slug || d.id,
        isActive: data.isActive !== false,
        ...data
      });
    });
    return list;
  } catch (err) {
    console.error('Error fetching categories from DB:', err);
    return [];
  }
}

export async function deleteCategoryFromDB(catId) {
  await deleteDoc(doc(db, 'categories', catId));
}

// -------------------------------------------------------------
// 3. Sellers & Customers Management Functions
// -------------------------------------------------------------
export async function fetchUsersFromDB() {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const users = [];
    snap.forEach(d => users.push({ id: d.id, ...d.data() }));
    return users;
  } catch (err) {
    console.error('Error fetching users from DB:', err);
    return [];
  }
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
  try {
    const snap = await getDocs(collection(db, 'orders'));
    const orders = [];
    snap.forEach(d => orders.push({ id: d.id, ...d.data() }));
    return orders;
  } catch (err) {
    console.error('Error fetching orders from DB:', err);
    return [];
  }
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
export function normalizeCouponCode(code) {
  return (code || '').toUpperCase().trim().replace(/\s+/g, '');
}

export function validateCouponData(data, existingCoupons = [], currentId = null) {
  const code = normalizeCouponCode(data.code);
  if (!code) {
    throw new Error('Coupon code is required.');
  }

  // Check unique coupon code
  const duplicate = existingCoupons.find(c => normalizeCouponCode(c.code) === code && c.id !== currentId);
  if (duplicate) {
    throw new Error('This coupon code already exists. Please use a unique coupon code.');
  }

  const discountType = data.discountType || 'percentage';
  let discountPercent = 0;
  let flatDiscount = 0;

  if (discountType === 'percentage') {
    discountPercent = Number(data.discountPercent);
    if (isNaN(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
      throw new Error('Discount percentage must be between 1 and 100.');
    }
  } else if (discountType === 'flat') {
    flatDiscount = Number(data.flatDiscount);
    if (isNaN(flatDiscount) || flatDiscount <= 0) {
      throw new Error('Flat discount amount must be greater than 0.');
    }
  } else {
    throw new Error('Invalid discount type selected.');
  }

  const minSpend = Number(data.minSpend || 0);
  if (isNaN(minSpend) || minSpend < 0) {
    throw new Error('Minimum spend must be 0 or a positive number.');
  }

  return {
    code,
    discountType,
    discountPercent,
    flatDiscount,
    minSpend,
    isActive: data.isActive !== false
  };
}

export async function createCoupon(couponData) {
  // Support legacy positional arguments for backward compatibility
  let data;
  if (typeof couponData === 'string') {
    const discountPercent = Number(arguments[1] || 0);
    const flatDiscount = Number(arguments[2] || 0);
    data = {
      code: couponData,
      discountType: discountPercent > 0 ? 'percentage' : 'flat',
      discountPercent,
      flatDiscount,
      minSpend: Number(arguments[3] || 0),
      isActive: arguments[4] !== false
    };
  } else {
    data = couponData;
  }

  const existingCoupons = await fetchCoupons();
  const validated = validateCouponData(data, existingCoupons);

  const docRef = await addDoc(collection(db, 'coupons'), {
    ...validated,
    createdAt: new Date()
  });

  return { id: docRef.id, ...validated };
}

export async function updateCoupon(couponId, couponData) {
  const existingCoupons = await fetchCoupons();
  const validated = validateCouponData(couponData, existingCoupons, couponId);

  await updateDoc(doc(db, 'coupons', couponId), {
    ...validated,
    updatedAt: new Date()
  });
}

export async function fetchCoupons() {
  try {
    const snap = await getDocs(collection(db, 'coupons'));
    const coupons = [];
    snap.forEach(d => {
      const data = d.data();
      coupons.push({
        id: d.id,
        code: normalizeCouponCode(data.code),
        discountType: data.discountType || (data.discountPercent ? 'percentage' : 'flat'),
        discountPercent: Number(data.discountPercent || 0),
        flatDiscount: Number(data.flatDiscount || 0),
        minSpend: Number(data.minSpend || 0),
        isActive: data.isActive !== false,
        ...data
      });
    });
    return coupons;
  } catch (err) {
    console.error('Error fetching coupons from DB:', err);
    return [];
  }
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
  try {
    const snap = await getDocs(collection(db, 'banners'));
    const banners = [];
    snap.forEach(d => banners.push({ id: d.id, ...d.data() }));
    return banners;
  } catch (err) {
    console.error('Error fetching banners from DB:', err);
    return [];
  }
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
