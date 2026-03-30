import type { ApiRoute, ParsedTypeInfo } from '../types/index.js';

export function generateMarkdown(
  routes: ApiRoute[],
  title: string = 'API Documentation',
  interfaces?: Map<string, ParsedTypeInfo>
): string {
  let markdown = `# ${title}\n\n`;
  
  markdown += `## Routes\n\n`;
  markdown += `| Method | Path | Summary | Request Body | Response |\n`;
  markdown += `|--------|------|---------|---------------|----------|\n`;
  
  for (const route of routes) {
    const method = route.method.toUpperCase();
    const path = route.path;
    const summary = route.summary || '-';
    const requestBody = route.requestBody ? route.requestBody.type : '-';
    const responseType = route.responses[0]?.type || '-';
    const statusCode = route.responses[0]?.statusCode || '-';
    
    markdown += `| ${method} | \`${path}\` | ${summary} | ${requestBody} | ${statusCode} ${responseType} |\n`;
  }
  
  markdown += `\n## Details\n\n`;
  
  for (const route of routes) {
    const method = route.method.toUpperCase();
    markdown += `### ${method} ${route.path}\n\n`;
    
    if (route.summary) {
      markdown += `**Summary:** ${route.summary}\n\n`;
    }
    
    if (route.description) {
      markdown += `${route.description}\n\n`;
    }
    
    if (route.params.length > 0) {
      markdown += `**Parameters:**\n\n`;
      markdown += `| Name | Type | In | Required |\n`;
      markdown += `|------|------|-----|----------|\n`;
      
      for (const param of route.params) {
        markdown += `| ${param.name} | ${param.type} | ${param.in} | ${param.required ? 'Yes' : 'No'} |\n`;
      }
      markdown += `\n`;
    }
    
    if (route.requestBody) {
      const bodyType = route.requestBody.type;
      markdown += `**Request Body:** \`${bodyType}\`${route.requestBody.required ? ' (required)' : ''}\n\n`;
      
      if (interfaces) {
        const iface = interfaces.get(bodyType);
        if (iface) {
          const codeBlock = '```json\n' + interfaceToJson(iface) + '\n```\n\n';
          markdown += codeBlock;
        }
      }
    }
    
    if (route.responses.length > 0) {
      markdown += '**Responses:**\n\n';
      for (const response of route.responses) {
        markdown += '- `' + response.statusCode + '` ' + (response.description || '') + ': `' + response.type + '`\n';
        
        if (interfaces && response.type !== 'void' && response.type !== 'any') {
          const iface = interfaces.get(response.type);
          if (iface) {
            const codeBlock = '\n```json\n' + interfaceToJson(iface) + '\n```\n\n';
            markdown += codeBlock;
          }
        }
      }
      markdown += '\n';
    }
    
    markdown += `---\n\n`;
  }
  
  return markdown;
}

function interfaceToJson(iface: ParsedTypeInfo): string {
  const obj: Record<string, unknown> = {};
  
  for (const [key, type] of Object.entries(iface.properties)) {
    if (key === '_type') continue;
    
    if (type.includes('string')) {
      obj[key] = 'string';
    } else if (type.includes('number')) {
      obj[key] = 0;
    } else if (type.includes('boolean')) {
      obj[key] = true;
    } else if (type.includes('Date')) {
      obj[key] = '2024-01-01';
    } else if (type.includes('[]')) {
      obj[key] = [];
    } else if (type.includes('?')) {
      obj[key] = null;
    } else {
      obj[key] = type;
    }
  }
  
  return JSON.stringify(obj, null, 2);
}
