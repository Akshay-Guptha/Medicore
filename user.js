const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  otp: { type: String },          // store OTP temporarily
  otpExpiry: { type: Date }       // OTP expiry time
}, { timestamps: true });          // automatically adds createdAt and updatedAt fields

module.exports = mongoose.model('User', userSchema);



