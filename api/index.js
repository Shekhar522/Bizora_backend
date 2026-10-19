
require('module-alias/register');

const mongoose = require('mongoose');
const { globSync } = require('glob');
const path = require('path');

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

// Register the existing models before loading the Express app.
const modelsPath = path.join(__dirname, '../src/models/**/*.js');

for (const filePath of globSync(modelsPath)) {
  require(filePath);
}

const app = require('../src/app');

let dbConnection;

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!process.env.DATABASE) {
    throw new Error('DATABASE environment variable is missing');
  }

  if (!dbConnection) {
    dbConnection = mongoose.connect(process.env.DATABASE);
  }

  try {
    await dbConnection;
  } catch (error) {
    dbConnection = undefined;
    throw error;
  }
}

module.exports = async (req, res) => {
  try {
    await connectDatabase();
    return app(req, res);
  } catch (error) {
    console.error('Backend initialization failed:', error.message);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Backend initialization failed',
      });
    }
  }
};
