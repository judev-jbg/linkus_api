import { RateLimiterMemory } from "rate-limiter-flexible";

// Rate limiters para diferentes endpoints
export const authLimiter = new RateLimiterMemory({
  keyPrefix: "auth_fail",
  points: 5, // 5 intentos
  duration: 900, // por 15 minutos
});

export const generalLimiter = new RateLimiterMemory({
  keyPrefix: "general",
  points: 100, // 100 requests
  duration: 3600, // por hora
});

export const createRateLimitMiddleware = (limiter) => {
  return async (req, res, next) => {
    try {
      const key = req.ip + "_" + (req.user?.id || "anonymous");
      await limiter.consume(key);
      next();
    } catch (rejRes) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      res.set("Retry-After", String(secs));
      res.status(429).json({
        success: false,
        message: "Too many requests",
        retryAfter: secs,
      });
    }
  };
};
