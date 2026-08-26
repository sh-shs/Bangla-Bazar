// Main Application Script (UI Wiring, Search, Cart State, Mobile Nav)
import { fetchPublishedProducts, fetchBanners, renderProductCard, DEFAULT_CATEGORIES, DEFAULT_BANNERS } from './products.js';
import { toggleWishlist, isProductInWishlist } from './auth.js';

// Global Cart State (localStorage backed)
export function getCart() {
  return JSON.parse(localStorage.getItem('bb_cart') || '[]');
}

export function saveCart(cart) {
  localStorage.setItem('bb_cart', JSON.stringify(cart));
  updateCartUI();
}

export function addToCart(product) {
  const cart = getCart();
  const existing = cart.find(item => item.id === product.id && item.variant === product.variant);
  if (existing) {
    existing.quantity += product.quantity || 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      sellerId: product.sellerId || 'admin',
      variant: product.variant || '',
      quantity: product.quantity || 1
    });
  }
  saveCart(cart);
  showToast(`${product.name} added to cart!`);
}

export function updateCartUI() {
  const cart = getCart();
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Update header cart badge
  document.querySelectorAll('.cart-count-badge').forEach(el => el.textContent = totalItems);

  // Update bottom navigation cart badge
  document.querySelectorAll('.cart-badge-bottom').forEach(badge => {
    if (totalItems > 0) {
      badge.textContent = totalItems;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  });

  // Update floating cart summary bubble
  const cartBubble = document.getElementById('floating-cart-bubble');
  if (cartBubble) {
    if (totalItems > 0) {
      cartBubble.style.display = 'flex';
      const itemsEl = cartBubble.querySelector('.cart-items');
      const totalEl = cartBubble.querySelector('.cart-total');
      if (itemsEl) itemsEl.textContent = `${totalItems} Items`;
      if (totalEl) totalEl.textContent = `৳${totalPrice}`;
    } else {
      cartBubble.style.display = 'none';
    }
  }
}

// Toast Notification
export function showToast(message) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Expose handlers globally for onclick attributes
window.handleAddToCart = (id, name, price, image, sellerId = 'admin') => {
  addToCart({ id, name, price, image, sellerId, quantity: 1 });
};

window.handleWishlistToggle = async (id, btnEl) => {
  const isWishlisted = await toggleWishlist(id);
  const icon = btnEl.querySelector('i');
  if (isWishlisted) {
    btnEl.classList.add('active');
    icon.className = 'fas fa-heart';
    showToast('Added to Wishlist');
  } else {
    btnEl.classList.remove('active');
    icon.className = 'far fa-heart';
    showToast('Removed from Wishlist');
  }
};

window.toggleDrawer = () => {
  const drawer = document.getElementById('nav-drawer');
  const overlay = document.getElementById('drawer-overlay');
  if (drawer && overlay) {
    drawer.classList.toggle('active');
    overlay.classList.toggle('active');
  }
};

window.goBack = () => {
  if (document.referrer && document.referrer.includes(window.location.host)) {
    window.history.back();
  } else {
    window.location.href = 'index.html';
  }
};

// Search Setup
export function initSearch(allProducts) {
  const input = document.getElementById('search-input');
  const resultsDropdown = document.getElementById('search-results');
  if (!input || !resultsDropdown) return;

  input.addEventListener('input', (e) => {
    const val = e.target.value.trim().toLowerCase();
    if (val.length < 2) {
      resultsDropdown.classList.remove('active');
      return;
    }
    const matches = allProducts.filter(p => p.name.toLowerCase().includes(val) || (p.category && p.category.toLowerCase().includes(val)));
    if (matches.length > 0) {
      resultsDropdown.innerHTML = matches.slice(0, 6).map(p => `
        <div class="search-result-item" onclick="window.location.href='product-detail.html?slug=${p.slug || p.id}'">
          <img src="${p.images?.[0] || 'https://via.placeholder.com/40'}" alt="${p.name}">
          <div>
            <div style="font-size: 0.85rem; font-weight: 600;">${p.name}</div>
            <div style="font-size: 0.75rem; color: var(--accent-color); font-weight: bold;">৳${p.discountPrice || p.regularPrice}</div>
          </div>
        </div>
      `).join('');
      resultsDropdown.classList.add('active');
    } else {
      resultsDropdown.innerHTML = '<div style="padding: 10px; font-size: 0.85rem; color: #777;">No products found</div>';
      resultsDropdown.classList.add('active');
    }
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !resultsDropdown.contains(e.target)) {
      resultsDropdown.classList.remove('active');
    }
  });
}

