const { hasOwnershipField, getOwnerId } = require('./ownership');

const create = async (Model, req, res) => {
  req.body.removed = false;

  const data = { ...req.body };

  if (hasOwnershipField(Model)) {
    data.createdBy = getOwnerId(req);
  }

  const result = await new Model(data).save();

  return res.status(200).json({
    success: true,
    result,
    message: 'Successfully Created the document in Model ',
  });
};

module.exports = create;
