const { hasOwnershipField, buildOwnerCondition } = require('./ownership');

const read = async (Model, req, res) => {
  const query = {
    _id: req.params.id,
    removed: false,
  };

  if (hasOwnershipField(Model)) {
    Object.assign(query, buildOwnerCondition(Model, req));
  }

  const result = await Model.findOne(query).exec();

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
    message: 'we found this document ',
  });
};

module.exports = read;
