const { send, requireUser } = require('../lib/shared');
module.exports = async (req, res) => {
  try {
    if (!['GET', 'POST', 'PATCH'].includes(req.method)) return send(res, 405, { error: 'Method tidak diizinkan.' });
    const role = req.method === 'GET' ? ['admin', 'cashier'] : ['admin'];
    const result = await requireUser(req, role);
    if (result.error) return send(res, result.error.status, { error: result.error.message });
    const { supabase } = result;
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('products').select('id,name,price,stock,active,updated_at').order('name');
      if (error) return send(res, 500, { error: 'Gagal mengambil produk.' });
      return send(res, 200, { products: data || [] });
    }
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const price = Number(body.price);
    const stock = Number(body.stock);
    if (!name || name.length > 120 || !Number.isSafeInteger(price) || price < 0 || !Number.isSafeInteger(stock) || stock < 0) {
      return send(res, 400, { error: 'Nama, harga (rupiah bulat), dan stok harus diisi dengan benar. Nilai tidak boleh negatif.' });
    }
    if (req.method === 'POST') {
      const { data, error } = await supabase.from('products').insert({ name, price, stock, active: body.active !== false }).select().single();
      if (error) return send(res, 400, { error: error.code === '23505' ? 'Nama produk sudah digunakan.' : 'Gagal menambah produk.' });
      return send(res, 201, { product: data });
    }
    const id = body.id;
    if (typeof id !== 'string') return send(res, 400, { error: 'ID produk wajib diisi.' });
    const { data, error } = await supabase.from('products').update({ name, price, stock, active: body.active !== false, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle();
    if (error) return send(res, 400, { error: 'Gagal memperbarui produk.' });
    if (!data) return send(res, 404, { error: 'Produk tidak ditemukan.' });
    return send(res, 200, { product: data });
  } catch (e) { return send(res, 500, { error: e.message || 'Terjadi kesalahan server.' }); }
};
