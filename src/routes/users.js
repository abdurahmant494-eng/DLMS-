const express = require('express');
const router = express.Router();
const { User } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Get all users (admin only) - NOW PROTECTED
router.get('/', authMiddleware, requireRole('admin', 'librarian'), async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']]
    });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID - NOW PROTECTED (users can see their own profile, admins can see all)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    // Regular users can only see their own profile
    // Admins and librarians can see any profile
    if (req.user.role === 'student' && parseInt(req.params.id) !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile - NOW PROTECTED
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    // Regular users can only update their own profile
    // Admins and librarians can update any profile
    if (req.user.role === 'student' && parseInt(req.params.id) !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't allow role changes via this endpoint (use admin endpoint)
    const { password, role, ...updateData } = req.body;

    // Only admins can change user roles
    if (role && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can change user roles' });
    }

    // If role is being changed and user is admin, allow it
    if (role && req.user.role === 'admin') {
      updateData.role = role;
    }

    await user.update(updateData);

    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      message: 'User updated successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Change user password - NOW PROTECTED
router.put('/:id/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Regular users can only change their own password
    // Admins can change any password (without current password)
    if (req.user.role === 'student' && parseInt(req.params.id) !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For regular users, verify current password
    if (req.user.role === 'student') {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required' });
      }

      const bcrypt = require('bcryptjs');
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    // For admins changing someone else's password, no current password needed
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Deactivate user (soft delete) - ADMIN ONLY
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Can't deactivate yourself
    if (user.user_id === req.user.user_id) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    // Soft delete by setting is_active to false
    await user.update({ is_active: false });

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// Get current user stats (for dashboard) - PROTECTED
router.get('/stats/dashboard', authMiddleware, async (req, res) => {
  try {
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { is_active: true } });
    const students = await User.count({ where: { role: 'student' } });
    const librarians = await User.count({ where: { role: 'librarian' } });
    const admins = await User.count({ where: { role: 'admin' } });

    res.json({
      totalUsers,
      activeUsers,
      byRole: {
        students,
        librarians,
        admins
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to get user statistics' });
  }
});

module.exports = router;