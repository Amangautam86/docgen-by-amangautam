#!/usr/bin/env node

import { Command } from 'commander';
import { parseFile } from './parsers/ast-parser.js';
import { extractRoutes, extractInterface } from './parsers/route-extractor.js';
import { generateMarkdown } from './generators/markdown-gen.js';
import { generateOpenApiJson } from './generators/openapi-gen.js';
import * as fs from 'fs';
import type { ParsedTypeInfo } from './types/index.js';

const program = new Command();

program
  .name('docgen')
  .description('AST-based API Documentation Generator')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate documentation from TypeScript files')
  .argument('<file>', 'TypeScript file to analyze')
  .option('-o, --output <file>', 'Output file (default: stdout)')
  .option('-f, --format <format>', 'Output format: markdown, openapi', 'markdown')
  .option('-t, --title <title>', 'API title', 'API Documentation')
  .option('-v, --version <version>', 'API version', '1.0.0')
  .action(async (file: string, options: { output?: string; format: string; title: string; version: string }) => {
    try {
      if (!fs.existsSync(file)) {
        console.error(`Error: File not found: ${file}`);
        process.exit(1);
      }
      
      const parsed = parseFile(file);
      const routes = extractRoutes(parsed.sourceFile);
      
      const interfaces = new Map<string, ParsedTypeInfo>();
      
      for (const route of routes) {
        if (route.requestBody) {
          const iface = extractInterface(parsed.sourceFile, route.requestBody.type);
          if (iface && !interfaces.has(iface.name)) {
            interfaces.set(iface.name, iface);
          }
        }
        
        for (const response of route.responses) {
          if (response.type !== 'void' && response.type !== 'any') {
            const iface = extractInterface(parsed.sourceFile, response.type);
            if (iface && !interfaces.has(iface.name)) {
              interfaces.set(iface.name, iface);
            }
          }
        }
      }
      
      let output: string;
      
      if (options.format === 'openapi') {
        const openapi = generateOpenApiJson(routes, options.title, options.version);
        output = JSON.stringify(openapi, null, 2);
      } else {
        output = generateMarkdown(routes, options.title, interfaces);
      }
      
      if (options.output) {
        fs.writeFileSync(options.output, output);
        console.log(`Documentation written to: ${options.output}`);
      } else {
        console.log(output);
      }
    } catch (error) {
      console.error('Error generating documentation:', error);
      process.exit(1);
    }
  });

program.parse();
