const { hasOwnershipField, buildOwnerCondition } = require('./ownership');

const update = async (Model, req, res) => {
  const query = {
    _id: req.params.id,
    removed: false,
  };

  if (hasOwnershipField(Model)) {
    Object.assign(query, buildOwnerCondition(Model, req));
  }

  const updates = { ...req.body };
  delete updates.createdBy;
  updates.removed = false;

  const result = await Model.findOneAndUpdate(
    query,
    updates,
    { new: true, runValidators: true }
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
    message: 'we update this document ',
  });
};

module.exports = update;
