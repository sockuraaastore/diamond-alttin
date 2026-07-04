// Global State
var currentUser = null;
var isAdmin = false;
var cart = [];
var categories = [];
var products = [];
var banners = [];
var supabaseClient = null;

// Supabase Config
var SUPABASE_URL = 'https://cdfcwwmtfavvkupanbmd.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZmN3d210ZmF2dmt1cGFuYm1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NDk3NTMsImV4cCI6MjA5ODEyNTc1M30.3qLSsivr6nRvzzVRF0RG3pawJkd9zDQMx4CtaVcHw98';

function initSupabase() {
    try {
        if (window.supabase && window.supabase.createClient) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
    } catch(e) {
        console.warn('Supabase init failed');
    }
}

// ===== AUTH =====
function showAuthModal() {
    var m = document.getElementById('auth-modal');
    if (m) m.classList.remove('hidden');
}

function hideAuthModal() {
    var m = document.getElementById('auth-modal');
    if (m) m.classList.add('hidden');
}

function toggleAuthMode() {
    var title = document.getElementById('auth-title');
    var sub = document.getElementById('auth-subtitle');
    var btn = document.getElementById('auth-submit-btn');
    var tog = document.getElementById('auth-toggle-text');
    var pg = document.getElementById('auth-passcode-group');
    if (!title) return;
    if (title.textContent === 'ورود') {
        title.textContent = 'ثبت نام';
        sub.textContent = 'حساب کاربری جدید ایجاد کنید';
        btn.textContent = 'ثبت نام';
        tog.textContent = 'حساب کاربری دارید؟ وارد شوید';
        if (pg) pg.classList.remove('hidden');
    } else {
        title.textContent = 'ورود';
        sub.textContent = 'به حساب خود وارد شوید';
        btn.textContent = 'ورود';
        tog.textContent = 'حساب کاربری ندارید؟ ثبت نام کنید';
        if (pg) pg.classList.add('hidden');
    }
}

function closeAuthModal() {
    hideAuthModal();
}

async function handleAuth(e) {
    e.preventDefault();
    if (!supabaseClient) { alert('خطا: اتصال به سرور برقرار نیست'); return; }
    var username = document.getElementById('auth-email').value.trim();
    var password = document.getElementById('auth-password').value;
    var passcode = document.getElementById('auth-passcode').value;
    var isLogin = document.getElementById('auth-title').textContent === 'ورود';
    var email = username + '@diamondalttin.com';
    try {
        var result;
        if (isLogin) {
            result = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
        } else {
            result = await supabaseClient.auth.signUp({ email: email, password: password });
        }
        if (result.error) throw result.error;
        currentUser = result.data.user;
        if (passcode) {
            try {
                var { data: valid } = await supabaseClient.rpc('verify_admin_passcode', { code: passcode });
                if (valid) {
                    await supabaseClient.from('user_roles').upsert({ user_id: currentUser.id, role: 'admin' });
                    isAdmin = true;
                    showAdminButton();
                }
            } catch(pe) {}
        }
        await checkAdminRole();
        hideAuthModal();
        showCartButton();
        if (!isLogin) {
            localStorage.setItem('welcome_' + currentUser.id, 'true');
            showWelcomePopup();
        }
    } catch (error) {
        var msg = error.message || error.msg || JSON.stringify(error) || 'خطا در احراز هویت';
        alert(msg);
    }
}

async function checkAdminRole() {
    if (!supabaseClient || !currentUser) return;
    try {
        var { data } = await supabaseClient.from('user_roles').select('role').eq('user_id', currentUser.id).single();
        if (data && data.role === 'admin') { isAdmin = true; showAdminButton(); }
    } catch(e) {}
}

function showAdminButton() {
    var b1 = document.getElementById('admin-btn');
    var b2 = document.getElementById('admin-btn-mobile');
    if (b1) b1.classList.remove('hidden');
    if (b2) b2.classList.remove('hidden');
}

function hideAdminButton() {
    var b1 = document.getElementById('admin-btn');
    var b2 = document.getElementById('admin-btn-mobile');
    if (b1) b1.classList.add('hidden');
    if (b2) b2.classList.add('hidden');
}

