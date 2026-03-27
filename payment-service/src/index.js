import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { connectRabbitMQ } from "./config/rabbitmq.js";

const PORT = process.env.PORT || 3004;

const start = async () => {
  await connectDB();
  await connectRabbitMQ();

  app.listen(PORT, () => {
    console.log(`\nPayment Service running on port ${PORT}`);
    console.log(`   ENV: ${process.env.NODE_ENV || "development"}`);
    console.log(`   Webhook endpoint: POST http://localhost:${PORT}/payments/webhook\n`);
  });
};

process.on("SIGTERM", () => { console.log("SIGTERM"); process.exit(0); });
process.on("SIGINT",  () => { console.log("SIGINT");  process.exit(0); });
process.on("unhandledRejection", (err) => { console.error("Unhandled:", err); process.exit(1); });

start();