/**
 * Configuration file
 *
 * @module config
 * @license MIT
 */

// Validate required environment variables
const requiredEnvVars = [
  'VOICY_MONGO_DB_URL',
  'TELEGRAM_TOKEN',
  'ADMIN_CHAT',
  'STRIPE_TOKEN'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  console.error('Please check your .env file or environment configuration.');
  process.exit(1);
}

module.exports = {
  database: process.env.VOICY_MONGO_DB_URL,
  productionDatabase: process.env.VOICY_MONGO_PROD_DB_URL,
  production_url: process.env.VOICY_URL,
  token: process.env.TELEGRAM_TOKEN,
  admin_chat: process.env.ADMIN_CHAT,
  stripe_token: process.env.STRIPE_TOKEN
};