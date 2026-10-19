const mongoose = require('mongoose');

const read = async (userModel, req, res) => {
  const User = mongoose.model(userModel);
  const reqUserName = userModel.toLowerCase();
  const userProfile = req[reqUserName];

  if (!userProfile || !userProfile._id || String(req.params.id) !== String(userProfile._id)) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found',
    });
  }

  const tmpResult = await User.findOne({
    _id: userProfile._id,
    removed: false,
  }).exec();

  if (!tmpResult) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found',
    });
  }

  const result = {
    _id: tmpResult._id,
    enabled: tmpResult.enabled,
    email: tmpResult.email,
    name: tmpResult.name,
    surname: tmpResult.surname,
    photo: tmpResult.photo,
    role: tmpResult.role,
  };

  return res.status(200).json({
    success: true,
    result,
    message: 'Profile found',
  });
};

module.exports = read;
