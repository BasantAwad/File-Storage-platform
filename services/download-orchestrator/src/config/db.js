const mongoose = require("mongoose");
const env = require("./env");

let dbReady = false;

const connectDb = async () => {
    if (process.env.NODE_ENV === "test") {
        dbReady = true;
        return;
    }

    await mongoose.connect(env.mongoUri);
    dbReady = true;
};

const isDbReady = () => process.env.NODE_ENV === "test" || dbReady;

module.exports = {
    connectDb,
    isDbReady
};
