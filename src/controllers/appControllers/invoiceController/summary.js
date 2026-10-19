const mongoose = require('mongoose');
const moment = require('moment');

const Model = mongoose.model('Invoice');

const { loadSettings } = require('@/middlewares/settings');

const summary = async (req, res) => {
  let defaultType = 'month';
  const { type } = req.query;

  await loadSettings();

  if (type) {
    if (['week', 'month', 'year'].includes(type)) {
      defaultType = type;
    } else {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Invalid type',
      });
    }
  }

  const currentDate = moment();
  const startDate = currentDate.clone().startOf(defaultType);
  const endDate = currentDate.clone().endOf(defaultType);

  const statuses = ['draft', 'pending', 'overdue', 'paid', 'unpaid', 'partially'];

  const response = await Model.aggregate([
    {
      $match: {
        removed: false,
        createdBy: new mongoose.Types.ObjectId(req.admin._id),
      },
    },
    {
      $facet: {
        totalInvoice: [
          {
            $group: {
              _id: null,
              total: { $sum: '$total' },
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              total: '$total',
              count: '$count',
            },
          },
        ],
        statusCounts: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              status: '$_id',
              count: '$count',
            },
          },
        ],
        paymentStatusCounts: [
          {
            $group: {
              _id: '$paymentStatus',
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              status: '$_id',
              count: '$count',
            },
          },
        ],
        overdueCounts: [
          {
            $match: {
              expiredDate: { $lt: new Date() },
            },
          },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              status: '$_id',
              count: '$count',
            },
          },
        ],
      },
    },
  ]);

  const aggregateResult = response[0] || {};
  const totalInvoices = aggregateResult.totalInvoice?.[0] || { total: 0, count: 0 };
  const statusResult = aggregateResult.statusCounts || [];
  const paymentStatusResult = aggregateResult.paymentStatusCounts || [];
  const overdueResult = aggregateResult.overdueCounts || [];
  const denominator = totalInvoices.count || 0;

  const statusResultMap = statusResult.map((item) => ({
    ...item,
    percentage: denominator ? Math.round((item.count / denominator) * 100) : 0,
  }));

  const paymentStatusResultMap = paymentStatusResult.map((item) => ({
    ...item,
    percentage: denominator ? Math.round((item.count / denominator) * 100) : 0,
  }));

  const overdueResultMap = overdueResult.map((item) => ({
    ...item,
    status: 'overdue',
    percentage: denominator ? Math.round((item.count / denominator) * 100) : 0,
  }));

  const result = [];

  statuses.forEach((status) => {
    const found = [
      ...paymentStatusResultMap,
      ...statusResultMap,
      ...overdueResultMap,
    ].find((item) => item.status === status);

    if (found) result.push(found);
  });

  const unpaid = await Model.aggregate([
    {
      $match: {
        removed: false,
        createdBy: new mongoose.Types.ObjectId(req.admin._id),
        paymentStatus: { $in: ['unpaid', 'partially'] },
      },
    },
    {
      $group: {
        _id: null,
        total_amount: {
          $sum: { $subtract: ['$total', '$credit'] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        total_amount: '$total_amount',
      },
    },
  ]);

  const finalResult = {
    total: totalInvoices.total,
    total_undue: unpaid.length > 0 ? unpaid[0].total_amount : 0,
    type,
    performance: result,
  };

  return res.status(200).json({
    success: true,
    result: finalResult,
    message: `Successfully found all invoices for the last ${defaultType}`,
  });
};

module.exports = summary;
