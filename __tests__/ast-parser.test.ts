import { parseFile } from '../src/parsers/ast-parser.js';
import { extractRoutes } from '../src/parsers/route-extractor.js';
import type { ApiRoute } from '../src/types/index.js';
import path from 'path';

describe('AST Parser', () => {
  const fixturePath = path.resolve(process.cwd(), 'test-fixtures/sample-api.ts');

  it('should parse the sample API file', () => {
    const result = parseFile(fixturePath);
    expect(result).toBeDefined();
    expect(result.sourceFile).toBeDefined();
  });

  it('should extract routes from the sample API', () => {
    const parsed = parseFile(fixturePath);
    const routes = extractRoutes(parsed.sourceFile);
    
    expect(routes).toHaveLength(4);
    
    expect(routes[0]).toMatchObject({
      method: 'get',
      path: '/users',
    });
    
    expect(routes[1]).toMatchObject({
      method: 'post',
      path: '/users',
    });
    
    expect(routes[2]).toMatchObject({
      method: 'put',
      path: '/users/:id',
    });
    
    expect(routes[3]).toMatchObject({
      method: 'delete',
      path: '/users/:id',
    });
  });

  it('should extract request body types from routes', () => {
    const parsed = parseFile(fixturePath);
    const routes = extractRoutes(parsed.sourceFile);
    
    const postRoute = routes.find((r: ApiRoute) => r.method === 'post');
    expect(postRoute?.requestBody?.type).toBe('CreateUserDto');
    
    const putRoute = routes.find((r: ApiRoute) => r.method === 'put');
    expect(putRoute?.requestBody?.type).toBe('UpdateUserDto');
    
    const deleteRoute = routes.find((r: ApiRoute) => r.method === 'delete');
    expect(deleteRoute?.requestBody).toBeUndefined();
  });

  it('should extract path parameters from routes', () => {
    const parsed = parseFile(fixturePath);
    const routes = extractRoutes(parsed.sourceFile);
    
    const putRoute = routes.find((r: ApiRoute) => r.method === 'put');
    expect(putRoute?.params).toContainEqual(
      expect.objectContaining({ name: 'id', in: 'path' })
    );
    
    const deleteRoute = routes.find((r: ApiRoute) => r.method === 'delete');
    expect(deleteRoute?.params).toContainEqual(
      expect.objectContaining({ name: 'id', in: 'path' })
    );
  });

  it('should extract response types from routes', () => {
    const parsed = parseFile(fixturePath);
    const routes = extractRoutes(parsed.sourceFile);
    
    const getRoute = routes.find((r: ApiRoute) => r.method === 'get');
    expect(getRoute?.responses).toContainEqual(
      expect.objectContaining({ type: 'PaginatedResponse' })
    );
    
    const postRoute = routes.find((r: ApiRoute) => r.method === 'post');
    expect(postRoute?.responses).toContainEqual(
      expect.objectContaining({ type: 'User' })
    );
    
    const deleteRoute = routes.find((r: ApiRoute) => r.method === 'delete');
    expect(deleteRoute?.responses).toContainEqual(
      expect.objectContaining({ type: 'DeleteResponse' })
    );
  });
});