async function logout() {
    if (supabaseClient) await supabaseClient.auth.signOut();
    currentUser = null; isAdmin = false; cart = [];
    hideAdminButton(); hideCartButton(); showAuthModal();
}

// ===== WELCOME =====
function showWelcomePopup() {
    var p = document.getElementById('welcome-popup');
    if (p) p.classList.remove('hidden');
}

function closeWelcomePopup() {
    var p = document.getElementById('welcome-popup');
    if (p) p.classList.add('hidden');
}

// ===== CART =====
function showCartButton() {
    var b = document.getElementById('cart-button');
    if (b) { b.classList.remove('hidden'); b.style.display = 'flex'; }
}

function hideCartButton() {
    var b = document.getElementById('cart-button');
    if (b) { b.classList.add('hidden'); b.style.display = 'none'; }
}

function addToCart(product, quantity) {
    var existing = cart.find(function(item) { return item.id === product.id; });
    if (existing) { existing.quantity += quantity; }
    else { cart.push(Object.assign({}, product, { quantity: quantity })); }
    updateCartCount();
}

function updateCartCount() {
    var count = cart.reduce(function(sum, item) { return sum + item.quantity; }, 0);
    var el = document.getElementById('cart-count');
    if (!el) return;
    if (count > 0) { el.textContent = count; el.classList.remove('hidden'); el.style.display = 'flex'; }
    else { el.classList.add('hidden'); el.style.display = 'none'; }
}

function openCartModal() {
    var modal = document.getElementById('cart-modal');
    var content = document.getElementById('cart-modal-content');
    if (!modal || !content) return;
    if (cart.length === 0) {
        content.innerHTML = '<h2 class="text-2xl font-serif mb-6">سبد خرید</h2><p class="text-gray-400 text-center py-8">سبد خرید شما خالی است</p>';
    } else {
        var total = cart.reduce(function(s, i) { return s + (i.price * i.quantity); }, 0);
        var itemsHtml = cart.map(function(item) {
            return '<div class="flex items-center gap-4 bg-gray-900 rounded-lg p-4 mb-3">' +
                '<img src="' + item.image_url + '" class="w-20 h-20 object-cover rounded-lg">' +
                '<div class="flex-1"><h3 class="font-semibold">' + item.title + '</h3>' +
                '<p class="text-yellow-500">' + item.price.toLocaleString() + ' تومان</p>' +
                '<p class="text-gray-400 text-sm">تعداد: ' + item.quantity + '</p></div>' +
                '<button onclick="removeFromCart(' + item.id + ')" class="text-red-500 hover:text-red-400">حذف</button></div>';
        }).join('');
        content.innerHTML = '<h2 class="text-2xl font-serif mb-6">سبد خرید</h2>' + itemsHtml +
            '<div class="border-t border-gray-700 pt-4 mb-6"><div class="flex justify-between text-lg font-semibold">' +
            '<span>جمع کل:</span><span class="text-yellow-500">' + total.toLocaleString() + ' تومان</span></div></div>' +
            '<div class="bg-gray-900 rounded-lg p-4 mb-6"><p class="text-gray-400 text-sm mb-2">شماره کارت فروشنده:</p>' +
            '<p class="font-mono text-yellow-500">۶۰۳۷-۹۹۱۸-۱۲۳۴-۵۶۷۸</p></div>' +
            '<form id="checkout-form" class="space-y-4">' +
            '<div><label class="block text-gray-300 mb-2 text-sm">شماره تماس</label>' +
            '<input type="tel" id="checkout-phone" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white" required></div>' +
            '<div><label class="block text-gray-300 mb-2 text-sm">آدرس ارسال</label>' +
            '<textarea id="checkout-address" rows="2" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white resize-none" required></textarea></div>' +
            '<div><label class="block text-gray-300 mb-2 text-sm">کد پستی</label>' +
            '<input type="text" id="checkout-zip" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white" required></div>' +
            '<div><label class="block text-gray-300 mb-2 text-sm">تصویر رسید پرداخت</label>' +
            '<input type="file" id="checkout-receipt" accept="image/*" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white" required></div>' +
            '<button type="submit" class="w-full bg-yellow-600 text-black py-3 rounded-lg font-semibold hover:bg-yellow-500">ثبت سفارش</button></form>';
        document.getElementById('checkout-form').addEventListener('submit', handleCheckout);
    }
    modal.classList.remove('hidden');
}

