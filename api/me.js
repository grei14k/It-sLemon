const { send, requireUser } = require('../lib/shared');
module.exports = async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method tidak diizinkan.' });
  try {
    const result = await requireUser(req);
    if (result.error) return send(res, result.error.status, { error: result.error.message });
    return send(res, 200, { user: { id: result.user.id, email: result.user.email }, profile: result.profile });
  } catch (e) { return send(res, 500, { error: 'Gagal memeriksa sesi staf.' }); }
};
