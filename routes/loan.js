const express = require('express');
const LoanApplication = require('../models/LoanApplication');
const User = require('../models/User');
const auth = require('../middlewares/auth');
const router = express.Router();

// Calculate EMI
router.post('/calculate-emi', (req, res) => {
  try {
    const { loanAmount, tenure, interestRate = 12.5 } = req.body;

    const monthlyRate = interestRate / 12 / 100;
    const emi = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenure) /
                (Math.pow(1 + monthlyRate, tenure) - 1);

    res.json({
      success: true,
      emi: Math.round(emi),
      totalPayment: Math.round(emi * tenure),
      totalInterest: Math.round(emi * tenure - loanAmount)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Check eligibility
router.post('/check-eligibility', auth, async (req, res) => {
  try {
    const { loanAmount, tenure } = req.body;
    const user = req.user;

    // Basic eligibility logic
    let eligible = true;
    let maxLoanAmount = 50000;
    let message = 'Eligible for loan';

    if (!user.name || !user.pan || !user.email) {
      eligible = false;
      message = 'Complete your profile first';
    } else if (user.creditScore < 600) {
      eligible = false;
      message = 'Low credit score';
      maxLoanAmount = 0;
    } else if (user.creditScore >= 600 && user.creditScore < 750) {
      maxLoanAmount = 100000;
    } else {
      maxLoanAmount = 200000;
    }

    if (loanAmount > maxLoanAmount) {
      eligible = false;
      message = `Loan amount exceeds maximum eligible amount of ₹${maxLoanAmount}`;
    }

    res.json({
      success: true,
      eligible,
      maxEligibleAmount: maxLoanAmount,
      message,
      creditScore: user.creditScore
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Apply for loan
router.post('/apply', auth, async (req, res) => {
  try {
    const { loanAmount, tenure, interestRate = 12.5 } = req.body;
    const user = req.user;

    // Check eligibility first
    const eligibility = await fetch(`${req.protocol}://${req.get('host')}/api/loan/check-eligibility`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      },
      body: JSON.stringify({ loanAmount, tenure })
    }).then(res => res.json());

    if (!eligibility.eligible) {
      return res.status(400).json({
        success: false,
        message: eligibility.message
      });
    }

    // Calculate EMI
    const monthlyRate = interestRate / 12 / 100;
    const emi = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenure) /
                (Math.pow(1 + monthlyRate, tenure) - 1);

    const loanApplication = new LoanApplication({
      userId: user._id,
      loanAmount,
      tenure,
      emi: Math.round(emi),
      interestRate
    });

    await loanApplication.save();

    res.json({
      success: true,
      message: 'Loan application submitted successfully',
      application: loanApplication
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's loan applications
router.get('/applications', auth, async (req, res) => {
  try {
    const applications = await LoanApplication.find({ userId: req.user._id })
      .sort({ appliedDate: -1 });

    res.json({
      success: true,
      applications
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: Update application status (for testing)
router.patch('/application/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const application = await LoanApplication.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    res.json({
      success: true,
      application
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;