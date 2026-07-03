// Supabase Configuration
const SUPABASE_URL = 'https://cdfcwwmtfavvkupanbmd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZmN3d210ZmF2dmt1cGFuYm1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NDk3NTMsImV4cCI6MjA5ODEyNTc1M30.3qLSsivr6nRvzzVRF0RG3pawJkd9zDQMx4CtaVcHw98';
const ADMIN_PASSCODE = '13911400';

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global State
let currentUser = null;
let isAdmin = false;
let cart = [];
let categories = [];
let products = [];
let banners = [];

// DOM Elements
const loader = document.getElementById('loader');
const loaderBar = document.getElementById('loader-bar');
const loaderPercent = document.getElementById('loader-percent');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scrollContainer = document.getElementById('scroll-container');
const canvasWrap = document.getElementById('canvas-wrap');
const darkOverlay = document.getElementById('dark-overlay');
const heroSection = document.getElementById('hero');
const marqueeWrap = document.querySelector('.marquee-wrap');

// Frame variables
let frames = [];
let currentFrame = 0;
const FRAME_COUNT = 94;
const FRAME_SPEED = 2.0;

// Initialize Lenis Smooth Scroll
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true
});

lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// Initialize App
async function initApp() {
    // Check for existing session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        await checkAdminRole();
        hideAuthModal();
        hideLoader();
        showCartButton();
    } else {
        showAuthModal();
        hideLoader();
    }

    // Setup event listeners
    setupEventListeners();
    
    // Load data
    await loadCategories();
    await loadProducts();
    await loadBanners();
    
    // Setup animations
    setupScrollAnimations();
    setupCounterAnimations();
    setupMarqueeAnimation();
}

// Loader Functions
function hideLoader() {
    setTimeout(() => {
        loader.classList.add('hidden');
    }, 500);
}

function updateLoader(percent) {
    loaderBar.style.width = `${percent}%`;
    loaderPercent.textContent = `${Math.round(percent)}%`;
}

// Auth Functions
function showAuthModal() {
    document.getElementById('auth-modal').classList.remove('hidden');
}

function hideAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
}

function toggleAuthMode() {
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const submitBtn = document.getElementById('auth-submit-btn');
    const toggleText = document.getElementById('auth-toggle-text');
    const passcodeGroup = document.getElementById('auth-passcode-group');

    if (title.textContent === 'ورود') {
        title.textContent = 'ثبت نام';
        subtitle.textContent = 'حساب کاربری جدید ایجاد کنید';
        submitBtn.textContent = 'ثبت نام';
        toggleText.textContent = 'حساب کاربری دارید؟ وارد شوید';
        passcodeGroup.classList.remove('hidden');
    } else {
        title.textContent = 'ورود';
        subtitle.textContent = 'به حساب خود وارد شوید';
        submitBtn.textContent = 'ورود';
        toggleText.textContent = 'حساب کاربری ندارید؟ ثبت نام کنید';
        passcodeGroup.classList.add('hidden');
    }
}

async function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const passcode = document.getElementById('auth-passcode').value;
    const isLogin = document.getElementById('auth-title').textContent === 'ورود';

    try {
        let result;
        if (isLogin) {
            result = await supabase.auth.signInWithPassword({ email, password });
        } else {
            result = await supabase.auth.signUp({ email, password });
        }

        if (result.error) throw result.error;

        currentUser = result.data.user;

        // Check passcode for admin
        if (passcode === ADMIN_PASSCODE) {
            await supabase.from('user_roles').upsert({ user_id: currentUser.id, role: 'admin' });
            isAdmin = true;
            showAdminButton();
        }

        await checkAdminRole();
        hideAuthModal();
        showCartButton();

        // Show welcome popup for new users
        if (!isLogin) {
            localStorage.setItem(`welcome_${currentUser.id}`, 'true');
            showWelcomePopup();
        }
    } catch (error) {
        alert(error.message || 'خطا در احراز هویت');
    }
}

async function checkAdminRole() {
    if (!currentUser) return;
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', currentUser.id).single();
    if (data && data.role === 'admin') {
        isAdmin = true;
        showAdminButton();
    }
}

function showAdminButton() {
    document.getElementById('admin-btn').classList.remove('hidden');
    document.getElementById('admin-btn-mobile').classList.remove('hidden');
}

