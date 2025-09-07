const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: false
  },
  dob: {
    type: Date,
    required: false
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: false
  },
  pan: {
    type: String,
    required: false
  },
  email: {
    type: String,
    required: false
  },
  otp: {
    type: String,
    required: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  creditScore: {
    type: Number,
    default: 500
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);