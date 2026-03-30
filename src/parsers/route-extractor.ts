import { SourceFile, CallExpression, StringLiteral, SyntaxKind, ArrowFunction, PropertyAccessExpression } from 'ts-morph';
import type { ApiRoute, HttpMethod, ParsedTypeInfo } from '../types/index.js';

const HTTP_METHODS: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

export function extractRoutes(sourceFile: SourceFile): ApiRoute[] {
  const routes: ApiRoute[] = [];
  
  const descendants = sourceFile.getDescendants();
  
  for (const node of descendants) {
    if (node.getKind() === SyntaxKind.CallExpression) {
      const call = node as CallExpression;
      const expression = call.getExpression();
      
      if (!PropertyAccessExpression.isPropertyAccessExpression(expression)) {
        continue;
      }
      
      const methodName = expression.getName();
      
      if (!HTTP_METHODS.includes(methodName.toLowerCase() as HttpMethod)) {
        continue;
      }
      
      const args = call.getArguments();
      if (args.length < 1) continue;
      
      const pathArg = args[0];
      if (!StringLiteral.isStringLiteral(pathArg)) continue;
      
      const path = pathArg.getLiteralValue();
      const method = methodName.toLowerCase() as HttpMethod;
      
      const route: ApiRoute = {
        method,
        path,
        params: [],
        responses: [],
      };
      
      if (args.length > 1) {
        extractFromHandlerArg(args[1], route);
      }
      
      extractPathParams(route);
      
      routes.push(route);
    }
  }
  
  return routes;
}

function extractFromHandlerArg(arg: any, route: ApiRoute): void {
  if (!ArrowFunction.isArrowFunction(arg)) {
    const funcDeclaration = arg;
    if (funcDeclaration.getKind && funcDeclaration.getKind() === SyntaxKind.FunctionDeclaration) {
      extractFromFunctionDeclaration(arg, route);
      return;
    }
    route.responses.push({
      statusCode: 200,
      type: 'void',
      description: 'Successful response',
    });
    return;
  }
  
  const params = arg.getParameters();
  
  for (const param of params) {
    const paramName = param.getName();
    const paramTypeNode = param.getTypeNode();
    
    if (paramName && paramTypeNode) {
      const typeText = paramTypeNode.getText();
      
      if (typeText.includes('Request')) {
        const bodyType = extractBodyTypeFromRequest(typeText);
        if (bodyType) {
          route.requestBody = {
            type: bodyType,
            required: true,
          };
        }
        
        const pathParams = extractPathParamsFromRequestType(typeText);
        for (const [name, ptype] of Object.entries(pathParams)) {
          if (!route.params.find(p => p.name === name)) {
            route.params.push({
              name,
              type: ptype,
              required: true,
              in: 'path',
            });
          }
        }
      }
      
      if ((paramName === 'res' || paramName === '_res') && typeText.includes('Response')) {
        const responseType = extractResponseTypeFromResponse(typeText);
        if (responseType && route.responses.length === 0) {
          route.responses.push({
            statusCode: 200,
            type: responseType,
            description: 'Successful response',
          });
        }
      }
    }
  }
  
  if (route.responses.length === 0) {
    extractReturnType(arg, route);
  }
}

function extractFromFunctionDeclaration(func: any, route: ApiRoute): void {
  const params = func.getParameters();
  
  for (const param of params) {
    const paramName = param.getName();
    const paramTypeNode = param.getTypeNode();
    
    if (paramName && paramTypeNode) {
      const typeText = paramTypeNode.getText();
      
      if (typeText.includes('Request')) {
        const bodyType = extractBodyTypeFromRequest(typeText);
        if (bodyType) {
          route.requestBody = {
            type: bodyType,
            required: true,
          };
        }
        
        const pathParams = extractPathParamsFromRequestType(typeText);
        for (const [name, ptype] of Object.entries(pathParams)) {
          if (!route.params.find(p => p.name === name)) {
            route.params.push({
              name,
              type: ptype,
              required: true,
              in: 'path',
            });
          }
        }
      }
    }
  }
  
  const returnTypeNode = func.getReturnTypeNode();
  if (returnTypeNode) {
    const returnTypeText = returnTypeNode.getText();
    const responseType = extractResponseType(returnTypeText);
    if (responseType) {
      route.responses.push({
        statusCode: 200,
        type: responseType,
        description: 'Successful response',
      });
      return;
    }
  }
  
  route.responses.push({
    statusCode: 200,
    type: 'void',
    description: 'Successful response',
  });
}

function extractResponseTypeFromResponse(typeText: string): string | null {
  const match = typeText.match(/Response\s*<([^>]+)>/);
  if (match) {
    const responseType = match[1].trim();
    if (responseType && responseType !== 'void' && responseType !== 'any') {
      return cleanTypeName(responseType);
    }
  }
  return null;
}

function extractBodyTypeFromRequest(typeText: string): string | null {
  const genericMatch = typeText.match(/Request\s*<\s*([^,>]+)\s*,\s*([^,>]+)\s*,\s*([^,>]+)\s*>/);
  if (genericMatch) {
    const bodyType = genericMatch[3].trim();
    if (bodyType && bodyType !== '{}' && bodyType !== 'any' && !bodyType.startsWith('{')) {
      return cleanTypeName(bodyType);
    }
  }
  
  const simpleMatch = typeText.match(/Request\s*<\s*\{\s*[^}]*\s*\}\s*,\s*\{\s*[^}]*\s*\}\s*,/);
  if (simpleMatch) {
    return null;
  }
  
  const simpleMatch2 = typeText.match(/Request\s*<\s*\{\s*[^}]*\s*\}\s*,/);
  if (simpleMatch2) {
    return null;
  }
  
  const simpleMatch3 = typeText.match(/Request\s*<\s*([^,>]+)\s*>/);
  if (simpleMatch3) {
    const inner = simpleMatch3[1].trim();
    if (inner && inner !== '{}' && !inner.includes('=') && !inner.startsWith('{')) {
      return cleanTypeName(inner);
    }
  }
  
  return null;
}

