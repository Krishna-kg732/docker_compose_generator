const Template = require('../models/Template');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');
const yaml = require('js-yaml');

/**
 * TemplateService - Core functionality for dynamic docker-compose template generation
 */
class TemplateService {
  constructor() {
    this.templatesPath = path.join(__dirname, '../../templates');
  }

  get isDbConnected() {
    return mongoose.connection.readyState === 1;
  }

  async initializeTemplatesFromFiles() {
    // Only initialize if database is connected
    if (!this.isDbConnected) {
      console.log('📂 Database not connected, skipping template initialization');
      return;
    }

    try {
      const existingTemplates = await Template.countDocuments();
      if (existingTemplates > 0) {
        console.log(`📊 Database already has ${existingTemplates} templates`);
        return;
      }

      const jsonTemplates = this.loadTemplatesFromFiles();
      const templates = Object.values(jsonTemplates);
      
      if (templates.length > 0) {
        await Template.insertMany(templates);
        console.log(`📥 Initialized ${templates.length} templates from JSON files to database`);
      }
    } catch (error) {
      console.error('❌ Error initializing templates:', error.message);
    }
  }

  loadTemplatesFromFiles() {
    const services = {};
    
    if (!fs.existsSync(this.templatesPath)) {
      fs.mkdirSync(this.templatesPath, { recursive: true });
    }

    try {
      const templateFiles = fs.readdirSync(this.templatesPath)
        .filter(file => file.endsWith('.json'));

      templateFiles.forEach(file => {
        const serviceId = path.basename(file, '.json');
        const templatePath = path.join(this.templatesPath, file);
        const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
        services[serviceId] = template;
      });

      console.log(`📂 Loaded ${Object.keys(services).length} service templates from files`);
    } catch (error) {
      console.error('❌ Error loading service templates from files:', error.message);
    }

    return services;
  }

  async getAllServices() {
    // TODO: Add pagination support
    // TODO: Add caching layer (Redis/Memory)
    // TODO: Add search and filtering capabilities
    try {
      if (this.isDbConnected) {
        const templates = await Template.find({ isActive: true }).select('-__v').lean();
        return templates;
      } else {
        const fileTemplates = this.loadTemplatesFromFiles();
        return Object.values(fileTemplates);
      }
    } catch (error) {
      console.error('❌ Error fetching templates from database, using file fallback:', error.message);
      const fileTemplates = this.loadTemplatesFromFiles();
      return Object.values(fileTemplates);
    }
  }

  async getServicesByCategory(category) {
    try {
      if (this.isDbConnected) {
        const templates = await Template.find({ category: category, isActive: true }).select('-__v').lean();
        return templates;
      } else {
        const fileTemplates = this.loadTemplatesFromFiles();
        return Object.values(fileTemplates).filter(service => service.category === category);
      }
    } catch (error) {
      console.error('❌ Error fetching templates by category:', error.message);
      const fileTemplates = this.loadTemplatesFromFiles();
      return Object.values(fileTemplates).filter(service => service.category === category);
    }
  }

  async getService(serviceId) {
    try {
      if (this.isDbConnected) {
        const template = await Template.findOne({ id: serviceId, isActive: true }).select('-__v').lean();
        return template;
      } else {
        const fileTemplates = this.loadTemplatesFromFiles();
        return fileTemplates[serviceId] || null;
      }
    } catch (error) {
      console.error('❌ Error fetching template:', error.message);
      const fileTemplates = this.loadTemplatesFromFiles();
      return fileTemplates[serviceId] || null;
    }
  }

  async createTemplate(templateData) {
    try {
      if (this.isDbConnected) {
        const template = new Template(templateData);
        const savedTemplate = await template.save();
        console.log(`✅ Template '${templateData.id}' created in database`);
        return savedTemplate;
      } else {
        throw new Error('Database not connected. Cannot create template.');
      }
    } catch (error) {
      console.error('❌ Error creating template:', error.message);
      throw error;
    }
  }

  async updateTemplate(serviceId, updateData) {
    try {
      if (this.isDbConnected) {
        const updatedTemplate = await Template.findOneAndUpdate(
          { id: serviceId },
          updateData,
          { new: true, runValidators: true }
        );
        
        if (!updatedTemplate) {
          throw new Error(`Template '${serviceId}' not found`);
        }
        
        console.log(`✅ Template '${serviceId}' updated in database`);
        return updatedTemplate;
      } else {
        throw new Error('Database not connected. Cannot update template.');
      }
    } catch (error) {
      console.error('❌ Error updating template:', error.message);
      throw error;
    }
  }

  async deleteTemplate(serviceId) {
    try {
      if (this.isDbConnected) {
        const deletedTemplate = await Template.findOneAndUpdate(
          { id: serviceId },
          { isActive: false },
          { new: true }
        );
        
        if (!deletedTemplate) {
          throw new Error(`Template '${serviceId}' not found`);
        }
        
        console.log(`✅ Template '${serviceId}' deleted (soft delete)`);
        return deletedTemplate;
      } else {
        throw new Error('Database not connected. Cannot delete template.');
      }
    } catch (error) {
      console.error('❌ Error deleting template:', error.message);
      throw error;
    }
  }

