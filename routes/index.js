const express = require('express');
const router = express.Router();
const db = require('../helpers/db');
const { Voice, Chat } = require('../models');

// Middleware for request validation and error handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Middleware for basic input validation
const validateRequest = (req, res, next) => {
  // Basic security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });
  next();
};

// Apply validation middleware to all routes
router.use(validateRequest);

router.get('/statsfornikita', asyncHandler(async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('Error fetching stats for nikita:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: err.message
    });
  }
}));

router.get('/statsforashmanov', asyncHandler(async (req, res) => {
  try {
    const voiceCount = await Voice.countDocuments({ engine: 'ashmanov' });
    const chatCount = await Chat.countDocuments({ engine: 'ashmanov' });
    
    res.json({
      success: true,
      data: {
        voiceCount,
        chatCount
      }
    });
  } catch (err) {
    console.error('Error fetching ashmanov stats:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ashmanov statistics',
      message: err.message
    });
  }
}));

// Health check endpoint
router.get('/health', asyncHandler(async (req, res) => {
  try {
    // Basic health check - test database connection
    await Chat.findOne().limit(1);
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
}));

module.exports = router;
