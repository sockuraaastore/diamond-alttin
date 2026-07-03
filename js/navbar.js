function renderNavbar() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const adminVisible = isAdmin() ? '' : 'style="display:none"';

  const navLinks = `
    <li><a href="index.html" class="${currentPath === 'index.html' ? 'active' : ''}">خانه</a></li>
    <li><a href="search.html" class="${currentPath === 'search.html' ? 'active' : ''}">جستجو</a></li>
    <li><a href="blogs.html" class="${currentPath === 'blogs.html' ? 'active' : ''}">بلاگ</a></li>
    <li><a href="about.html" class="${currentPath === 'about.html' ? 'active' : ''}">درباره ما</a></li>
    <li><a href="support.html" class="${currentPath === 'support.html' ? 'active' : ''}">پشتیبانی</a></li>
    <li><a href="my-orders.html" class="${currentPath === 'my-orders.html' ? 'active' : ''}">سفارشات من</a></li>
    <li><a href="my-purchases.html" class="${currentPath === 'my-purchases.html' ? 'active' : ''}">خریدهای من</a></li>
    <li id="nav-admin" ${adminVisible}><a href="admin.html" style="color:var(--color-gold);font-weight:700">پنل ادمین</a></li>
    <li><a href="#" onclick="toggleCart();return false" style="position:relative">🛒 <span class="cart-badge" style="position:absolute;top:-8px;left:-8px;background:var(--color-gold);color:var(--color-black);border-radius:50%;width:18px;height:18px;font-size:0.7rem;display:none;align-items:center;justify-content:center;font-weight:700">0</span></a></li>
    <li id="nav-auth"></li>
  `;

  const mobileLinks = `
    <a href="index.html">خانه</a>
    <a href="search.html">جستجو</a>
    <a href="blogs.html">بلاگ</a>
    <a href="about.html">درباره ما</a>
    <a href="support.html">پشتیبانی</a>
    <a href="my-orders.html">سفارشات من</a>
    <a href="my-purchases.html">خریدهای من</a>
    <a href="admin.html" id="mobile-admin" ${adminVisible} style="color:var(--color-gold)">پنل ادمین</a>
    <a href="#" id="mobile-auth"></a>
  `;

  const navbar = document.createElement('nav');
  navbar.className = 'navbar';
  navbar.innerHTML = `
    <div class="navbar-inner">
      <a href="index.html" class="navbar-brand">
        <span>diamond</span>
        <span>alttin</span>
      </a>
      <button class="mobile-menu-btn" onclick="toggleMobileMenu()">☰</button>
      <ul class="navbar-links">${navLinks}</ul>
    </div>
  `;

  const mobileMenu = document.createElement('div');
  mobileMenu.id = 'mobile-menu';
  mobileMenu.className = 'mobile-menu';
  mobileMenu.innerHTML = mobileLinks;

  document.body.prepend(mobileMenu);
  document.body.prepend(navbar);

  updateAuthLinks();
}

function updateAuthLinks() {
  const navAuth = document.getElementById('nav-auth');
  const mobileAuth = document.getElementById('mobile-auth');
  const navAdmin = document.getElementById('nav-admin');
  const mobileAdmin = document.getElementById('mobile-admin');

  if (isLoggedIn()) {
    if (navAuth) navAuth.innerHTML = '<a href="#" onclick="logout();return false">خروج</a>';
    if (mobileAuth) mobileAuth.textContent = 'خروج';
    if (mobileAuth) mobileAuth.onclick = function(e) { e.preventDefault(); logout(); };
  } else {
    if (navAuth) navAuth.innerHTML = '<a href="login.html">ورود</a>';
    if (mobileAuth) mobileAuth.textContent = 'ورود';
    if (mobileAuth) mobileAuth.onclick = null;
    if (mobileAuth) mobileAuth.href = 'login.html';
  }

  if (isAdmin()) {
    if (navAdmin) navAdmin.style.display = '';
    if (mobileAdmin) mobileAdmin.style.display = '';
  }
}
