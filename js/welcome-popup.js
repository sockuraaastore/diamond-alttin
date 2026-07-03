function checkWelcomePopup() {
  if (!isLoggedIn()) return;
  const welcomed = localStorage.getItem(WELCOMED_KEY);
  if (welcomed === 'false') {
    document.getElementById('welcome-modal').classList.add('active');
  }
}

function closeWelcomeModal() {
  document.getElementById('welcome-modal').classList.remove('active');
  localStorage.setItem(WELCOMED_KEY, 'true');
}
