import { generateMarkdown } from '../src/generators/markdown-gen.js';
import type { ApiRoute } from '../src/types/index.js';

describe('Markdown Generator', () => {
  const mockRoutes: ApiRoute[] = [
    {
      method: 'get',
      path: '/users',
      summary: 'Get all users',
      params: [],
      responses: [{ statusCode: 200, type: 'User[]', description: 'Successful response' }],
    },
    {
      method: 'post',
      path: '/users',
      summary: 'Create a user',
      params: [],
      requestBody: { type: 'CreateUserDto', required: true },
      responses: [{ statusCode: 201, type: 'User', description: 'User created' }],
    },
    {
      method: 'put',
      path: '/users/:id',
      summary: 'Update a user',
      params: [{ name: 'id', type: 'string', required: true, in: 'path' }],
      requestBody: { type: 'UpdateUserDto', required: true },
      responses: [{ statusCode: 200, type: 'User', description: 'User updated' }],
    },
  ];

  it('should generate markdown with title', () => {
    const markdown = generateMarkdown(mockRoutes, 'Users API');
    expect(markdown).toContain('# Users API');
  });

  it('should generate route table with all routes', () => {
    const markdown = generateMarkdown(mockRoutes);
    expect(markdown).toContain('| Method | Path |');
    expect(markdown).toContain('| GET');
    expect(markdown).toContain('| POST');
    expect(markdown).toContain('| PUT');
  });

  it('should include request body in documentation', () => {
    const markdown = generateMarkdown(mockRoutes);
    expect(markdown).toContain('CreateUserDto');
    expect(markdown).toContain('UpdateUserDto');
  });

  it('should include path parameters', () => {
    const markdown = generateMarkdown(mockRoutes);
    expect(markdown).toContain('id');
    expect(markdown).toContain('path');
  });

  it('should include response types', () => {
    const markdown = generateMarkdown(mockRoutes);
    expect(markdown).toContain('User[]');
    expect(markdown).toContain('200');
  });
});
