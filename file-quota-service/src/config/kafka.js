const { Kafka } = require('kafkajs');

let producer;

async function connectKafka() {
  const kafka = new Kafka({
    clientId: 'file-quota-service',
    brokers: [process.env.KAFKA_BROKER || 'kafka:9092']
  });

  producer = kafka.producer();
  try {
    await producer.connect();
    console.log('Connected to Kafka (Producer)');
  } catch (error) {
    console.error('Error connecting to Kafka:', error);
  }
}

async function publishQuotaExceeded(userId, currentUsed, maxStorage, newFileSize) {
  if (!producer) return;
  
  try {
    await producer.send({
      topic: 'quota.exceeded',
      messages: [
        { 
          key: userId, 
          value: JSON.stringify({ 
            user_id: userId, 
            current_used: currentUsed, 
            max_storage: maxStorage, 
            attempted_file_size: newFileSize,
            timestamp: new Date().toISOString()
          }) 
        }
      ],
    });
    console.log(`Published quota.exceeded event for user ${userId}`);
  } catch (error) {
    console.error('Failed to publish message:', error);
  }
}

module.exports = { connectKafka, publishQuotaExceeded };
