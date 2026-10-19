const { hasOwnershipField, buildOwnerCondition } = require('./ownership');

const summary = async (Model, req, res) => {
  const conditions = [{ removed: false }];

  if (hasOwnershipField(Model)) {
    conditions.push(buildOwnerCondition(Model, req));
  }

  const baseFilter = { $and: conditions };
  let countFilterQuery = baseFilter;

  if (req.query.filter !== undefined && req.query.equal !== undefined) {
    countFilterQuery = {
      $and: [...conditions, { [req.query.filter]: req.query.equal }],
    };
  }

  const [countAllDocs, countFilter] = await Promise.all([
    Model.countDocuments(baseFilter).exec(),
    Model.countDocuments(countFilterQuery).exec(),
  ]);

  return res.status(200).json({
    success: true,
    result: { countFilter, countAllDocs },
    message: 'Successfully retrieved summary',
  });
};

module.exports = summary;
