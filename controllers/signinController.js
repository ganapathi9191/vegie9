const Auth = require('../models/signinModel');
const bcrypt = require('bcrypt');

// Register user with OTP
const generateReferralCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const register = async (req, res) => {
  const { firstName, lastName, email, phoneNumber, referralCodeUsed } = req.body;

  if (!firstName || !lastName || !email || !phoneNumber) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const existing = await Auth.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const referralCode = generateReferralCode();

    let referredBy = null;
    let coins = 0;

    // If referral code is used, reward both
    if (referralCodeUsed) {
      const referrer = await Auth.findOne({ referralCode: referralCodeUsed });

      if (referrer) {
        referrer.coins += 100;
        await referrer.save();
        referredBy = referralCodeUsed;
        coins = 100;
      }
    }

    const newUser = await Auth.create({
      firstName,
      lastName,
      email,
      phoneNumber,
      otp,
      referralCode,
      referredBy,
      coins
    });

    res.status(201).json({
      message: 'User registered. OTP sent.',
      userId: newUser._id,
      otp,
      referralCode
    });

  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
};

// Verify OTP
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  const user = await Auth.findOne({ email });

  if (!user || user.otp !== otp) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  user.isVerified = true;
  user.otp = null;
  await user.save();

  res.status(200).json({ message: 'OTP verified. You can now set a password.', userId: user._id });
};

// Set Password after OTP
const setPassword = async (req, res) => {
  const { userId, password } = req.body;
  if (!userId || !password) return res.status(400).json({ message: 'All fields required' });

  const user = await Auth.findById(userId);
  if (!user || !user.isVerified) return res.status(400).json({ message: 'User not verified' });

  const hashed = await bcrypt.hash(password, 10);
  user.password = hashed;
  await user.save();

  res.status(200).json({ message: 'Password set successfully' });
};

// Login
const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  const user = await Auth.findOne({ email });
  if (!user || !user.password) return res.status(400).json({ message: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: 'Incorrect password' });

  res.status(200).json({
    message: 'Login successful',
    user: {
      id: user._id,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phoneNumber: user.phoneNumber
    }
  });
};
// Get profile by ID with fullName
const getProfile = async (req, res) => {
  try {
    const { userId } = req.params;    

    const user = await Auth.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const fullName = `${user.firstName} ${user.lastName}`;
    res.status(200).json({
      fullName,
      email: user.email,
      phoneNumber: user.phoneNumber
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get profile', error: err.message });
  }
};


// Update profile by ID and return updated fullName
const updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, email, phoneNumber } = req.body;

    const updatedUser = await Auth.findByIdAndUpdate(
      userId,
      { firstName, lastName, email, phoneNumber },
      { new: true, runValidators: true }
    );

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    const fullName = `${updatedUser.firstName} ${updatedUser.lastName}`;

    res.status(200).json({
      message: 'Profile updated successfully',
      fullName,
      email: updatedUser.email,
      phoneNumber: updatedUser.phoneNumber
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update profile', error: err.message });
  }
};
// PUT: Add or Update Address
const addOrUpdateAddress = async (req, res) => {
  const { userId } = req.params;
  const { addressLine1, addressLine2, city, state, postalCode, country } = req.body;

  try {
    const user = await Auth.findByIdAndUpdate(
      userId,
      {
        address: {
          addressLine1,
          addressLine2,
          city,
          state,
          postalCode,
          country
        }
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Address updated successfully',
      address: user.address
    });
  } catch (err) {
    res.status(500).json({ message: 'Error updating address', error: err.message });
  }
};

// GET: Get Address by user ID
const getAddressByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await Auth.findById(userId).select('address');
    if (!user || !user.address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    res.status(200).json({ address: user.address });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching address', error: err.message });
  }
};



// 👇 Final Export
module.exports = {
  register,
  verifyOtp,
  setPassword,
  login,
  getProfile,
  updateProfile,
  addOrUpdateAddress, 
  getAddressByUserId
};
