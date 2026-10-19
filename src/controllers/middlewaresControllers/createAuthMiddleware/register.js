const Joi = require('joi');
const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const register = async (req, res, { userModel }) => {
  const UserModel = mongoose.model(userModel);
  const UserPasswordModel = mongoose.model(userModel + 'Password');

  const schema = Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    email: Joi.string().trim().email({ tlds: { allow: true } }).required(),
    password: Joi.string().min(8).max(128).required(),
    country: Joi.string().trim().max(100).allow(''),
  });

  const { error, value } = schema.validate(req.body, {
    abortEarly: true,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid registration details.',
      errorMessage: error.message,
    });
  }

  const email = value.email.toLowerCase();
  const existingUser = await UserModel.findOne({ email, removed: false });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      result: null,
      message: 'An account with this email already exists.',
    });
  }

  let user;
  let passwordRecord;

  try {
    const salt = crypto.randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(salt + value.password, 12);

    user = await UserModel.create({
      name: value.name,
      email,
      enabled: true,
      removed: false,
      role: 'owner',
    });

    passwordRecord = await UserPasswordModel.create({
      user: user._id,
      password: passwordHash,
      salt,
      emailVerified: true,
      authType: 'email',
    });

    return res.status(201).json({
      success: true,
      result: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
      message: 'Registration successful. You can now sign in.',
    });
  } catch (err) {
    if (passwordRecord) {
      try {
        await UserPasswordModel.deleteOne({ _id: passwordRecord._id });
      } catch (cleanupError) {
        console.error('Registration password cleanup failed:', cleanupError.message);
      }
    }

    if (user) {
      try {
        await UserModel.deleteOne({ _id: user._id });
      } catch (cleanupError) {
        console.error('Registration user cleanup failed:', cleanupError.message);
      }
    }

    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        result: null,
        message: 'An account with this email already exists.',
      });
    }

    throw err;
  }
};

module.exports = register;