function hideAdminButton() {
    document.getElementById('admin-btn').classList.add('hidden');
    document.getElementById('admin-btn-mobile').classList.add('hidden');
}

async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
    isAdmin = false;
    cart = [];
    hideAdminButton();
    hideCartButton();
    showAuthModal();
}

// Welcome Popup
function showWelcomePopup() {
    document.getElementById('welcome-popup').classList.remove('hidden');
}

function closeWelcomePopup() {
    document.getElementById('welcome-popup').classList.add('hidden');
}

// Cart Functions
function showCartButton() {
    document.getElementById('cart-button').classList.add('visible');
}

function hideCartButton() {
    document.getElementById('cart-button').classList.remove('visible');
}

function addToCart(product, quantity) {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ ...product, quantity });
    }
    updateCartCount();
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const countEl = document.getElementById('cart-count');
    if (count > 0) {
        countEl.textContent = count;
        countEl.classList.remove('hidden');
    } else {
        countEl.classList.add('hidden');
    }
}

function openCartModal() {
    const modal = document.getElementById('cart-modal');
    const content = document.getElementById('cart-modal-content');
    
    if (cart.length === 0) {
        content.innerHTML = `
            <h2 class="text-2xl font-['Playfair_Display',serif] mb-6">سبد خرید</h2>
            <p class="text-white/60 text-center py-8">سبد خرید شما خالی است</p>
        `;
    } else {
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        content.innerHTML = `
            <h2 class="text-2xl font-['Playfair_Display',serif] mb-6">سبد خرید</h2>
            <div class="space-y-4 mb-6">
                ${cart.map(item => `
                    <div class="flex items-center gap-4 bg-dark rounded-lg p-4">
                        <img src="${item.image_url}" class="w-20 h-20 object-cover rounded-lg">
                        <div class="flex-1">
                            <h3 class="font-semibold">${item.title}</h3>
                            <p class="text-gold">${item.price.toLocaleString()} تومان</p>
                            <p class="text-white/60 text-sm">تعداد: ${item.quantity}</p>
                        </div>
                        <button onclick="removeFromCart(${item.id})" class="text-red-500 hover:text-red-400">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                `).join('')}
            </div>
            <div class="border-t border-white/10 pt-4 mb-6">
                <div class="flex justify-between items-center text-lg font-semibold">
                    <span>جمع کل:</span>
                    <span class="text-gold">${total.toLocaleString()} تومان</span>
                </div>
            </div>
            <div class="bg-dark rounded-lg p-4 mb-6">
                <p class="text-white/60 text-sm mb-2">شماره کارت فروشنده:</p>
                <p class="font-mono text-gold">۶۰۳۷-۹۹۱۸-۱۲۳۴-۵۶۷۸</p>
            </div>
            <form id="checkout-form" class="space-y-4">
                <div>
                    <label class="block text-white/80 mb-2 text-sm">شماره تماس</label>
                    <input type="tel" id="checkout-phone" class="w-full bg-dark border border-white/20 rounded-lg px-4 py-3 text-white focus:border-gold focus:outline-none" required>
                </div>
                <div>
                    <label class="block text-white/80 mb-2 text-sm">آدرس ارسال</label>
                    <textarea id="checkout-address" rows="2" class="w-full bg-dark border border-white/20 rounded-lg px-4 py-3 text-white focus:border-gold focus:outline-none resize-none" required></textarea>
                </div>
                <div>
                    <label class="block text-white/80 mb-2 text-sm">کد پستی</label>
                    <input type="text" id="checkout-zip" class="w-full bg-dark border border-white/20 rounded-lg px-4 py-3 text-white focus:border-gold focus:outline-none" required>
                </div>
                <div>
                    <label class="block text-white/80 mb-2 text-sm">تصویر رسید پرداخت</label>
                    <input type="file" id="checkout-receipt" accept="image/*" class="w-full bg-dark border border-white/20 rounded-lg px-4 py-3 text-white focus:border-gold focus:outline-none" required>
                </div>
                <button type="submit" class="w-full bg-gold text-dark py-3 rounded-lg font-semibold hover:bg-gold-light transition-colors">ثبت سفارش</button>
            </form>
        `;
        
        document.getElementById('checkout-form').addEventListener('submit', handleCheckout);
    }
    
    modal.classList.remove('hidden');
}

function closeCartModal() {
    document.getElementById('cart-modal').classList.add('hidden');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartCount();
    openCartModal();
}

