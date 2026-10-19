const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { generate: uniqueId } = require('shortid');

const updatePassword = async (userModel, req, res) => {
  const reqUserName = userModel.toLowerCase();
  const userProfile = req[reqUserName];

  if (!userProfile || !userProfile._id || String(req.params.id) !== String(userProfile._id)) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'User not found',
    });
  }

  const { password } = req.body;

  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'The password needs to be at least 8 characters long.',
    });
  }

  if (userProfile.email === 'admin@admin.com') {
    return res.status(403).json({
      success: false,
      result: null,
      message: "you couldn't update demo password",
    });
  }

  const UserPassword = mongoose.model(userModel + 'Password');
  const salt = uniqueId();
  const passwordHash = bcrypt.hashSync(salt + password);

  const resultPassword = await UserPassword.findOneAndUpdate(
    { user: userProfile._id, removed: false },
    { $set: { password: passwordHash, salt } },
    { new: true }
  ).exec();

  if (!resultPassword) {
    return res.status(403).json({
      success: false,
      result: null,
      message: "User Password couldn't save correctly",
    });
  }

  return res.status(200).json({
    success: true,
    result: {},
    message: 'Password updated successfully',
  });
};

module.exports = updatePassword;
