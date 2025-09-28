/**
 * TemplateController - Handles HTTP requests for template operations
 * Separates request/response logic from business logic
 */
class TemplateController {
  constructor(templateService) {
    this.templateService = templateService;
  }

  // Health check endpoint
  async getHealth(req, res) {
    try {
      const stats = await this.templateService.getTemplateStats();
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: this.templateService.isDbConnected,
        templates: stats.total
        // TODO: Add system metrics (memory, CPU)
        // TODO: Add database response time
        // TODO: Add service dependencies health
      });
    } catch (error) {
      res.status(503).json({
        status: 'ERROR',
        error: error.message
      });
    }
  }

  // Get template statistics
  async getStats(req, res) {
    try {
      const stats = await this.templateService.getTemplateStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics',
        message: error.message
      });
    }
  }

  // Get all available services
  async getAllServices(req, res) {
    try {
      const services = await this.templateService.getAllServices();
      res.json({
        success: true,
        data: services,
        count: services.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch services',
        message: error.message
      });
    }
  }

  // Get services by category
  async getServicesByCategory(req, res) {
    // TODO: Add category validation middleware
    // TODO: Add caching for frequently requested categories
    const { category } = req.params;
    const services = await this.templateService.getServicesByCategory(category);
    
    res.json({
      data: services,
      category,
      count: services.length
    });
  }

  // Get specific service
  async getService(req, res) {
    try {
      const { serviceId } = req.params;
      const service = await this.templateService.getService(serviceId);
      
      if (!service) {
        return res.status(404).json({
          success: false,
          error: 'Service not found',
          serviceId: serviceId
        });
      }

      res.json({
        success: true,
        data: service
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch service',
        message: error.message
      });
    }
  }

  // Create new template
  async createService(req, res) {
    try {
      const templateData = req.body;
      
      // Basic validation
      if (!templateData.id || !templateData.name || !templateData.services) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: id, name, services'
        });
      }

      const newTemplate = await this.templateService.createTemplate(templateData);
      res.status(201).json({
        success: true,
        data: newTemplate,
        message: 'Template created successfully'
      });
    } catch (error) {
      if (error.code === 11000) {
        res.status(409).json({
          success: false,
          error: 'Template with this ID already exists',
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create template',
          message: error.message
        });
      }
    }
  }

  // Update existing template
  async updateService(req, res) {
    try {
      const { serviceId } = req.params;
      const updateData = req.body;
      
      const updatedTemplate = await this.templateService.updateTemplate(serviceId, updateData);
      res.json({
        success: true,
        data: updatedTemplate,
        message: 'Template updated successfully'
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: 'Template not found',
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update template',
          message: error.message
        });
      }
    }
  }

  // Delete template
  async deleteService(req, res) {
    try {
      const { serviceId } = req.params;
      
      const deletedTemplate = await this.templateService.deleteTemplate(serviceId);
      res.json({
        success: true,
        data: deletedTemplate,
        message: 'Template deleted successfully'
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: 'Template not found',
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to delete template',
          message: error.message
        });
      }
    }
  }

  // Generate docker-compose from selected services
  async generateCompose(req, res) {
    try {
      const { selectedServices, variables, outputFormat } = req.body;

      // Input validation
      if (!selectedServices || !Array.isArray(selectedServices)) {
        return res.status(400).json({
          error: 'selectedServices must be an array',
          example: {
            selectedServices: ['sonarr', 'radarr', 'prowlarr'],
            variables: { port: 8989, configPath: '/srv/config' }
          }
        });
      }

      if (selectedServices.length === 0) {
        return res.status(400).json({
          error: 'At least one service must be selected'
        });
      }

      // Validate service IDs format
      const invalidIds = selectedServices.filter(id => typeof id !== 'string' || id.trim() === '');
      if (invalidIds.length > 0) {
        return res.status(400).json({
          error: 'All service IDs must be non-empty strings'
        });
      }

      // Generate docker-compose (returns YAML string by default)
      const dockerComposeYaml = await this.templateService.generateDockerCompose(
        selectedServices, 
        variables || {}, 
        outputFormat || 'yaml'
      );

      // Set appropriate content type for YAML response
      res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
      
      // Return the generated YAML string directly
      res.send(dockerComposeYaml);

    } catch (error) {
      console.error('Generate compose error:', error.message);
      
      // Handle specific error types
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'One or more services not found',
          message: error.message
        });
      }
      
      if (error.message.includes('Duplicate service') || error.message.includes('Port conflict')) {
        return res.status(409).json({
          error: 'Service configuration conflict',
          message: error.message
        });
      }
      
      if (error.message.includes('validation failed')) {
        return res.status(400).json({
          error: 'Invalid compose configuration',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'Failed to generate docker-compose',
        message: error.message
      });
    }
  }

  // Alternative endpoint that returns JSON object instead of YAML
  async generateComposeJson(req, res) {
    try {
      const { selectedServices, variables } = req.body;

      if (!selectedServices || !Array.isArray(selectedServices) || selectedServices.length === 0) {
        return res.status(400).json({
          error: 'selectedServices must be a non-empty array'
        });
      }

      // Generate docker-compose object
      const dockerCompose = await this.templateService.generateDockerCompose(
        selectedServices, 
        variables || {}, 
        'object'
      );

      res.json({
        success: true,
        data: {
          dockerCompose,
          selectedServices,
          variables: variables || {},
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to generate docker-compose',
        message: error.message
      });
    }
  }

  // Initialize templates from JSON files to database
  async initializeTemplates(req, res) {
    try {
      await this.templateService.initializeTemplatesFromFiles();
      const stats = await this.templateService.getTemplateStats();
      
      res.json({
        success: true,
        message: 'Templates initialized from JSON files',
        stats: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to initialize templates',
        message: error.message
      });
    }
  }
}

module.exports = TemplateController;