async function handleCheckout(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('لطفا ابتدا وارد حساب کاربری شوید');
        return;
    }

    const phone = document.getElementById('checkout-phone').value;
    const address = document.getElementById('checkout-address').value;
    const zip = document.getElementById('checkout-zip').value;
    const receiptFile = document.getElementById('checkout-receipt').files[0];

    // Upload receipt image
    const { data: receiptData, error: receiptError } = await supabase.storage
        .from('receipts')
        .upload(`${currentUser.id}/${Date.now()}.jpg`, receiptFile);

    if (receiptError) {
        alert('خطا در آپلود تصویر رسید');
        return;
    }

    // Create order
    const orderData = {
        user_id: currentUser.id,
        phone,
        address,
        zip_code: zip,
        receipt_url: receiptData.path,
        items: cart,
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        status: 'pending'
    };

    const { error } = await supabase.from('orders').insert(orderData);
    if (error) {
        alert('خطا در ثبت سفارش');
        return;
    }

    // Clear cart
    cart = [];
    updateCartCount();
    closeCartModal();
    alert('سفارش شما با موفقیت ثبت شد');
    loadOrders();
}

// Product Functions
async function loadProducts() {
    const { data, error } = await supabase.from('products').select('*');
    if (!error) {
        products = data || [];
        renderProducts(products);
    }
}

function renderProducts(productsToRender) {
    const container = document.getElementById('products-container');
    container.innerHTML = productsToRender.map(product => `
        <div class="product-card" onclick="openProductModal(${product.id})">
            <img src="${product.image_url}" alt="${product.title}">
            <div class="product-card-content">
                <h3 class="font-semibold text-lg mb-2">${product.title}</h3>
                <p class="text-gold font-bold">${product.price.toLocaleString()} تومان</p>
                <p class="text-white/60 text-sm mt-2">موجودی: ${product.stock}</p>
            </div>
        </div>
    `).join('');
}

function openProductModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById('product-modal');
    const content = document.getElementById('product-modal-content');
    
    content.innerHTML = `
        <img src="${product.image_url}" class="w-full h-64 object-cover rounded-lg mb-4">
        <h2 class="text-2xl font-['Playfair_Display',serif] mb-2">${product.title}</h2>
        <p class="text-white/70 mb-4">${product.description}</p>
        <p class="text-gold text-2xl font-bold mb-4">${product.price.toLocaleString()} تومان</p>
        <p class="text-white/60 mb-6">موجودی: ${product.stock}</p>
        <div class="flex items-center gap-4 mb-6">
            <label class="text-white/80">تعداد:</label>
            <input type="number" id="product-quantity" value="1" min="1" max="${product.stock}" class="w-20 bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-center focus:border-gold focus:outline-none">
        </div>
        <button onclick="addToCartFromModal(${product.id})" class="w-full bg-gold text-dark py-3 rounded-lg font-semibold hover:bg-gold-light transition-colors">افزودن به سبد خرید</button>
    `;
    
    modal.classList.remove('hidden');
}

function closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
}

function addToCartFromModal(productId) {
    const product = products.find(p => p.id === productId);
    const quantity = parseInt(document.getElementById('product-quantity').value);
    addToCart(product, quantity);
    closeProductModal();
}

// Category Functions
async function loadCategories() {
    const { data, error } = await supabase.from('categories').select('*');
    if (!error) {
        categories = data || [];
        renderCategories();
    }
}

function renderCategories() {
    const container = document.getElementById('categories-container');
    container.innerHTML = `
        <button onclick="filterByCategory('all')" class="category-btn active bg-gold text-dark px-6 py-3 rounded-full font-semibold hover:bg-gold-light transition-colors">همه</button>
        ${categories.map(cat => `
            <button onclick="filterByCategory('${cat.id}')" class="category-btn bg-dark-gray text-white/80 px-6 py-3 rounded-full font-semibold hover:bg-gold hover:text-dark transition-colors">${cat.name}</button>
        `).join('')}
    `;
}

function filterByCategory(categoryId) {
    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-gold', 'text-dark');
        btn.classList.add('bg-dark-gray', 'text-white/80');
    });
    event.target.classList.add('active', 'bg-gold', 'text-dark');
    event.target.classList.remove('bg-dark-gray', 'text-white/80');

    // Filter products
    if (categoryId === 'all') {
        renderProducts(products);
    } else {
        const filtered = products.filter(p => p.category_id === categoryId);
        renderProducts(filtered);
    }
}

