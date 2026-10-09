import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`🚀 [Dulal Mahato Hub API] running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  console.log(`📡 Health check available at: http://localhost:${env.PORT}/api/v1/health`);
});

// Graceful shutdown
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, () => {
    console.log(`\n🛑 Received ${signal}, gracefully shutting down...`);
    server.close(() => {
      console.log('✅ HTTP server closed. Exiting process.');
      process.exit(0);
    });
  });
});