function closeCartModal() {
    var m = document.getElementById('cart-modal');
    if (m) m.classList.add('hidden');
}

function removeFromCart(productId) {
    cart = cart.filter(function(item) { return item.id !== productId; });
    updateCartCount();
    openCartModal();
}

async function handleCheckout(e) {
    e.preventDefault();
    if (!currentUser) { alert('لطفا ابتدا وارد حساب کاربری شوید'); return; }
    if (!supabaseClient) { alert('خطا در اتصال به سرور'); return; }
    var phone = document.getElementById('checkout-phone').value;
    var address = document.getElementById('checkout-address').value;
    var zip = document.getElementById('checkout-zip').value;
    var receiptFile = document.getElementById('checkout-receipt').files[0];
    var { data: receiptData, error: receiptError } = await supabaseClient.storage.from('receipts').upload(currentUser.id + '/' + Date.now() + '.jpg', receiptFile);
    if (receiptError) { alert('خطا در آپلود تصویر رسید'); return; }
    var orderData = { user_id: currentUser.id, phone: phone, address: address, zip_code: zip, receipt_url: receiptData.path, items: cart, total: cart.reduce(function(s, i) { return s + (i.price * i.quantity); }, 0), status: 'pending' };
    var { error } = await supabaseClient.from('orders').insert(orderData);
    if (error) { alert('خطا در ثبت سفارش'); return; }
    cart = []; updateCartCount(); closeCartModal(); alert('سفارش شما با موفقیت ثبت شد');
}

// ===== PRODUCTS =====
async function loadProducts() {
    if (!supabaseClient) return;
    try {
        var { data } = await supabaseClient.from('products').select('*');
        if (data) { products = data; renderProducts(products); }
    } catch(e) {}
}

function renderProducts(list) {
    var c = document.getElementById('products-container');
    if (!c) return;
    c.innerHTML = list.map(function(p) {
        return '<div class="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 cursor-pointer hover:border-yellow-600 transition-colors" onclick="openProductModal(\'' + p.id + '\')">' +
            '<img src="' + p.image_url + '" class="w-full h-48 object-cover">' +
            '<div class="p-4"><h3 class="font-semibold text-lg mb-2">' + p.title + '</h3>' +
            '<p class="text-yellow-500 font-bold">' + p.price.toLocaleString() + ' تومان</p>' +
            '<p class="text-gray-400 text-sm mt-2">موجودی: ' + p.stock + '</p></div></div>';
    }).join('');
}

function openProductModal(productId) {
    var product = products.find(function(p) { return p.id === productId; });
    if (!product) return;
    var modal = document.getElementById('product-modal');
    var content = document.getElementById('product-modal-content');
    if (!modal || !content) return;
    content.innerHTML = '<img src="' + product.image_url + '" class="w-full h-64 object-cover rounded-lg mb-4">' +
        '<h2 class="text-2xl font-serif mb-2">' + product.title + '</h2>' +
        '<p class="text-gray-300 mb-4">' + product.description + '</p>' +
        '<p class="text-yellow-500 text-2xl font-bold mb-4">' + product.price.toLocaleString() + ' تومان</p>' +
        '<p class="text-gray-400 mb-6">موجودی: ' + product.stock + '</p>' +
        '<div class="flex items-center gap-4 mb-6"><label class="text-gray-300">تعداد:</label>' +
        '<input type="number" id="product-quantity" value="1" min="1" max="' + product.stock + '" class="w-20 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-center"></div>' +
        '<button onclick="addToCartFromModal(\'' + product.id + '\')" class="w-full bg-yellow-600 text-black py-3 rounded-lg font-semibold hover:bg-yellow-500">افزودن به سبد خرید</button>';
    modal.classList.remove('hidden');
}

