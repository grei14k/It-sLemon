window.LemonPOS = (() => {
  let client;
  async function init() {
    const response = await fetch('/api/config');
    const config = await response.json();
    if (!response.ok) throw new Error(config.error || 'Konfigurasi Supabase belum siap.');
    if (!window.supabase) throw new Error('Library login gagal dimuat. Periksa koneksi internet.');
    client = window.supabase.createClient(config.url, config.anonKey);
    return client;
  }
  async function token() {
    if (!client) await init();
    const { data: { session } } = await client.auth.getSession();
    if (!session) { location.href = '/pos/login.html'; throw new Error('Sesi berakhir. Silakan login kembali.'); }
    return session.access_token;
  }
  async function api(url, options = {}) {
    const accessToken = await token();
    const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) { await client.auth.signOut(); location.href = '/pos/login.html'; }
    if (!response.ok) throw new Error(data.error || 'Permintaan gagal.');
    return data;
  }
  async function logout() { if (client) await client.auth.signOut(); location.href = '/pos/login.html'; }
  const rupiah = n => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n || 0));
  function escapeHTML(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  return { init, api, logout, rupiah, escapeHTML, get client() { return client; } };
})();
