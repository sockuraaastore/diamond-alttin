async function submitTicket(e) {
  e.preventDefault();

  const subject = document.getElementById('ticket-subject').value.trim();
  const message = document.getElementById('ticket-message').value.trim();
  const btn = document.getElementById('ticket-btn');

  btn.textContent = 'در حال ارسال...';
  btn.disabled = true;

  try {
    const { error } = await supabase.from('tickets').insert({
      user_id: currentUser.id,
      subject,
      message,
      status: 'open'
    });
    if (error) throw error;

    showToast('تیکت شما با موفقیت ارسال شد', 'success');
    document.getElementById('ticket-form').reset();
    await loadTickets();
  } catch (err) {
    showToast('خطا در ارسال تیکت', 'error');
  }

  btn.textContent = 'ارسال تیکت';
  btn.disabled = false;
}

async function loadTickets() {
  const container = document.getElementById('tickets-container');

  const { data: tickets } = await supabase
    .from('tickets')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (!tickets || tickets.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--color-light-gray);padding:2rem">تیکتی ثبت نکرده‌اید</p>';
    return;
  }

  container.innerHTML = `
    <h2 style="font-size:1.2rem;font-weight:600;color:var(--color-gold);margin-bottom:1rem">تیکت‌های شما</h2>
    ${tickets.map(t => `
      <div style="background:var(--color-dark-gray);border:1px solid var(--color-gray);border-radius:12px;padding:1.5rem;margin-bottom:1rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
          <span style="font-weight:600">${t.subject}</span>
          <span class="status-badge status-${t.status === 'open' ? 'pending' : t.status === 'replied' ? 'approved' : 'rejected'}">
            ${t.status === 'open' ? 'باز' : t.status === 'replied' ? 'پاسخ داده شده' : 'بسته شده'}
          </span>
        </div>
        <p style="color:var(--color-light-gray);font-size:0.9rem;margin-bottom:0.5rem">${t.message}</p>
        <span style="color:var(--color-light-gray);font-size:0.8rem">${new Date(t.created_at).toLocaleDateString('fa-IR')}</span>
      </div>
    `).join('')}
  `;
}
