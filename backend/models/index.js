// MongoDB Models for Job Scraper Application
// Clean, normalized, and indexed schemas with relationships

const User = require('./User');
const Job = require('./Job');
const Application = require('./Application');
const Site = require('./Site');

module.exports = {
  User,
  Job,
  Application,
  Site
};
