// Multi-Vendor Seller Dashboard Management Module
import {
  db,
  auth,
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

// Apply for Seller Registration
export async function applyForSeller(storeName, phone, nid, address) {
  if (!currentUser) throw new Error('Must be logged in to become a seller');

  const sellerPayload = {
    sellerStatus: 'pending',
    storeName: storeName ? storeName.trim() : '',
    sellerPhone: phone ? phone.trim() : '',
    sellerNID: nid ? nid.trim() : '',
    sellerAddress: address ? address.trim() : '',
    sellerRequestedAt: new Date()
  };

  await updateDoc(doc(db, 'users', currentUser.uid), sellerPayload);
  return sellerPayload;
}

// Client-side Image Resizing/Compression to avoid multi-MB uploads on mobile
export async function compressImage(file, maxDimension = 1200, quality = 0.85) {
  if (!file || !file.type || !file.type.startsWith('image/')) return file;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

// Upload Media (Image or Video) with Cloudinary, Firebase Storage fallback & fast placeholder fallback
export async function uploadMediaFile(file, folderPath = 'products/images', timeoutMs = 15000) {
  if (!file) return null;

  // Compress image client-side if it's an image
  const uploadFile = file.type && file.type.startsWith('image/') ? await compressImage(file) : file;

  // 1. Try Cloudinary Unauthenticated Upload first
  try {
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('upload_preset', 'Bangla Bazar');
    const isVideo = uploadFile.type && uploadFile.type.startsWith('video');
    const resourceType = isVideo ? 'video' : 'image';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
      const fileName = `${Date.now()}_${uploadFile.name.replace(/\s+/g, '_')}`;
      const storageRef = ref(storage, `${folderPath}/${fileName}`);
      const uploadTask = await uploadBytesResumable(storageRef, uploadFile);
      return await getDownloadURL(uploadTask.ref);
    })();

    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 5000));
    const url = await Promise.race([uploadPromise, timeoutPromise]);
    if (url) return url;
  } catch (e) {
    console.warn('Firebase Storage upload fallback:', e);
  }

  // 3. Clean static image URL fallback (never generates huge Base64 strings to avoid 1MB Firestore limit)
  const cleanName = encodeURIComponent(uploadFile.name.substring(0, 20));
  return `https://via.placeholder.com/600x400/0B4D3C/FFFFFF?text=${cleanName}`;
}

// Add or Update Seller Product
export async function saveSellerProduct(productData, productId = null) {
  try {
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
  } catch (err) {
    console.error('Error in saveSellerProduct:', err);
    throw err;
  }
}

// Fetch Products belonging exclusively to logged in Seller
export async function fetchMyProducts() {
  try {
    if (!currentUser) return [];
    const q = query(collection(db, 'products'), where('sellerId', '==', currentUser.uid));
    const snap = await getDocs(q);
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    return list;
  } catch (err) {
    console.warn('Error fetching seller products:', err);
    return [];
  }
}

// Delete Product (Seller's own)
export async function deleteSellerProduct(productId) {
  try {
    if (!currentUser) return;
    await deleteDoc(doc(db, 'products', productId));
  } catch (err) {
    console.error('Error deleting seller product:', err);
    throw err;
  }
}

// Fetch Orders containing Seller's Products using array-contains
export async function fetchMyOrders() {
  try {
    if (!currentUser) return [];
    const q = query(collection(db, 'orders'), where('sellerIds', 'array-contains', currentUser.uid));
    const snap = await getDocs(q);
    const myOrders = [];

    snap.forEach(docSnap => {
      const order = { id: docSnap.id, ...docSnap.data() };
      const items = Array.isArray(order.items) ? order.items : [];
      const sellerItems = items.filter(item => item.sellerId === currentUser.uid);
      if (sellerItems.length > 0) {
        myOrders.push({ ...order, items: sellerItems });
      }
    });
    return myOrders;
  } catch (err) {
    console.warn('Error fetching seller orders:', err);
    return [];
  }
}
