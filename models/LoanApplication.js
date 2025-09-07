const mongoose = require('mongoose');

const loanApplicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  loanAmount: {
    type: Number,
    required: true
  },
  tenure: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Submitted', 'Under Review', 'Approved', 'Rejected', 'Disbursed'],
    default: 'Submitted'
  },
  emi: {
    type: Number,
    required: true
  },
  interestRate: {
    type: Number,
    default: 12.5
  },
  appliedDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('LoanApplication', loanApplicationSchema);