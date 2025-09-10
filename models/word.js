/**
 * @module models/word
 * @license MIT
 */

/** Dependencies */
const mongoose = require('mongoose');

/** Schema */
const Schema = mongoose.Schema;
const wordSchema = new Schema({
  word: {
    type: String,
    required: true,
    maxlength: [100, 'Word cannot exceed 100 characters'],
    index: true,
    validate: {
      validator: function(v) {
        return /^[a-zA-ZÀ-ÿ\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF]+$/.test(v); // Allow letters and accented characters
      },
      message: 'Word must contain only letters'
    }
  },
  count: {
    type: Number,
    required: true,
    default: 1,
    min: [1, 'Count must be at least 1'],
    max: [1000000, 'Count cannot exceed 1 million']
  }
}, {
  // Add index for sorting by count
  index: { count: -1 }
});

// Ensure unique words
wordSchema.index({ word: 1 }, { unique: true });

/** Exports */
module.exports = mongoose.model('word', wordSchema);
