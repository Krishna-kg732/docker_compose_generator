require('dotenv').config();

const express = require('express');

// Import scaffolded components
const Database = require('./src/config/database');
const TemplateService = require('./src/services/TemplateService');
const TemplateController = require('./src/controllers/templateController');
const createTemplateRoutes = require('./src/routes/templateRoutes');
const { errorHandler, notFoundHandler, requestLogger } = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(requestLogger);

// Initialize services
const templateService = new TemplateService();
const templateController = new TemplateController(templateService);

// Setup routes
app.use('/', createTemplateRoutes(templateController));

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Database connection and startup
async function startServer() {
  let dbConnected = false;
  
  try {
    // Try to connect to database
    await Database.connect();
    dbConnected = true;
    console.log('✅ Database connected successfully');
    
    // Initialize templates if database is empty (only when connected)
    await templateService.initializeTemplatesFromFiles();
  } catch (error) {
    console.log('⚠️ Database connection failed, using file fallback');
    dbConnected = false;
    // Don't try to initialize templates when DB is not available
  }
  
  // Start server (always start, regardless of database status)
  const server = app.listen(PORT, () => {
    console.log('🚀 Template Generator Service');
    console.log(`📍 Server: http://localhost:${PORT}`);
    console.log(`🗄️ Database: ${dbConnected ? 'Connected' : 'File Fallback'}`);
    console.log(`📋 Health: http://localhost:${PORT}/health`);
    // TODO: Add API documentation endpoint
    // TODO: Add health monitoring dashboard
  });
  
  return server;
}

// Graceful shutdown
let server;

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  if (server) {
    server.close(() => {
      console.log('✅ Server closed');
    });
  }
  await Database.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  if (server) {
    server.close(() => {
      console.log('✅ Server closed');
    });
  }
  await Database.disconnect();
  process.exit(0);
});

startServer().then(serverInstance => {
  server = serverInstance;
}).catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});