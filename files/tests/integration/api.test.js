const request = require('supertest');
const app = require('../../src/app');

describe('Integration Tests - API Endpoints', () => {
  it('should return 200 OK for /health', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('status', 'healthy');
  });

  it('should return 200 OK for /ready', async () => {
    const response = await request(app).get('/ready');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('status', 'ready');
  });

  it('should return metrics for /metrics', async () => {
    const response = await request(app).get('/metrics');
    expect(response.status).toBe(200);
    expect(response.text).toContain('http_requests_total');
  });

  it('should return swagger documentation for /docs', async () => {
    const response = await request(app).get('/docs/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Swagger UI');
  });
});
