const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const products = [
  { id: 'p1', name: 'Lemon Tea', price: 12000, stock: 12 },
  { id: 'p2', name: 'Honey Lemon', price: 15000, stock: 3 },
  { id: 'p3', name: 'Lemon Soda', price: 14000, stock: 0 }
];
http.createServer((req, res) => {
  if (req.url.startsWith('/api/menu')) { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ products })); }
  if (req.url.startsWith('/api/orders')) {
    let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
      const o = JSON.parse(b); const it = o.items[0]; const p = products.find((x) => x.id === it.product_id);
      p.stock -= it.quantity;
      res.statusCode = 201; res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ receipt: { id: 'a1b2c3d4-0000', created_at: new Date().toISOString(), customer_name: o.customer_name, customer_phone: o.customer_phone || null, note: o.note || null, lines: [{ name: p.name, price: p.price, quantity: it.quantity, subtotal: p.price * it.quantity }], total: p.price * it.quantity } }));
    });
    return;
  }
  const f = path.join(root, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; return res.end(); } res.end(d); });
}).listen(3000);
