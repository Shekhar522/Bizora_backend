const { hasOwnershipField, buildOwnerCondition } = require('./ownership');

const remove = async (Model, req, res) => {
  const query = {
    _id: req.params.id,
    removed: false,
  };

  if (hasOwnershipField(Model)) {
    Object.assign(query, buildOwnerCondition(Model, req));
  }

  const result = await Model.findOneAndUpdate(
    query,
    { $set: { removed: true } },
    { new: true }
  ).exec();

  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found ',
    });
  }

  return res.status(200).json({
    success: true,
    result,
    message: 'Successfully Deleted the document in Model ',
  });
};

module.exports = remove;
