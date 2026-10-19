const mongoose = require('mongoose');

/**
 * Returns the authenticated admin ID as a tenant identifier.
 * This helper does not query or modify the database.
 */
const getTenantId = (req) => {
  const adminId = req?.admin?._id;

  if (!adminId || !mongoose.isValidObjectId(adminId)) {
    const error = new Error('Authenticated tenant is required');
    error.status = 401;
    throw error;
  }

  return new mongoose.Types.ObjectId(adminId);
};

module.exports = { getTenantId };
