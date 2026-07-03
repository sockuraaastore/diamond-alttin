let currentUser = null;
let userProfile = null;

async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    userProfile = data;
  }
  return currentUser;
}

function isLoggedIn() {
  return currentUser !== null;
}

function isAdmin() {
  return userProfile && userProfile.role === 'admin';
}

async function register(username, password) {
  const email = username + '@diamondalttin.local';
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  const { error: profileError } = await supabase.from('profiles').insert({
    id: data.user.id,
    username,
    role: 'customer'
  });
  if (profileError) throw profileError;

  localStorage.setItem(WELCOMED_KEY, 'false');
  currentUser = data.user;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
  userProfile = profile;

  return data;
}

async function login(username, password) {
  const email = username + '@diamondalttin.local';
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  currentUser = data.user;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
  userProfile = profile;

  return data;
}

async function logout() {
  await supabase.auth.signOut();
  currentUser = null;
  userProfile = null;
  window.location.href = 'index.html';
}

async function checkAdminPasscode(passcode) {
  if (passcode !== ADMIN_PASSCODE) return false;
  if (!userProfile) return false;

  const { error } = await supabase.from('profiles').update({ role: 'admin' }).eq('id', currentUser.id);
  if (error) throw error;
  userProfile.role = 'admin';
  return true;
}
