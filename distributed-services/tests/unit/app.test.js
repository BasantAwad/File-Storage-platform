const app = require('../../src/app');

describe('Unit Tests - Application Initialization', () => {
  it('should define app correctly', () => {
    expect(app).toBeDefined();
  });

  it('should have a metrics endpoint', () => {
    const route = app._router.stack.find(s => s.route && s.route.path === '/metrics');
    expect(route).toBeDefined();
    expect(route.route.methods.get).toBeTruthy();
  });

  it('should have a docs endpoint', () => {
    const route = app._router.stack.find(s => s.regexp && s.regexp.source.includes('^\\/docs\\/?(?=\\/|$)'));
    expect(route).toBeDefined();
  });

  it('should handle JSON body parsing', () => {
    const jsonParser = app._router.stack.find(s => s.name === 'jsonParser');
    expect(jsonParser).toBeDefined();
  });

  it('should handle request ID middleware', () => {
    // Check if there is an anonymous middleware right after jsonParser
    const middleware = app._router.stack.find(s => s.name === '<anonymous>');
    expect(middleware).toBeDefined();
  });
});
