import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

export const Permissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);

/** Restrict a route/controller to users whose assigned apps include one of these. */
export const RequireApp = (...apps: string[]) => SetMetadata('requiredApps', apps);

export const Public = () => SetMetadata('isPublic', true);

/**
 * Allow a route to be called by a trusted external system presenting a service
 * API key (Admin › API Keys) in `X-Api-Key`, instead of a user JWT.
 *
 * Unlike `@Public()` this is still authenticated — it just accepts a machine
 * credential. A valid user JWT is also accepted, so these routes stay usable
 * from the UI. Role/permission decorators are NOT applied to service callers,
 * so only put this on endpoints an integration partner should reach.
 */
export const ServiceAuth = () => SetMetadata('isServiceAuth', true);
