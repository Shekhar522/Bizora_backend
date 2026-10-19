const mongoose = require('mongoose');
const moment = require('moment');

const InvoiceModel = mongoose.model('Invoice');

const summary = async (Model, req, res) => {
  if (!req.admin || !req.admin._id) {
    return res.status(401).json({
      success: false,
      result: null,
      message: 'Authentication required',
    });
  }

  let defaultType = 'month';
  const { type } = req.query;

  if (type && ['week', 'month', 'year'].includes(type)) {
    defaultType = type;
  } else if (type) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid type',
    });
  }

  const currentDate = moment();
  const startDate = currentDate.clone().startOf(defaultType);
  const endDate = currentDate.clone().endOf(defaultType);
  const ownerId = new mongoose.Types.ObjectId(req.admin._id);

  const pipeline = [
    {
      $match: {
        createdBy: ownerId,
        removed: false,
      },
    },
    {
      $facet: {
        totalClients: [
          {
            $match: {
              enabled: true,
            },
          },
          {
            $count: 'count',
          },
        ],
        newClients: [
          {
            $match: {
              created: {
                $gte: startDate.toDate(),
                $lte: endDate.toDate(),
              },
              enabled: true,
            },
          },
          {
            $count: 'count',
          },
        ],
        activeClients: [
          {
            $lookup: {
              from: InvoiceModel.collection.name,
              let: { clientId: '$_id' },
              pipeline: [
                {
                  $match: {
                    createdBy: ownerId,
                    removed: false,
                    $expr: {
                      $eq: ['$client', '$$clientId'],
                    },
                  },
                },
                {
                  $project: { _id: 1 },
                },
              ],
              as: 'invoice',
            },
          },
          {
            $match: {
              'invoice.0': { $exists: true },
              enabled: true,
            },
          },
          {
            $count: 'count',
          },
        ],
      },
    },
  ];

  const aggregationResult = await Model.aggregate(pipeline);
  const result = aggregationResult[0] || {};

  const totalClients = result.totalClients?.[0]?.count || 0;
  const totalNewClients = result.newClients?.[0]?.count || 0;
  const activeClients = result.activeClients?.[0]?.count || 0;

  const totalActiveClientsPercentage =
    totalClients > 0 ? (activeClients / totalClients) * 100 : 0;
  const totalNewClientsPercentage =
    totalClients > 0 ? (totalNewClients / totalClients) * 100 : 0;

  return res.status(200).json({
    success: true,
    result: {
      new: Math.round(totalNewClientsPercentage),
      active: Math.round(totalActiveClientsPercentage),
    },
    message: 'Successfully get summary of new clients',
  });
};

module.exports = summary;
