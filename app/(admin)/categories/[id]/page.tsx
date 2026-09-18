import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
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
  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, parseInt(id)), ne(categories.status, "Deleted")));
  return { title: category ? `Category: ${category.name}` : "Category Not Found" };
}

export default async function CategoryDetailPage({ params }: Props) {
  await requirePageRead("/categories");
  const { id } = await params;
  const categoryId = parseInt(id);

  if (isNaN(categoryId)) notFound();

  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, categoryId), ne(categories.status, "Deleted")));

  if (!category) notFound();

  const tz = await getAppTimezone();

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Category Details</h1>
          <p className="text-sm text-muted-foreground">
            View category information and details.
          </p>
        </div>
        <Link href="/categories">
          <Button variant="outline" size="sm" className="border-[#ccc]">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Categories
          </Button>
        </Link>
      </div>

      {/* Detail Card */}
      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">
            Category Information
          </h2>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">ID</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{category.id}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Name</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">{category.name}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Type</dt>
              <dd className="mt-1">
                <span
                  className={`inline-block px-2 py-0.5 text-xs font-medium ${
                    category.type === "inventoriable"
                      ? "bg-[#337ab7] text-white"
                      : "bg-[#f0ad4e] text-white"
                  }`}
                >
                  {category.type === "inventoriable" ? "Inventoriable" : "Consumable"}
                </span>
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Status</dt>
              <dd className="mt-1">
                <span
                  className={`inline-block px-2 py-0.5 text-xs font-medium ${
                    category.status === "Active"
                      ? "bg-[#5cb85c] text-white"
                      : "bg-[#999] text-white"
                  }`}
                >
                  {category.status}
                </span>
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4 sm:col-span-2">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Description</dt>
              <dd className="mt-1 text-sm text-foreground">{category.description || "-"}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Created At</dt>
              <dd className="mt-1 text-sm text-foreground">
                {formatDateOnly(category.createdAt, tz)}
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Updated At</dt>
              <dd className="mt-1 text-sm text-foreground">
                {category.updatedAt
                  ? formatDateOnly(category.updatedAt, tz)
                  : "-"}
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Deleted At</dt>
              <dd className="mt-1 text-sm text-foreground">
                {category.deletedAt
                  ? formatDateOnly(category.deletedAt, tz)
                  : "-"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
