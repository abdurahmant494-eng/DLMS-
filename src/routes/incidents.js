const express = require('express');
const router = express.Router();
const { Incident, User } = require('../config/database');

// Report new incident
router.post('/', async (req, res) => {
  try {
    const { title, description, category, location, priority, reporter_notes } = req.body;
    
    // In real app, get user ID from JWT token
    const reporter_id = req.user?.user_id || 1; // Temporary for testing
    
    const incident = await Incident.create({
      title,
      description,
      category,
      location,
      priority: priority || 'medium',
      reporter_notes,
      reporter_id,
      status: 'pending'
    });
    
    res.status(201).json({
      message: 'Incident reported successfully',
      incident
    });
  } catch (error) {
    console.error('Report incident error:', error);
    res.status(500).json({ error: 'Failed to report incident' });
  }
});

// Get all incidents
router.get('/', async (req, res) => {
  try {
    const { status, category, priority } = req.query;
    const where = {};
    
    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;
    
    const incidents = await Incident.findAll({
      where,
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: ['user_id', 'first_name', 'last_name', 'email', 'role']
        },
        {
          model: User,
          as: 'assignedStaff',
          attributes: ['user_id', 'first_name', 'last_name', 'email', 'role']
        }
      ],
      order: [['reported_at', 'DESC']]
    });
    
    res.json({ incidents });
  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

// Get single incident
router.get('/:id', async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: ['user_id', 'first_name', 'last_name', 'email', 'role']
        },
        {
          model: User,
          as: 'assignedStaff',
          attributes: ['user_id', 'first_name', 'last_name', 'email', 'role']
        }
      ]
    });
    
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    
    res.json({ incident });
  } catch (error) {
    console.error('Get incident error:', error);
    res.status(500).json({ error: 'Failed to fetch incident' });
  }
});

// Update incident (staff only)
router.put('/:id', async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id);
    
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    
    const { status, assigned_staff_id, staff_notes, priority } = req.body;
    
    // If status is being changed to resolved, set resolved_at
    const updates = { status, assigned_staff_id, staff_notes, priority };
    if (status === 'resolved' && incident.status !== 'resolved') {
      updates.resolved_at = new Date();
    }
    
    await incident.update(updates);
    
    res.json({
      message: 'Incident updated successfully',
      incident
    });
  } catch (error) {
    console.error('Update incident error:', error);
    res.status(500).json({ error: 'Failed to update incident' });
  }
});

// Get incident statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const total = await Incident.count();
    const pending = await Incident.count({ where: { status: 'pending' } });
    const resolved = await Incident.count({ where: { status: 'resolved' } });
    const inProgress = await Incident.count({ where: { status: 'in_progress' } });
    
    // Count by category
    const categories = await Incident.findAll({
      attributes: ['category', [sequelize.fn('COUNT', sequelize.col('category')), 'count']],
      group: ['category']
    });
    
    // Count by priority
    const priorities = await Incident.findAll({
      attributes: ['priority', [sequelize.fn('COUNT', sequelize.col('priority')), 'count']],
      group: ['priority']
    });
    
    res.json({
      total,
      pending,
      resolved,
      inProgress,
      categories,
      priorities
    });
  } catch (error) {
    console.error('Get incident stats error:', error);
    res.status(500).json({ error: 'Failed to get incident statistics' });
  }
});

module.exports = router;