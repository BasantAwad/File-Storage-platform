const express = require("express");
const { isDbReady } = require("../config/db");
const { isProducerReady } = require("../config/kafka");
const { isConsumerReady } = require("../config/kafkaConsumer");
const { sendSuccess } = require("../utils/response");

const router = express.Router();

router.get("/health", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Service healthy",
        service: "file-sharing",
        data: { service: "file-sharing" },
        timestamp: new Date().toISOString()
    });
});

router.get("/ready", (req, res) => {
    const ready = isDbReady() && isProducerReady() && isConsumerReady();
    const status = ready ? 200 : 503;

    return res.status(status).json({
        success: ready,
        ready,
        message: ready ? "Service ready" : "Service not ready",
        data: {
            dbReady: isDbReady(),
            producerReady: isProducerReady(),
            consumerReady: isConsumerReady()
        },
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
