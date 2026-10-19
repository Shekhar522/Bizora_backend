const { hasOwnershipField, buildOwnerCondition } = require('./ownership');

const search = async (Model, req, res) => {
  const fieldsArray = req.query.fields
    ? req.query.fields.split(',').filter(Boolean)
    : ['name'];

  const conditions = [{ removed: false }];

  if (hasOwnershipField(Model)) {
    conditions.push(buildOwnerCondition(Model, req));
  }

  if (req.query.q) {
    const searchConditions = fieldsArray.map((field) => ({
      [field]: { $regex: new RegExp(req.query.q, 'i') },
    }));

    if (searchConditions.length) {
      conditions.push({ $or: searchConditions });
    }
  }

  const results = await Model.find({ $and: conditions })
    .limit(20)
    .exec();

  if (!results || results.length === 0) {
    return res.status(203).json({
      success: true,
      result: [],
      message: 'No document found',
    });
  }

  return res.status(200).json({
    success: true,
    result: results,
    message: 'Successfully found documents',
  });
};

module.exports = search;
