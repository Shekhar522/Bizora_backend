const { hasOwnershipField, buildOwnerCondition } = require('./ownership');

const paginatedList = async (Model, req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, parseInt(req.query.items, 10) || 10);
  const skip = (page - 1) * limit;
  const { sortBy = 'created', sortValue = -1 } = req.query;

  const conditions = [{ removed: false }];

  if (hasOwnershipField(Model)) {
    conditions.push(buildOwnerCondition(Model, req));
  }

  const fieldsArray = req.query.fields
    ? req.query.fields.split(',').filter(Boolean)
    : [];

  if (fieldsArray.length && req.query.q) {
    const search = {
      $or: fieldsArray.map((field) => ({
        [field]: { $regex: new RegExp(req.query.q, 'i') },
      })),
    };
    conditions.push(search);
  }

  if (req.query.filter && req.query.equal !== undefined) {
    conditions.push({ [req.query.filter]: req.query.equal });
  }

  const filter = { $and: conditions };
  const [result, count] = await Promise.all([
    Model.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: Number(sortValue) || -1 })
      .exec(),
    Model.countDocuments(filter).exec(),
  ]);

  const pages = Math.ceil(count / limit);
  const pagination = { page, pages, count };

  if (count > 0) {
    return res.status(200).json({
      success: true,
      result,
      pagination,
      message: 'Successfully found all documents',
    });
  }

  return res.status(203).json({
    success: true,
    result: [],
    pagination,
    message: 'Collection is Empty',
  });
};

module.exports = paginatedList;
