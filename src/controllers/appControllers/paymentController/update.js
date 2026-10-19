const mongoose = require('mongoose');

const Model = mongoose.model('Payment');
const Invoice = mongoose.model('Invoice');

const { calculate } = require('@/helpers');

const update = async (req, res) => {
  if (!req.admin || !req.admin._id) {
    return res.status(401).json({
      success: false,
      result: null,
      message: 'Authentication required',
    });
  }

  const ownerId = req.admin._id;
  const currentAmount = Number(req.body.amount);

  if (!Number.isFinite(currentAmount) || currentAmount <= 0) {
    return res.status(202).json({
      success: false,
      result: null,
      message: 'The payment amount must be greater than 0',
    });
  }

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

  const previousAmount = Number(previousPayment.amount);
  const total = Number(currentInvoice.total);
  const discount = Number(currentInvoice.discount || 0);
  const previousCredit = Number(currentInvoice.credit || 0);

  const changedAmount = calculate.sub(currentAmount, previousAmount);
  const maxAmount = calculate.sub(
    total,
    calculate.add(discount, previousCredit)
  );

  if (changedAmount > maxAmount) {
    return res.status(202).json({
      success: false,
      result: null,
      message: `The Max Amount you can add is ${maxAmount + previousAmount}`,
      error: `The Max Amount you can add is ${maxAmount + previousAmount}`,
    });
  }

  const updatedCredit = calculate.add(previousCredit, changedAmount);

  const paymentStatus =
    calculate.sub(total, discount) === updatedCredit
      ? 'paid'
      : updatedCredit > 0
        ? 'partially'
        : 'unpaid';

  const updates = {
    number: req.body.number,
    date: req.body.date,
    amount: currentAmount,
    paymentMode: req.body.paymentMode,
    ref: req.body.ref,
    description: req.body.description,
    updated: new Date(),
  };

  const result = await Model.findOneAndUpdate(
    {
      _id: previousPayment._id,
      createdBy: ownerId,
      removed: false,
    },
    { $set: updates },
    {
      new: true,
      runValidators: true,
    }
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
      $inc: { credit: changedAmount },
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
    message: 'Successfully updated the Payment ',
  });
};

module.exports = update;
