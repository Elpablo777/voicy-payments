// Dependencies
const mongoose = require('mongoose');

// Schema
const Schema = mongoose.Schema;
const chatSchema = new Schema({
  id: {
    type: String,
    required: true,
    index: true,
    validate: {
      validator: function(v) {
        // Check numeric string format
        if (!/^-?\d+$/.test(v)) return false;
        try {
          const id = BigInt(v);
          // Telegram chat IDs are 64-bit signed integers
          const min = BigInt('-9223372036854775808');
          const max = BigInt('9223372036854775807');
          return id >= min && id <= max;
        } catch (e) {
          return false;
        }
      },
      message: 'Chat ID must be a valid 64-bit signed integer string'
    }
  },
  engine: {
    type: String,
    required: true,
    enum: {
      values: ['wit', 'google', 'yandex', 'ashmanov'],
      message: 'Engine must be one of: wit, google, yandex, ashmanov'
    },
    default: 'wit',
  },
  googleLanguage: {
    type: String,
    required: true,
    default: 'en-US',
    validate: {
      validator: function(v) {
        return /^[a-z]{2}-[A-Z]{2}$/.test(v);
      },
      message: 'Google language must be in format xx-XX'
    }
  },
  witLanguage: {
    type: String,
    required: true,
    default: 'English',
    maxlength: [50, 'Wit language name cannot exceed 50 characters']
  },
  yandexLanguage: {
    type: String,
    required: true,
    default: 'en-US',
    validate: {
      validator: function(v) {
        return /^[a-z]{2}-[A-Z]{2}$/.test(v);
      },
      message: 'Yandex language must be in format xx-XX'
    }
  },
  adminLocked: {
    type: Boolean,
    required: true,
    default: false,
  },
  silent: {
    type: Boolean,
    required: true,
    default: false,
  },
  filesBanned: {
    type: Boolean,
    required: true,
    default: true,
  },
  googleSetupMessageId: {
    type: Number,
    min: [0, 'Message ID cannot be negative']
  },
  googleKey: {
    type: String,
    maxlength: [500, 'Google key cannot exceed 500 characters']
  },
  language: String, // added just as a virtual variable
}, { 
  timestamps: true,
  // Add index for better query performance
  index: { id: 1 }
});

// Add compound index for engine queries
chatSchema.index({ engine: 1, createdAt: -1 });

// Exports
module.exports = mongoose.model('chat', chatSchema);
