// core/interceptors/transform.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiSuccessResponse } from '../types/api-response.interface';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(map((result) => this.wrap(result)));
  }

  private wrap(result: any): ApiSuccessResponse<T> {
    // Paginated list shape: { data, total, page, limit } → data + meta
    if (
      result &&
      typeof result === 'object' &&
      Array.isArray(result.data) &&
      typeof result.total === 'number'
    ) {
      return {
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
        },
      };
    }

    // Message-only shape: { message: '...' } with nothing else
    if (
      result &&
      typeof result === 'object' &&
      typeof result.message === 'string' &&
      Object.keys(result).length === 1
    ) {
      return { success: true, message: result.message };
    }

    // Anything else — entities, arrays, nested objects — becomes `data`
    return { success: true, data: result };
  }
}
