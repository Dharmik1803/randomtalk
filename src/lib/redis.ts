import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;

if (redisUrl && redisToken) {
  // Option 1: Upstash Rest URL + Token (Recommended for Edge)
  redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });
} else if (redisUrl) {
  // Option 2: Fallback to Redis URL (Works if it's an Upstash REST URL)
  redis = Redis.fromEnv(); // Automatically picks up UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
}

export { redis };
