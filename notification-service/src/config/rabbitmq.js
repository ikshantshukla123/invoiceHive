import amqplib from "amqplib";

let channel    = null;
let connection = null;
const EXCHANGE = "invoicehive";

export const connectRabbitMQ = async (retries = 10) => {
  for (let i = 0; i < retries; i++) {
    try {
      connection = await amqplib.connect(process.env.RABBITMQ_URL);
      channel    = await connection.createChannel();

      // Same exchange as all other services
      await channel.assertExchange(EXCHANGE, "topic", { durable: true });

      // Prefetch 1 — process one email at a time
      // Prevents the service from pulling 100 jobs and then crashing mid-way
      await channel.prefetch(1);

      console.log(" RabbitMQ connected");

      connection.on("close", () => {
        console.warn("  RabbitMQ closed — reconnecting in 5s");
        channel = null;
        setTimeout(() => connectRabbitMQ(), 5000);
      });

      connection.on("error", (err) => {
        console.error(" RabbitMQ error:", err.message);
      });

      return channel;
    } catch (err) {
      const wait = Math.min((i + 1) * 2000, 15000);
      console.warn(`RabbitMQ unavailable — retry ${i + 1}/${retries} in ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  console.error(" RabbitMQ: gave up connecting");
  process.exit(1); // Notification service is useless without RabbitMQ
};

// ── Subscribe to a routing key pattern ───────────────────────────────────────
// Usage: consume("invoice.sent", handler)
// Usage: consume("invoice.*", handler) — wildcard
export const consume = async (routingKey, handler) => {
  if (!channel) throw new Error("RabbitMQ channel not ready");

  // Create a durable named queue — survives restarts, messages not lost
  const queueName = `notification.${routingKey.replace(".", "_").replace("*", "all")}`;
  const { queue } = await channel.assertQueue(queueName, {
    durable:   true,
    arguments: {
      // Dead-letter exchange — failed messages go here instead of disappearing
      "x-dead-letter-exchange": "invoicehive.dlx",
    },
  });

  // Bind this queue to the exchange with the routing key
  await channel.bindQueue(queue, EXCHANGE, routingKey);

  // Start consuming
  channel.consume(queue, async (msg) => {
    if (!msg) return;

    const routingKeyReceived = msg.fields.routingKey;
    let data;

    try {
      data = JSON.parse(msg.content.toString());
      console.log(` Consumed: ${routingKeyReceived}`, { id: data.invoiceId || data.userId });

      await handler(data, routingKeyReceived);

      // Acknowledge — tell RabbitMQ we processed it successfully
      channel.ack(msg);
    } catch (err) {
      console.error(` Consumer error for ${routingKeyReceived}:`, err.message);

      // Nack with requeue:false — sends to dead-letter queue after failure
      // requeue:true would cause infinite retry loops
      channel.nack(msg, false, false);
    }
  });

  console.log(`📬 Listening on queue: ${queueName} [${routingKey}]`);
};

export const getChannel = () => channel;