  async generateDockerCompose(selectedServices, variables = {}, outputFormat = 'object') {
    // Step 1: Validate input
    if (!Array.isArray(selectedServices) || selectedServices.length === 0) {
      throw new Error('selectedServices must be a non-empty array');
    }

    // Step 2: Fetch all relevant templates from database
    const templates = await this.getMultipleServices(selectedServices);
    
    // Step 3: Validate all services were found
    const foundServices = templates.map(t => t.id);
    const missingServices = selectedServices.filter(id => !foundServices.includes(id));
    if (missingServices.length > 0) {
      throw new Error(`Services not found: ${missingServices.join(', ')}`);
    }

    // Step 4: Initialize compose structure
    const compose = {
      version: '3.9',
      services: {},
      networks: {},
      volumes: {}
    };

    // Step 5: Process each template and merge components
    for (const template of templates) {
      // Process services with variable substitution
      if (template.services) {
        const processedServices = this.processTemplate(template.services, variables);
        // Check for duplicate service names
        for (const serviceName in processedServices) {
          if (compose.services[serviceName]) {
            throw new Error(`Duplicate service name '${serviceName}' found in templates`);
          }
        }
        Object.assign(compose.services, processedServices);
      }

      // Process networks
      if (template.networks) {
        const processedNetworks = this.processTemplate(template.networks, variables);
        Object.assign(compose.networks, processedNetworks);
      }

      // Process volumes
      if (template.volumes) {
        const processedVolumes = this.processTemplate(template.volumes, variables);
        Object.assign(compose.volumes, processedVolumes);
      }
    }

    // Step 6: Add default network if none specified
    if (Object.keys(compose.networks).length === 0) {
      compose.networks.default = { driver: 'bridge' };
    }

    // Step 7: Validate final compose structure
    this.validateComposeStructure(compose);

    // Step 8: Update usage statistics
    await this.incrementUsageStats(selectedServices);

    // Step 9: Return in requested format
    if (outputFormat === 'yaml') {
      return yaml.dump(compose, { 
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
      });
    }

    return compose;
  }

  processTemplate(template, variables) {
    const templateString = JSON.stringify(template);
    const compiledTemplate = handlebars.compile(templateString);
    return JSON.parse(compiledTemplate(variables));
  }

  // Fetch multiple services efficiently
  async getMultipleServices(serviceIds) {
    try {
      if (this.isDbConnected) {
        return await Template.find({ 
          id: { $in: serviceIds }, 
          isActive: true 
        }).select('-__v').lean();
      } else {
        const fileTemplates = this.loadTemplatesFromFiles();
        return serviceIds
          .map(id => fileTemplates[id])
          .filter(template => template !== undefined);
      }
    } catch (error) {
      console.error('❌ Error fetching multiple templates:', error.message);
      const fileTemplates = this.loadTemplatesFromFiles();
      return serviceIds
        .map(id => fileTemplates[id])
        .filter(template => template !== undefined);
    }
  }

  // Validate compose structure for conflicts and errors
  validateComposeStructure(compose) {
    const usedPorts = new Set();
    const errors = [];

    // Check for port conflicts
    for (const [serviceName, serviceConfig] of Object.entries(compose.services)) {
      if (serviceConfig.ports) {
        serviceConfig.ports.forEach(portMapping => {
          const hostPort = portMapping.split(':')[0];
          if (usedPorts.has(hostPort)) {
            errors.push(`Port conflict: ${hostPort} is used by multiple services`);
          }
          usedPorts.add(hostPort);
        });
      }
    }

    // Validate service structure
    for (const [serviceName, serviceConfig] of Object.entries(compose.services)) {
      if (!serviceConfig.image && !serviceConfig.build) {
        errors.push(`Service '${serviceName}' must specify either 'image' or 'build'`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Compose validation failed: ${errors.join(', ')}`);
    }
  }

  // Update usage statistics for templates
  async incrementUsageStats(serviceIds) {
    if (!this.isDbConnected) {
      return; // Skip stats update if using file fallback
    }

    try {
      await Template.updateMany(
        { id: { $in: serviceIds }, isActive: true },
        { 
          $inc: { 'usage.downloadCount': 1 },
          $set: { 'usage.lastUsed': new Date() }
        }
      );
      console.log(`📈 Updated usage stats for ${serviceIds.length} services`);
    } catch (error) {
      console.error('❌ Error updating usage stats:', error.message);
    }
  }

  async validateServices(selectedServices) {
    // TODO: Add volume mount conflict detection
    // TODO: Add network configuration validation
    // TODO: Add resource requirement checking
    // TODO: Add dependency compatibility validation
    const conflicts = [];
    const usedPorts = new Set();

    for (const serviceId of selectedServices) {
      const service = await this.getService(serviceId);
      if (service && service.metadata && service.metadata.defaultPorts) {
        service.metadata.defaultPorts.forEach(port => {
          if (usedPorts.has(port)) {
            conflicts.push({
              type: 'port_conflict',
              service: serviceId,
              port: port,
              message: `Port ${port} is already in use by another service`
            });
          } else {
            usedPorts.add(port);
          }
        });
      }
    }

    return conflicts;
  }

  async getTemplateStats() {
    try {
      if (this.isDbConnected) {
        const stats = await Template.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]);
        
        const totalCount = await Template.countDocuments({ isActive: true });
        
        return {
          total: totalCount,
          byCategory: stats,
          source: 'database'
        };
      } else {
        const fileTemplates = this.loadTemplatesFromFiles();
        const templates = Object.values(fileTemplates);
        const categoryStats = {};
        
        templates.forEach(template => {
          categoryStats[template.category] = (categoryStats[template.category] || 0) + 1;
        });
        
        return {
          total: templates.length,
          byCategory: Object.entries(categoryStats).map(([_id, count]) => ({ _id, count })),
          source: 'files'
        };
      }
    } catch (error) {
      console.error('❌ Error getting template stats:', error.message);
      return { total: 0, byCategory: [], source: 'error' };
    }
  }
}

module.exports = TemplateService;
