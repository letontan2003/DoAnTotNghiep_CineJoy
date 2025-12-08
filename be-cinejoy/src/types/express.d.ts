// Type declarations for Express to fix build errors when @types packages are missing
declare module "express" {
  import { IncomingMessage, ServerResponse } from "http";

  export interface Request extends IncomingMessage {
    body?: any;
    params?: any;
    query?: any;
    headers: any;
    file?: any;
    files?: any;
    ip?: string;
  }

  export interface Response extends ServerResponse {
    status(code: number): Response;
    json(body: any): Response;
    send(body: any): Response;
    cookie(name: string, value: string, options?: any): Response;
    clearCookie(name: string, options?: any): Response;
  }

  export interface NextFunction {
    (err?: any): void;
  }

  export interface Application {
    use(...handlers: any[]): Application;
    listen(port: number | string, callback?: () => void): any;
    get(path: string, ...handlers: any[]): Application;
    post(path: string, ...handlers: any[]): Application;
    put(path: string, ...handlers: any[]): Application;
    delete(path: string, ...handlers: any[]): Application;
  }

  export interface Router {
    get(path: string, ...handlers: any[]): Router;
    post(path: string, ...handlers: any[]): Router;
    put(path: string, ...handlers: any[]): Router;
    delete(path: string, ...handlers: any[]): Router;
    use(...handlers: any[]): Router;
  }

  export function express(): Application;
  export function Router(): Router;
}

declare module "cookie-parser" {
  import { Request, Response, NextFunction } from "express";
  export default function cookieParser(
    secret?: string
  ): (req: Request, res: Response, next: NextFunction) => void;
}

declare module "cors" {
  import { Request, Response, NextFunction } from "express";
  export default function cors(
    options?: any
  ): (req: Request, res: Response, next: NextFunction) => void;
}

declare module "multer" {
  import { Request } from "express";
  export interface File {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
  }
  export interface MulterRequest extends Request {
    file?: File;
    files?: File[] | { [fieldname: string]: File[] };
  }
  export default function multer(options?: any): any;
}

declare namespace Express {
  namespace Multer {
    interface File {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      destination: string;
      filename: string;
      path: string;
      buffer: Buffer;
    }
  }
}

// Type declarations for axios
declare module "axios" {
  export interface AxiosRequestConfig {
    url?: string;
    method?: string;
    baseURL?: string;
    headers?: any;
    params?: any;
    data?: any;
    timeout?: number;
    [key: string]: any;
  }

  export interface AxiosResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: any;
    config: AxiosRequestConfig;
  }

  export interface AxiosError<T = any> extends Error {
    config: AxiosRequestConfig;
    code?: string;
    request?: any;
    response?: AxiosResponse<T>;
    isAxiosError: boolean;
  }

  export default function axios(
    config: AxiosRequestConfig
  ): Promise<AxiosResponse>;
  export default function axios(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse>;

  export function get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>>;
  export function post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>>;
  export function put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>>;
  // Note: delete is a reserved word in TypeScript
  // axios.delete() is available on axios instance, not as a named export
  // Use axios({ method: 'delete', url, ...config }) or axios.delete() on instance

  export function create(config?: AxiosRequestConfig): typeof axios;
}
