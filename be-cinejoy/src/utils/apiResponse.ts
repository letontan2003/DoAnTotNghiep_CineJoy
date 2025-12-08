// Standardized API Response Interface
export interface ApiResponse<T = any> {
  status: boolean;
  error: number;
  message: string;
  data: T | null;
}

// Success Response Helper
export const successResponse = <T>(
  message: string,
  data: T | null = null
): ApiResponse<T> => ({
  status: true,
  error: 0,
  message,
  data,
});

// Error Response Helper
export const errorResponse = (
  message: string,
  errorCode: number = 500,
  data: any = null
): ApiResponse => ({
  status: false,
  error: errorCode,
  message,
  data,
});

// Common Error Responses
export const notFoundResponse = (
  resource: string = "Resource"
): ApiResponse => ({
  status: false,
  error: 404,
  message: `${resource} không tìm thấy`,
  data: null,
});

export const badRequestResponse = (message: string): ApiResponse => ({
  status: false,
  error: 400,
  message,
  data: null,
});

export const unauthorizedResponse = (
  message: string = "Unauthorized"
): ApiResponse => ({
  status: false,
  error: 401,
  message,
  data: null,
});

export const forbiddenResponse = (
  message: string = "Forbidden"
): ApiResponse => ({
  status: false,
  error: 403,
  message,
  data: null,
});

export const serverErrorResponse = (
  message: string = "Lỗi server"
): ApiResponse => ({
  status: false,
  error: 500,
  message,
  data: null,
});

export const validationErrorResponse = (message: string): ApiResponse => ({
  status: false,
  error: 422,
  message,
  data: null,
});

export const conflictResponse = (message: string): ApiResponse => ({
  status: false,
  error: 409,
  message,
  data: null,
});
