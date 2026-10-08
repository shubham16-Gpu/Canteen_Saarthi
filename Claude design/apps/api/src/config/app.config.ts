import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: +process.env.API_PORT! || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3000',
}));
