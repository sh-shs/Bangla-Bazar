// Multi-Vendor Seller Dashboard Management Module
import {
  db,
  storage,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  ref,
  uploadBytesResumable,
  getDownloadURL
} from './firebase-config.js';
import { currentUser, userProfile } from './auth.js';
import { showToast } from './app.js';

// Apply for Seller Registration
export async function applyForSeller(storeName, phone, nid, address) {
  if (!currentUser) throw new Error('Must be logged in to become a seller');

  const sellerPayload = {
    sellerStatus: 'pending',
    storeName,
    sellerPhone: phone,
    sellerNID: nid,
    sellerAddress: address,
    sellerRequestedAt: new Date()
  };

  await updateDoc(doc(db, 'users', currentUser.uid), sellerPayload);
  return sellerPayload;
}

// Upload Media (Image or Video) with Cloudinary & Firebase Storage support & fast placeholder fallback
export async function uploadMediaFile(file, folderPath = 'products/images') {
  if (!file) return null;

  // 1. Try Cloudinary Unauthenticated Upload first
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'Bangla Bazar');
    const isVideo = file.type && file.type.startsWith('video');
    const resourceType = isVideo ? 'video' : 'image';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`https://api.cloudinary.com/v1_1/vhc6a9gy/${resourceType}/upload`, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.secure_url) return data.secure_url;
    }
  } catch (e) {
    console.warn('Cloudinary upload fallback:', e);
  }

  // 2. Try Firebase Storage with 5s timeout
  try {
    const uploadPromise = (async () => {
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const storageRef = ref(storage, `${folderPath}/${fileName}`);
      const uploadTask = await uploadBytesResumable(storageRef, file);
      return await getDownloadURL(uploadTask.ref);
    })();

    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 5000));
    const url = await Promise.race([uploadPromise, timeoutPromise]);
    if (url) return url;
  } catch (e) {
    console.warn('Firebase Storage upload fallback:', e);
  }

  // 3. Clean static image URL fallback (never generates huge Base64 strings to avoid 1MB Firestore limit)
  const cleanName = encodeURIComponent(file.name.substring(0, 20));
  return `https://via.placeholder.com/600x400/0B4D3C/FFFFFF?text=${cleanName}`;
}

// Add or Update Seller Product
export async function saveSellerProduct(productData, productId = null) {
  const activeUser = currentUser || auth.currentUser;

  const payload = {
    ...productData,
    sellerId: activeUser ? activeUser.uid : 'admin',
    sellerName: userProfile?.storeName || (activeUser ? activeUser.displayName : null) || 'Bangla Bazar Admin',
    updatedAt: new Date()
  };

  if (productId) {
    await updateDoc(doc(db, 'products', productId), payload);
    return productId;
  } else {
    payload.createdAt = new Date();
    payload.status = 'published';
    const docRef = await addDoc(collection(db, 'products'), payload);
    return docRef.id;
  }
}

// Fetch Products belonging exclusively to logged in Seller
export async function fetchMyProducts() {
  if (!currentUser) return [];
  const q = query(collection(db, 'products'), where('sellerId', '==', currentUser.uid));
  const snap = await getDocs(q);
  const list = [];
  snap.forEach(d => list.push({ id: d.id, ...d.data() }));
  return list;
}

// Delete Product (Seller's own)
export async function deleteSellerProduct(productId) {
  if (!currentUser) return;
  await deleteDoc(doc(db, 'products', productId));
}

// Fetch Orders containing Seller's Products using array-contains
export async function fetchMyOrders() {
  if (!currentUser) return [];
  const q = query(collection(db, 'orders'), where('sellerIds', 'array-contains', currentUser.uid));
  const snap = await getDocs(q);
  const myOrders = [];

  snap.forEach(docSnap => {
    const order = { id: docSnap.id, ...docSnap.data() };
    const sellerItems = order.items.filter(item => item.sellerId === currentUser.uid);
    if (sellerItems.length > 0) {
      myOrders.push({ ...order, items: sellerItems });
    }
  });
  return myOrders;
}
