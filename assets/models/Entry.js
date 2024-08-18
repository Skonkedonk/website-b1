// models/Entry.js

const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
  title: { type: String, required: true, default: "Entry" },
  description: { type: String, required: true, default: "An incredible description!"},
  category: { type: String, required: true },
  filePath: { type: String, default: null }, 
  fileType: { type: String, default: null }, 
  fileSize: { type: Number, default: null }, 
  rating: { type: String, required: true },
});

module.exports = mongoose.model('Entry', entrySchema);
