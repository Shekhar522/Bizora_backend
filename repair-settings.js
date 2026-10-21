require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function repairSettings() {
  try {
    if (!process.env.DATABASE) {
      throw new Error('DATABASE environment variable is missing.');
    }

    await mongoose.connect(process.env.DATABASE);

    // Load the existing Setting model and its schema.
    require('./src/models/coreModels/Setting');
    const Setting = mongoose.model('Setting');

    const settingsDir = path.join(__dirname, 'src/setup/defaultSettings');
    const files = fs.readdirSync(settingsDir).filter(file => file.endsWith('.json'));

    const defaults = files.flatMap(file =>
      JSON.parse(fs.readFileSync(path.join(settingsDir, file), 'utf8'))
    );

    console.log('Database:', mongoose.connection.name);
    console.log('Default settings found:', defaults.length);

    if (mongoose.connection.name !== 'Business_Manager') {
      throw new Error('Wrong database selected. No settings were changed.');
    }

    let inserted = 0;
    let skipped = 0;

    for (const setting of defaults) {
      const existing = await Setting.findOne({
        settingCategory: setting.settingCategory,
        settingKey: setting.settingKey,
      }).lean();

      if (existing) {
        skipped++;
        continue;
      }

      await Setting.create({
        ...setting,
        removed: false,
        enabled: true,
        isPrivate: false,
        isCoreSetting: false,
      });

      inserted++;
    }

    console.log('Settings inserted:', inserted);
    console.log('Existing settings skipped:', skipped);
    console.log('Settings-only repair completed.');
  } catch (error) {
    console.error('Settings repair failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

repairSettings();
