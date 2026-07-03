let searchTimeout;

async function searchProducts() {
  clearTimeout(searchTimeout);
  const query = document.getElementById('search-input').value.trim();
  const container = document.getElementById('search-results');

  if (!query) {
    container.innerHTML = '';
    return;
  }

  searchTimeout = setTimeout(async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (!data || data.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--color-light-gray);grid-column:1/-1;padding:4rem">محصولی یافت نشد</p>';
      return;
    }

    container.innerHTML = data.map(p => `
      <div class="product-card" onclick="window.location.href='index.html?product=${p.id}'">
        <img src="${p.image_url}" alt="${p.name}">
        <div class="product-card-info">
          <div class="product-card-title">${p.name}</div>
          <div class="product-card-price">${formatPrice(p.price)}</div>
        </div>
      </div>
    `).join('');
  }, 300);
}
