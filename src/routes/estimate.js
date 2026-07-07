const express = require('express');
const { estimateMealCalories } = require('../services/claude');

const router = express.Router();

// POST /api/estimate-calories
// body: { foodText: string }
// response sukses: { items: [{name, kcal}], total: number, note?: string }
//                atau: { notFood: true }
router.post('/estimate-calories', async (req, res) => {
  const { foodText } = req.body || {};

  if (!foodText || typeof foodText !== 'string' || !foodText.trim()) {
    return res.status(400).json({ error: 'Field "foodText" wajib diisi dan berupa string.' });
  }
  if (foodText.length > 1000) {
    return res.status(400).json({ error: 'Teks menu terlalu panjang (maksimal 1000 karakter).' });
  }

  try {
    const result = await estimateMealCalories(foodText.trim());
    res.json(result);
  } catch (err) {
    console.error('[estimate-calories] error:', err.message);
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
    res.status(status).json({ error: err.message || 'Gagal menghubungi AI.' });
  }
});

module.exports = router;
