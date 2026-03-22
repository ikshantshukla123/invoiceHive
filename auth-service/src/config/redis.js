import Redis from "ioredis";
import { REDIS_URL } from "./env.js";

// ioredis auto-reconnects — much better than the official redis package
//it is lib we are using to establish connectoiopn with redis and it has built in retry mechanism which is very good for production use cases
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 5) {
      console.error(" Redis: too many retries, giving up");
      return null;
    }
    return Math.min(times * 200, 2000); // exponential backoff, max 2s
  },
});

redis.on("connect", () => console.log("Redis connected"));
redis.on("error", (err) => console.error(" Redis error:", err.message));

export default redis;