import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './App.css';

function App() {
  const [code, setCode] = useState(`import { Router, Request, Response } from 'express';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
}

export interface DeleteResponse {
  success: boolean;
  deletedId: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export const userRouter = Router();

userRouter.get('/users', async (req: Request, res: Response): Promise<PaginatedResponse<User>> => {
  return { data: [], total: 0, page: 1, limit: 10 };
});

userRouter.post('/users', async (req: Request<{}, {}, CreateUserDto>, res: Response<User>): Promise<void> => {
  res.json({} as User);
});

userRouter.put('/users/:id', async (req: Request<{ id: string }, {}, UpdateUserDto>, res: Response<User>): Promise<void> => {
  res.json({} as User);
});

userRouter.delete('/users/:id', async (req: Request<{ id: string }>, res: Response<DeleteResponse>): Promise<void> => {
  res.json({} as DeleteResponse);
});`);

  const [markdown, setMarkdown] = useState('');

  const generateDocs = () => {
    const routes: Array<{
      method: string;
      path: string;
      requestBody?: { type: string };
      params: Array<{ name: string; in: string }>;
      responses: Array<{ statusCode: number; type: string }>;
    }> = [];

    const routeRegex = /\.\s*(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = routeRegex.exec(code)) !== null) {
      const method = match[1];
      const path = match[2];

      const route: any = {
        method,
        path,
        params: [],
        responses: [{ statusCode: 200, type: 'void' }],
      };

      const pathParams = path.match(/:(\w+)/g);
      if (pathParams) {
        route.params = pathParams.map((p: string) => ({ name: p.slice(1), in: 'path' }));
      }

      const handlerStart = match.index + match[0].length;
      const handlerSection = code.slice(handlerStart, handlerStart + 500);

      const bodyMatch = handlerSection.match(/Request\s*<\s*[^>]*>\s*,\s*\{\s*([^},]*)/);
      if (bodyMatch && bodyMatch[1] && !bodyMatch[1].includes('=')) {
        const bodyType = bodyMatch[1].trim();
        if (bodyType && bodyType !== '{}' && !bodyType.startsWith('{')) {
          route.requestBody = { type: bodyType };
        }
      }

      const simpleBodyMatch = handlerSection.match(/Request\s*<\s*\{\s*[^}]*\}\s*,\s*\{\s*([^},]*)/);
      if (simpleBodyMatch && simpleBodyMatch[1]) {
        route.requestBody = { type: simpleBodyMatch[1].trim() };
      }

      const pathParamMatch = handlerSection.match(/Request\s*<\s*\{\s*([^}]+)\s*\}\s*,/);
      if (pathParamMatch) {
        const paramsStr = pathParamMatch[1];
        const paramMatches = paramsStr.matchAll(/(\w+)\s*:\s*\w+/g);
        for (const pm of paramMatches) {
          if (!route.params.find((p: any) => p.name === pm[1])) {
            route.params.push({ name: pm[1], in: 'path' });
          }
        }
      }

      const responseMatch = handlerSection.match(/Response\s*<([^>]+)>/);
      if (responseMatch) {
        const responseType = responseMatch[1].trim();
        if (responseType && responseType !== 'void') {
          route.responses = [{ statusCode: 200, type: responseType }];
        }
      }

      const promiseMatch = handlerSection.match(/: Promise<([^>]+)>/);
      if (promiseMatch) {
        const responseType = promiseMatch[1].trim();
        if (responseType && responseType !== 'void') {
          route.responses = [{ statusCode: 200, type: responseType }];
        }
      }

      routes.push(route);
    }

    const interfaces: Record<string, Record<string, string>> = {};
    const interfaceRegex = /export\s+interface\s+(\w+)\s*\{([^}]+)\}/g;
    let ifaceMatch;
    while ((ifaceMatch = interfaceRegex.exec(code)) !== null) {
      const name = ifaceMatch[1];
      const body = ifaceMatch[2];
      const props: Record<string, string> = {};
      const propRegex = /(\w+)\s*:\s*([^;]+)/g;
      let propMatch;
      while ((propMatch = propRegex.exec(body)) !== null) {
        props[propMatch[1]] = propMatch[2].trim();
      }
      interfaces[name] = props;
    }

    const typeAliasRegex = /export\s+type\s+(\w+)\s*=\s*\{([^}]+)\}/g;
    while ((ifaceMatch = typeAliasRegex.exec(code)) !== null) {
      const name = ifaceMatch[1];
      const body = ifaceMatch[2];
      const props: Record<string, string> = {};
      const propRegex = /(\w+)\s*:\s*([^;]+)/g;
      let propMatch;
      while ((propMatch = propRegex.exec(body)) !== null) {
        props[propMatch[1]] = propMatch[2].trim();
      }
      interfaces[name] = props;
    }

    let md = `# API Documentation\n\n`;
    md += `| Method | Path | Request Body | Response |\n`;
    md += `|--------|------|---------------|----------|\n`;

    for (const route of routes) {
      const method = route.method.toUpperCase();
      const body = route.requestBody?.type || '-';
      const response = route.responses[0]?.type || '-';
      md += `| ${method} | \`${route.path}\` | ${body} | ${response} |\n`;
    }

    md += `\n## Details\n\n`;

    for (const route of routes) {
      const method = route.method.toUpperCase();
      md += `### ${method} ${route.path}\n\n`;

      if (route.requestBody) {
        md += `**Request Body:** \`${route.requestBody.type}\`\n\n`;
        const iface = interfaces[route.requestBody.type];
        if (iface) {
          const example: Record<string, unknown> = {};
          for (const [key, type] of Object.entries(iface)) {
            if (type.includes('string')) example[key] = 'string';
            else if (type.includes('number')) example[key] = 0;
            else if (type.includes('boolean')) example[key] = true;
            else if (type.includes('Date')) example[key] = '2024-01-01';
            else if (type.includes('[]')) example[key] = [];
            else example[key] = type;
          }
          md += '```json\n' + JSON.stringify(example, null, 2) + '\n```\n\n';
        }
      }

      if (route.params.length > 0) {
        md += `**Parameters:**\n`;
        for (const param of route.params) {
          md += `- \`${param.name}\` (${param.in})\n`;
        }
        md += `\n`;
      }

      md += `**Response:** \`${route.responses[0]?.type}\`\n\n`;
      const respIface = interfaces[route.responses[0]?.type?.replace('[]', '')];
      if (respIface) {
        const example: Record<string, unknown> = {};
        for (const [key, type] of Object.entries(respIface)) {
          if (type.includes('string')) example[key] = 'string';
          else if (type.includes('number')) example[key] = 0;
          else if (type.includes('boolean')) example[key] = true;
          else if (type.includes('Date')) example[key] = '2024-01-01';
          else if (type.includes('[]')) example[key] = [];
          else example[key] = type;
        }
        md += '```json\n' + JSON.stringify(example, null, 2) + '\n```\n\n';
      }

      md += `---\n\n`;
    }

    setMarkdown(md);
  };

  return (
    <div className="app">
      <header>
        <div className="header-content">
          <h1>
            <span className="logo-icon">&#9670;</span>
            DocWeaver
          </h1>
          <p>AST-based API Documentation Generator</p>
        </div>
      </header>
      <main>
        <div className="editor-pane">
          <div className="pane-header">
            <span className="pane-title">
              <span className="dot red"></span>
              <span className="dot yellow"></span>
              <span className="dot green"></span>
              TypeScript
            </span>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your TypeScript code here..."
            spellCheck={false}
          />
          <button onClick={generateDocs}>
            <span className="btn-icon">&#9654;</span>
            Generate Documentation
          </button>
        </div>
        <div className="preview-pane">
          <div className="pane-header">
            <span className="pane-title">
              <span className="dot red"></span>
              <span className="dot yellow"></span>
              <span className="dot green"></span>
              Preview
            </span>
          </div>
          <div className="markdown-content">
            {markdown ? (
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match;
                    return !isInline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                          margin: '1rem 0',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                        }}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  h1: ({ children }) => <h1 className="md-h1">{children}</h1>,
                  h2: ({ children }) => <h2 className="md-h2">{children}</h2>,
                  h3: ({ children }) => <h3 className="md-h3">{children}</h3>,
                  table: ({ children }) => <table className="md-table">{children}</table>,
                  th: ({ children }) => <th className="md-th">{children}</th>,
                  td: ({ children }) => <td className="md-td">{children}</td>,
                  p: ({ children }) => <p className="md-p">{children}</p>,
                  ul: ({ children }) => <ul className="md-ul">{children}</ul>,
                  li: ({ children }) => <li className="md-li">{children}</li>,
                }}
              >
                {markdown}
              </ReactMarkdown>
            ) : (
              <div className="placeholder">
                <div className="placeholder-icon">&#128196;</div>
                <p>Click "Generate Documentation" to preview</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
