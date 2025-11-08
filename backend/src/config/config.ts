import dotenv from 'dotenv';
dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  authEnabled: boolean;
  corsOrigins: string[];
  sessionExpiry: string;
  maxSessionsPerUser: number;
  idleTimeoutMinutes: number;
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  authEnabled: process.env.AUTH_ENABLED === 'true',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
  sessionExpiry: process.env.SESSION_EXPIRY || '24h',
  maxSessionsPerUser: parseInt(process.env.MAX_SESSIONS_PER_USER || '5', 10),
  idleTimeoutMinutes: parseInt(process.env.IDLE_TIMEOUT_MINUTES || '30', 10),
};

export default config;
