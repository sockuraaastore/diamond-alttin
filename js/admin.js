let passcodeInput = '';

function enterDigit(digit) {
  if (passcodeInput.length >= 8) return;
  passcodeInput += digit;
  updatePasscodeDots();
}

function clearPasscode() {
  passcodeInput = '';
  updatePasscodeDots();
  document.getElementById('passcode-error').style.display = 'none';
}

function updatePasscodeDots() {
  const dots = document.querySelectorAll('.passcode-dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('filled', i < passcodeInput.length);
  });
}

async function submitPasscode() {
  const success = await checkAdminPasscode(passcodeInput);
  if (success) {
    document.getElementById('passcode-overlay').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'block';
    await loadAdminData();
  } else {
    document.getElementById('passcode-error').style.display = 'block';
    passcodeInput = '';
    updatePasscodeDots();
  }
}

function switchTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).style.display = 'block';
  event.target.classList.add('active');

  if (tab === 'banners') loadAdminBanners();
  if (tab === 'categories') loadAdminCategories();
  if (tab === 'products') loadAdminProducts();
  if (tab === 'orders') loadAdminOrders();
  if (tab === 'support') loadAdminTickets();
}

async function loadAdminData() {
  await loadAdminBanners();
  await loadAdminCategories();
  await loadAdminProducts();
  await loadAdminOrders();
  await loadAdminTickets();
}

// Banners
async function loadAdminBanners() {
  const container = document.getElementById('banners-list');
  const { data } = await supabase.from('banners').select('*').order('sort_order');

  if (!data || data.length === 0) {
    container.innerHTML = '<p style="color:var(--color-light-gray)">بنری وجود ندارد</p>';
    return;
  }

  container.innerHTML = data.map(b => `
    <div style="background:var(--color-dark-gray);border:1px solid var(--color-gray);border-radius:12px;padding:1rem;margin-bottom:0.5rem;display:flex;align-items:center;gap:1rem">
      <img src="${b.image_url}" style="width:120px;height:68px;object-fit:cover;border-radius:8px" alt="بنر">
      <div style="flex:1">
        <span class="status-badge ${b.is_active ? 'status-approved' : 'status-rejected'}">${b.is_active ? 'فعال' : 'غیرفعال'}</span>
      </div>
      <button onclick="deleteBanner('${b.id}')" class="btn-secondary" style="padding:0.4rem 0.8rem;font-size:0.85rem">حذف</button>
    </div>
  `).join('');
}

async function addBanner(e) {
  e.preventDefault();
  const file = document.getElementById('banner-file').files[0];
  if (!file) return;

  const btn = document.getElementById('banner-add-btn');
  btn.textContent = 'در حال آپلود...';
  btn.disabled = true;

  try {
    const url = await uploadFile('banners', file);
    const { error } = await supabase.from('banners').insert({
      image_url: url,
      is_active: true,
      sort_order: 0
    });
    if (error) throw error;
    showToast('بنر با موفقیت اضافه شد', 'success');
    document.getElementById('banner-file').value = '';
    await loadAdminBanners();
  } catch (err) {
    showToast('خطا در افزودن بنر', 'error');
  }

  btn.textContent = 'افزودن';
  btn.disabled = false;
}

async function deleteBanner(id) {
  if (!confirm('آیا از حذف این بنر مطمئن هستید؟')) return;
  await supabase.from('banners').delete().eq('id', id);
  showToast('بنر حذف شد', 'success');
  await loadAdminBanners();
}

// Categories
async function loadAdminCategories() {
  const container = document.getElementById('categories-list');
  const { data } = await supabase.from('categories').select('*').order('sort_order');

  const prodSelect = document.getElementById('prod-category');
  if (prodSelect) {
    prodSelect.innerHTML = (data || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p style="color:var(--color-light-gray)">دسته‌بندی‌ای وجود ندارد</p>';
    return;
  }

  container.innerHTML = data.map(c => `
    <div style="background:var(--color-dark-gray);border:1px solid var(--color-gray);border-radius:12px;padding:1rem;margin-bottom:0.5rem;display:flex;align-items:center;justify-content:space-between">
      <span style="font-weight:600">${c.name}</span>
      <button onclick="deleteCategory('${c.id}')" class="btn-secondary" style="padding:0.4rem 0.8rem;font-size:0.85rem">حذف</button>
    </div>
  `).join('');
}

async function addCategory(e) {
  e.preventDefault();
  const name = document.getElementById('cat-name').value.trim();
  const { error } = await supabase.from('categories').insert({ name, sort_order: 0 });
  if (error) throw error;
  showToast('دسته‌بندی اضافه شد', 'success');
  document.getElementById('cat-name').value = '';
  await loadAdminCategories();
}

async function deleteCategory(id) {
  if (!confirm('آیا از حذف این دسته‌بندی مطمئن هستید؟')) return;
  await supabase.from('categories').delete().eq('id', id);
  showToast('دسته‌بندی حذف شد', 'success');
  await loadAdminCategories();
}

// Products
async function loadAdminProducts() {
  const container = document.getElementById('products-list');
  const { data } = await supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false });

  if (!data || data.length === 0) {
    container.innerHTML = '<p style="color:var(--color-light-gray)">محصولی وجود ندارد</p>';
    return;
  }

  container.innerHTML = data.map(p => `
    <div style="background:var(--color-dark-gray);border:1px solid var(--color-gray);border-radius:12px;padding:1rem;margin-bottom:0.5rem;display:flex;align-items:center;gap:1rem">
      <img src="${p.image_url}" style="width:60px;height:60px;object-fit:cover;border-radius:8px" alt="${p.name}">
      <div style="flex:1">
        <div style="font-weight:600">${p.name}</div>
        <div style="color:var(--color-gold);font-size:0.9rem">${formatPrice(p.price)}</div>
        <div style="color:var(--color-light-gray);font-size:0.8rem">موجودی: ${p.stock} | ${p.categories?.name || 'بدون دسته'}</div>
      </div>
      <button onclick="deleteProduct('${p.id}')" class="btn-secondary" style="padding:0.4rem 0.8rem;font-size:0.85rem">حذف</button>
    </div>
  `).join('');
}

