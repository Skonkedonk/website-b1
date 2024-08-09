// models/User.js
const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  second: {
    type: String,
    required: false
  }
})

module.exports = mongoose.model('User', userSchema)
