export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  VENDOR = "VENDOR",
  KITCHEN_STAFF = "KITCHEN_STAFF",
  CASHIER = "CASHIER",
  CUSTOMER = "CUSTOMER",
}

export enum Permission {
  // User management
  USER_CREATE = "user:create",
  USER_READ = "user:read",
  USER_UPDATE = "user:update",
  USER_DELETE = "user:delete",

  // Organization
  ORG_CREATE = "org:create",
  ORG_READ = "org:read",
  ORG_UPDATE = "org:update",
  ORG_DELETE = "org:delete",

  // Menu management
  MENU_CREATE = "menu:create",
  MENU_READ = "menu:read",
  MENU_UPDATE = "menu:update",
  MENU_DELETE = "menu:delete",

  // Order management
  ORDER_CREATE = "order:create",
  ORDER_READ = "order:read",
  ORDER_READ_ALL = "order:read_all",
  ORDER_UPDATE = "order:update",
  ORDER_CANCEL = "order:cancel",

  // Inventory
  INVENTORY_READ = "inventory:read",
  INVENTORY_UPDATE = "inventory:update",

  // Payment
  PAYMENT_READ = "payment:read",
  PAYMENT_PROCESS = "payment:process",
  PAYMENT_REFUND = "payment:refund",

  // Reports
  REPORT_VIEW = "report:view",
  REPORT_EXPORT = "report:export",

  // Settings
  SETTINGS_READ = "settings:read",
  SETTINGS_UPDATE = "settings:update",

  // Audit
  AUDIT_READ = "audit:read",
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission),

  [Role.ADMIN]: [
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.ORG_READ,
    Permission.ORG_UPDATE,
    Permission.MENU_CREATE,
    Permission.MENU_READ,
    Permission.MENU_UPDATE,
    Permission.MENU_DELETE,
    Permission.ORDER_READ_ALL,
    Permission.ORDER_UPDATE,
    Permission.ORDER_CANCEL,
    Permission.INVENTORY_READ,
    Permission.INVENTORY_UPDATE,
    Permission.PAYMENT_READ,
    Permission.PAYMENT_PROCESS,
    Permission.PAYMENT_REFUND,
    Permission.REPORT_VIEW,
    Permission.REPORT_EXPORT,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_UPDATE,
    Permission.AUDIT_READ,
  ],

  [Role.VENDOR]: [
    Permission.MENU_CREATE,
    Permission.MENU_READ,
    Permission.MENU_UPDATE,
    Permission.MENU_DELETE,
    Permission.ORDER_READ_ALL,
    Permission.ORDER_UPDATE,
    Permission.INVENTORY_READ,
    Permission.INVENTORY_UPDATE,
    Permission.REPORT_VIEW,
  ],

  [Role.KITCHEN_STAFF]: [
    Permission.MENU_READ,
    Permission.ORDER_READ_ALL,
    Permission.ORDER_UPDATE,
    Permission.INVENTORY_READ,
    Permission.INVENTORY_UPDATE,
  ],

  [Role.CASHIER]: [
    Permission.MENU_READ,
    Permission.ORDER_CREATE,
    Permission.ORDER_READ_ALL,
    Permission.ORDER_UPDATE,
    Permission.PAYMENT_READ,
    Permission.PAYMENT_PROCESS,
  ],

  [Role.CUSTOMER]: [
    Permission.MENU_READ,
    Permission.ORDER_CREATE,
    Permission.ORDER_READ,
    Permission.ORDER_CANCEL,
    Permission.PAYMENT_READ,
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}
