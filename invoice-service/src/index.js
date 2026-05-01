import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { connectRabbitMQ } from "./config/rabbitmq.js";
import { initS3 } from "./config/s3.js";
import { startOverdueCron } from "./jobs/overdue.job.js";

const PORT = process.env.PORT || 3003;

const start = async () => {
  await connectDB();
  await connectRabbitMQ();
  await initS3();

  // Start nightly overdue detection cron
  startOverdueCron();

  app.listen(PORT, () => {
    console.log(`\n🚀 Invoice Service running on port ${PORT}`);
    console.log(`   ENV: ${process.env.NODE_ENV || "development"}`);
    console.log(`   Health: http://localhost:${PORT}/health\n`);
  });
};

process.on("SIGTERM", () => { console.log("SIGTERM"); process.exit(0); });
process.on("SIGINT",  () => { console.log("SIGINT");  process.exit(0); });
process.on("unhandledRejection", (err) => { console.error("Unhandled:", err); process.exit(1); });

start();