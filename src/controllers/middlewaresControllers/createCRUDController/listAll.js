const { hasOwnershipField, buildOwnerCondition } = require('./ownership');

const listAll = async (Model, req, res) => {
  const sort = req.query.sort || 'desc';
  const enabled = req.query.enabled || undefined;

  const conditions = [{ removed: false }];

  if (hasOwnershipField(Model)) {
    conditions.push(buildOwnerCondition(Model, req));
  }

  if (enabled !== undefined) {
    conditions.push({ enabled });
  }

  const result = await Model.find({ $and: conditions })
    .sort({ created: sort })
    .populate()
    .exec();

  if (!result || result.length === 0) {
    return res.status(203).json({
      success: true,
      result: [],
      message: 'Collection is Empty',
    });
  }

  return res.status(200).json({
    success: true,
    result,
    message: 'Successfully found all documents',
  });
};

module.exports = listAll;
