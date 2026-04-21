export const ADMIN_PERMISSION_VALUES = [
  "orders",
  "admins",
  "about",
  "books",
  "ebooks",
  "handmade",
  "events",
  "services",
  "contact",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSION_VALUES)[number];
export type AdminRole = "superadmin" | AdminPermission[];

type PermissionCarrier = {
  role?: unknown;
  permissions?: unknown;
};

export const ADMIN_PERMISSION_LABELS: Record<AdminPermission, string> = {
  orders: "Rendelések",
  admins: "Adminok",
  about: "Kiadóról",
  books: "Könyvek",
  ebooks: "E-könyvek",
  handmade: "Handmade",
  events: "Rendezvények",
  services: "Szolgáltatások",
  contact: "Kapcsolat",
};

export const ADMIN_PERMISSION_OPTIONS = ADMIN_PERMISSION_VALUES.map((value) => ({
  value,
  label: ADMIN_PERMISSION_LABELS[value],
}));

export const ADMIN_NAVIGATION_LINKS: Array<{
  href: string;
  label: string;
  permission?: AdminPermission;
}> = [
  { href: "/admin/orders", label: "Rendelések", permission: "orders" },
  { href: "/admin/profile", label: "Saját adatok" },
  { href: "/admin/admins", label: "Adminok", permission: "admins" },
  { href: "/admin/about", label: "Kiadóról", permission: "about" },
  { href: "/admin/books", label: "Könyvek", permission: "books" },
  { href: "/admin/ebooks", label: "E-könyvek", permission: "ebooks" },
  { href: "/admin/handmade", label: "Handmade", permission: "handmade" },
  { href: "/admin/rendezvenyek", label: "Rendezvények", permission: "events" },
  { href: "/admin/services", label: "Szolgáltatások", permission: "services" },
  { href: "/admin/contact", label: "Kapcsolat", permission: "contact" },
];

export function normalizeAdminPermissions(value: unknown): AdminPermission[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const uniquePermissions = new Set<AdminPermission>();

  for (const item of value) {
    if (
      typeof item === "string" &&
      (ADMIN_PERMISSION_VALUES as readonly string[]).includes(item)
    ) {
      uniquePermissions.add(item as AdminPermission);
    }
  }

  return Array.from(uniquePermissions);
}

export function isSuperadminRole(value: unknown): value is "superadmin" {
  return value === "superadmin";
}

function isLegacyEditorRole(value: unknown): value is "editor" {
  return value === "editor";
}

export function isAdminRoleValue(value: unknown) {
  return (
    isSuperadminRole(value) ||
    isLegacyEditorRole(value) ||
    Array.isArray(value)
  );
}

export function normalizeAdminRole(
  value: unknown,
  legacyPermissions?: unknown,
): AdminRole {
  if (isSuperadminRole(value)) {
    return "superadmin";
  }

  if (Array.isArray(value)) {
    return normalizeAdminPermissions(value);
  }

  if (isLegacyEditorRole(value)) {
    return normalizeAdminPermissions(legacyPermissions);
  }

  return normalizeAdminPermissions(legacyPermissions);
}

export function getAdminPermissions(actor: PermissionCarrier | null | undefined) {
  const normalizedRole = normalizeAdminRole(actor?.role, actor?.permissions);

  return normalizedRole === "superadmin"
    ? [...ADMIN_PERMISSION_VALUES]
    : normalizedRole;
}

export function hasAdminPermission(
  actor: PermissionCarrier | null | undefined,
  permission: AdminPermission,
) {
  if (isSuperadminRole(normalizeAdminRole(actor?.role, actor?.permissions))) {
    return true;
  }

  const permissions = getAdminPermissions(actor);

  return permissions.includes(permission);
}

export function getAdminPermissionForPath(pathname: string): AdminPermission | null {
  if (
    pathname === "/admin" ||
    pathname === "/admin/profile" ||
    pathname === "/admin/login" ||
    pathname === "/admin/register"
  ) {
    return null;
  }

  if (pathname === "/admin/admins") {
    return "admins";
  }

  if (pathname === "/admin/orders") {
    return "orders";
  }

  if (pathname === "/admin/about") {
    return "about";
  }

  if (pathname === "/admin/books" || pathname.startsWith("/admin/books/")) {
    return "books";
  }

  if (pathname === "/admin/ebooks") {
    return "ebooks";
  }

  if (pathname === "/admin/handmade") {
    return "handmade";
  }

  if (pathname === "/admin/rendezvenyek") {
    return "events";
  }

  if (pathname === "/admin/services") {
    return "services";
  }

  if (pathname === "/admin/contact") {
    return "contact";
  }

  return null;
}

export function getAccessibleAdminLinks(actor: PermissionCarrier | null | undefined) {
  return ADMIN_NAVIGATION_LINKS.filter(
    (link) => !link.permission || hasAdminPermission(actor, link.permission),
  );
}

export function getDefaultAdminPath(actor: PermissionCarrier | null | undefined) {
  const [firstLink] = getAccessibleAdminLinks(actor);
  return firstLink?.href ?? "/admin/profile";
}
