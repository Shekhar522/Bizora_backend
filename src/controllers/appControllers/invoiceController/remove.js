const mongoose = require('mongoose');

const Model = mongoose.model('Invoice');
const ModelPayment = mongoose.model('Payment');

const remove = async (req, res) => {
  if (!req.admin || !req.admin._id) {
    return res.status(401).json({
      success: false,
      result: null,
      message: 'Authenticated account is missing',
    });
  }

  const deletedInvoice = await Model.findOneAndUpdate(
    {
      _id: req.params.id,
      createdBy: req.admin._id,
      removed: false,
    },
    {
      $set: { removed: true },
    },
    { new: true }
  ).exec();

  if (!deletedInvoice) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'Invoice not found',
    });
  }

  await ModelPayment.updateMany(
    {
      invoice: deletedInvoice._id,
      createdBy: req.admin._id,
      removed: false,
    },
    {
      $set: { removed: true },
    }
  ).exec();

  return res.status(200).json({
    success: true,
    result: deletedInvoice,
    message: 'Invoice deleted successfully',
  });
};

module.exports = remove;
