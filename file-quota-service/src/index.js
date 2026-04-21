require('dotenv').config();
const express = require('express');
const { connectDB } = require('./config/db');
const { connectKafka } = require('./config/kafka');
const quotaRoutes = require('./routes/quota.routes');

const app = express();
app.use(express.json());

// Basic health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'file-quota' });
});

// App routes
app.use('/quota', quotaRoutes);

const PORT = process.env.PORT || 3001;

async function startServer() {
  await connectDB();
  await connectKafka();
  
  app.listen(PORT, () => {
    console.log(`File Quota Service listening on port ${PORT}`);
  });
}

startServer().catch(console.error);
