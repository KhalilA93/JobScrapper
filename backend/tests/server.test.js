const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');

// Test database
const MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/jobscrapper_test';

describe('Server Health Check', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('GET /api/health should return 200', async () => {
    const res = await request(app)
      .get('/api/health')
      .expect(200);
    
    expect(res.body).toHaveProperty('status', 'OK');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
  });

  test('GET /api/unknown-route should return 404', async () => {
    const res = await request(app)
      .get('/api/unknown-route')
      .expect(404);
    
    expect(res.body).toHaveProperty('error', 'Route not found');
  });
});
