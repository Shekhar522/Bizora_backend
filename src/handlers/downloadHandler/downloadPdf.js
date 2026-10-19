const custom = require('@/controllers/pdfController');
const mongoose = require('mongoose');
const { getOwnerId } = require('@/controllers/middlewaresControllers/createCRUDController/ownership');

const supportedModels = {
  invoice: 'Invoice',
  payment: 'Payment',
};

module.exports = async function downloadPdf(req, res, { directory, id }) {
  try {
    const modelName = supportedModels[directory];

    if (!modelName) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Document not found',
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Document not found',
      });
    }

    const expectedFile = `${directory}-${id}.pdf`;
    if (req.params.file !== expectedFile) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Document not found',
      });
    }

    const ownerId = getOwnerId(req);
    const Model = mongoose.model(modelName);

    const result = await Model.findOne({
      _id: id,
      createdBy: ownerId,
      removed: false,
    }).exec();

    if (!result) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Document not found',
      });
    }

    const fileId = `${directory}-${result._id}.pdf`;
    const targetLocation = `src/public/download/${directory}/${fileId}`;

    await custom.generatePdf(
      modelName,
      {
        filename: directory,
        format: 'A4',
        targetLocation,
      },
      result,
      () => {
        return res.download(targetLocation, (error) => {
          if (error && !res.headersSent) {
            return res.status(500).json({
              success: false,
              result: null,
              message: "Couldn't download file",
            });
          }
        });
      }
    );
  } catch (error) {
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        result: null,
        message: 'Unable to generate document',
      });
    }
  }
};
