const Joi = require('joi');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const verify = async (req, res, { userModel }) => {
  const { userId, emailToken } = req.params;

  const schema = Joi.object({
    userId: Joi.string().hex().length(24).required(),
    emailToken: Joi.string().hex().length(64).required(),
  });

  const { error } = schema.validate({ userId, emailToken });

  if (error) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid verification link.',
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Authentication is not configured correctly.',
    });
  }

  const UserModel = mongoose.model(userModel);
  const UserPasswordModel = mongoose.model(userModel + 'Password');

  const user = await UserModel.findOne({
    _id: userId,
    removed: false,
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'This verification link is invalid or no longer available.',
    });
  }

  const passwordRecord = await UserPasswordModel.findOne({
    user: user._id,
    removed: false,
    emailToken,
  });

  if (!passwordRecord) {
    const alreadyVerified = await UserPasswordModel.findOne({
      user: user._id,
      removed: false,
      emailVerified: true,
    });

    if (alreadyVerified) {
      return res.status(409).json({
        success: false,
        result: null,
        message: 'This email has already been verified. Please sign in.',
      });
    }

    return res.status(400).json({
      success: false,
      result: null,
      message: 'This verification link is invalid or no longer available.',
    });
  }

  if (passwordRecord.emailVerified === true) {
    return res.status(409).json({
      success: false,
      result: null,
      message: 'This email has already been verified. Please sign in.',
    });
  }

  // Save the user first so a failed save does not consume the verification token.
  user.enabled = true;
  await user.save();

  const consumedRecord = await UserPasswordModel.findOneAndUpdate(
    {
      _id: passwordRecord._id,
      emailToken,
      emailVerified: false,
      removed: false,
    },
    {
      $set: { emailVerified: true },
      $unset: { emailToken: 1 },
    },
    { new: true }
  );

  if (!consumedRecord) {
    return res.status(409).json({
      success: false,
      result: null,
      message: 'This verification link has already been used.',
    });
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: '24h',
  });

  const sessionUpdate = await UserPasswordModel.updateOne(
    { _id: consumedRecord._id, removed: false, emailVerified: true },
    { $addToSet: { loggedSessions: token } }
  );

  if (sessionUpdate.modifiedCount !== 1) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Email verified, but sign-in could not be completed. Please sign in.',
    });
  }

  return res.status(200).json({
    success: true,
    result: {
      _id: user._id,
      name: user.name,
      surname: user.surname,
      role: user.role,
      email: user.email,
      photo: user.photo,
      token,
      maxAge: null,
    },
    message: 'Email verified successfully.',
  });
};

module.exports = verify;
