import amqplib from "amqplib";

let channel = null;
let connection = null;

const EXCHANGE = "invoicehive";

// ── Connect to RabbitMQ with retry logic ──────────────────────────────────────
export const connectRabbitMQ = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      connection = await amqplib.connect(process.env.RABBITMQ_URL);
      channel    = await connection.createChannel();

      // Topic exchange — routing keys like "invoice.sent", "invoice.paid"
      await channel.assertExchange(EXCHANGE, "topic", { durable: true });

      console.log("✅ RabbitMQ connected");

      // Handle connection drops — reconnect automatically
      connection.on("close", () => {
        console.warn("⚠️  RabbitMQ connection closed — reconnecting in 5s");
        setTimeout(() => connectRabbitMQ(), 5000);
      });

      connection.on("error", (err) => {
        console.error("❌ RabbitMQ error:", err.message);
      });

      return channel;
    } catch (err) {
      const wait = (i + 1) * 2000;
      console.warn(`⚠️  RabbitMQ unavailable — retry ${i + 1}/${retries} in ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  console.error("❌ RabbitMQ: could not connect after retries — events will be skipped");
};

// ── Publish an event ──────────────────────────────────────────────────────────
// Usage: await publish("invoice.sent", { invoiceId, userId, clientEmail })
export const publish = async (routingKey, data) => {
  if (!channel) {
    console.warn(`⚠️  RabbitMQ not connected — skipping event: ${routingKey}`);
    return;
  }
  try {
    channel.publish(
      EXCHANGE,
      routingKey,
      Buffer.from(JSON.stringify(data)),
      {
        persistent:  true,        // Survive RabbitMQ restart
        contentType: "application/json",
        timestamp:   Date.now(),
      }
    );
    console.log(`📤 Event published: ${routingKey}`);
  } catch (err) {
    console.error(`❌ Failed to publish ${routingKey}:`, err.message);
  }
};

export const getChannel = () => channel;