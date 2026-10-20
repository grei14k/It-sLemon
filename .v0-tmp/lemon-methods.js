  componentDidMount() {
    this._loadMenu();
    this._menuTimer = setInterval(() => this._loadMenu(), 30000);
  }
  componentWillUnmount() {
    clearInterval(this._menuTimer);
    clearInterval(this._iv);
    clearTimeout(this._to);
    if (this._dlg) this._dlg.remove();
  }
  _loadMenu() {
    return fetch('/api/menu', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('menu'))))
      .then((d) => this.setState({ products: Array.isArray(d.products) ? d.products : [], menuFailed: false }))
      .catch(() => this.setState({ menuFailed: true }));
  }
  _esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  _rp(n) {
    return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
  }
  _dialog() {
    if (this._dlg && this._dlg.isConnected) return this._dlg;
    if (!document.getElementById('lemon-order-css')) {
      const st = document.createElement('style');
      st.id = 'lemon-order-css';
      st.textContent = [
        '#lemon-order{border:0;padding:0;background:transparent;max-width:min(460px,calc(100vw - 24px));width:100%;max-height:calc(100vh - 24px);font-family:Nunito,system-ui,sans-serif;color:#2a2a2a}',
        '#lemon-order::backdrop{background:rgba(15,91,52,0.55);backdrop-filter:blur(3px)}',
        '#lemon-order .lo-card{background:#fff4d6;border-radius:28px;padding:28px;box-shadow:0 24px 60px rgba(0,0,0,0.35);display:flex;flex-direction:column;gap:16px}',
        '#lemon-order .lo-head{display:flex;gap:16px;align-items:center}',
        '#lemon-order .lo-thumb{width:72px;height:88px;border-radius:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden}',
        '#lemon-order .lo-thumb img{height:80px;width:auto;max-width:64px;object-fit:contain}',
        '#lemon-order h2{margin:0;font-size:24px;font-weight:800;color:#0f5b34;line-height:1.2}',
        '#lemon-order .lo-muted{margin:0;font-size:15px;color:#5f5a48}',
        '#lemon-order label{display:flex;flex-direction:column;gap:6px;font-weight:800;font-size:15px;color:#0f5b34}',
        '#lemon-order input,#lemon-order textarea{font:inherit;font-weight:600;font-size:16px;padding:12px 14px;border-radius:14px;border:2px solid #e3d3a0;background:#fffdf5;color:#2a2a2a}',
        '#lemon-order input:focus-visible,#lemon-order textarea:focus-visible,#lemon-order button:focus-visible{outline:3px solid #f6c635;outline-offset:2px}',
        '#lemon-order .lo-qty{display:flex;align-items:center;gap:10px}',
        '#lemon-order .lo-qty input{width:72px;text-align:center}',
        '#lemon-order .lo-step{width:44px;height:44px;border-radius:999px;border:0;background:#0f5b34;color:#fff4d6;font-size:22px;font-weight:800;cursor:pointer}',
        '#lemon-order .lo-total{display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:20px;padding-top:12px;border-top:2px dashed #e3d3a0}',
        '#lemon-order .lo-err{margin:0;color:#9b1c1c;font-weight:700;font-size:15px}',
        '#lemon-order .lo-err:empty{display:none}',
        '#lemon-order .lo-actions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}',
        '#lemon-order .lo-btn{font:inherit;font-weight:800;font-size:16px;padding:12px 22px;border-radius:999px;border:0;cursor:pointer}',
        '#lemon-order .lo-primary{background:#0f5b34;color:#fff4d6}',
        '#lemon-order .lo-primary[disabled]{opacity:0.6;cursor:wait}',
        '#lemon-order .lo-ghost{background:transparent;color:#0f5b34;border:2px solid #0f5b34}',
        '#lemon-order .lo-brand{font-family:Pacifico,cursive;font-size:30px;color:#0f5b34;text-align:center;line-height:1.2}',
        '#lemon-order .lo-ok{margin:0 auto;background:#dcf3e4;color:#0f5b34;font-weight:800;font-size:14px;padding:6px 14px;border-radius:999px}',
        '#lemon-order dl{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:0;font-size:15px}',
        '#lemon-order dt{color:#5f5a48}#lemon-order dd{margin:0;font-weight:800;text-align:right;word-break:break-word}',
        '#lemon-order table{width:100%;border-collapse:collapse;font-size:15px}',
        '#lemon-order th{text-align:left;color:#5f5a48;font-weight:700;padding:6px 0;border-bottom:2px dashed #e3d3a0}',
        '#lemon-order td{padding:8px 0;font-weight:700}#lemon-order .r{text-align:right}',
        '@media print{body>*:not(#lemon-order){display:none!important}#lemon-order .lo-card{box-shadow:none}#lemon-order .lo-actions{display:none}}'
      ].join('\n');
      document.head.appendChild(st);
    }
    const d = document.createElement('dialog');
    d.id = 'lemon-order';
    d.setAttribute('aria-labelledby', 'lo-title');
    d.addEventListener('click', (e) => { if (e.target === d && !this._submitting) d.close(); });
    d.addEventListener('cancel', (e) => { if (this._submitting) e.preventDefault(); });
    document.body.appendChild(d);
    this._dlg = d;
    return d;
  }
  _openOrder(product, flavor) {
    const d = this._dialog();
    const max = Math.max(1, Math.min(20, product.stock));
    d.innerHTML = `
      <form class="lo-card" novalidate>
        <div class="lo-head">
          <div class="lo-thumb" style="background:${this._esc(flavor.theme.bg)}"><img src="${this._esc(flavor.src)}" alt=""></div>
          <div>
            <h2 id="lo-title">${this._esc(product.name)}</h2>
            <p class="lo-muted">${this._rp(product.price)} / gelas · stok ${product.stock}</p>
          </div>
        </div>
        <label>Jumlah
          <span class="lo-qty">
            <button type="button" class="lo-step" data-step="-1" aria-label="Kurangi jumlah">-</button>
            <input name="qty" type="number" inputmode="numeric" min="1" max="${max}" value="1" aria-label="Jumlah gelas">
            <button type="button" class="lo-step" data-step="1" aria-label="Tambah jumlah">+</button>
          </span>
        </label>
        <label>Nama pemesan
          <input name="name" required maxlength="60" autocomplete="name" placeholder="Nama kamu">
        </label>
        <label>No. WhatsApp (opsional)
          <input name="phone" type="tel" maxlength="20" autocomplete="tel" placeholder="08xxxxxxxxxx">
        </label>
        <label>Catatan (opsional)
          <textarea name="note" rows="2" maxlength="200" placeholder="Contoh: less ice, less sugar"></textarea>
        </label>
        <div class="lo-total"><span>Total</span><span data-total>${this._rp(product.price)}</span></div>
        <p class="lo-err" role="alert" data-err></p>
        <div class="lo-actions">
          <button type="button" class="lo-btn lo-ghost" data-close>Batal</button>
          <button type="submit" class="lo-btn lo-primary">Pesan sekarang</button>
        </div>
      </form>`;
    const form = d.querySelector('form');
    const qty = form.querySelector('[name=qty]');
    const totalEl = form.querySelector('[data-total]');
    const errEl = form.querySelector('[data-err]');
    const readQty = () => Math.min(max, Math.max(1, Math.floor(Number(qty.value) || 1)));
    const clampQty = () => {
      const v = readQty();
      qty.value = String(v);
      totalEl.textContent = this._rp(v * product.price);
      return v;
    };
    qty.addEventListener('change', clampQty);
    qty.addEventListener('input', () => { totalEl.textContent = this._rp(readQty() * product.price); });
    form.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => { qty.value = String(readQty() + Number(b.dataset.step)); clampQty(); }));
    form.querySelector('[data-close]').addEventListener('click', () => d.close());
    form.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.isComposing || e.keyCode === 229)) e.preventDefault(); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (this._submitting) return;
      const nameInput = form.querySelector('[name=name]');
      const name = nameInput.value.trim();
      if (name.length < 2) { errEl.textContent = 'Nama pemesan wajib diisi.'; nameInput.focus(); return; }
      const submitBtn = form.querySelector('[type=submit]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Memproses…';
      errEl.textContent = '';
      this._submitting = true;
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name,
          customer_phone: form.querySelector('[name=phone]').value.trim(),
          note: form.querySelector('[name=note]').value.trim(),
          items: [{ product_id: product.id, quantity: clampQty() }]
        })
      })
        .then((r) => r.json().catch(() => ({})).then((data) => ({ ok: r.ok, data })))
        .then(({ ok, data }) => {
          this._submitting = false;
          if (!ok || !data.receipt) throw new Error(data.error || 'Pesanan gagal dikirim. Coba lagi.');
          this._showReceipt(data.receipt);
          this._loadMenu();
        })
        .catch((err) => {
          this._submitting = false;
          errEl.textContent = err.message || 'Pesanan gagal dikirim. Coba lagi.';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Pesan sekarang';
          this._loadMenu();
        });
    });
    if (!d.open) d.showModal();
    qty.focus();
  }
  _showReceipt(rc) {
    const d = this._dialog();
    const code = rc.id ? String(rc.id).slice(0, 8).toUpperCase() : '-';
    const when = new Date(rc.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    const rows = (rc.lines || []).map((l) => `<tr><td>${this._esc(l.name)}</td><td class="r">${l.quantity}</td><td class="r">${this._rp(l.subtotal)}</td></tr>`).join('');
    d.innerHTML = `
      <div class="lo-card" aria-live="polite">
        <div class="lo-brand" id="lo-title">It&#39;s Lemon</div>
        <span class="lo-ok">Pesanan diterima</span>
        <dl>
          <dt>No. pesanan</dt><dd>#${this._esc(code)}</dd>
          <dt>Waktu</dt><dd>${this._esc(when)}</dd>
          <dt>Atas nama</dt><dd>${this._esc(rc.customer_name)}</dd>
          ${rc.customer_phone ? `<dt>WhatsApp</dt><dd>${this._esc(rc.customer_phone)}</dd>` : ''}
          ${rc.note ? `<dt>Catatan</dt><dd>${this._esc(rc.note)}</dd>` : ''}
        </dl>
        <table><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Subtotal</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="lo-total"><span>Total</span><span>${this._rp(rc.total)}</span></div>
        <p class="lo-muted">Tunjukkan struk ini ke kasir saat mengambil dan membayar pesananmu.</p>
        <div class="lo-actions">
          <button type="button" class="lo-btn lo-ghost" data-print>Cetak / simpan</button>
          <button type="button" class="lo-btn lo-primary" data-close>Selesai</button>
        </div>
      </div>`;
    d.querySelector('[data-print]').addEventListener('click', () => window.print());
    const done = d.querySelector('[data-close]');
    done.addEventListener('click', () => d.close());
    done.focus();
  }
