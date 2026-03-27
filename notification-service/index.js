import "dotenv/config";
import app from "./app.js";
import { connectRabbitMQ } from "./config/rabbitmq.js";
import { verifyMailer } from "./config/mailer.js";
import { registerConsumers } from "./consumers/index.js";

const PORT = process.env.PORT || 3005;

const start = async () => {
  // Connect to RabbitMQ — retries built in
  await connectRabbitMQ();

  // Verify SMTP connection — warns but doesn't exit if it fails
  await verifyMailer();

  // Start all event consumers
  await registerConsumers();

  // Start HTTP server (just for health checks — this service is event-driven)
  app.listen(PORT, () => {
    console.log(`\n Notification Service running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Status: http://localhost:${PORT}/status\n`);
    console.log(" Listening for events on RabbitMQ...\n");
  });
};

process.on("SIGTERM", () => { console.log("SIGTERM — shutting down"); process.exit(0); });
process.on("SIGINT",  () => { console.log("SIGINT  — shutting down"); process.exit(0); });
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
  process.exit(1);
});

start();