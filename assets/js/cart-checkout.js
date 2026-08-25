// Cart & Checkout Module
import { getCart, saveCart, showToast } from './app.js';
import { db, collection, addDoc, serverTimestamp, doc, getDoc } from './firebase-config.js';
import { currentUser } from './auth.js';

// Default delivery rates if not dynamically overridden in Firestore settings
let deliverySettings = {
  insideKushtia: 100,
  outsideKushtia: 160
};

export async function loadDeliverySettings() {
  try {
    const docSnap = await getDoc(doc(db, 'settings', 'delivery'));
    if (docSnap.exists()) {
      deliverySettings = { ...deliverySettings, ...docSnap.data() };
    }
  } catch (err) {
    console.warn('Using default delivery settings:', err);
  }
  return deliverySettings;
}

export function calculateDeliveryCharge(district) {
  if (district && district.trim().toLowerCase() === 'kushtia') {
    return Number(deliverySettings.insideKushtia);
  }
  return Number(deliverySettings.outsideKushtia);
}

// Render Cart Page Elements
export function renderCartItemsPage() {
  const container = document.getElementById('cart-items-container');
  const subtotalEl = document.getElementById('cart-subtotal');
  const grandTotalEl = document.getElementById('cart-grandtotal');

  if (!container) return;

  const cart = getCart();
  if (cart.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 16px;">
        <i class="fas fa-shopping-basket" style="font-size: 3rem; color: #CCC; margin-bottom: 12px;"></i>
        <h3 style="color: var(--text-muted);">Your Shopping Cart is Empty</h3>
        <a href="shop.html" class="btn-primary" style="display: inline-block; margin-top: 16px;">Continue Shopping</a>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = '৳0';
    if (grandTotalEl) grandTotalEl.textContent = '৳0';
    return;
  }

  container.innerHTML = cart.map((item, index) => `
    <div class="cart-item-card" style="display: flex; gap: 12px; padding: 12px; background: #FFF; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 10px; align-items: center;">
      <img src="${item.image}" alt="${item.name}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 6px;">
      <div style="flex: 1;">
        <h4 style="font-size: 0.9rem; font-weight: 600; line-height: 1.2;">${item.name}</h4>
        ${item.variant ? `<span style="font-size: 0.75rem; color: #777;">Variant: ${item.variant}</span>` : ''}
        <div style="font-weight: 700; color: var(--accent-color); font-size: 0.95rem; margin-top: 4px;">৳${item.price}</div>
      </div>
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
        <button onclick="window.removeCartItem(${index})" style="background: transparent; color: var(--danger-color); font-size: 0.9rem;"><i class="fas fa-trash"></i></button>
        <div style="display: flex; align-items: center; border: 1px solid var(--border-color); border-radius: 4px; overflow: hidden;">
          <button onclick="window.updateCartQty(${index}, -1)" style="padding: 2px 8px; background: #EEE;">-</button>
          <span style="padding: 2px 10px; font-size: 0.85rem; font-weight: bold;">${item.quantity}</span>
          <button onclick="window.updateCartQty(${index}, 1)" style="padding: 2px 8px; background: #EEE;">+</button>
        </div>
      </div>
    </div>
  `).join('');

  const subtotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  if (subtotalEl) subtotalEl.textContent = `৳${subtotal}`;
  if (grandTotalEl) grandTotalEl.textContent = `৳${subtotal}`;
}

window.updateCartQty = (index, delta) => {
  const cart = getCart();
  if (cart[index]) {
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) {
      cart.splice(index, 1);
    }
    saveCart(cart);
    renderCartItemsPage();
  }
};

window.removeCartItem = (index) => {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  renderCartItemsPage();
};

// Place Order into Firestore
export async function placeOrder(orderData) {
  try {
    // Collect all sellerIds involved in this order for Firestore Security Rule scope
    const sellerIds = Array.from(new Set(orderData.items.map(item => item.sellerId || 'admin')));

    const docRef = await addDoc(collection(db, 'orders'), {
      ...orderData,
      sellerIds,
      createdAt: serverTimestamp(),
      userId: currentUser ? currentUser.uid : 'guest',
      orderStatus: 'Pending',
      paymentStatus: orderData.paymentMethod === 'cod' ? 'Pending' : 'Submitted'
    });

    // Clear cart on success
    localStorage.removeItem('bb_cart');
    return docRef.id;
  } catch (err) {
    console.error('Order placement failed:', err);
    throw err;
  }
}
