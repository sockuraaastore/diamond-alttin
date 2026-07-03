async function loadBlogs() {
  const container = document.getElementById('blogs-container');

  const { data: blogs } = await supabase
    .from('blogs')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (!blogs || blogs.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--color-light-gray);padding:4rem">هنوز مقاله‌ای منتشر نشده است</p>';
    return;
  }

  container.innerHTML = blogs.map(blog => `
    <div style="background:var(--color-dark-gray);border:1px solid var(--color-gray);border-radius:12px;overflow:hidden;margin-bottom:1.5rem">
      ${blog.image_url ? `<img src="${blog.image_url}" style="width:100%;height:250px;object-fit:cover" alt="${blog.title}">` : ''}
      <div style="padding:1.5rem">
        <h2 style="font-size:1.2rem;font-weight:700;margin-bottom:0.5rem">${blog.title}</h2>
        <p style="color:var(--color-light-gray);font-size:0.9rem;line-height:2;margin-bottom:0.5rem">${blog.content.substring(0, 200)}...</p>
        <span style="color:var(--color-light-gray);font-size:0.8rem">${new Date(blog.created_at).toLocaleDateString('fa-IR')}</span>
      </div>
    </div>
  `).join('');
}
