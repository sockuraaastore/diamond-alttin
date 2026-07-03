function formatPrice(amount) {
  return Number(amount).toLocaleString('fa-IR') + ' تومان';
}

function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showElement(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
}

function hideElement(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(product, quantity = 1) {
  const cart = getCart();
  const existing = cart.find(item => item.product_id === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      product_id: product.id,
      name: product.name,
      price: product.discount_price || product.price,
      image_url: product.image_url,
      quantity
    });
  }
  saveCart(cart);
  showToast('به سبد خرید اضافه شد', 'success');
}

function removeFromCart(productId) {
  const cart = getCart().filter(item => item.product_id !== productId);
  saveCart(cart);
  renderCartDrawer();
}

function updateCartQty(productId, delta) {
  const cart = getCart();
  const item = cart.find(i => i.product_id === productId);
  if (item) {
    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(productId);
      return;
    }
  }
  saveCart(cart);
  renderCartDrawer();
}

function getCartTotal() {
  return getCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

function updateCartBadge() {
  const badges = document.querySelectorAll('.cart-badge');
  const count = getCartCount();
  badges.forEach(b => {
    b.textContent = count;
    b.style.display = count > 0 ? 'inline-flex' : 'none';
  });
}

function renderCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  if (!drawer) return;
  const items = getCart();
  const itemsContainer = drawer.querySelector('.cart-items');
  const totalContainer = drawer.querySelector('.cart-total');

  if (items.length === 0) {
    itemsContainer.innerHTML = '<p style="text-align:center;color:var(--color-light-gray);padding:2rem">سبد خرید خالی است</p>';
  } else {
    itemsContainer.innerHTML = items.map(item => `
      <div class="cart-item">
        <img src="${item.image_url}" alt="${item.name}">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${formatPrice(item.price)}</div>
          <div class="cart-qty">
            <button onclick="updateCartQty('${item.product_id}', -1)">-</button>
            <span>${item.quantity}</span>
            <button onclick="updateCartQty('${item.product_id}', 1)">+</button>
          </div>
        </div>
        <button onclick="removeFromCart('${item.product_id}')" style="background:none;border:none;color:var(--color-light-gray);cursor:pointer">✕</button>
      </div>
    `).join('');
  }

  totalContainer.innerHTML = `
    <span>جمع کل</span>
    <span>${formatPrice(getCartTotal())}</span>
  `;
}

function toggleCart() {
  const drawer = document.getElementById('cart-drawer');
  if (drawer) {
    drawer.classList.toggle('active');
    renderCartDrawer();
  }
}

function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  if (menu) menu.classList.toggle('active');
}

async function uploadFile(bucket, file) {
  const ext = file.name.split('.').pop();
  const path = `${Date.now()}.${ext}`;
  const { data, error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return urlData.publicUrl;
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
