const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const twilio = require('twilio');  // ← Add this line
const router = express.Router();

// Store OTPs in memory for testing (instead of console)
const otpStore = new Map();

// Send OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Generate random 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    let user = await User.findOne({ phoneNumber });

    if (!user) {
      user = new User({ phoneNumber });
    }

    user.otp = otp;
    user.isVerified = false;
    await user.save();

    // ========== FREE OTP TESTING ==========
    console.log('📱 OTP for', phoneNumber, 'is:', otp);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      otp: otp, // ← This is the key! Return OTP in response
      note: 'For testing purposes - use this OTP'
    });
    // ========== END FREE OTP ==========

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    const user = await User.findOne({ phoneNumber });

    // For testing, also check our memory store
    const storedOtp = otpStore.get(phoneNumber);

    if (!user || (user.otp !== otp && storedOtp !== otp)) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    user.isVerified = true;
    user.otp = null;
    await user.save();

    // Remove from memory store after verification
    otpStore.delete(phoneNumber);

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get OTP for testing (new endpoint)
router.get('/get-otp/:phoneNumber', (req, res) => {
  const { phoneNumber } = req.params;
  const otp = otpStore.get(phoneNumber);

  if (!otp) {
    return res.status(404).json({ message: 'No OTP found for this number' });
  }

  res.json({ success: true, phoneNumber, otp });
});

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by ID
    const user = await User.findById(decoded.userId).select('-otp -__v');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        email: user.email,
        pan: user.pan,
        dob: user.dob,
        gender: user.gender,
        creditScore: user.creditScore || 500,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { name, email, pan, dob, gender } = req.body;

    // Update user
    const user = await User.findByIdAndUpdate(
      decoded.userId,
      {
        name,
        email,
        pan,
        dob: dob ? new Date(dob) : null,
        gender
      },
      { new: true, runValidators: true }
    ).select('-otp -__v');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        email: user.email,
        pan: user.pan,
        dob: user.dob,
        gender: user.gender,
        creditScore: user.creditScore || 500,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;