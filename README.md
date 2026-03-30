# DocWeaver

AST-based API Documentation Generator that statically analyzes TypeScript source code to extract routes, request bodies, and response types directly from the Abstract Syntax Tree (AST).

## Problem

Developers change API endpoints but forget to update the documentation. Existing tools just read comments (which are often missing or outdated). DocWeaver analyzes the actual code to generate accurate documentation.

## Features

- **AST-based extraction** - Parses TypeScript source code to find Express/Fastify routes
- **Type inference** - Extracts request body types and response types from code
- **Multiple output formats** - Generates Markdown and OpenAPI 3.0 JSON
- **CLI tool** - Generate docs from the command line
- **Web UI** - Interactive documentation preview

## Installation

```bash
npm install
```

## Usage

### CLI

```bash
# Generate Markdown docs
npx tsx src/index.ts generate test-fixtures/sample-api.ts

# Generate OpenAPI JSON
npx tsx src/index.ts generate test-fixtures/sample-api.ts -f openapi

# Save to file
npx tsx src/index.ts generate test-fixtures/sample-api.ts -o docs.md
```

### Web UI

```bash
cd ui
npm install
npm run dev
```

## How It Works

DocWeaver uses [ts-morph](https://ts-morph.com/) to analyze TypeScript AST:

1. **Parse the source file** - ts-morph creates an AST representation
2. **Find route handlers** - Look for `router.get()`, `router.post()`, etc.
3. **Extract metadata** - Get path parameters, request body types, return types
4. **Generate output** - Convert to Markdown or OpenAPI JSON

### Example

Input TypeScript:
```typescript
router.get('/users', () => {
  return [] as User[];
});

router.post('/users', (body: CreateUserDto) => {
  return {} as User;
});
```

Output Markdown:
```markdown
| Method | Path | Request Body | Response |
|--------|------|---------------|----------|
| GET | /users | - | User[] |
| POST | /users | CreateUserDto | User |
```

## Architecture

```
docgen/
├── src/
│   ├── parsers/
│   │   ├── ast-parser.ts      # Uses ts-morph to read TS files
│   │   └── route-extractor.ts  # Finds Express/Fastify routes
│   ├── generators/
│   │   ├── markdown-gen.ts     # Converts to Markdown
│   │   └── openapi-gen.ts      # Converts to OpenAPI JSON
│   └── types/
│       └── index.ts            # TypeScript interfaces
├── ui/                         # React web UI
└── test-fixtures/              # Test files
```

## Testing

```bash
npm test
```

## Deployment

### Vercel (Recommended)

The project can be deployed to Vercel for free:

1. Push to GitHub
2. Import project in Vercel
3. Deploy

The UI folder contains a Vite + React app that can be deployed as a static site.

### Building for Production

```bash
# Build CLI
npm run build

# Build UI
cd ui
npm run build
```

## Tech Stack

- **TypeScript** - Type-safe codebase
- **ts-morph** - AST parsing for TypeScript
- **Jest** - Testing
- **Vite + React** - Web UI
- **Commander** - CLI framework

## License

ISC