// Banner Functions
async function loadBanners() {
    const { data, error } = await supabase.from('banners').select('*');
    if (!error) {
        banners = data || [];
        renderBanners();
    }
}

function renderBanners() {
    const container = document.getElementById('banners-container');
    if (banners.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-white/60">بنری موجود نیست</div>';
        return;
    }
    container.innerHTML = banners.map(banner => `
        <div class="min-w-full">
            <img src="${banner.image_url}" class="w-full h-64 object-cover">
        </div>
    `).join('');
}

// Order Functions
async function loadOrders() {
    if (!currentUser) return;
    
    const { data, error } = await supabase.from('orders')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
    
    if (!error) {
        renderOrders(data || []);
        renderPurchases(data || []);
    }
}

function renderOrders(orders) {
    const container = document.getElementById('orders-container');
    if (orders.length === 0) {
        container.innerHTML = '<div class="text-center text-white/60 py-8">سفارشی ثبت نشده است</div>';
        return;
    }
    container.innerHTML = orders.map(order => `
        <div class="order-card">
            <div class="flex items-center justify-between mb-4">
                <span class="text-white/60 text-sm">${new Date(order.created_at).toLocaleDateString('fa-IR')}</span>
                <span class="order-status ${order.status}">${getStatusText(order.status)}</span>
            </div>
            <div class="mb-4">
                <p class="text-white/80 text-sm">شماره تماس: ${order.phone}</p>
                <p class="text-white/80 text-sm">آدرس: ${order.address}</p>
            </div>
            <div class="border-t border-white/10 pt-4">
                <p class="text-gold font-semibold">${order.total.toLocaleString()} تومان</p>
            </div>
            ${order.admin_note ? `<p class="text-white/60 text-sm mt-2">یادداشت مدیر: ${order.admin_note}</p>` : ''}
        </div>
    `).join('');
}

function renderPurchases(orders) {
    const container = document.getElementById('purchases-container');
    const approvedOrders = orders.filter(o => o.status === 'approved');
    
    if (approvedOrders.length === 0) {
        container.innerHTML = '<div class="text-center text-white/60 py-8">خریدی تأیید شده وجود ندارد</div>';
        return;
    }
    container.innerHTML = approvedOrders.map(order => `
        <div class="order-card">
            <div class="flex items-center justify-between mb-4">
                <span class="text-white/60 text-sm">${new Date(order.created_at).toLocaleDateString('fa-IR')}</span>
                <span class="order-status approved">تأیید شده</span>
            </div>
            <p class="text-gold font-semibold">${order.total.toLocaleString()} تومان</p>
            ${order.admin_note ? `<p class="text-white/60 text-sm mt-2">${order.admin_note}</p>` : ''}
        </div>
    `).join('');
}

function getStatusText(status) {
    switch (status) {
        case 'pending': return 'در انتظار بررسی';
        case 'approved': return 'تأیید شده';
        case 'rejected': return 'رد شده';
        default: return status;
    }
}

// Support Functions
async function handleSupportSubmit(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('لطفا ابتدا وارد حساب کاربری شوید');
        return;
    }

    const subject = document.getElementById('ticket-subject').value;
    const description = document.getElementById('ticket-description').value;

    const { error } = await supabase.from('tickets').insert({
        user_id: currentUser.id,
        subject,
        description,
        status: 'open'
    });

    if (error) {
        alert('خطا در ارسال تیکت');
        return;
    }

    alert('تیکت شما با موفقیت ارسال شد');
    document.getElementById('support-form').reset();
}

// Admin Functions
function showAdminPanel() {
    if (!isAdmin) return;
    document.getElementById('admin-panel').classList.remove('hidden');
    loadAdminData();
}

function closeAdminPanel() {
    document.getElementById('admin-panel').classList.add('hidden');
}

function showAdminTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.admin-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.admin-tab').forEach(el => {
        el.classList.remove('active', 'bg-gold', 'text-dark');
        el.classList.add('text-white/80');
    });

    // Show selected tab
    document.getElementById(`admin-${tabName}`).classList.remove('hidden');
    event.target.classList.add('active', 'bg-gold', 'text-dark');
    event.target.classList.remove('text-white/80');
}