function extractPathParamsFromRequestType(typeText: string): Record<string, string> {
  const params: Record<string, string> = {};
  
  const match = typeText.match(/Request\s*<\s*\{\s*([^}]+)\s*\}\s*,/);
  if (match) {
    const paramsStr = match[1];
    const paramMatches = paramsStr.matchAll(/(\w+)\s*:\s*(\w+)/g);
    for (const paramMatch of paramMatches) {
      params[paramMatch[1]] = paramMatch[2];
    }
  }
  
  return params;
}

function extractReturnType(arrowFunc: any, route: ApiRoute): void {
  const returnTypeNode = arrowFunc.getReturnTypeNode();
  
  if (returnTypeNode) {
    const returnTypeText = returnTypeNode.getText();
    const responseType = extractResponseType(returnTypeText);
    if (responseType) {
      route.responses.push({
        statusCode: 200,
        type: responseType,
        description: 'Successful response',
      });
      return;
    }
  }
  
  const returnType = arrowFunc.getReturnType();
  const returnTypeText = returnType.getText();
  
  if (returnTypeText && returnTypeText !== 'void' && returnTypeText !== 'Promise<void>') {
    const responseType = extractResponseType(returnTypeText);
    if (responseType) {
      route.responses.push({
        statusCode: 200,
        type: responseType,
        description: 'Successful response',
      });
      return;
    }
  }
  
  route.responses.push({
    statusCode: 200,
    type: 'void',
    description: 'Successful response',
  });
}

function extractResponseType(typeText: string): string | null {
  if (typeText.includes('import(')) {
    const parts = typeText.split('.');
    const lastPart = parts[parts.length - 1];
    const cleanPart = lastPart.replace(/[^a-zA-Z0-9]/g, '');
    if (cleanPart && cleanPart !== 'Promise') {
      return cleanPart;
    }
  }
  
  const promiseMatch = typeText.match(/Promise<([^>]+)>/);
  if (promiseMatch) {
    let innerType = promiseMatch[1].trim();
    
    const arrayMatch = innerType.match(/Array<([^>]+)>/);
    if (arrayMatch) {
      return cleanTypeName(arrayMatch[1]) + '[]';
    }
    
    if (innerType.includes('[]')) {
      return cleanTypeName(innerType.replace('[]', '')) + '[]';
    }
    
    return cleanTypeName(innerType);
  }
  
  const arrayMatch = typeText.match(/Array<([^>]+)>/);
  if (arrayMatch) {
    return cleanTypeName(arrayMatch[1]) + '[]';
  }
  
  if (typeText.includes('[]')) {
    const match = typeText.match(/(\w+)\[\]/);
    if (match) {
      return match[1] + '[]';
    }
  }
  
  const simpleMatch = typeText.match(/^(\w+)$/);
  if (simpleMatch && simpleMatch[1] !== 'void' && simpleMatch[1] !== 'any') {
    return simpleMatch[1];
  }
  
  return 'unknown';
}

function cleanTypeName(typeText: string): string {
  let cleaned = typeText
    .replace(/import\([^)]+\)\./g, '')
    .replace(/"/g, '')
    .replace(/'/g, '')
    .trim();
  
  if (cleaned.includes('<')) {
    cleaned = cleaned.replace(/<[^>]+>/g, '');
  }
  
  if (cleaned.includes('[]')) {
    const baseType = cleaned.replace('[]', '').trim();
    return baseType + '[]';
  }
  
  const match = cleaned.match(/\b(\w+)\b/);
  return match ? match[1] : cleaned;
}

function extractPathParams(route: ApiRoute): void {
  const pathMatches = route.path.match(/:(\w+)/g);
  
  if (pathMatches) {
    for (const param of pathMatches) {
      const paramName = param.slice(1);
      if (!route.params.find(p => p.name === paramName)) {
        route.params.push({
          name: paramName,
          type: 'string',
          required: true,
          in: 'path',
        });
      }
    }
  }
}

export function extractInterface(sourceFile: SourceFile, interfaceName: string): ParsedTypeInfo | null {
  const interfaces = sourceFile.getInterfaces();
  
  for (const iface of interfaces) {
    if (iface.getName() === interfaceName) {
      const properties: Record<string, string> = {};
      
      iface.getProperties().forEach(prop => {
        const name = prop.getName();
        const type = prop.getType();
        if (name) {
          properties[name] = cleanTypeName(type.getText());
        }
      });
      
      return { name: interfaceName, properties };
    }
  }
  
  const typeAliases = sourceFile.getTypeAliases();
  for (const typeAlias of typeAliases) {
    if (typeAlias.getName() === interfaceName) {
      const typeNode = typeAlias.getTypeNode();
      if (typeNode) {
        return { name: interfaceName, properties: { _type: cleanTypeName(typeNode.getText()) } };
      }
    }
  }
  
  return null;
}
