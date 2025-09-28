const express = require('express');
const router = express.Router();

/**
 * Template Routes - API endpoints for template operations
 * Uses TemplateController for request handling
 */
function createTemplateRoutes(templateController) {
  
  // Health check
  router.get('/health', (req, res) => templateController.getHealth(req, res));

  // Template statistics  
  router.get('/api/stats', (req, res) => templateController.getStats(req, res));
  
  // TODO: Add API documentation route (/api/docs)
  // TODO: Add rate limiting middleware
  // TODO: Add authentication middleware for write operations

  // Service management routes
  router.get('/api/services', (req, res) => templateController.getAllServices(req, res));
  router.get('/api/services/category/:category', (req, res) => templateController.getServicesByCategory(req, res));
  router.get('/api/services/:serviceId', (req, res) => templateController.getService(req, res));
  router.post('/api/services', (req, res) => templateController.createService(req, res));
  router.put('/api/services/:serviceId', (req, res) => templateController.updateService(req, res));
  router.delete('/api/services/:serviceId', (req, res) => templateController.deleteService(req, res));

  // Docker-compose generation endpoints
  router.post('/templates/generate', (req, res) => templateController.generateCompose(req, res));
  router.post('/api/generate', (req, res) => templateController.generateCompose(req, res)); // Legacy endpoint
  router.post('/api/generate-json', (req, res) => templateController.generateComposeJson(req, res)); // JSON response

  // Database initialization
  router.post('/api/initialize', (req, res) => templateController.initializeTemplates(req, res));

  return router;
}

module.exports = createTemplateRoutes;