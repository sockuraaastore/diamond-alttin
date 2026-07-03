async function loadOrders() {
  const container = document.getElementById('orders-container');

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error || !orders || orders.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--color-light-gray);padding:4rem">هنوز سفارشی ثبت نکرده‌اید</p>';
    return;
  }

  container.innerHTML = orders.map(order => `
    <div style="background:var(--color-dark-gray);border:1px solid var(--color-gray);border-radius:12px;padding:1.5rem;margin-bottom:1rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem">
        <span style="color:var(--color-light-gray);font-size:0.85rem">${new Date(order.created_at).toLocaleDateString('fa-IR')}</span>
        <span class="status-badge status-${order.status}">${getStatusText(order.status)}</span>
      </div>
      <div style="font-size:1.1rem;font-weight:700;color:var(--color-gold);margin-bottom:0.5rem">${formatPrice(order.total_price)}</div>
      <div style="color:var(--color-light-gray);font-size:0.9rem;margin-bottom:0.5rem">تلفن: ${order.phone}</div>
      <div style="color:var(--color-light-gray);font-size:0.9rem;margin-bottom:0.5rem">آدرس: ${order.address}</div>
      <div style="color:var(--color-light-gray);font-size:0.9rem;margin-bottom:0.5rem">کد پستی: ${order.postal_code}</div>
      ${order.admin_note ? `
        <div style="background:var(--color-gray);padding:0.8rem;border-radius:8px;margin-top:1rem">
          <span style="color:var(--color-gold);font-weight:600">یادداشت ادمین: </span>
          <span>${order.admin_note}</span>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function getStatusText(status) {
  const map = {
    pending: 'در انتظار بررسی',
    approved: 'تایید شده',
    rejected: 'رد شده'
  };
  return map[status] || status;
}
