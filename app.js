/**
 * Main module
 */

require('dotenv').config({path: `${__dirname}/.env`});

var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
const cors = require('cors');

var routes = require('./routes/index');

var app = express();

const mongoose = require('mongoose');
const config = require('./config');
const db = require('./helpers/db');

global.Promise = require('bluebird');
global.Promise.config({ cancellation: true });

/** Setup mongoose with proper error handling */
mongoose.Promise = global.Promise;

// Handle initial connection
mongoose.connect(config.database)
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    console.error('Please check your database configuration and ensure MongoDB is running');
    process.exit(1);
  });

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');

app.use(logger('dev'));
app.use(bodyParser.json({ limit: '1mb' })); // Reduced size limit for security
app.use(bodyParser.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors());

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers
app.use(function(err, req, res, next) {
  // Set default error status
  const status = err.status || 500;
  
  // Log error for debugging
  console.error('Error occurred:', {
    message: err.message,
    status: status,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method
  });

  res.status(status);
  
  // Send JSON response for API requests
  if (req.originalUrl.startsWith('/stats') || req.accepts('json')) {
    res.json({
      error: true,
      message: status === 500 ? 'Internal Server Error' : err.message,
      status: status
    });
  } else {
    // Render error page for other requests
    res.render('error', {
      message: err.message,
      error: process.env.NODE_ENV === 'development' ? err : { status: status },
    });
  }
});

// Generate stats with improved error handling
function generateStatsWithRetry() {
  db.getNewStats()
    .then(() => {
      console.log('New stats were generated!');
    })
    .catch(err => {
      console.error('Stats generation failed:', err.message);
      // Don't exit the application, just log the error
    });
}

// Initial stats generation
generateStatsWithRetry();

// Set up interval for periodic stats generation
setInterval(generateStatsWithRetry, 300000); // 5 minutes

console.log('Server is up and running!');

module.exports = app;
