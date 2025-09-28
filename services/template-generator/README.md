# Dynamic Template Generator Service

A microservice that dynamically generates Docker Compose files based on user-selected services with variable substitution.

## Features

- **Dynamic Service Selection**: Choose from available service templates
- **Variable Substitution**: Customize service configurations with Handlebars
- **Service Composition**: Merge multiple services into a single docker-compose file
- **Conflict Detection**: Validate port conflicts and service compatibility
- **Template Reloading**: Hot reload service templates without restart
- **Validation**: Ensure template correctness and best practices

## Technology Stack
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **MongoDB**: Template storage and metadata
- **Handlebars**: Template engine for dynamic generation
- **JSON Schema**: Template validation
- **Docker API**: Docker service validation

## API Endpoints
- `GET /templates` - List available templates
- `GET /templates/{id}` - Get template details
- `POST /templates` - Create new template
- `PUT /templates/{id}` - Update template
- `DELETE /templates/{id}` - Delete template
- `POST /templates/generate` - Generate custom template
- `POST /templates/{id}/validate` - Validate template

## Template Categories
- **Web Applications**: LAMP, MEAN, Django, etc.
- **Databases**: MySQL, PostgreSQL, MongoDB clusters
- **Microservices**: Service mesh patterns, API gateways
- **CI/CD**: Jenkins, GitLab CI, GitHub Actions
- **Monitoring**: ELK stack, Prometheus + Grafana
- **Development**: Local development environments

## Template Structure
```json
{
  "id": "lamp-stack",
  "name": "LAMP Stack",
  "description": "Apache, MySQL, PHP development environment",
  "category": "web-applications",
  "version": "1.0.0",
  "tags": ["php", "mysql", "apache"],
  "services": {
    "web": { ... },
    "database": { ... }
  },
  "networks": { ... },
  "volumes": { ... }
}
```

## Usage Example
```bash
curl -X POST "http://localhost:8002/templates/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "stack": "web",
    "database": "mysql",
    "cache": "redis",
    "webserver": "nginx"
  }'
```