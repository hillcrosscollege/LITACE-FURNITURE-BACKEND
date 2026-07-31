export enum AdminStatus {
  PENDING = 'pending', // self-registered, awaiting superadmin approval
  ACTIVE = 'active', // approved, can login
  INACTIVE = 'inactive', // deactivated by superadmin
}

export enum AdminRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
}
