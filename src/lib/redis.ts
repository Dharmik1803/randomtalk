import { Redis } from "@upstash/redis";

let redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;

if (redisUrl && redisToken) {
  // Ensure the URL starts with https:// for the HTTP client
  if (redisUrl.startsWith("redis://") || redisUrl.startsWith("rediss://")) {
    console.warn("⚠️ [Redis] You provided a redis:// URL to a serverless HTTP client. Attempting to convert to https://...");
    redisUrl = redisUrl.replace("redis://", "https://").replace("rediss://", "https://");
  }
  
  if (!redisUrl.startsWith("http")) {
    redisUrl = `https://${redisUrl}`;
  }

  console.log(`[Redis] Initializing HTTP client with URL: ${redisUrl.split('@').pop()}`);
  
  redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });
} 

export { redis };
