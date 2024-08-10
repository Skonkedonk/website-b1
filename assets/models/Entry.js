const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
  title: { type: String, required: true, default: 'My_entry' },
  description: { type: String, required: true, default: '' },
  category: { type: String, required: true, default: '' },
  filePath: { type: String, required: true, default: '' },
  fileType: { type: String, required: true, default: '' },
  fileSize: { type: Number, required: true, default: '' },
  rating: { type: Number, required: true, default: '' },
});

module.exports = mongoose.model('Entry', entrySchema);

