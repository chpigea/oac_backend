// config.js
const path = require('path');
const fs = require('fs');

function loadConfig() {
  const env = process.env.NODE_ENV || 'development';
  const configFolder = process.env.OAC_CONFIG_FOLDER || __dirname;
  const configPath = path.join(configFolder, 'config', `${env}.json`);
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  config.database.user = process.env.OAC_DB_USER || config.database.user;
  config.database.password = process.env.OAC_DB_PASSWORD || config.database.password;
  config.smtp.host = process.env.OAC_SMTP_HOST || config.smtp.host;
  config.smtp.port = process.env.OAC_SMTP_PORT || config.smtp.port;
  config.smtp.auth.user = process.env.OAC_SMTP_USER || config.smtp.auth.user;
  config.smtp.auth.password = process.env.OAC_SMTP_PASSWORD || config.smtp.auth.password;
  config.exposed.protocol = process.env.OAC_EXPOSED_PROTOCOL || config.exposed.protocol;
  config.exposed.host = process.env.OAC_EXPOSED_HOST || config.exposed.host;
  config.exposed.port = process.env.OAC_EXPOSED_PORT || config.exposed.port;

  return config;
}

module.exports = loadConfig();