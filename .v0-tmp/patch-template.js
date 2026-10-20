const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(FILE, 'utf8');
const re = /(<script type="__bundler\/template">)([\s\S]*?)(<\/script>)/;
const m = html.match(re);
let t = JSON.parse(m[2]);

function swap(oldStr, newStr) {
  const n = t.split(oldStr).length - 1;
  if (n !== 1) throw new Error('Expected 1 match, got ' + n + ' for: ' + oldStr.slice(0, 80));
  t = t.replace(oldStr, () => newStr);
}

swap(
  '<h3 style="margin:6px 0 0;font-size:26px;font-weight:800;color:#0f5b34">{{item.name}}</h3>',
  '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:6px;flex-wrap:wrap"><h3 style="margin:0;font-size:26px;font-weight:800;color:#0f5b34">{{item.name}}</h3><span style="flex-shrink:0;font-weight:800;font-size:13px;letter-spacing:0.03em;padding:6px 12px;border-radius:999px;white-space:nowrap;{{item.stockStyle}}">{{item.stockText}}</span></div>'
);
swap(
  '<span style="font-weight:800;font-size:20px;white-space:nowrap;color:#3b3b3b">Rp [HARGA]</span>\n<a onClick="{{orderNow}}" href="#kontak" style="background:#0f5b34;color:#fff4d6;font-weight:800;font-size:16px;text-decoration:none;padding:12px 22px;border-radius:999px">Pesan</a>',
  '<span style="font-weight:800;font-size:20px;white-space:nowrap;color:#3b3b3b">{{item.priceText}}</span>\n<button type="button" onClick="{{item.order}}" aria-disabled="{{item.disabledAttr}}" aria-label="{{item.btnLabel}}" style="font-family:inherit;border:0;font-weight:800;font-size:16px;padding:12px 22px;border-radius:999px;{{item.btnStyle}}">{{item.btnText}}</button>'
);
swap(
  'this.state = { pos: 0, prev: 0, hl: false };',
  'this.state = { pos: 0, prev: 0, hl: false, products: null, menuFailed: false };'
);
swap('  renderVals() {\n', fs.readFileSync(path.join(__dirname, 'lemon-methods.js'), 'utf8') + '  renderVals() {\n');
swap(
  'menu: flavors.map((f) => ({ name: f.name, src: f.src, alt: f.alt, tint: f.theme.bg, desc: f.desc })),',
  `menu: flavors.map((f) => {
        const list = this.state.products;
        const p = list ? list.find((x) => String(x.name).trim().toLowerCase() === f.name.toLowerCase()) : null;
        let stockText = 'Memuat stok…';
        let stockStyle = 'background:#efe6c8;color:#5f5a48';
        let available = false;
        if (!list && this.state.menuFailed) { stockText = 'Stok belum dapat dimuat'; }
        else if (list && !p) { stockText = 'Belum tersedia'; }
        else if (p && p.stock <= 0) { stockText = 'Habis'; stockStyle = 'background:#fde2e2;color:#9b1c1c'; }
        else if (p && p.stock <= 5) { stockText = 'Sisa ' + p.stock + ' gelas'; stockStyle = 'background:#ffe8a8;color:#7a4b00'; available = true; }
        else if (p) { stockText = 'Tersedia · ' + p.stock; stockStyle = 'background:#dcf3e4;color:#0f5b34'; available = true; }
        return {
          name: f.name, src: f.src, alt: f.alt, tint: f.theme.bg, desc: f.desc,
          priceText: p ? this._rp(p.price) : 'Rp -',
          stockText, stockStyle,
          btnText: available ? 'Pesan' : (p && p.stock <= 0 ? 'Habis' : 'Pesan'),
          btnLabel: available ? 'Pesan ' + f.name : f.name + ' tidak tersedia',
          btnStyle: available ? 'background:#0f5b34;color:#fff4d6;cursor:pointer' : 'background:#d9d2bb;color:#6b6450;cursor:not-allowed',
          disabledAttr: available ? 'false' : 'true',
          order: (e) => { if (e && e.preventDefault) e.preventDefault(); if (available) this._openOrder(p, f); else if (!list) this._loadMenu(); }
        };
      }),`
);
swap(
  "{ no: '2', title: 'DM kami', body: 'Kirim DM ke Instagram @itslemon.official dan sebutkan pesananmu, atau langsung datang ke gerai kami.' },",
  "{ no: '2', title: 'Pesan online', body: 'Klik tombol Pesan di kartu menu, isi nama kamu, dan langsung dapat struk digital. Bisa juga DM @itslemon.official atau datang ke gerai.' },"
);

const out = JSON.stringify(t).replace(/<\//g, '<\\/');
fs.writeFileSync(FILE, html.replace(re, (all, a, b, c) => a + out + c));
console.log('patched, template length', t.length);
