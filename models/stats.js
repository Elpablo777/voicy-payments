/**
 * @module models/stats
 * @license MIT
 */

/** Dependencies */
const mongoose = require('mongoose');

/** Schema */
const Schema = mongoose.Schema;
const statsSchema = new Schema({
  json: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        try {
          JSON.parse(v);
          return true;
        } catch (e) {
          return false;
        }
      },
      message: 'JSON field must contain valid JSON'
    }
  },
}, { 
  timestamps: true,
  // Ensure only one stats document exists
  index: { createdAt: -1 }
});

/** Exports */
module.exports = mongoose.model('stats', statsSchema);
