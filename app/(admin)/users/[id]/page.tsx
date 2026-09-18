import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { users, departments, roles } from "@/lib/db/schema";
import { eq, ne, and } from "drizzle-orm";
import { getAppTimezone } from "@/lib/settings";
import { formatDateOnly } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { requirePageRead } from "@/lib/api-auth";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(and(eq(users.id, parseInt(id)), ne(users.status, "Deleted")));
  return { title: user ? `User: ${user.email}` : "User Not Found" };
}

export default async function UserDetailPage({ params }: Props) {
  await requirePageRead("/users");
  const { id } = await params;
  const userId = parseInt(id);

  if (isNaN(userId)) notFound();

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      firstname: users.firstname,
      lastname: users.lastname,
      departmentId: users.departmentId,
      departmentName: departments.department,
      roleId: users.roleId,
      roleName: roles.role,
      status: users.status,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(and(eq(users.id, userId), ne(users.status, "Deleted")));

  if (!user) notFound();

  const tz = await getAppTimezone();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">User Details</h1>
          <p className="text-sm text-muted-foreground">View user information and details.</p>
        </div>
        <Link href="/users">
          <Button variant="outline" size="sm" className="border-[#ccc]">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
          </Button>
        </Link>
      </div>

      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">User Information</h2>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">ID</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{user.id}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Email</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">{user.email}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">First Name</dt>
              <dd className="mt-1 text-sm text-foreground">{user.firstname}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Last Name</dt>
              <dd className="mt-1 text-sm text-foreground">{user.lastname}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Department</dt>
              <dd className="mt-1 text-sm text-foreground">{user.departmentName || "-"}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Role</dt>
              <dd className="mt-1 text-sm text-foreground">{user.roleName || "-"}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Status</dt>
              <dd className="mt-1">
                <span className={`inline-block px-2 py-0.5 text-xs font-medium ${user.status === "Active" ? "bg-[#5cb85c] text-white" : "bg-[#999] text-white"}`}>
                  {user.status}
                </span>
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Created At</dt>
              <dd className="mt-1 text-sm text-foreground">{formatDateOnly(user.createdAt, tz)}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Updated At</dt>
              <dd className="mt-1 text-sm text-foreground">{user.updatedAt ? formatDateOnly(user.updatedAt, tz) : "-"}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Deleted At</dt>
              <dd className="mt-1 text-sm text-foreground">{user.deletedAt ? formatDateOnly(user.deletedAt, tz) : "-"}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
