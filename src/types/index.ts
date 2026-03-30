export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';

export interface ApiParam {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  in: 'path' | 'query' | 'header' | 'cookie';
}

export interface ApiRequestBody {
  type: string;
  description?: string;
  required: boolean;
}

export interface ApiResponse {
  statusCode: number;
  type: string;
  description?: string;
}

export interface ApiRoute {
  method: HttpMethod;
  path: string;
  summary?: string;
  description?: string;
  params: ApiParam[];
  requestBody?: ApiRequestBody;
  responses: ApiResponse[];
  tags?: string[];
}

export interface ApiDocument {
  title: string;
  version: string;
  description?: string;
  routes: ApiRoute[];
  interfaces: Record<string, Record<string, string>>;
}

export interface ParsedTypeInfo {
  name: string;
  properties: Record<string, string>;
}
