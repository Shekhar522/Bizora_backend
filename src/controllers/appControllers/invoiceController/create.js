const mongoose = require('mongoose');

const Model = mongoose.model('Invoice');
const Client = mongoose.model('Client');

const { calculate } = require('@/helpers');
const { increaseBySettingKey } = require('@/middlewares/settings');
const schema = require('./schemaValidate');

const create = async (req, res) => {
  const body = { ...req.body };

  const { error, value } = schema.validate(body);
  if (error) {
    const { details } = error;
    return res.status(400).json({
      success: false,
      result: null,
      message: details[0]?.message,
    });
  }

  if (!req.admin || !req.admin._id) {
    return res.status(401).json({
      success: false,
      result: null,
      message: 'Authenticated account is missing',
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

  const { items = [], taxRate = 0, discount = 0 } = value;

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
  body.paymentStatus =
    calculate.sub(total, discount) === 0 ? 'paid' : 'unpaid';
  body.createdBy = req.admin._id;
  delete body._id;

  const result = await new Model(body).save();

  const fileId = 'invoice-' + result._id + '.pdf';
  const updateResult = await Model.findOneAndUpdate(
    { _id: result._id, createdBy: req.admin._id },
    { pdf: fileId },
    { new: true }
  ).exec();

  increaseBySettingKey({
    settingKey: 'last_invoice_number',
  });

  return res.status(200).json({
    success: true,
    result: updateResult,
    message: 'Invoice created successfully',
  });
};

module.exports = create;
