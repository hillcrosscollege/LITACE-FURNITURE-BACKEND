import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AdminJwtPayload {
  sub: string;
  email: string;
  role: string;
  status: string;
  permissions: string[]; // permission keys e.g. ['products.view', 'orders.manage']
}

/**
 * Extracts the authenticated admin from the request.
 * Usage: @CurrentAdmin() admin: AdminJwtPayload
 *        @CurrentAdmin('email') email: string
 */
export const CurrentAdmin = createParamDecorator(
  (data: keyof AdminJwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const admin = request.user as AdminJwtPayload;
    return data ? admin?.[data] : admin;
  },
);
