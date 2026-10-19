const { send, requireUser } = require('../lib/shared');
module.exports = async (req, res) => {
  try {
    if (!['GET', 'POST'].includes(req.method)) return send(res, 405, { error: 'Method tidak diizinkan.' });
    const result = await requireUser(req, req.method === 'GET' ? ['admin'] : ['admin', 'cashier']);
    if (result.error) return send(res, result.error.status, { error: result.error.message });
    const { supabase, user } = result;
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('transactions')
        .select('id,total_amount,notes,created_at,cashier_id')
        .order('created_at', { ascending: false }).limit(100);
      if (error) return send(res, 500, { error: 'Gagal mengambil riwayat transaksi.' });
      return send(res, 200, { transactions: data || [] });
    }
    const items = req.body && req.body.items;
    if (!Array.isArray(items) || items.length === 0 || items.length > 100) return send(res, 400, { error: 'Keranjang kosong atau jumlah item tidak valid.' });
    const clean = [];
    for (const item of items) {
      if (!item || typeof item.product_id !== 'string' || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000) {
        return send(res, 400, { error: 'Item transaksi tidak valid.' });
      }
      clean.push({ product_id: item.product_id, quantity: item.quantity });
    }
    const { data, error } = await supabase.rpc('process_sale', {
      p_items: clean,
      p_cashier_id: user.id,
      p_notes: typeof req.body.notes === 'string' ? req.body.notes.slice(0, 500) : null
    });
    if (error) {
      const msg = error.message || '';
      if (/stok tidak cukup|tidak aktif|harga belum diatur|produk tidak ditemukan|keranjang kosong|jumlah/i.test(msg)) return send(res, 409, { error: msg });
      return send(res, 500, { error: 'Transaksi gagal diproses. Tidak ada stok yang dikurangi.' });
    }
    return send(res, 201, { transaction: data });
  } catch (e) { return send(res, 500, { error: 'Terjadi kesalahan server.' }); }
};
