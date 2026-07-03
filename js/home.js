let allProducts = [];
let currentCategory = null;

function initScrollVideo() {
  const video = document.getElementById('hero-video');
  const hero = document.getElementById('hero');
  if (!video || !hero) return;

  video.addEventListener('loadedmetadata', () => {
    video.currentTime = 0;
  });

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();
        const scrollPercent = Math.max(0, Math.min(1, -rect.top / rect.height));
        if (video.duration) {
          video.currentTime = scrollPercent * video.duration;
        }
        ticking = false;
      });
      ticking = true;
    }
  });
}

async function loadBanners() {
  const container = document.getElementById('banners-container');
  if (!container) return;

  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error || !data || data.length === 0) {
    document.getElementById('banners-section').style.display = 'none';
    return;
  }

  container.innerHTML = data.map(b => `
    <div style="min-width:300px;flex-shrink:0;border-radius:12px;overflow:hidden;aspect-ratio:16/9">
      <img src="${b.image_url}" style="width:100%;height:100%;object-fit:cover" alt="بنر">
    </div>
  `).join('');
}

async function loadCategories() {
  const container = document.getElementById('categories-container');
  if (!container) return;

  const { data } = await supabase.from('categories').select('*').order('sort_order');

  container.innerHTML = `
    <button class="category-btn active" onclick="filterProducts(null)">همه</button>
    ${(data || []).map(c => `
      <button class="category-btn" onclick="filterProducts('${c.id}')">${c.name}</button>
    `).join('')}
  `;
}

async function loadProducts(categoryId = null) {
  const container = document.getElementById('products-container');
  if (!container) return;

  let query = supabase.from('products').select('*').eq('is_active', true);
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data } = await query.order('created_at', { ascending: false });
  allProducts = data || [];

  renderProducts(allProducts);
}

function filterProducts(categoryId) {
  currentCategory = categoryId;

  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');

  if (categoryId) {
    renderProducts(allProducts.filter(p => p.category_id === categoryId));
  } else {
    renderProducts(allProducts);
  }
}

function renderProducts(products) {
  const container = document.getElementById('products-container');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--color-light-gray);grid-column:1/-1;padding:4rem">محصولی یافت نشد</p>';
    return;
  }

  container.innerHTML = products.map(p => `
    <div class="product-card" onclick="openProductModal('${p.id}')">
      <img src="${p.image_url}" alt="${p.name}">
      <div class="product-card-info">
        <div class="product-card-title">${p.name}</div>
        <div class="product-card-price">${formatPrice(p.price)}</div>
        ${p.stock > 0 ? `<span style="color:var(--color-light-gray);font-size:0.8rem">موجود: ${p.stock} عدد</span>` : '<span style="color:#f87171;font-size:0.8rem">ناموجود</span>'}
      </div>
    </div>
  `).join('');
}

function openProductModal(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  const modal = document.getElementById('product-modal');
  const content = document.getElementById('product-modal-content');

  content.innerHTML = `
    <img src="${product.image_url}" style="width:100%;border-radius:12px;margin-bottom:1rem" alt="${product.name}">
    <h2 style="font-size:1.4rem;font-weight:700;margin-bottom:0.5rem">${product.name}</h2>
    <p style="color:var(--color-light-gray);line-height:2;margin-bottom:1rem">${product.description || 'توضیحی ثبت نشده است'}</p>
    <div style="font-size:1.3rem;font-weight:700;color:var(--color-gold);margin-bottom:0.5rem">${formatPrice(product.price)}</div>
    <div style="color:var(--color-light-gray);margin-bottom:1.5rem">
      ${product.stock > 0 ? `موجودی: ${product.stock} عدد` : '<span style="color:#f87171">ناموجود</span>'}
    </div>
    ${product.stock > 0 ? `
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem">
        <span style="color:var(--color-light-gray)">تعداد:</span>
        <div class="cart-qty">
          <button onclick="changeModalQty(-1)">-</button>
          <span id="modal-qty">1</span>
          <button onclick="changeModalQty(1)">+</button>
        </div>
      </div>
      <button class="btn-primary w-full" onclick="addFromModal('${product.id}')">افزودن به سبد خرید</button>
    ` : ''}
  `;

  modal.classList.add('active');
  modal.dataset.productId = productId;
}

function closeProductModal() {
  document.getElementById('product-modal').classList.remove('active');
}

let modalQty = 1;

function changeModalQty(delta) {
  modalQty = Math.max(1, modalQty + delta);
  document.getElementById('modal-qty').textContent = modalQty;
}

function addFromModal(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;
  addToCart(product, modalQty);
  modalQty = 1;
  closeProductModal();
}

function openCheckout() {
  toggleCart();
  window.location.href = 'index.html#checkout-section';
}
