// Products Data Management & Firestore Helper Functions
import { db, collection, getDocs, doc, getDoc, query, where, orderBy, limit } from './firebase-config.js';

// Fallback initial categories array as defined in requirement
export const DEFAULT_CATEGORIES = [
  { id: 'electronics', name: 'Electronics', icon: 'fa-laptop' },
  { id: 'fashion', name: 'Fashion', icon: 'fa-tshirt' },
  { id: 'home-living', name: 'Home & Living', icon: 'fa-couch' },
  { id: 'kitchen', name: 'Kitchen', icon: 'fa-utensils' },
  { id: 'beauty', name: 'Beauty', icon: 'fa-pump-soap' },
  { id: 'health', name: 'Health', icon: 'fa-heartbeat' },
  { id: 'baby-care', name: 'Baby Care', icon: 'fa-baby' },
  { id: 'sports', name: 'Sports', icon: 'fa-football-ball' },
  { id: 'lighting', name: 'Lighting', icon: 'fa-lightbulb' },
  { id: 'gadgets', name: 'Gadgets', icon: 'fa-mobile-alt' }
];

export async function fetchPublishedProducts() {
  try {
    const q = query(collection(db, 'products'), where('status', '==', 'published'));
    const snap = await getDocs(q);
    const products = [];
    snap.forEach(docSnap => {
      products.push({ id: docSnap.id, ...docSnap.data() });
    });
    return products;
  } catch (err) {
    console.warn('Firestore products fetch error / offline mode, returning empty array:', err);
    return [];
  }
}

export async function fetchProductBySlugOrId(identifier) {
  try {
    // Check by ID
    const docRef = doc(db, 'products', identifier);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    // Check by slug
    const q = query(collection(db, 'products'), where('slug', '==', identifier), limit(1));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      const docSnap = querySnap.docs[0];
      return { id: docSnap.id, ...docSnap.data() };
    }
  } catch (err) {
    console.error('Error fetching product detail:', err);
  }
  return null;
}

export async function fetchBanners() {
  try {
    const snap = await getDocs(collection(db, 'banners'));
    const banners = [];
    snap.forEach(docSnap => {
      banners.push({ id: docSnap.id, ...docSnap.data() });
    });
    if (banners.length > 0) return banners;
  } catch (e) {
    console.warn('Banner fetch error, using default banners');
  }
  return [
    {
      image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80',
      title: 'Grand Wholesale Offer!',
      subtitle: 'Up to 50% discount on local items across Kushtia'
    },
    {
      image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1200&q=80',
      title: 'Trending Electronics & Gadgets',
      subtitle: 'Best prices guaranteed on top brands'
    }
  ];
}

// Generate product card HTML snippet
export function renderProductCard(product) {
  const isDiscounted = product.discountPrice && Number(product.discountPrice) < Number(product.regularPrice);
  const currentPrice = isDiscounted ? product.discountPrice : product.regularPrice;
  const discountPercent = isDiscounted ? Math.round(((product.regularPrice - product.discountPrice) / product.regularPrice) * 100) : 0;
  const isOutOfStock = !product.stock || Number(product.stock) <= 0;
  const productUrl = `/product-detail.html?slug=${product.slug || product.id}`;
  const imageSrc = product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/300?text=Bangla+Bazar';
  const sellerId = product.sellerId || 'admin';

  return `
    <div class="product-card" data-product-id="${product.id}">
      <div class="product-thumb">
        <a href="${productUrl}">
          <img src="${imageSrc}" alt="${product.name}" loading="lazy">
        </a>
        ${isDiscounted ? `<span class="discount-badge">-${discountPercent}%</span>` : ''}
        ${isOutOfStock ? `<div class="stock-out-overlay">Stock Out</div>` : ''}
        <button class="wishlist-btn-card" onclick="window.handleWishlistToggle('${product.id}', this)">
          <i class="far fa-heart"></i>
        </button>
      </div>
      <div class="product-details">
        <a href="${productUrl}">
          <h3 class="product-title">${product.name}</h3>
        </a>
        <div class="product-price-wrap">
          <span class="current-price">৳${currentPrice}</span>
          ${isDiscounted ? `<span class="old-price">৳${product.regularPrice}</span>` : ''}
        </div>
        <button class="add-to-cart-btn ${isOutOfStock ? 'stock-out' : ''}"
          ${isOutOfStock ? 'disabled' : ''}
          onclick="window.handleAddToCart('${product.id}', '${product.name}', ${currentPrice}, '${imageSrc}', '${sellerId}')">
          <i class="fas fa-shopping-cart"></i> ${isOutOfStock ? 'Stock Out' : 'Add to Cart'}
        </button>
      </div>
    </div>
  `;
}
