const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    default: 'My_entry' 
  },
  description: {
    type: String,
    required: true,
    default: 'N/A'
  },
  file: {
    type: String, 
    required: false  
  },
  category: {
    type: String,
    required: true 
  },
  rating: {
    type: Number,
    required: true,
    default: 0  
  }
});

const Entry = mongoose.model('Entry', entrySchema);

module.exports = Entry;
