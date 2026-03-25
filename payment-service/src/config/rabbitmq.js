import amqplib from "amqplib";

let channel    = null;
let connection = null;
const EXCHANGE = "invoicehive";

export const connectRabbitMQ = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      connection = await amqplib.connect(process.env.RABBITMQ_URL);
      channel    = await connection.createChannel();
      await channel.assertExchange(EXCHANGE, "topic", { durable: true });
      console.log(" RabbitMQ connected");

      connection.on("close", () => {
        console.warn("  RabbitMQ closed — reconnecting in 5s");
        setTimeout(() => connectRabbitMQ(), 5000);
      });
      return channel;
    } catch (err) {
      const wait = (i + 1) * 2000;
      console.warn(`  RabbitMQ retry ${i + 1}/${retries} in ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  console.error("RabbitMQ: could not connect — payment events will be skipped");
};

export const publish = async (routingKey, data) => {
  if (!channel) {
    console.warn(`RabbitMQ not ready — skipping: ${routingKey}`);
    return;
  }
  try {
    channel.publish(
      EXCHANGE, routingKey,
      Buffer.from(JSON.stringify(data)),
      { persistent: true, contentType: "application/json", timestamp: Date.now() }
    );
    console.log(`Event published: ${routingKey}`);
  } catch (err) {
    console.error(` Publish failed ${routingKey}:`, err.message);
  }
};