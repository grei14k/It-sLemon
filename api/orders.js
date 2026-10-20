const { adminClient, send } = require('../lib/shared');

const MAX_QTY_PER_PRODUCT = 20;
const MAX_LINES = 10;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 5;
const recentByIp = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const hits = (recentByIp.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  hits.push(now);
  recentByIp.set(ip, hits);
  return hits.length > RATE_MAX;
}

function cleanText(value, max) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

async function onlineCashierId(supabase) {
  if (process.env.ONLINE_ORDER_CASHIER_ID) return process.env.ONLINE_ORDER_CASHIER_ID;
  const { data } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1).maybeSingle();
  return data ? data.id : null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method tidak diizinkan.' });
  try {
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    if (rateLimited(ip)) return send(res, 429, { error: 'Terlalu banyak pesanan. Coba lagi sebentar lagi.' });

    const body = req.body || {};
    const customerName = cleanText(body.customer_name, 60);
    const customerPhone = cleanText(body.customer_phone, 20);
    const customerNote = cleanText(body.note, 200);
    if (customerName.length < 2) return send(res, 400, { error: 'Nama pemesan wajib diisi.' });
    if (customerPhone && !/^[0-9+\-\s]{6,20}$/.test(customerPhone)) return send(res, 400, { error: 'Nomor WhatsApp tidak valid.' });

    const items = body.items;
    if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINES) {
      return send(res, 400, { error: 'Pesanan kosong atau terlalu banyak item.' });
    }
    const qtyById = new Map();
    for (const item of items) {
      if (!item || typeof item.product_id !== 'string' || item.product_id.length > 64 || !Number.isSafeInteger(item.quantity) || item.quantity < 1) {
        return send(res, 400, { error: 'Item pesanan tidak valid.' });
      }
      qtyById.set(item.product_id, (qtyById.get(item.product_id) || 0) + item.quantity);
    }
    for (const qty of qtyById.values()) {
      if (qty > MAX_QTY_PER_PRODUCT) return send(res, 400, { error: `Maksimal ${MAX_QTY_PER_PRODUCT} gelas per varian untuk pesanan online.` });
    }

    const supabase = adminClient();
    const ids = [...qtyById.keys()];
    const { data: products, error: productError } = await supabase.from('products')
      .select('id,name,price,stock,active').in('id', ids);
    if (productError) return send(res, 500, { error: 'Gagal memeriksa produk.' });

    const lines = [];
    for (const [id, quantity] of qtyById) {
      const p = (products || []).find((x) => x.id === id);
      if (!p || !p.active) return send(res, 409, { error: 'Produk tidak tersedia.' });
      if (p.stock < quantity) return send(res, 409, { error: p.stock > 0 ? `Stok ${p.name} tinggal ${p.stock}.` : `${p.name} sedang habis.` });
      lines.push({ product_id: id, name: p.name, price: p.price, quantity, subtotal: p.price * quantity });
    }
    const total = lines.reduce((sum, l) => sum + l.subtotal, 0);

    const cashierId = await onlineCashierId(supabase);
    if (!cashierId) return send(res, 503, { error: 'Pemesanan online belum diaktifkan oleh admin.' });

    const notes = ['PESANAN ONLINE', `Nama: ${customerName}`, customerPhone && `WA: ${customerPhone}`, customerNote && `Catatan: ${customerNote}`]
      .filter(Boolean).join(' · ').slice(0, 500);

    const { data, error } = await supabase.rpc('process_sale', {
      p_items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
      p_cashier_id: cashierId,
      p_notes: notes
    });
    if (error) {
      const msg = error.message || '';
      if (/stok tidak cukup|tidak aktif|harga belum diatur|produk tidak ditemukan|jumlah/i.test(msg)) return send(res, 409, { error: msg });
      console.error('[api/orders] process_sale error:', error);
      return send(res, 500, { error: 'Pesanan gagal diproses. Tidak ada stok yang dikurangi.' });
    }

    const tx = Array.isArray(data) ? data[0] : data;
    const transactionId = typeof tx === 'string' ? tx : (tx && (tx.id || tx.transaction_id)) || null;
    return send(res, 201, {
      receipt: {
        id: transactionId,
        created_at: (tx && tx.created_at) || new Date().toISOString(),
        customer_name: customerName,
        customer_phone: customerPhone || null,
        note: customerNote || null,
        lines: lines.map(({ name, price, quantity, subtotal }) => ({ name, price, quantity, subtotal })),
        total: (tx && Number.isFinite(Number(tx.total_amount))) ? Number(tx.total_amount) : total
      }
    });
  } catch (e) {
    console.error('[api/orders] Error:', e);
    return send(res, 500, { error: 'Terjadi kesalahan server.' });
  }
};
