const { hasOwnershipField, buildOwnerCondition } = require('./ownership');

const filter = async (Model, req, res) => {
  if (req.query.filter === undefined || req.query.equal === undefined) {
    return res.status(403).json({
      success: false,
      result: null,
      message: 'filter not provided correctly',
    });
  }

  const conditions = [
    { removed: false },
    { [req.query.filter]: req.query.equal },
  ];

  if (hasOwnershipField(Model)) {
    conditions.push(buildOwnerCondition(Model, req));
  }

  const result = await Model.find({ $and: conditions }).exec();

  if (result.length === 0) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found',
    });
  }

  return res.status(200).json({
    success: true,
    result,
    message: 'Successfully found all documents',
  });
};

module.exports = filter;
