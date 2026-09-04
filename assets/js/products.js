// Products Data Management & Firestore Helper Functions
import { db, collection, getDocs, doc, getDoc, query, where, orderBy, limit } from './firebase-config.js';
import { isProductInWishlist } from './auth.js';

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

export async function fetchActiveCategories() {
  try {
    const snap = await getDocs(collection(db, 'categories'));
    const list = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.isActive !== false) {
        list.push({
          id: data.slug || docSnap.id,
          name: data.name,
          icon: data.icon || 'fa-folder',
          image: data.image || '',
          ...data
        });
      }
    });

    if (list.length > 0) {
      return list;
    }
  } catch (err) {
    console.warn('Error fetching categories from Firestore, using default categories:', err);
  }
  return DEFAULT_CATEGORIES;
}

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
  if (!identifier) return null;
  const fetchPromise = (async () => {
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
      console.warn('Error fetching product detail from Firestore:', err);
    }
    return null;
  })();

  const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 3500));
  return Promise.race([fetchPromise, timeoutPromise]);
}

export function getProductShareUrl(identifier) {
  if (!identifier) return window.location.href;
  const base = window.location.href.split('?')[0].split('#')[0];
  const directory = base.substring(0, base.lastIndexOf('/') + 1);
  return `${directory}product-detail.html?id=${encodeURIComponent(identifier)}`;
}

export const DEFAULT_BANNERS = [
  {
    id: 'banner_1',
    image: 'assets/banners/hero-banner-1.jpg',
    fallbackImage: 'assets/banners/hero-banner-1.jpg',
    linkTo: 'offers.html'
  },
  {
    id: 'banner_2',
    image: 'assets/banners/hero-banner-2.jpg',
    fallbackImage: 'assets/banners/hero-banner-2.jpg',
    linkTo: 'shop.html'
  },
  {
    id: 'banner_3',
    image: 'assets/banners/hero-banner-3.jpg',
    fallbackImage: 'assets/banners/hero-banner-3.jpg',
    linkTo: 'shop.html'
  }
];

export async function fetchBanners() {
  try {
    const fetchPromise = (async () => {
      const snap = await getDocs(collection(db, 'banners'));
      const list = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.isActive !== false) {
          list.push({ id: docSnap.id, ...data });
        }
      });
      return list.length > 0 ? list : DEFAULT_BANNERS;
    })();

    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(DEFAULT_BANNERS), 1200));
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (err) {
    console.warn('Error fetching banners from Firestore, using default banners:', err);
    return DEFAULT_BANNERS;
  }
}

// Generate product card HTML snippet
export function renderProductCard(product) {
  const isDiscounted = product.discountPrice && Number(product.discountPrice) < Number(product.regularPrice);
  const currentPrice = isDiscounted ? product.discountPrice : product.regularPrice;
  const discountPercent = isDiscounted ? Math.round(((product.regularPrice - product.discountPrice) / product.regularPrice) * 100) : 0;
  const isOutOfStock = !product.stock || Number(product.stock) <= 0;
  const productIdOrSlug = product.id || product.slug;
  const productUrl = `product-detail.html?id=${encodeURIComponent(productIdOrSlug)}`;
  const imageSrc = product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/300?text=SHS+Bazar';
  const sellerId = product.sellerId || 'admin';

  return `
    <div class="product-card" data-product-id="${product.id}">
      <div class="product-thumb">
        <a href="${productUrl}">
          <img src="${imageSrc}" alt="${product.name}" loading="lazy">
        </a>
        ${isDiscounted ? `<span class="discount-badge">-${discountPercent}%</span>` : ''}
        ${isOutOfStock ? `<div class="stock-out-overlay">Stock Out</div>` : ''}
        <button class="share-btn-card" title="Share Product" onclick="event.preventDefault(); event.stopPropagation(); window.handleCopyProductLink('${product.id}')">
          <i class="fas fa-share-nodes"></i>
        </button>
        <button class="wishlist-btn-card ${isProductInWishlist(product.id) ? 'active' : ''}" onclick="window.handleWishlistToggle('${product.id}', this)">
          <i class="${isProductInWishlist(product.id) ? 'fas' : 'far'} fa-heart"></i>
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
