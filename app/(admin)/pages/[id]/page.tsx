import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import { eq, ne, and } from "drizzle-orm";
import { getAppTimezone } from "@/lib/settings";
import { formatDateTimeLong } from "@/lib/datetime";
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
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, parseInt(id)), ne(pages.status, "Deleted")));
  return { title: page ? `Page: ${page.page}` : "Page Not Found" };
}

export default async function PageDetailPage({ params }: Props) {
  await requirePageRead("/pages");
  const { id } = await params;
  const pageId = parseInt(id);

  if (isNaN(pageId)) notFound();

  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, pageId), ne(pages.status, "Deleted")));

  if (!page) notFound();

  const tz = await getAppTimezone();

  // Fetch parent page name if parentId exists
  let parentName = "-";
  if (page.parentId) {
    const [parent] = await db
      .select()
      .from(pages)
      .where(eq(pages.id, page.parentId));
    if (parent) parentName = parent.page;
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Page Details</h1>
          <p className="text-sm text-muted-foreground">
            View page information and details.
          </p>
        </div>
        <Link href="/pages">
          <Button variant="outline" size="sm" className="border-[#ccc]">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Pages
          </Button>
        </Link>
      </div>

      {/* Detail Card */}
      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">
            Page Information
          </h2>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">ID</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{page.id}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Page Name</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">{page.page}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Path</dt>
              <dd className="mt-1 font-mono text-sm text-foreground">{page.path}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Icon</dt>
              <dd className="mt-1 text-sm text-foreground">{page.icon || "-"}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Order</dt>
              <dd className="mt-1 text-sm text-foreground">{page.order ?? "-"}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Parent Page</dt>
              <dd className="mt-1 text-sm text-foreground">{parentName}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Status</dt>
              <dd className="mt-1">
                <span
                  className={`inline-block px-2 py-0.5 text-xs font-medium ${
                    page.status === "Active"
                      ? "bg-[#5cb85c] text-white"
                      : "bg-[#999] text-white"
                  }`}
                >
                  {page.status}
                </span>
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Created At</dt>
              <dd className="mt-1 text-sm text-foreground">
                {formatDateTimeLong(page.createdAt, tz)}
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Updated At</dt>
              <dd className="mt-1 text-sm text-foreground">
                {page.updatedAt
                  ? formatDateTimeLong(page.updatedAt, tz)
                  : "-"}
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4 sm:col-span-2">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Deleted At</dt>
              <dd className="mt-1 text-sm text-foreground">
                {page.deletedAt
                  ? formatDateTimeLong(page.deletedAt, tz)
                  : "-"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
