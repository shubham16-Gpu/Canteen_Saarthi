import { redirect } from "next/navigation";

/**
 * Admin and SuperAdmin share the same UI shell.
 * RBAC matrix filters which pages each role sees in the sidebar.
 * Hard redirect any /admin visit to /superadmin.
 */
export default function AdminLandingPage() {
  redirect("/superadmin");
}