function closeProductModal() {
    var m = document.getElementById('product-modal');
    if (m) m.classList.add('hidden');
}

function addToCartFromModal(productId) {
    var product = products.find(function(p) { return p.id === productId; });
    var qty = parseInt(document.getElementById('product-quantity').value);
    addToCart(product, qty);
    closeProductModal();
}

// ===== CATEGORIES =====
async function loadCategories() {
    if (!supabaseClient) return;
    try {
        var { data } = await supabaseClient.from('categories').select('*');
        if (data) { categories = data; renderCategories(); }
    } catch(e) {}
}

function renderCategories() {
    var c = document.getElementById('categories-container');
    if (!c) return;
    c.innerHTML = '<button onclick="filterByCategory(\'all\', this)" class="category-btn bg-yellow-600 text-black px-6 py-3 rounded-full font-semibold hover:bg-yellow-500 transition-colors">همه</button>' +
        categories.map(function(cat) {
            return '<button onclick="filterByCategory(\'' + cat.id + '\', this)" class="category-btn bg-gray-800 text-gray-300 px-6 py-3 rounded-full font-semibold hover:bg-yellow-600 hover:text-black transition-colors">' + cat.name + '</button>';
        }).join('');
}

function filterByCategory(categoryId, btn) {
    document.querySelectorAll('.category-btn').forEach(function(b) {
        b.className = b.className.replace('bg-yellow-600 text-black', 'bg-gray-800 text-gray-300');
    });
    if (btn) { btn.className = btn.className.replace('bg-gray-800 text-gray-300', 'bg-yellow-600 text-black'); }
    if (categoryId === 'all') { renderProducts(products); }
    else { renderProducts(products.filter(function(p) { return p.category_id === categoryId; })); }
}

// ===== BANNERS =====
async function loadBanners() {
    if (!supabaseClient) return;
    try {
        var { data } = await supabaseClient.from('banners').select('*');
        if (data) { banners = data; renderBanners(); }
    } catch(e) {}
}

function renderBanners() {
    var c = document.getElementById('banners-container');
    if (!c) return;
    if (banners.length === 0) { c.innerHTML = '<div class="p-8 text-center text-gray-400">بنری موجود نیست</div>'; return; }
    c.innerHTML = banners.map(function(b) { return '<div class="min-w-full"><img src="' + b.image_url + '" class="w-full h-64 object-cover"></div>'; }).join('');
}

// ===== ORDERS =====
async function loadOrders() {
    if (!supabaseClient || !currentUser) return;
    try {
        var { data } = await supabaseClient.from('orders').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
        if (data) { renderOrders(data); renderPurchases(data); }
    } catch(e) {}
}

