const { Pool } = require("pg");
const logger = require("./logger");
require("dotenv").config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

pool.on("connect", () => {
    // Suppress verbose connection logs for pure queries
});

pool.on("error", (err) => {
    logger.error("Unexpected error on idle database client", err);
    process.exit(-1);
});

const connectDB = async () => {
    try {
        const res = await pool.query("SELECT NOW()");
        logger.info(`Database connected successfully at ${res.rows[0].now}`);
    } catch (error) {
        logger.error("Database connection failed. Exiting...", error);
        process.exit(1); // Ensure server does NOT start if database fails
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
    connectDB,
};