// Carousel Banner Controls
let currentSlide = 0;
let carouselTimer = null;

export function initCarousel(banners) {
  const container = document.getElementById('carousel-container');
  const dotsContainer = document.getElementById('carousel-dots');
  if (!container || !dotsContainer || !banners || banners.length === 0) return;

  container.innerHTML = banners.map(b => {
    const imgSrc = (b.image && !b.image.startsWith('PASTE_CLOUDINARY_URL')) ? b.image : (b.fallbackImage || b.image);
    const linkUrl = b.linkTo || 'shop.html';
    const hasOverlay = (b.title && b.title.trim()) || (b.subtitle && b.subtitle.trim());
    return `
      <div class="carousel-slide" onclick="window.location.href='${linkUrl}'" style="cursor: pointer;">
        <img src="${imgSrc}" alt="${b.title || 'Banner'}" onerror="this.src='${b.fallbackImage || 'https://via.placeholder.com/1200x400?text=Bangla+Bazar'}'">
        ${hasOverlay ? `
        <div class="banner-overlay">
          <h2>${b.title || ''}</h2>
          <p>${b.subtitle || ''}</p>
        </div>` : ''}
      </div>
    `;
  }).join('');

  dotsContainer.innerHTML = banners.map((_, idx) => `<div class="dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></div>`).join('');

  const goToSlide = (index) => {
    currentSlide = (index + banners.length) % banners.length;
    container.style.transform = `translateX(-${currentSlide * 100}%)`;
    const dots = dotsContainer.querySelectorAll('.dot');
    dots.forEach((dot, idx) => dot.classList.toggle('active', idx === currentSlide));
  };

  const startAutoRotate = () => {
    if (carouselTimer) clearInterval(carouselTimer);
    carouselTimer = setInterval(() => {
      goToSlide(currentSlide + 1);
    }, 2000); // 2-second rotation
  };

  dotsContainer.querySelectorAll('.dot').forEach(dot => {
    dot.addEventListener('click', (e) => {
      const idx = parseInt(e.target.getAttribute('data-index'), 10);
      goToSlide(idx);
      startAutoRotate();
    });
  });

  // Touch / Swipe Gesture support for mobile devices
  let startX = 0;
  let endX = 0;
  const heroSec = container.closest('.hero-section') || container;

  heroSec.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
  }, { passive: true });

  heroSec.addEventListener('touchend', (e) => {
    endX = e.changedTouches[0].clientX;
    const diff = startX - endX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        goToSlide(currentSlide + 1);
      } else {
        goToSlide(currentSlide - 1);
      }
      startAutoRotate();
    }
  }, { passive: true });

  startAutoRotate();
}

// Initializer on Page Load
async function initApp() {
  updateCartUI();

  // Dynamically update copyright year in footer
  const yearEl = document.getElementById('copyright-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // If on homepage, render catalog sections
  const trendingGrid = document.getElementById('trending-products');
  if (trendingGrid) {
    // 1. Render default categories and initial banner immediately (non-blocking)
    const catGrid = document.getElementById('category-grid');
    if (catGrid) {
      catGrid.innerHTML = DEFAULT_CATEGORIES.map(cat => `
        <div class="category-card" onclick="window.location.href='shop.html?category=${cat.id}'">
          <div class="category-icon-box"><i class="fas ${cat.icon}"></i></div>
          <span class="category-name">${cat.name}</span>
        </div>
      `).join('');
    }

    // Initialize carousel immediately with default local banners
    initCarousel(DEFAULT_BANNERS);

    // 2. Fetch remote banners asynchronously without blocking static components
    fetchBanners().then(banners => {
      if (banners && banners.length > 0) {
        initCarousel(banners);
      }
    }).catch(err => console.warn('Banner fetch error:', err));

    const products = await fetchPublishedProducts();
    initSearch(products);

    const renderGrid = (elementId, filterFn) => {
      const el = document.getElementById(elementId);
      if (el) {
        const filtered = filterFn ? products.filter(filterFn) : products;
        if (filtered.length > 0) {
          el.innerHTML = filtered.map(renderProductCard).join('');
        } else {
          el.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888; padding: 20px;">No products available yet in this section.</p>';
        }
      }
    };

    renderGrid('trending-products', p => p.isTrending);
    renderGrid('flash-sale-products', p => p.isFlashSale);
    renderGrid('latest-products', null);
    renderGrid('best-sellers-products', p => p.isBestSeller);
    renderGrid('recommended-products', p => p.isFeatured);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
