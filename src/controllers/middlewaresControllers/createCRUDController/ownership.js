const getOwnerId = (req) => {
  const ownerId = req.admin && req.admin._id;

  if (!ownerId) {
    throw new Error('Authenticated account is missing');
  }

  return ownerId;
};

const hasOwnershipField = (Model) => Boolean(Model.schema.path('createdBy'));

const buildOwnerCondition = (Model, req) => {
  if (!hasOwnershipField(Model)) {
    throw new Error(`Ownership field missing from model ${Model.modelName}`);
  }

  return { createdBy: getOwnerId(req) };
};

module.exports = {
  getOwnerId,
  hasOwnershipField,
  buildOwnerCondition,
};
