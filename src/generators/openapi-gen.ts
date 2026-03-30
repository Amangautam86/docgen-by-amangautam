import type { ApiRoute, ApiDocument } from '../types/index.js';

export function generateOpenApi(routes: ApiRoute[], title: string = 'API', version: string = '1.0.0'): ApiDocument {
  const openApi: ApiDocument = {
    title,
    version,
    routes,
    interfaces: {},
  };
  
  return openApi;
}

export function generateOpenApiJson(routes: ApiRoute[], title: string = 'API', version: string = '1.0.0'): object {
  const paths: Record<string, object> = {};
  
  for (const route of routes) {
    const pathKey = route.path.replace(/:(\w+)/g, '{$1}');
    
    if (!paths[pathKey]) {
      paths[pathKey] = {};
    }
    
    const responseSchemas: Record<string, object> = {};
    
    for (const response of route.responses) {
      responseSchemas[response.statusCode.toString()] = {
        description: response.description || '',
        content: {
          'application/json': {
            schema: {
              type: response.type === 'void' ? 'object' : 'object',
              properties: response.type !== 'void' ? {
                data: {
                  type: response.type.includes('[]') ? 'array' : 'object',
                  items: response.type.includes('[]') ? { type: response.type.replace('[]', '') } : undefined,
                },
              } : undefined,
            },
          },
        },
      };
    }
    
    const operation: Record<string, unknown> = {
      summary: route.summary || '',
      description: route.description || '',
      responses: responseSchemas,
    };
    
    if (route.requestBody) {
      operation.requestBody = {
        required: route.requestBody.required,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                _data: { $ref: `#/components/schemas/${route.requestBody.type}` },
              },
            },
          },
        },
      };
    }
    
    if (route.params.length > 0) {
      operation.parameters = route.params.map(param => ({
        name: param.name,
        in: param.in,
        required: param.required,
        schema: { type: param.type },
        description: param.description || '',
      }));
    }
    
    (paths[pathKey] as Record<string, unknown>)[route.method] = operation;
  }
  
  return {
    openapi: '3.0.0',
    info: {
      title,
      version,
    },
    paths,
    components: {
      schemas: {},
    },
  };
}
