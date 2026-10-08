import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";

/**
 * Decode the role out of an HS256 JWT (no signature verify — that runs server-side
 * via the API on every request). Used purely to pick the correct landing page.
 */
function decodeRole(token: string | undefined): string | undefined {
  if (!token) return undefined;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return undefined;
    const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8"));
    return typeof payload?.role === "string" ? payload.role : undefined;
  } catch {
    return undefined;
  }
}

function landingFor(role: string | undefined): string {
  if (!role) return "/login";
  const r = role.toUpperCase();
  if (r === "SUPER_ADMIN") return "/superadmin";
  if (r === "ADMIN") return "/superadmin"; // shares UI; RBAC filters pages
  if (r === "VENDOR") return "/vendor/declare";
  if (r === "CUSTOMER") return "/employee/coupon";
  return "/superadmin";
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const hdrs = await headers();
  const host = hdrs.get("host") || "";
  const port = host.split(":")[1] || "";
  const token =
    (port ? cookieStore.get(`auth_token_${port}`)?.value : undefined) ||
    cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/login");
  }

  redirect(landingFor(decodeRole(token)));
}
