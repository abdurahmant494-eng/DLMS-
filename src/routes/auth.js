const express = require('express');
const router = express.Router();
const { User } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authMiddleware, requireRole } = require('../middleware/auth');
const emailService = require('../services/emailService');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { university_id, email, password, first_name, last_name, role, phone, department, year } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Check if university ID exists
    const existingUniversityId = await User.findOne({ where: { university_id } });
    if (existingUniversityId) {
      return res.status(400).json({ error: 'University ID already registered' });
    }

    // Create new user
    const user = await User.create({
      university_id,
      email,
      password,
      first_name,
      last_name,
      role: role || 'student',
      phone,
      department,
      year
    });

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(email, {
        name: `${first_name} ${last_name}`,
        university_id: university_id,
        role: role || 'student'
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.last_login = new Date();
    await user.save();

    // Create JWT token
    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Create refresh token (for longer sessions)
    const refreshToken = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        type: 'refresh'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      message: 'Login successful',
      token,
      refreshToken,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Refresh token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'your-secret-key');
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    const user = await User.findByPk(decoded.user_id);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Create new access token
    const newToken = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Token refreshed successfully',
      token: newToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Get current user profile (Protected)
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.user_id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile (Protected)
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.user_id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't allow role changes via this endpoint
    const { password, role, email, university_id, ...updateData } = req.body;
    
    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      updateData.email = email;
    }

    // Check if university ID is being changed and if it's already taken
    if (university_id && university_id !== user.university_id) {
      const existingUniversityId = await User.findOne({ where: { university_id } });
      if (existingUniversityId) {
        return res.status(400).json({ error: 'University ID already in use' });
      }
      updateData.university_id = university_id;
    }

    await user.update(updateData);

    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      message: 'Profile updated successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password (Protected)
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const user = await User.findByPk(req.user.user_id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
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

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('🔍 DEBUG: Forgot password called for email:', email); // DEBUG LINE
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.log('🔍 DEBUG: User not found for email:', email); // DEBUG LINE
      // Don't reveal if user exists or not for security
      return res.json({ 
        message: 'If your email is registered, you will receive a password reset link' 
      });
    }

    console.log('🔍 DEBUG: User found:', user.user_id, user.email); // DEBUG LINE
    
    // Create password reset token (expires in 1 hour)
    const resetToken = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        type: 'password_reset'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    console.log('🔍 DEBUG: Reset token created:', resetToken); // DEBUG LINE

    // TEMPORARY FIX: For testing, return token without sending email
    console.log('🔍 DEBUG: For testing - returning token without email');
    console.log('🔍 DEBUG: Reset link:', `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`);
    
    // Uncomment this in production:
    /*
    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(email, {
        name: `${user.first_name} ${user.last_name}`,
        resetToken: resetToken,
        resetLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
      });
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      return res.status(500).json({ error: 'Failed to send reset email' });
    }
    */

    res.json({ 
      message: 'Password reset link sent to your email',
      token: resetToken, // For testing
      resetLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}` // For testing
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    console.error('🔍 DEBUG: Error details:', error.message); // DEBUG LINE
    res.status(500).json({ error: 'Failed to process password reset request', details: error.message });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    console.log('🔍 DEBUG: Reset password called with token length:', token ? token.length : 0); // DEBUG LINE
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Verify reset token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    if (decoded.type !== 'password_reset') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    const user = await User.findByPk(decoded.user_id);
    
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    console.log('🔍 DEBUG: Password reset successful for user:', user.user_id); // DEBUG LINE

    // Send confirmation email
    try {
      await emailService.sendPasswordChangedEmail(user.email, {
        name: `${user.first_name} ${user.last_name}`
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Continue anyway
    }

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid or expired reset token' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Reset token has expired' });
    }
    
    res.status(500).json({ error: 'Failed to reset password', details: error.message });
  }
});

// Test email endpoint
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('🔍 DEBUG: Test email called for:', email); // DEBUG LINE
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('🔍 DEBUG: Attempting to send test email...'); // DEBUG LINE
    
    const result = await emailService.sendTestEmail(email);
    
    console.log('🔍 DEBUG: Email sent successfully:', result); // DEBUG LINE
    
    res.json({
      message: 'Test email sent successfully',
      details: result
    });
  } catch (error) {
    console.error('Test email error:', error);
    console.error('🔍 DEBUG: Email error details:', error.message); // DEBUG LINE
    res.status(500).json({ error: 'Failed to send test email', details: error.message });
  }
});

module.exports = router;