async function loadAdminData() {
    await loadAdminBanners();
    await loadAdminCategories();
    await loadAdminProducts();
    await loadAdminOrders();
    await loadAdminTickets();
}

async function loadAdminBanners() {
    const { data } = await supabase.from('banners').select('*');
    const container = document.getElementById('banners-list');
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-white/60">بنری موجود نیست</p>';
        return;
    }
    container.innerHTML = data.map(banner => `
        <div class="bg-dark rounded-lg overflow-hidden border border-white/10">
            <img src="${banner.image_url}" class="w-full h-32 object-cover">
            <div class="p-4 flex justify-end">
                <button onclick="deleteBanner('${banner.id}')" class="text-red-500 hover:text-red-400 text-sm">حذف</button>
            </div>
        </div>
    `).join('');
}

async function handleBannerSubmit(e) {
    e.preventDefault();
    const file = document.getElementById('banner-image').files[0];
    if (!file) return;

    const { data, error } = await supabase.storage
        .from('banners')
        .upload(`${Date.now()}.jpg`, file);

    if (error) {
        alert('خطا در آپلود تصویر');
        return;
    }

    await supabase.from('banners').insert({ image_url: data.path });
    document.getElementById('banner-form').reset();
    loadAdminBanners();
    loadBanners();
}

async function deleteBanner(bannerId) {
    if (!confirm('آیا از حذف این بنر اطمینان دارید؟')) return;
    await supabase.from('banners').delete().eq('id', bannerId);
    loadAdminBanners();
    loadBanners();
}

async function loadAdminCategories() {
    const { data } = await supabase.from('categories').select('*');
    const container = document.getElementById('categories-list');
    const select = document.getElementById('product-category');
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-white/60">دسته‌بندی وجود ندارد</p>';
        select.innerHTML = '<option value="">دسته‌بندی‌ای موجود نیست</option>';
        return;
    }

    container.innerHTML = data.map(cat => `
        <div class="bg-dark rounded-lg p-4 flex items-center justify-between border border-white/10">
            <span class="text-white/80">${cat.name}</span>
            <button onclick="deleteCategory('${cat.id}')" class="text-red-500 hover:text-red-400 text-sm">حذف</button>
        </div>
    `).join('');

    select.innerHTML = data.map(cat => `
        <option value="${cat.id}">${cat.name}</option>
    `).join('');
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    const name = document.getElementById('category-name').value;
    
    const { error } = await supabase.from('categories').insert({ name });
    if (error) {
        alert('خطا در افزودن دسته‌بندی');
        return;
    }

    document.getElementById('category-name').value = '';
    loadAdminCategories();
    loadCategories();
}

async function deleteCategory(categoryId) {
    if (!confirm('آیا از حذف این دسته‌بندی اطمینان دارید؟')) return;
    await supabase.from('categories').delete().eq('id', categoryId);
    loadAdminCategories();
    loadCategories();
}

async function loadAdminProducts() {
    const { data } = await supabase.from('products').select('*, categories(name)');
    const container = document.getElementById('products-list-admin');
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-white/60">محصولی وجود ندارد</p>';
        return;
    }

    container.innerHTML = data.map(product => `
        <div class="bg-dark rounded-lg p-4 flex items-center gap-4 border border-white/10">
            <img src="${product.image_url}" class="w-20 h-20 object-cover rounded-lg">
            <div class="flex-1">
                <h3 class="font-semibold">${product.title}</h3>
                <p class="text-gold text-sm">${product.price.toLocaleString()} تومان</p>
                <p class="text-white/60 text-sm">موجودی: ${product.stock}</p>
            </div>
            <button onclick="deleteProduct('${product.id}')" class="text-red-500 hover:text-red-400 text-sm">حذف</button>
        </div>
    `).join('');
}

async function handleProductSubmit(e) {
    e.preventDefault();
    const file = document.getElementById('product-image').files[0];
    if (!file) return;

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('products')
        .upload(`${Date.now()}.jpg`, file);

    if (uploadError) {
        alert('خطا در آپلود تصویر');
        return;
    }

    const productData = {
        title: document.getElementById('product-title').value,
        description: document.getElementById('product-description').value,
        category_id: document.getElementById('product-category').value,
        price: parseInt(document.getElementById('product-price').value),
        stock: parseInt(document.getElementById('product-stock').value),
        image_url: uploadData.path
    };

    const { error } = await supabase.from('products').insert(productData);
    if (error) {
        alert('خطا در افزودن محصول');
        return;
    }

    document.getElementById('product-form').reset();
    loadAdminProducts();
    loadProducts();
}

