import { SetMetadata } from '@nestjs/common';
const PERMISSIONS_KEY = 'permissions';

/**
 * Restricts a route to admins who have specific permissions.
 * Usage: @RequirePermissions('products.create', 'products.update')
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
