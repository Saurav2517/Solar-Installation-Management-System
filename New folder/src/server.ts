import createApp from './app';
import { config } from './config';
import prisma from './config/database';

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    const app = createApp();

    app.listen(config.app.port, () => {
      console.log(`
╔══════════════════════════════════════════════════════╗
║                                                      ║
║   🌞 SIMS Backend - Solar Installation Management    ║
║                                                      ║
║   Environment : ${config.app.env.padEnd(35)}║
║   Port        : ${String(config.app.port).padEnd(35)}║
║   API Version : ${config.app.apiVersion.padEnd(35)}║
║   API Base    : /api/${config.app.apiVersion.padEnd(31)}║
║   Health      : http://localhost:${String(config.app.port).padEnd(19)}║
║                                                      ║
╚══════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
const gracefulShutdown = async () => {
  console.log('\n🔄 Shutting down gracefully...');
  await prisma.$disconnect();
  console.log('✅ Database disconnected');
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();