async function deleteProduct(productId) {
    if (!confirm('آیا از حذف این محصول اطمینان دارید؟')) return;
    await supabase.from('products').delete().eq('id', productId);
    loadAdminProducts();
    loadProducts();
}

async function loadAdminOrders() {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    const container = document.getElementById('admin-orders-list');
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-white/60">سفارشی وجود ندارد</p>';
        return;
    }

    container.innerHTML = data.map(order => `
        <div class="bg-dark rounded-lg p-4 border border-white/10">
            <div class="flex items-center justify-between mb-4">
                <span class="text-white/60 text-sm">${new Date(order.created_at).toLocaleDateString('fa-IR')}</span>
                <span class="order-status ${order.status}">${getStatusText(order.status)}</span>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                    <p class="text-white/60">شماره تماس:</p>
                    <p class="text-white/80">${order.phone}</p>
                </div>
                <div>
                    <p class="text-white/60">آدرس:</p>
                    <p class="text-white/80">${order.address}</p>
                </div>
                <div>
                    <p class="text-white/60">کد پستی:</p>
                    <p class="text-white/80">${order.zip_code}</p>
                </div>
                <div>
                    <p class="text-white/60">مبلغ کل:</p>
                    <p class="text-gold">${order.total.toLocaleString()} تومان</p>
                </div>
            </div>
            <a href="${SUPABASE_URL}/storage/v1/object/public/receipts/${order.receipt_url}" target="_blank" class="text-gold hover:text-gold-light text-sm mb-4 inline-block">مشاهده رسید پرداخت</a>
            ${order.status === 'pending' ? `
                <div class="flex gap-2 mt-4">
                    <button onclick="approveOrder('${order.id}')" class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-500 transition-colors">تأیید</button>
                    <button onclick="rejectOrder('${order.id}')" class="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-500 transition-colors">رد</button>
                </div>
            ` : ''}
            ${order.admin_note ? `<p class="text-white/60 text-sm mt-2">یادداشت: ${order.admin_note}</p>` : ''}
        </div>
    `).join('');
}

async function approveOrder(orderId) {
    const note = prompt('یادداشت ارسال (مثال: طی ۳ روز ارسال می‌شود):');
    if (note === null) return;

    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
    
    // Update order status
    await supabase.from('orders').update({ 
        status: 'approved', 
        admin_note: note 
    }).eq('id', orderId);

    // Update product stock
    if (order && order.items) {
        for (const item of order.items) {
            const { data: product } = await supabase.from('products').select('stock').eq('id', item.id).single();
            if (product) {
                await supabase.from('products').update({ 
                    stock: product.stock - item.quantity 
                }).eq('id', item.id);
            }
        }
    }

    loadAdminOrders();
}

async function rejectOrder(orderId) {
    const reason = prompt('دلیل رد سفارش:');
    if (reason === null) return;

    await supabase.from('orders').update({ 
        status: 'rejected', 
        admin_note: reason 
    }).eq('id', orderId);

    loadAdminOrders();
}

async function loadAdminTickets() {
    const { data } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
    const container = document.getElementById('admin-tickets-list');
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-white/60">تیکتی وجود ندارد</p>';
        return;
    }

    container.innerHTML = data.map(ticket => `
        <div class="ticket-card">
            <div class="flex items-center justify-between mb-4">
                <h3 class="font-semibold">${ticket.subject}</h3>
                <span class="order-status ${ticket.status === 'open' ? 'pending' : 'approved'}">${ticket.status === 'open' ? 'باز' : 'پاسخ داده شده'}</span>
            </div>
            <p class="text-white/70 text-sm mb-4">${ticket.description}</p>
            ${ticket.reply ? `<p class="text-gold text-sm mb-4">پاسخ: ${ticket.reply}</p>` : ''}
            <div class="flex gap-2">
                <input type="text" id="reply-${ticket.id}" placeholder="پاسخ..." class="flex-1 bg-dark border border-white/20 rounded-lg px-4 py-2 text-white text-sm focus:border-gold focus:outline-none">
                <button onclick="replyToTicket('${ticket.id}')" class="bg-gold text-dark px-4 py-2 rounded-lg text-sm hover:bg-gold-light transition-colors">ارسال پاسخ</button>
            </div>
        </div>
    `).join('');
}

