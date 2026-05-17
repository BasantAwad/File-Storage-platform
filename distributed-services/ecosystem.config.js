module.exports = {
  apps: [
    {
      name: process.env.SERVICE_NAME || "distributed-service",
      script: "./src/index.js",
      instances: 2,
      exec_mode: "cluster",
      autorestart: true,
      max_restarts: 10,
      kill_timeout: 8000,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "development"
      },
      env_production: {
        NODE_ENV: "production"
      }
    }
  ]
};
