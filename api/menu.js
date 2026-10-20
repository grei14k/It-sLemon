const { adminClient, send } = require('../lib/shared');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method tidak diizinkan.' });
  try {
    const supabase = adminClient();
    const { data, error } = await supabase.from('products')
      .select('id,name,price,stock')
      .eq('active', true)
      .order('name');
    if (error) return send(res, 500, { error: 'Gagal mengambil menu.' });
    res.setHeader('Cache-Control', 'no-store');
    return send(res, 200, { products: data || [] });
  } catch (e) {
    console.error('[api/menu] Error:', e);
    return send(res, 500, { error: 'Menu belum dapat dimuat.' });
  }
};