async function replyToTicket(ticketId) {
    const reply = document.getElementById(`reply-${ticketId}`).value;
    if (!reply) return;

    await supabase.from('tickets').update({ 
        reply, 
        status: 'replied' 
    }).eq('id', ticketId);

    loadAdminTickets();
}

// Search Functions
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            if (!query) {
                document.getElementById('search-results').innerHTML = '';
                return;
            }
            const results = products.filter(p => 
                p.title.toLowerCase().includes(query) || 
                p.description.toLowerCase().includes(query)
            );
            renderSearchResults(results);
        });
    }
}

function renderSearchResults(results) {
    const container = document.getElementById('search-results');
    if (results.length === 0) {
        container.innerHTML = '<p class="text-white/60 col-span-3 text-center py-8">نتیجه‌ای یافت نشد</p>';
        return;
    }
    container.innerHTML = results.map(product => `
        <div class="product-card" onclick="openProductModal(${product.id})">
            <img src="${product.image_url}" alt="${product.title}">
            <div class="product-card-content">
                <h3 class="font-semibold text-lg mb-2">${product.title}</h3>
                <p class="text-gold font-bold">${product.price.toLocaleString()} تومان</p>
            </div>
        </div>
    `).join('');
}

// Section Navigation
function showSection(sectionName) {
    // Hide hero and scroll container
    heroSection.style.display = 'none';
    scrollContainer.style.display = 'none';
    canvasWrap.style.display = 'none';
    marqueeWrap.style.display = 'none';

    // Hide all sections
    document.querySelectorAll('#sections-container > section').forEach(el => {
        el.classList.add('hidden');
    });

    // Show requested section
    const section = document.getElementById(`${sectionName}-section`);
    if (section) {
        section.classList.remove('hidden');
        window.scrollTo(0, 0);
    }

    // Load data for specific sections
    if (sectionName === 'orders' || sectionName === 'purchases') {
        loadOrders();
    }
    if (sectionName === 'search') {
        setupSearch();
    }
}

// Frame Loading
async function loadFrames() {
    const totalFrames = FRAME_COUNT;
    let loaded = 0;

    // Load first 10 frames immediately
    const initialBatch = Math.min(10, totalFrames);
    for (let i = 1; i <= initialBatch; i++) {
        const img = new Image();
        img.src = `frames/frame_${String(i).padStart(4, '0')}.webp`;
        await new Promise(resolve => {
            img.onload = () => {
                frames[i - 1] = img;
                loaded++;
                updateLoader((loaded / totalFrames) * 100);
                resolve();
            };
            img.onerror = () => {
                loaded++;
                updateLoader((loaded / totalFrames) * 100);
                resolve();
            };
        });
    }

    // Load remaining frames in background
    for (let i = initialBatch + 1; i <= totalFrames; i++) {
        const img = new Image();
        img.src = `frames/frame_${String(i).padStart(4, '0')}.webp`;
        img.onload = () => {
            frames[i - 1] = img;
            loaded++;
            updateLoader((loaded / totalFrames) * 100);
        };
    }

    // Wait for all frames
    while (loaded < totalFrames) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    updateLoader(100);
}

// Canvas Rendering
function setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
}

function drawFrame(index) {
    const img = frames[index];
    if (!img) return;

    const cw = canvas.width / (window.devicePixelRatio || 1);
    const ch = canvas.height / (window.devicePixelRatio || 1);
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih) * 0.85;
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
}

// Scroll Animations
function setupScrollAnimations() {
    // Hero transition
    ScrollTrigger.create({
        trigger: scrollContainer,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
            const p = self.progress;
            heroSection.style.opacity = Math.max(0, 1 - p * 15);
            const wipeProgress = Math.min(1, Math.max(0, (p - 0.01) / 0.06));
            const radius = wipeProgress * 75;
            canvasWrap.style.clipPath = `circle(${radius}% at 50% 50%)`;
        }
    });

    // Frame to scroll binding
    ScrollTrigger.create({
        trigger: scrollContainer,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
            const accelerated = Math.min(self.progress * FRAME_SPEED, 1);
            const index = Math.min(Math.floor(accelerated * FRAME_COUNT), FRAME_COUNT - 1);
            if (index !== currentFrame) {
                currentFrame = index;
                requestAnimationFrame(() => drawFrame(currentFrame));
            }
        }
    });

    // Dark overlay
    ScrollTrigger.create({
        trigger: scrollContainer,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
            const p = self.progress;
            let opacity = 0;
            if (p >= 0.7 && p <= 0.75) opacity = (p - 0.7) / 0.05 * 0.9;
            else if (p > 0.75 && p < 0.85) opacity = 0.9;
            else if (p >= 0.85 && p <= 0.9) opacity = 0.9 * (1 - (p - 0.85) / 0.05);
            darkOverlay.style.opacity = opacity;
        }
    });

    // Section animations
    document.querySelectorAll('.scroll-section').forEach(section => {
        setupSectionAnimation(section);
    });
}

