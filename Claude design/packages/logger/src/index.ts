import pino from "pino";
import type { Logger } from "pino";

const isDev = process.env.NODE_ENV !== "production";

const devTransport: pino.TransportSingleOptions = {
  target: "pino-pretty",
  options: {
    colorize: true,
    translateTime: "SYS:standard",
    ignore: "pid,hostname",
  },
};

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  ...(isDev ? { transport: devTransport } : {}),
  redact: {
    paths: [
      "password",
      "passwordHash",
      "token",
      "accessToken",
      "refreshToken",
      "authorization",
      "cookie",
      "creditCard",
      "cardNumber",
      "cvv",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[REDACTED]",
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function createChildLogger(name: string, bindings?: Record<string, unknown>): Logger {
  return logger.child({ module: name, ...bindings });
}

export type { Logger };
export default logger;
