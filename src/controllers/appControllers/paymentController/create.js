const mongoose = require('mongoose');

const Model = mongoose.model('Payment');
const Invoice = mongoose.model('Invoice');
const Client = mongoose.model('Client');

const { calculate } = require('@/helpers');

const create = async (req, res) => {
  if (!req.admin || !req.admin._id) {
    return res.status(401).json({
      success: false,
      result: null,
      message: 'Authentication required',
    });
  }

  const amount = Number(req.body.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(202).json({
      success: false,
      result: null,
      message: `The Minimum Amount must be greater than 0`,
    });
  }

  const ownerId = req.admin._id;

  const currentInvoice = await Invoice.findOne({
    _id: req.body.invoice,
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

  const invoiceClientId =
    currentInvoice.client && currentInvoice.client._id
      ? currentInvoice.client._id
      : currentInvoice.client;

  const ownedClient = await Client.findOne({
    _id: invoiceClientId,
    createdBy: ownerId,
    removed: false,
  }).select('_id');

  if (!ownedClient) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'Invoice client not found for this account',
    });
  }

  const {
    total: previousTotal,
    discount: previousDiscount,
    credit: previousCredit,
  } = currentInvoice;

  const maxAmount = calculate.sub(
    calculate.sub(previousTotal, previousDiscount),
    previousCredit
  );

  if (amount > maxAmount) {
    return res.status(202).json({
      success: false,
      result: null,
      message: `The Max Amount you can add is ${maxAmount}`,
    });
  }

  const paymentData = {
    ...req.body,
    amount,
    invoice: currentInvoice._id,
    client: ownedClient._id,
    createdBy: ownerId,
  };

  delete paymentData._id;
  delete paymentData.credit;
  delete paymentData.removed;
  delete paymentData.pdf;

  const result = await Model.create(paymentData);

  const fileId = `payment-${result._id}.pdf`;

  const updatePath = await Model.findOneAndUpdate(
    {
      _id: result._id,
      createdBy: ownerId,
      removed: false,
    },
    { $set: { pdf: fileId } },
    { new: true }
  ).exec();

  const paymentId = result._id;
  const { total, discount, credit } = currentInvoice;
  const updatedCredit = calculate.add(credit, amount);

  const paymentStatus =
    calculate.sub(total, discount) === updatedCredit
      ? 'paid'
      : updatedCredit > 0
        ? 'partially'
        : 'unpaid';

  const invoiceUpdate = await Invoice.findOneAndUpdate(
    {
      _id: currentInvoice._id,
      createdBy: ownerId,
      removed: false,
    },
    {
      $push: { payment: paymentId },
      $inc: { credit: amount },
      $set: { paymentStatus },
    },
    {
      new: true,
      runValidators: true,
    }
  ).exec();

  if (!invoiceUpdate) {
    await Model.findOneAndUpdate(
      { _id: paymentId, createdBy: ownerId, removed: false },
      { $set: { removed: true } }
    );
    return res.status(404).json({
      success: false,
      result: null,
      message: 'Invoice not found',
    });
  }

  return res.status(200).json({
    success: true,
    result: updatePath,
    message: 'Payment Invoice created successfully',
  });
};

module.exports = create;
