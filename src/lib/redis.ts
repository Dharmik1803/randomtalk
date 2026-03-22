import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;

// Type definition for global to persist Redis client in development (HMR)
declare global {
  var redisClient: ReturnType<typeof createClient> | undefined;
}

let redis: ReturnType<typeof createClient> | null = null;

if (redisUrl) {
  if (!global.redisClient) {
    console.log("[Redis] Initializing node-redis client...");
    const client = createClient({
      url: redisUrl,
    });

    client.on("error", (err) => console.error("[Redis] Client Error:", err));
    
    // Connect asynchronously
    client.connect().catch((err) => {
      console.error("[Redis] Connection Error:", err);
    });

    global.redisClient = client;
  }
  
  redis = global.redisClient;
} else {
  console.warn("⚠️ [Redis] REDIS_URL not found in environment variables.");
}

export { redis };
