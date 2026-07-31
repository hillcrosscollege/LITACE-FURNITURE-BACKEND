// core/interfaces/api-response.interface.ts
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message?: string;
  data?: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
  statusCode: number;
}
