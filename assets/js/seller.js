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

// Upload Media (Image or Video) to Firebase Storage
export async function uploadMediaFile(file, folderPath = 'product-media') {
  const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
  const storageRef = ref(storage, `${folderPath}/${fileName}`);
  const uploadTask = await uploadBytesResumable(storageRef, file);
  const downloadURL = await getDownloadURL(uploadTask.ref);
  return downloadURL;
}

// Add or Update Seller Product
export async function saveSellerProduct(productData, productId = null) {
  if (!currentUser) throw new Error('Unauthorized');

  const payload = {
    ...productData,
    sellerId: currentUser.uid,
    sellerName: userProfile?.storeName || currentUser.displayName || 'Vendor',
    updatedAt: new Date()
  };

  if (productId) {
    await updateDoc(doc(db, 'products', productId), payload);
    return productId;
  } else {
    payload.createdAt = new Date();
    payload.status = 'published'; // Default to published once approved vendor
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
