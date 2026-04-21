require('dotenv').config();
const express = require('express');
const { connectDB } = require('./config/db');
const urlRoutes = require('./routes/url.routes');

const app = express();
app.use(express.json());

// Basic health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'presigned-url' });
});

// App routes
app.use('/url', urlRoutes);

const PORT = process.env.PORT || 3002;

async function startServer() {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`Presigned URL Service listening on port ${PORT}`);
  });
}

startServer().catch(console.error);
