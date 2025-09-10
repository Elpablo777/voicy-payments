// Dependencies
const mongoose = require('mongoose');

// Schema
const Schema = mongoose.Schema;
const voiceSchema = new Schema({
  url: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        try {
          new URL(v);
          return true;
        } catch (e) {
          return false;
        }
      },
      message: 'URL must be a valid URL'
    }
  },
  engine: {
    type: String,
    required: true,
    default: 'google',
    enum: {
      values: ['wit', 'google', 'yandex', 'ashmanov'],
      message: 'Engine must be one of: wit, google, yandex, ashmanov'
    },
  },
  duration: {
    type: Number,
    required: true,
    min: [0, 'Duration cannot be negative'],
    max: [3600, 'Duration cannot exceed 1 hour'], // Reasonable limit
  },
  language: {
    type: String,
    required: true,
    maxlength: [10, 'Language code cannot exceed 10 characters']
  },
  text: {
    type: String,
    maxlength: [10000, 'Transcribed text cannot exceed 10000 characters'] // Reasonable limit
  },
}, { 
  timestamps: true,
  // Add indexes for better query performance
  index: { engine: 1, createdAt: -1 }
});

// Add compound indexes for common queries
voiceSchema.index({ engine: 1, language: 1 });
voiceSchema.index({ createdAt: -1 });

// Exports
module.exports = mongoose.model('voice', voiceSchema);
