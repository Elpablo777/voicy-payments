const express = require('express');
const router = express.Router();
const db = require('../helpers/db');
const { Voice, Chat } = require('../models');

// Middleware for request validation and error handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Simple rate limiting middleware
const createRateLimiter = (windowMs = 60000, maxRequests = 100) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const clientId = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get or create request history for this client
    if (!requests.has(clientId)) {
      requests.set(clientId, []);
    }
    
    const clientRequests = requests.get(clientId);
    
    // Remove old requests outside the window
    const recentRequests = clientRequests.filter(timestamp => timestamp > windowStart);
    requests.set(clientId, recentRequests);
    
    // Check if limit exceeded
    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000} seconds.`,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    // Add current request
    recentRequests.push(now);
    requests.set(clientId, recentRequests);
    
    next();
  };
};

// Middleware for basic input validation and security
const validateRequest = (req, res, next) => {
  // Enhanced security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Content-Security-Policy': "default-src 'self'",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  });
  
  // Basic input sanitization for query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        // Remove potentially dangerous characters
        req.query[key] = req.query[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      }
    });
  }
  
  next();
};

// Apply rate limiting and validation middleware to all routes
router.use(createRateLimiter(60000, 50)); // 50 requests per minute
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