function setupSectionAnimation(section) {
    const type = section.dataset.animation;
    const persist = section.dataset.persist === 'true';
    const enter = parseFloat(section.dataset.enter) / 100;
    const leave = parseFloat(section.dataset.leave) / 100;
    const children = section.querySelectorAll('.section-label, .section-heading, .section-body, .section-note, .cta-button, .stat');

    const tl = gsap.timeline({ paused: true });

    switch (type) {
        case 'fade-up':
            tl.from(children, { y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'power3.out' });
            break;
        case 'slide-left':
            tl.from(children, { x: -80, opacity: 0, stagger: 0.14, duration: 0.9, ease: 'power3.out' });
            break;
        case 'slide-right':
            tl.from(children, { x: 80, opacity: 0, stagger: 0.14, duration: 0.9, ease: 'power3.out' });
            break;
        case 'scale-up':
            tl.from(children, { scale: 0.85, opacity: 0, stagger: 0.12, duration: 1.0, ease: 'power2.out' });
            break;
        case 'stagger-up':
            tl.from(children, { y: 60, opacity: 0, stagger: 0.15, duration: 0.8, ease: 'power3.out' });
            break;
    }

    ScrollTrigger.create({
        trigger: scrollContainer,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
            const p = self.progress;
            if (p >= enter && p <= leave) {
                tl.progress((p - enter) / (leave - enter));
            } else if (p < enter && tl.progress() > 0) {
                tl.progress(0);
            } else if (p > leave && !persist && tl.progress() < 1) {
                tl.progress(1);
            } else if (p > leave && persist && tl.progress() < 1) {
                tl.progress(1);
            }
        }
    });
}

// Counter Animations
function setupCounterAnimations() {
    document.querySelectorAll('.stat-number').forEach(el => {
        const target = parseFloat(el.dataset.value);
        const decimals = parseInt(el.dataset.decimals || '0');
        gsap.from(el, {
            textContent: 0,
            duration: 2,
            ease: 'power1.out',
            snap: { textContent: decimals === 0 ? 1 : 0.01 },
            scrollTrigger: { 
                trigger: el.closest('.scroll-section'), 
                start: 'top 70%', 
                toggleActions: 'play none none reverse' 
            }
        });
    });
}

// Marquee Animation
function setupMarqueeAnimation() {
    gsap.to('.marquee-text', {
        xPercent: -25,
        ease: 'none',
        scrollTrigger: { 
            trigger: scrollContainer, 
            start: 'top top', 
            end: 'bottom bottom', 
            scrub: true 
        }
    });

    // Fade marquee based on scroll
    ScrollTrigger.create({
        trigger: scrollContainer,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
            const p = self.progress;
            if (p > 0.1 && p < 0.9) {
                marqueeWrap.style.opacity = '0.3';
            } else {
                marqueeWrap.style.opacity = '0';
            }
        }
    });
}

// Event Listeners
function setupEventListeners() {
    // Auth form
    document.getElementById('auth-form').addEventListener('submit', handleAuth);

    // Mobile menu
    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
        document.getElementById('mobile-menu').classList.toggle('hidden');
    });

    // Support form
    document.getElementById('support-form').addEventListener('submit', handleSupportSubmit);

    // Banner form
    document.getElementById('banner-form').addEventListener('submit', handleBannerSubmit);

    // Category form
    document.getElementById('category-form').addEventListener('submit', handleCategorySubmit);

    // Product form
    document.getElementById('product-form').addEventListener('submit', handleProductSubmit);

    // Window resize
    window.addEventListener('resize', setupCanvas);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
    setupCanvas();
    await loadFrames();
    initApp();
});