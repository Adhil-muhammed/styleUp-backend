import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const { code, message } = this.extractError(exception);

    response.status(status).json({
      success: false,
      data: null,
      error: { code, message },
      meta: {
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }

  private extractError(exception: unknown): { code: string; message: string } {
    if (!(exception instanceof HttpException)) {
      return { code: 'INTERNAL_ERROR', message: 'Internal server error' };
    }

    const payload = exception.getResponse();
    if (typeof payload === 'string') {
      return { code: this.codeFromStatus(exception.getStatus()), message: payload };
    }

    if (typeof payload === 'object' && payload !== null) {
      const record = payload as Record<string, unknown>;
      if (typeof record['code'] === 'string' && typeof record['message'] === 'string') {
        return { code: record['code'], message: record['message'] };
      }

      const message = record['message'];
      if (typeof message === 'string') {
        return { code: this.codeFromStatus(exception.getStatus()), message };
      }
      if (Array.isArray(message)) {
        return {
          code: 'VALIDATION_ERROR',
          message: message.map(String).join('; '),
        };
      }
    }

    return {
      code: this.codeFromStatus(exception.getStatus()),
      message: exception.message,
    };
  }

  private codeFromStatus(status: number): string {
    if (status === 400) return 'VALIDATION_ERROR';
    if (status === 401) return 'UNAUTHORIZED';
    if (status === 403) return 'FORBIDDEN';
    if (status === 404) return 'NOT_FOUND';
    if (status === 409) return 'CONFLICT';
    if (status === 429) return 'RATE_LIMITED';
    return 'INTERNAL_ERROR';
  }
}
