const mongoose = require('mongoose');

const Model = mongoose.model('Payment');
const Invoice = mongoose.model('Invoice');

const remove = async (req, res) => {
  if (!req.admin || !req.admin._id) {
    return res.status(401).json({
      success: false,
      result: null,
      message: 'Authentication required',
    });
  }

  const ownerId = req.admin._id;

  const previousPayment = await Model.findOne({
    _id: req.params.id,
    createdBy: ownerId,
    removed: false,
  });

  if (!previousPayment) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'Payment not found',
    });
  }

  const invoiceId =
    previousPayment.invoice && previousPayment.invoice._id
      ? previousPayment.invoice._id
      : previousPayment.invoice;

  const currentInvoice = await Invoice.findOne({
    _id: invoiceId,
    createdBy: ownerId,
    removed: false,
  });

  if (!currentInvoice) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'Invoice not found',
    });
  }

  const paymentId = previousPayment._id;
  const previousAmount = Number(previousPayment.amount);
  const total = Number(currentInvoice.total);
  const discount = Number(currentInvoice.discount || 0);
  const previousCredit = Number(currentInvoice.credit || 0);
  const updatedCredit = previousCredit - previousAmount;

  const paymentStatus =
    total - discount === updatedCredit
      ? 'paid'
      : updatedCredit > 0
        ? 'partially'
        : 'unpaid';

  const result = await Model.findOneAndUpdate(
    {
      _id: paymentId,
      createdBy: ownerId,
      removed: false,
    },
    { $set: { removed: true } },
    { new: true }
  ).exec();

  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'Payment not found',
    });
  }

  const updateInvoice = await Invoice.findOneAndUpdate(
    {
      _id: currentInvoice._id,
      createdBy: ownerId,
      removed: false,
    },
    {
      $pull: { payment: paymentId },
      $inc: { credit: -previousAmount },
      $set: { paymentStatus },
    },
    {
      new: true,
      runValidators: true,
    }
  ).exec();

  if (!updateInvoice) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'Invoice not found',
    });
  }

  return res.status(200).json({
    success: true,
    result,
    message: 'Successfully Deleted the document ',
  });
};

module.exports = remove;
