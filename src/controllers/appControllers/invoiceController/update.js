const mongoose = require('mongoose');

const Model = mongoose.model('Invoice');
const Client = mongoose.model('Client');

const { calculate } = require('@/helpers');
const schema = require('./schemaValidate');

const update = async (req, res) => {
  const body = { ...req.body };

  if (!req.admin || !req.admin._id) {
    return res.status(401).json({
      success: false,
      result: null,
      message: 'Authenticated account is missing',
    });
  }

  const { error, value } = schema.validate(body);
  if (error) {
    const { details } = error;
    return res.status(400).json({
      success: false,
      result: null,
      message: details[0]?.message,
    });
  }

  const previousInvoice = await Model.findOne({
    _id: req.params.id,
    createdBy: req.admin._id,
    removed: false,
  }).exec();

  if (!previousInvoice) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found ',
    });
  }

  const clientId =
    value.client && typeof value.client === 'object'
      ? value.client._id
      : value.client;

  if (!clientId) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'A valid client is required',
    });
  }

  const ownedClient = await Client.findOne({
    _id: clientId,
    createdBy: req.admin._id,
    removed: false,
  })
    .select('_id')
    .lean()
    .exec();

  if (!ownedClient) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'Client not found in this account',
    });
  }

  const credit = previousInvoice.credit || 0;
  const { items = [], taxRate = 0, discount = 0 } = value;

  if (items.length === 0) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Items cannot be empty',
    });
  }

  let subTotal = 0;
  let taxTotal = 0;
  let total = 0;

  items.forEach((item) => {
    const itemTotal = calculate.multiply(item.quantity, item.price);
    subTotal = calculate.add(subTotal, itemTotal);
    item.total = itemTotal;
  });

  taxTotal = calculate.multiply(subTotal, taxRate / 100);
  total = calculate.add(subTotal, taxTotal);

  body.client = ownedClient._id;
  body.subTotal = subTotal;
  body.taxTotal = taxTotal;
  body.total = total;
  body.items = items;
  body.pdf = 'invoice-' + req.params.id + '.pdf';
  body.paymentStatus =
    calculate.sub(total, discount) === credit
      ? 'paid'
      : credit > 0
        ? 'partially'
        : 'unpaid';

  // Ownership must come from the authenticated account, never the request body.
  delete body.createdBy;
  delete body._id;
  delete body.credit;
  delete body.payment;
  delete body.removed;

  const result = await Model.findOneAndUpdate(
    {
      _id: req.params.id,
      createdBy: req.admin._id,
      removed: false,
    },
    { $set: body },
    { new: true, runValidators: true }
  ).exec();

  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found ',
    });
  }

  return res.status(200).json({
    success: true,
    result,
    message: 'we update this document ',
  });
};

module.exports = update;
