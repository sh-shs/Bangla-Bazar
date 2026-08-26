// Cart & Checkout Module
import { getCart, saveCart, showToast } from './app.js';
import { db, collection, addDoc, getDocs, serverTimestamp, doc, getDoc } from './firebase-config.js';
import { currentUser } from './auth.js';

// Default delivery rates if not dynamically overridden in Firestore settings
let deliverySettings = {
  insideKushtia: 100,
  outsideKushtia: 160
};

export async function loadDeliverySettings() {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Delivery settings load timeout')), 1200)
    );
    const docSnap = await Promise.race([
      getDoc(doc(db, 'settings', 'delivery')),
      timeoutPromise
    ]);
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

// Place Order into Firestore with Server-Side Recalculation
export async function placeOrder(orderData) {
  try {
    const items = (orderData.items || []).map(item => ({
      id: item.id || item.productId || 'N/A',
      name: item.name || 'Unnamed Product',
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 1),
      image: item.image || item.images?.[0] || 'https://via.placeholder.com/150',
      variant: item.variant || item.selectedVariant || null,
      sellerId: item.sellerId || 'admin'
    }));

    // Server-side recalculation of subtotal
    const calculatedSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Server-side recalculation of delivery charge
    const district = orderData.shippingAddress?.district || 'Kushtia';
    await loadDeliverySettings();
    const calculatedDelivery = calculateDeliveryCharge(district);

    // Server-side coupon verification and recalculation
    let calculatedDiscount = 0;
    let verifiedCouponCode = '';

    const providedCouponCode = (orderData.couponCode || '').toUpperCase().trim().replace(/\s+/g, '');
    if (providedCouponCode) {
      try {
        const couponsSnap = await getDocs(collection(db, 'coupons'));
        let matchedCoupon = null;
        couponsSnap.forEach(d => {
          const cData = d.data();
          if ((cData.code || '').toUpperCase().trim().replace(/\s+/g, '') === providedCouponCode) {
            matchedCoupon = { id: d.id, ...cData };
          }
        });

        if (!matchedCoupon) {
          throw new Error(`Coupon code "${providedCouponCode}" does not exist.`);
        }
        if (matchedCoupon.isActive === false) {
          throw new Error(`Coupon code "${providedCouponCode}" is currently inactive.`);
        }

        const minSpend = Number(matchedCoupon.minSpend || 0);
        if (calculatedSubtotal < minSpend) {
          throw new Error(`Minimum spend of ৳${minSpend} is required to apply coupon "${providedCouponCode}".`);
        }

        const isPercent = matchedCoupon.discountType === 'percentage' || Boolean(matchedCoupon.discountPercent);
        if (isPercent) {
          calculatedDiscount = Math.round((calculatedSubtotal * Number(matchedCoupon.discountPercent || 0)) / 100);
        } else {
          calculatedDiscount = Number(matchedCoupon.flatDiscount || 0);
        }

        // Clamp discount to subtotal so total cannot be negative
        calculatedDiscount = Math.min(calculatedDiscount, calculatedSubtotal);
        verifiedCouponCode = providedCouponCode;
      } catch (couponErr) {
        console.warn('Coupon re-validation warning:', couponErr);
        if (couponErr.message && couponErr.message.includes('Coupon code')) {
          throw couponErr;
        }
      }
    }

    // Ensure total amount cannot be negative (floor at 0)
    const calculatedTotalAmount = Math.max(0, calculatedSubtotal + calculatedDelivery - calculatedDiscount);

    // Collect all sellerIds involved in this order for Firestore Security Rule scope
    const sellerIds = Array.from(new Set(items.map(item => item.sellerId || 'admin')));

    const sanitizedOrder = {
      items,
      customerInfo: {
        name: orderData.customerInfo?.name || 'Not provided',
        phone: orderData.customerInfo?.phone || 'Not provided',
        email: orderData.customerInfo?.email || 'Not provided'
      },
      shippingAddress: {
        division: orderData.shippingAddress?.division || 'Not provided',
        district: orderData.shippingAddress?.district || 'Not provided',
        thana: orderData.shippingAddress?.thana || orderData.shippingAddress?.upazila || 'Not provided',
        union: orderData.shippingAddress?.union || 'Not provided',
        village: orderData.shippingAddress?.village || 'Not provided',
        notes: orderData.shippingAddress?.notes || ''
      },
      subtotal: calculatedSubtotal,
      deliveryCharge: calculatedDelivery,
      couponCode: verifiedCouponCode,
      discountAmount: calculatedDiscount,
      totalAmount: calculatedTotalAmount,
      paymentMethod: orderData.paymentMethod || 'cod',
      bKashTxnId: orderData.bKashTxnId || null,
      sellerIds,
      createdAt: serverTimestamp(),
      userId: currentUser ? currentUser.uid : 'guest',
      orderStatus: 'Pending',
      paymentStatus: orderData.paymentMethod === 'cod' ? 'Pending' : 'Submitted'
    };

    const docRef = await addDoc(collection(db, 'orders'), sanitizedOrder);

    // Clear cart on success
    localStorage.removeItem('bb_cart');
    return docRef.id;
  } catch (err) {
    console.error('Order placement failed:', err);
    throw err;
  }
}