async function addProduct(e) {
  e.preventDefault();
  const file = document.getElementById('prod-image').files[0];
  if (!file) return;

  try {
    const url = await uploadFile('products', file);
    const { error } = await supabase.from('products').insert({
      name: document.getElementById('prod-name').value.trim(),
      description: document.getElementById('prod-desc').value.trim(),
      price: Number(document.getElementById('prod-price').value),
      stock: Number(document.getElementById('prod-stock').value),
      category_id: document.getElementById('prod-category').value,
      image_url: url,
      is_active: true
    });
    if (error) throw error;
    showToast('محصول با موفقیت اضافه شد', 'success');
    e.target.reset();
    await loadAdminProducts();
  } catch (err) {
    showToast('خطا در افزودن محصول', 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('آیا از حذف این محصول مطمئن هستید؟')) return;
  await supabase.from('products').delete().eq('id', id);
  showToast('محصول حذف شد', 'success');
  await loadAdminProducts();
}

// Orders
async function loadAdminOrders() {
  const container = document.getElementById('orders-list');
  const { data: orders } = await supabase
    .from('orders')
    .select('*, profiles(username)')
    .order('created_at', { ascending: false });

  if (!orders || orders.length === 0) {
    container.innerHTML = '<p style="color:var(--color-light-gray)">سفارشی وجود ندارد</p>';
    return;
  }

  container.innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>تاریخ</th>
            <th>کاربر</th>
            <th>تلفن</th>
            <th>مبلغ</th>
            <th>وضعیت</th>
            <th>عملیات</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(o => `
            <tr>
              <td style="font-size:0.85rem">${new Date(o.created_at).toLocaleDateString('fa-IR')}</td>
              <td>${o.profiles?.username || '-'}</td>
              <td>${o.phone}</td>
              <td style="color:var(--color-gold);font-weight:600">${formatPrice(o.total_price)}</td>
              <td><span class="status-badge status-${o.status}">${o.status === 'pending' ? 'در انتظار' : o.status === 'approved' ? 'تایید' : 'رد'}</span></td>
              <td>
                <button onclick="openOrderModal('${o.id}')" class="btn-secondary" style="padding:0.3rem 0.6rem;font-size:0.8rem">بررسی</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function openOrderModal(orderId) {
  const { data: order } = await supabase.from('orders').select('*, order_items(*)').eq('id', orderId).single();
  if (!order) return;

  const modal = document.getElementById('order-modal');
  const content = document.getElementById('order-modal-content');

  content.innerHTML = `
    <h2 style="font-size:1.3rem;font-weight:700;color:var(--color-gold);margin-bottom:1.5rem">جزئیات سفارش</h2>
    <div style="margin-bottom:1rem">
      <div style="color:var(--color-light-gray);margin-bottom:0.3rem">تلفن: ${order.phone}</div>
      <div style="color:var(--color-light-gray);margin-bottom:0.3rem">آدرس: ${order.address}</div>
      <div style="color:var(--color-light-gray);margin-bottom:0.3rem">کد پستی: ${order.postal_code}</div>
      <div style="color:var(--color-light-gray);margin-bottom:1rem">فیش واریزی:</div>
      <a href="${order.receipt_url}" target="_blank" style="display:inline-block;margin-bottom:1rem">
        <img src="${order.receipt_url}" style="max-width:200px;border-radius:8px;border:1px solid var(--color-gray)" alt="فیش">
      </a>
    </div>
    <div style="margin-bottom:1.5rem">
      <h4 style="font-weight:600;margin-bottom:0.5rem">اقلام سفارش:</h4>
      ${order.order_items.map(item => `
        <div style="display:flex;justify-content:space-between;padding:0.3rem 0;border-bottom:1px solid var(--color-gray)">
          <span>${item.product_name} × ${item.quantity}</span>
          <span style="color:var(--color-gold)">${formatPrice(item.price * item.quantity)}</span>
        </div>
      `).join('')}
      <div style="display:flex;justify-content:space-between;padding:0.5rem 0;font-weight:700">
        <span>جمع کل</span>
        <span style="color:var(--color-gold)">${formatPrice(order.total_price)}</span>
      </div>
    </div>
    ${order.status === 'pending' ? `
      <div style="margin-bottom:1rem">
        <label style="display:block;margin-bottom:0.3rem;color:var(--color-light-gray);font-size:0.85rem">یادداشت ادمین</label>
        <input type="text" id="admin-note-${orderId}" class="input-field" placeholder="مثلاً: طی ۳ روز ارسال می‌شود">
      </div>
      <div style="display:flex;gap:1rem">
        <button class="btn-primary" onclick="approveOrder('${orderId}')" style="flex:1">تایید و ارسال</button>
        <button class="btn-secondary" onclick="rejectOrder('${orderId}')" style="flex:1;color:#f87171;border-color:#f87171">رد سفارش</button>
      </div>
    ` : `
      <div style="background:var(--color-gray);padding:1rem;border-radius:8px;margin-top:1rem">
        <span style="color:var(--color-gold);font-weight:600">وضعیت: </span>
        <span>${order.status === 'approved' ? 'تایید شده' : 'رد شده'}</span>
        ${order.admin_note ? `<br><span style="color:var(--color-light-gray)">یادداشت: ${order.admin_note}</span>` : ''}
      </div>
    `}
  `;

  modal.classList.add('active');
}

function closeOrderModal() {
  document.getElementById('order-modal').classList.remove('active');
}

async function approveOrder(orderId) {
  const note = document.getElementById('admin-note-' + orderId)?.value.trim() || '';

  // Get order items to deduct stock
  const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId);

  // Deduct stock for each item
  for (const item of items) {
    if (item.product_id) {
      const { data: product } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
      if (product) {
        await supabase.from('products').update({ stock: Math.max(0, product.stock - item.quantity) }).eq('id', item.product_id);
      }
    }
  }

  await supabase.from('orders').update({ status: 'approved', admin_note: note }).eq('id', orderId);
  showToast('سفارش تایید شد', 'success');
  closeOrderModal();
  await loadAdminOrders();
}

async function rejectOrder(orderId) {
  const note = document.getElementById('admin-note-' + orderId)?.value.trim() || 'رد شده توسط ادمین';
  await supabase.from('orders').update({ status: 'rejected', admin_note: note }).eq('id', orderId);
  showToast('سفارش رد شد', 'success');
  closeOrderModal();
  await loadAdminOrders();
}

// Support
async function loadAdminTickets() {
  const container = document.getElementById('admin-tickets-list');
  const { data: tickets } = await supabase
    .from('tickets')
    .select('*, profiles(username)')
    .order('created_at', { ascending: false });

  if (!tickets || tickets.length === 0) {
    container.innerHTML = '<p style="color:var(--color-light-gray)">تیکتی وجود ندارد</p>';
    return;
  }

  container.innerHTML = tickets.map(t => `
    <div style="background:var(--color-dark-gray);border:1px solid var(--color-gray);border-radius:12px;padding:1.5rem;margin-bottom:1rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
        <span style="font-weight:600">${t.subject}</span>
        <span style="color:var(--color-light-gray);font-size:0.8rem">${t.profiles?.username || '-'}</span>
      </div>
      <p style="color:var(--color-light-gray);margin-bottom:1rem">${t.message}</p>
      <div style="display:flex;gap:0.5rem">
        <input type="text" id="reply-${t.id}" class="input-field" placeholder="پاسخ ادمین" style="flex:1">
        <button onclick="replyToTicket('${t.id}')" class="btn-primary" style="padding:0.5rem 1rem">ارسال پاسخ</button>
      </div>
    </div>
  `).join('');
}

async function replyToTicket(ticketId) {
  const reply = document.getElementById('reply-' + ticketId)?.value.trim();
  if (!reply) return;

  const { error: replyError } = await supabase.from('ticket_replies').insert({
    ticket_id: ticketId,
    sender_id: currentUser.id,
    message: reply,
    is_admin_reply: true
  });
  if (replyError) throw replyError;

  await supabase.from('tickets').update({ status: 'replied' }).eq('id', ticketId);
  showToast('پاسخ ارسال شد', 'success');
  document.getElementById('reply-' + ticketId).value = '';
  await loadAdminTickets();
}
