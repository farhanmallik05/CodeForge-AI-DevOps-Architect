const express = require('express');
const router = express.Router();

// GET /api/data - Retrieve sample data
router.get('/data', async (req, res) => {
  try {
    // In a real app, this would query the database
    const data = {
      items: [
        { id: 1, name: 'Widget Alpha', status: 'active' },
        { id: 2, name: 'Widget Beta', status: 'active' },
        { id: 3, name: 'Widget Gamma', status: 'inactive' },
      ],
      metadata: {
        total: 3,
        page: 1,
        per_page: 10,
      },
    };
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// GET /api/data/:id - Retrieve a single item
router.get('/data/:id', async (req, res) => {
  const { id } = req.params;
  res.json({
    id: parseInt(id),
    name: `Widget ${id}`,
    status: 'active',
    created_at: new Date().toISOString(),
  });
});

// POST /api/data - Create a new item
router.post('/data', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  res.status(201).json({
    id: Date.now(),
    name,
    status: 'active',
    created_at: new Date().toISOString(),
  });
});

module.exports = router;
