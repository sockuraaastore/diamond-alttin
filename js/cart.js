async function handleCheckout(e) {
  e.preventDefault();

  if (!isLoggedIn()) {
    showToast('لطفا ابتدا وارد شوید', 'error');
    setTimeout(() => { window.location.href = 'login.html'; }, 1000);
    return;
  }

  const cart = getCart();
  if (cart.length === 0) {
    showToast('سبد خرید خالی است', 'error');
    return;
  }

  const phone = document.getElementById('checkout-phone').value.trim();
  const address = document.getElementById('checkout-address').value.trim();
  const postalCode = document.getElementById('checkout-postal').value.trim();
  const receiptFile = document.getElementById('checkout-receipt').files[0];

  if (!phone || !address || !postalCode || !receiptFile) {
    showToast('لطفا تمام فیلدها را پر کنید', 'error');
    return;
  }

  const btn = document.getElementById('checkout-btn');
  btn.textContent = 'در حال ارسال...';
  btn.disabled = true;

  try {
    const receiptUrl = await uploadFile('receipts', receiptFile);

    const totalPrice = getCartTotal();

    const { data: order, error: orderError } = await supabase.from('orders').insert({
      user_id: currentUser.id,
      total_price: totalPrice,
      phone,
      address,
      postal_code: postalCode,
      receipt_url: receiptUrl,
      status: 'pending'
    }).select().single();

    if (orderError) throw orderError;

    for (const item of cart) {
      const { error: itemError } = await supabase.from('order_items').insert({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.name,
        price: item.price,
        quantity: item.quantity
      });
      if (itemError) throw itemError;
    }

    saveCart([]);
    showToast('سفارش شما با موفقیت ثبت شد', 'success');
    document.getElementById('checkout-form').reset();
    renderCartDrawer();

  } catch (err) {
    showToast('خطا در ثبت سفارش: ' + err.message, 'error');
  }

  btn.textContent = 'ثبت سفارش';
  btn.disabled = false;
}

function renderCheckoutForm() {
  const cart = getCart();
  const section = document.getElementById('checkout-section');
  if (!section) return;

  section.innerHTML = `
    <div style="background:var(--color-dark-gray);border:1px solid var(--color-gray);border-radius:16px;padding:2rem;max-width:600px;margin:0 auto">
      <h2 style="font-size:1.4rem;font-weight:700;color:var(--color-gold);margin-bottom:1.5rem;text-align:center">تکمیل خرید</h2>

      ${cart.length === 0 ? '<p style="text-align:center;color:var(--color-light-gray)">سبد خرید شما خالی است</p>' : `
        <div style="margin-bottom:1.5rem">
          ${cart.map(item => `
            <div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--color-gray)">
              <span>${item.name} × ${item.quantity}</span>
              <span style="color:var(--color-gold)">${formatPrice(item.price * item.quantity)}</span>
            </div>
          `).join('')}
          <div style="display:flex;justify-content:space-between;padding:1rem 0;font-weight:700;font-size:1.1rem">
            <span>جمع کل</span>
            <span style="color:var(--color-gold)">${formatPrice(getCartTotal())}</span>
          </div>
        </div>

        <div class="card-number-box" style="margin-bottom:1.5rem">
          <div class="label">شماره کارت فروشنده</div>
          <div class="number">6037-9918-0000-0000</div>
        </div>

        <form id="checkout-form" onsubmit="handleCheckout(event)">
          <div style="margin-bottom:1rem">
            <label style="display:block;margin-bottom:0.5rem;color:var(--color-light-gray);font-size:0.9rem">شماره تلفن</label>
            <input type="tel" id="checkout-phone" class="input-field" placeholder="شماره تلفن خود را وارد کنید" required>
          </div>
          <div style="margin-bottom:1rem">
            <label style="display:block;margin-bottom:0.5rem;color:var(--color-light-gray);font-size:0.9rem">آدرس ارسال</label>
            <textarea id="checkout-address" class="input-field" rows="3" placeholder="آدرس کامل خود را وارد کنید" required style="resize:vertical"></textarea>
          </div>
          <div style="margin-bottom:1rem">
            <label style="display:block;margin-bottom:0.5rem;color:var(--color-light-gray);font-size:0.9rem">کد پستی</label>
            <input type="text" id="checkout-postal" class="input-field" placeholder="کد پستی خود را وارد کنید" required>
          </div>
          <div style="margin-bottom:1.5rem">
            <label style="display:block;margin-bottom:0.5rem;color:var(--color-light-gray);font-size:0.9rem">عکس فیش واریزی</label>
            <input type="file" id="checkout-receipt" accept="image/*" class="input-field" required>
          </div>
          <button type="submit" class="btn-primary w-full" id="checkout-btn">ثبت سفارش</button>
        </form>
      `}
    </div>
  `;
}