function renderOrders(orders) {
    var c = document.getElementById('orders-container');
    if (!c) return;
    if (!orders.length) { c.innerHTML = '<p class="text-center text-gray-400 py-8">سفارشی ثبت نشده است</p>'; return; }
    c.innerHTML = orders.map(function(o) {
        return '<div class="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-4">' +
            '<div class="flex justify-between mb-4"><span class="text-gray-400 text-sm">' + new Date(o.created_at).toLocaleDateString('fa-IR') + '</span>' +
            '<span class="px-3 py-1 rounded-full text-xs font-semibold ' + (o.status === 'approved' ? 'bg-green-900 text-green-300' : o.status === 'rejected' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300') + '">' + getStatusText(o.status) + '</span></div>' +
            '<p class="text-gray-300 text-sm">شماره تماس: ' + o.phone + '</p>' +
            '<p class="text-gray-300 text-sm">آدرس: ' + o.address + '</p>' +
            '<p class="text-yellow-500 font-semibold mt-4">' + o.total.toLocaleString() + ' تومان</p>' +
            (o.admin_note ? '<p class="text-gray-400 text-sm mt-2">یادداشت: ' + o.admin_note + '</p>' : '') + '</div>';
    }).join('');
}

function renderPurchases(orders) {
    var c = document.getElementById('purchases-container');
    if (!c) return;
    var approved = orders.filter(function(o) { return o.status === 'approved'; });
    if (!approved.length) { c.innerHTML = '<p class="text-center text-gray-400 py-8">خریدی تأیید شده وجود ندارد</p>'; return; }
    c.innerHTML = approved.map(function(o) {
        return '<div class="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-4">' +
            '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-900 text-green-300">تأیید شده</span>' +
            '<p class="text-yellow-500 font-semibold mt-4">' + o.total.toLocaleString() + ' تومان</p>' +
            (o.admin_note ? '<p class="text-gray-400 text-sm mt-2">' + o.admin_note + '</p>' : '') + '</div>';
    }).join('');
}

function getStatusText(status) {
    if (status === 'pending') return 'در انتظار بررسی';
    if (status === 'approved') return 'تأیید شده';
    if (status === 'rejected') return 'رد شده';
    return status;
}

// ===== SUPPORT =====
async function handleSupportSubmit(e) {
    e.preventDefault();
    if (!currentUser) { alert('لطفا ابتدا وارد حساب کاربری شوید'); return; }
    if (!supabaseClient) { alert('خطا در اتصال به سرور'); return; }
    var subject = document.getElementById('ticket-subject').value;
    var description = document.getElementById('ticket-description').value;
    var { error } = await supabaseClient.from('tickets').insert({ user_id: currentUser.id, subject: subject, description: description, status: 'open' });
    if (error) { alert('خطا در ارسال تیکت'); return; }
    alert('تیکت شما با موفقیت ارسال شد');
    document.getElementById('support-form').reset();
}

// ===== SEARCH =====
function setupSearch() {
    var input = document.getElementById('search-input');
    if (!input) return;
    input.addEventListener('input', function(e) {
        var q = e.target.value.toLowerCase();
        var results = products.filter(function(p) { return p.title.toLowerCase().indexOf(q) > -1 || p.description.toLowerCase().indexOf(q) > -1; });
        var c = document.getElementById('search-results');
        if (!c) return;
        if (!q) { c.innerHTML = ''; return; }
        if (!results.length) { c.innerHTML = '<p class="text-gray-400 col-span-3 text-center py-8">نتیجه‌ای یافت نشد</p>'; return; }
        c.innerHTML = results.map(function(p) {
            return '<div class="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 cursor-pointer hover:border-yellow-600" onclick="openProductModal(\'' + p.id + '\')">' +
                '<img src="' + p.image_url + '" class="w-full h-48 object-cover">' +
                '<div class="p-4"><h3 class="font-semibold text-lg mb-2">' + p.title + '</h3>' +
                '<p class="text-yellow-500 font-bold">' + p.price.toLocaleString() + ' تومان</p></div></div>';
        }).join('');
    });
}

// ===== NAVIGATION =====
function showSection(sectionName) {
    var hero = document.getElementById('hero');
    var scroll = document.getElementById('scroll-container');
    var cw = document.getElementById('canvas-wrap');
    var mq = document.querySelector('.marquee-wrap');
    if (hero) hero.style.display = 'none';
    if (scroll) scroll.style.display = 'none';
    if (cw) cw.style.display = 'none';
    if (mq) mq.style.display = 'none';
    document.querySelectorAll('#sections-container > section').forEach(function(el) { el.classList.add('hidden'); });
    var section = document.getElementById(sectionName + '-section');
    if (section) { section.classList.remove('hidden'); window.scrollTo(0, 0); }
    if (sectionName === 'orders' || sectionName === 'purchases') loadOrders();
    if (sectionName === 'search') setupSearch();
}

// ===== ADMIN PANEL =====
function showAdminPanel() {
    if (!isAdmin) return;
    var p = document.getElementById('admin-panel');
    if (p) p.classList.remove('hidden');
    loadAdminData();
}

function closeAdminPanel() {
    var p = document.getElementById('admin-panel');
    if (p) p.classList.add('hidden');
}

function showAdminTab(tabName) {
    document.querySelectorAll('.admin-content').forEach(function(el) { el.classList.add('hidden'); });
    document.querySelectorAll('.admin-tab').forEach(function(el) {
        el.classList.remove('bg-yellow-600', 'text-black');
        el.classList.add('text-gray-300');
    });
    var panel = document.getElementById('admin-' + tabName);
    if (panel) panel.classList.remove('hidden');
    if (event && event.target) {
        event.target.classList.add('bg-yellow-600', 'text-black');
        event.target.classList.remove('text-gray-300');
    }
}

async function loadAdminData() {
    await loadAdminBanners();
    await loadAdminCategories();
    await loadAdminProducts();
    await loadAdminOrders();
    await loadAdminTickets();
}

async function loadAdminBanners() {
    if (!supabaseClient) return;
    var { data } = await supabaseClient.from('banners').select('*');
    var c = document.getElementById('banners-list');
    if (!c) return;
    if (!data || !data.length) { c.innerHTML = '<p class="text-gray-400">بنری موجود نیست</p>'; return; }
    c.innerHTML = data.map(function(b) {
        return '<div class="bg-gray-900 rounded-lg overflow-hidden border border-gray-800"><img src="' + b.image_url + '" class="w-full h-32 object-cover">' +
            '<div class="p-4 flex justify-end"><button onclick="deleteBanner(\'' + b.id + '\')" class="text-red-500 hover:text-red-400 text-sm">حذف</button></div></div>';
    }).join('');
}

async function handleBannerSubmit(e) {
    e.preventDefault();
    if (!supabaseClient) return;
    var file = document.getElementById('banner-image').files[0];
    if (!file) return;
    var { data, error } = await supabaseClient.storage.from('banners').upload(Date.now() + '.jpg', file);
    if (error) { alert('خطا در آپلود'); return; }
    await supabaseClient.from('banners').insert({ image_url: data.path });
    document.getElementById('banner-form').reset();
    loadAdminBanners(); loadBanners();
}

async function deleteBanner(id) {
    if (!confirm('حذف بنر؟')) return;
    await supabaseClient.from('banners').delete().eq('id', id);
    loadAdminBanners(); loadBanners();
}

async function loadAdminCategories() {
    if (!supabaseClient) return;
    var { data } = await supabaseClient.from('categories').select('*');
    var c = document.getElementById('categories-list');
    var s = document.getElementById('product-category');
    if (c) {
        if (!data || !data.length) { c.innerHTML = '<p class="text-gray-400">دسته‌بندی وجود ندارد</p>'; }
        else { c.innerHTML = data.map(function(cat) { return '<div class="bg-gray-900 rounded-lg p-4 flex justify-between border border-gray-800"><span class="text-gray-300">' + cat.name + '</span><button onclick="deleteCategory(\'' + cat.id + '\')" class="text-red-500 text-sm">حذف</button></div>'; }).join(''); }
    }
    if (s && data) { s.innerHTML = data.map(function(cat) { return '<option value="' + cat.id + '">' + cat.name + '</option>'; }).join(''); }
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    if (!supabaseClient) return;
    var name = document.getElementById('category-name').value;
    await supabaseClient.from('categories').insert({ name: name });
    document.getElementById('category-name').value = '';
    loadAdminCategories(); loadCategories();
}

async function deleteCategory(id) {
    if (!confirm('حذف دسته‌بندی؟')) return;
    await supabaseClient.from('categories').delete().eq('id', id);
    loadAdminCategories(); loadCategories();
}

async function loadAdminProducts() {
    if (!supabaseClient) return;
    var { data } = await supabaseClient.from('products').select('*');
    var c = document.getElementById('products-list-admin');
    if (!c) return;
    if (!data || !data.length) { c.innerHTML = '<p class="text-gray-400">محصولی وجود ندارد</p>'; return; }
    c.innerHTML = data.map(function(p) {
        return '<div class="bg-gray-900 rounded-lg p-4 flex items-center gap-4 border border-gray-800"><img src="' + p.image_url + '" class="w-20 h-20 object-cover rounded-lg">' +
            '<div class="flex-1"><h3 class="font-semibold">' + p.title + '</h3><p class="text-yellow-500 text-sm">' + p.price.toLocaleString() + ' تومان</p><p class="text-gray-400 text-sm">موجودی: ' + p.stock + '</p></div>' +
            '<button onclick="deleteProduct(\'' + p.id + '\')" class="text-red-500 text-sm">حذف</button></div>';
    }).join('');
}

async function handleProductSubmit(e) {
    e.preventDefault();
    if (!supabaseClient) return;
    var file = document.getElementById('product-image').files[0];
    if (!file) return;
    var { data: ud, error: ue } = await supabaseClient.storage.from('products').upload(Date.now() + '.jpg', file);
    if (ue) { alert('خطا در آپلود'); return; }
    await supabaseClient.from('products').insert({
        title: document.getElementById('product-title').value,
        description: document.getElementById('product-description').value,
        category_id: document.getElementById('product-category').value,
        price: parseInt(document.getElementById('product-price').value),
        stock: parseInt(document.getElementById('product-stock').value),
        image_url: ud.path
    });
    document.getElementById('product-form').reset();
    loadAdminProducts(); loadProducts();
}

async function deleteProduct(id) {
    if (!confirm('حذف محصول؟')) return;
    await supabaseClient.from('products').delete().eq('id', id);
    loadAdminProducts(); loadProducts();
}

async function loadAdminOrders() {
    if (!supabaseClient) return;
    var { data } = await supabaseClient.from('orders').select('*').order('created_at', { ascending: false });
    var c = document.getElementById('admin-orders-list');
    if (!c) return;
    if (!data || !data.length) { c.innerHTML = '<p class="text-gray-400">سفارشی وجود ندارد</p>'; return; }
    c.innerHTML = data.map(function(o) {
        return '<div class="bg-gray-900 rounded-lg p-4 border border-gray-800 mb-4">' +
            '<div class="flex justify-between mb-4"><span class="text-gray-400 text-sm">' + new Date(o.created_at).toLocaleDateString('fa-IR') + '</span>' +
            '<span class="px-3 py-1 rounded-full text-xs font-semibold ' + (o.status === 'approved' ? 'bg-green-900 text-green-300' : o.status === 'rejected' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300') + '">' + getStatusText(o.status) + '</span></div>' +
            '<p class="text-gray-300 text-sm">تلفن: ' + o.phone + '</p><p class="text-gray-300 text-sm">آدرس: ' + o.address + '</p><p class="text-gray-300 text-sm">کدپستی: ' + o.zip_code + '</p>' +
            '<p class="text-yellow-500 font-semibold mt-2">' + o.total.toLocaleString() + ' تومان</p>' +
            '<a href="' + SUPABASE_URL + '/storage/v1/object/public/receipts/' + o.receipt_url + '" target="_blank" class="text-yellow-500 hover:text-yellow-400 text-sm mt-2 inline-block">مشاهده رسید</a>' +
            (o.status === 'pending' ? '<div class="flex gap-2 mt-4"><button onclick="approveOrder(\'' + o.id + '\')" class="bg-green-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600">تأیید</button><button onclick="rejectOrder(\'' + o.id + '\')" class="bg-red-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600">رد</button></div>' : '') +
            (o.admin_note ? '<p class="text-gray-400 text-sm mt-2">یادداشت: ' + o.admin_note + '</p>' : '') + '</div>';
    }).join('');
}

async function approveOrder(id) {
    var note = prompt('یادداشت ارسال:');
    if (note === null) return;
    var { data: order } = await supabaseClient.from('orders').select('*').eq('id', id).single();
    await supabaseClient.from('orders').update({ status: 'approved', admin_note: note }).eq('id', id);
    if (order && order.items) {
        for (var i = 0; i < order.items.length; i++) {
            var item = order.items[i];
            var { data: prod } = await supabaseClient.from('products').select('stock').eq('id', item.id).single();
            if (prod) await supabaseClient.from('products').update({ stock: prod.stock - item.quantity }).eq('id', item.id);
        }
    }
    loadAdminOrders();
}

async function rejectOrder(id) {
    var reason = prompt('دلیل رد:');
    if (reason === null) return;
    await supabaseClient.from('orders').update({ status: 'rejected', admin_note: reason }).eq('id', id);
    loadAdminOrders();
}

async function loadAdminTickets() {
    if (!supabaseClient) return;
    var { data } = await supabaseClient.from('tickets').select('*').order('created_at', { ascending: false });
    var c = document.getElementById('admin-tickets-list');
    if (!c) return;
    if (!data || !data.length) { c.innerHTML = '<p class="text-gray-400">تیکتی وجود ندارد</p>'; return; }
    c.innerHTML = data.map(function(t) {
        return '<div class="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-4">' +
            '<h3 class="font-semibold mb-2">' + t.subject + '</h3>' +
            '<p class="text-gray-300 text-sm mb-4">' + t.description + '</p>' +
            (t.reply ? '<p class="text-yellow-500 text-sm mb-4">پاسخ: ' + t.reply + '</p>' : '') +
            '<div class="flex gap-2"><input type="text" id="reply-' + t.id + '" placeholder="پاسخ..." class="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm">' +
            '<button onclick="replyToTicket(\'' + t.id + '\')" class="bg-yellow-600 text-black px-4 py-2 rounded-lg text-sm hover:bg-yellow-500">ارسال</button></div></div>';
    }).join('');
}

async function replyToTicket(id) {
    var reply = document.getElementById('reply-' + id).value;
    if (!reply) return;
    await supabaseClient.from('tickets').update({ reply: reply, status: 'replied' }).eq('id', id);
    loadAdminTickets();
}

// ===== LOADER =====
function hideLoader() {
    var el = document.getElementById('loader');
    if (el) { el.style.opacity = '0'; setTimeout(function() { el.style.display = 'none'; }, 700); }
}

// ===== INIT =====
window.addEventListener('DOMContentLoaded', function() {
    initSupabase();
    setupEventListeners();
    hideLoader();
    checkSession();
    loadCategories();
    loadProducts();
    loadBanners();
});

async function checkSession() {
    if (!supabaseClient) { showAuthModal(); return; }
    try {
        var { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            currentUser = session.user;
            await checkAdminRole();
            hideAuthModal();
            showCartButton();
        } else {
            showAuthModal();
        }
    } catch(e) {
        showAuthModal();
    }
}

function setupEventListeners() {
    var authForm = document.getElementById('auth-form');
    if (authForm) authForm.addEventListener('submit', handleAuth);

    var mobileBtn = document.getElementById('mobile-menu-btn');
    if (mobileBtn) mobileBtn.addEventListener('click', function() {
        var m = document.getElementById('mobile-menu');
        if (m) m.classList.toggle('hidden');
    });

    var supportForm = document.getElementById('support-form');
    if (supportForm) supportForm.addEventListener('submit', handleSupportSubmit);

    var bannerForm = document.getElementById('banner-form');
    if (bannerForm) bannerForm.addEventListener('submit', handleBannerSubmit);

    var categoryForm = document.getElementById('category-form');
    if (categoryForm) categoryForm.addEventListener('submit', handleCategorySubmit);

    var productForm = document.getElementById('product-form');
    if (productForm) productForm.addEventListener('submit', handleProductSubmit);

    var searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.addEventListener('input', function(e) {
        var q = e.target.value.toLowerCase();
        var results = products.filter(function(p) { return p.title.toLowerCase().indexOf(q) > -1 || p.description.toLowerCase().indexOf(q) > -1; });
        var c = document.getElementById('search-results');
        if (!c) return;
        if (!q) { c.innerHTML = ''; return; }
        if (!results.length) { c.innerHTML = '<p class="text-gray-400 col-span-3 text-center py-8">نتیجه‌ای یافت نشد</p>'; return; }
        c.innerHTML = results.map(function(p) {
            return '<div class="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 cursor-pointer" onclick="openProductModal(\'' + p.id + '\')">' +
                '<img src="' + p.image_url + '" class="w-full h-48 object-cover"><div class="p-4"><h3 class="font-semibold">' + p.title + '</h3><p class="text-yellow-500">' + p.price.toLocaleString() + ' تومان</p></div></div>';
        }).join('');
    });
}