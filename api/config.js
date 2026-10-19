const { env, send } = require('../lib/shared');
module.exports = async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method tidak diizinkan.' });
  try { return send(res, 200, { url: env('SUPABASE_URL'), anonKey: env('SUPABASE_ANON_KEY') }); }
  catch (e) { return send(res, 500, { error: e.message }); }
};
