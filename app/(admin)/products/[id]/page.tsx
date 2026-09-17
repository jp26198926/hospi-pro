import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { products, categories, users } from "@/lib/db/schema";
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
  const [product] = await db
    .select({ code: products.code, name: products.name })
    .from(products)
    .where(and(eq(products.id, parseInt(id)), ne(products.status, "Deleted")));
  return { title: product ? `Product: ${product.code}` : "Product Not Found" };
}

export default async function ProductDetailPage({ params }: Props) {
  await requirePageRead("/products");
  const { id } = await params;
  const productId = parseInt(id);

  if (isNaN(productId)) notFound();

  const [product] = await db
    .select({
      id: products.id,
      code: products.code,
      name: products.name,
      categoryId: products.categoryId,
      categoryName: categories.name,
      brand: products.brand,
      model: products.model,
      minStock: products.minStock,
      stock: products.stock,
      lastCost: products.lastCost,
      avgCost: products.avgCost,
      status: products.status,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      deletedAt: products.deletedAt,
      deletedReason: products.deletedReason,
      createdByName: users.firstname,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(users, eq(products.createdBy, users.id))
    .where(and(eq(products.id, productId), ne(products.status, "Deleted")));

  if (!product) notFound();

  const tz = await getAppTimezone();

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Product Details</h1>
          <p className="text-sm text-muted-foreground">
            View product information and details.
          </p>
        </div>
        <Link href="/products">
          <Button variant="outline" size="sm" className="border-[#ccc]">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Button>
        </Link>
      </div>

      {/* Detail Card */}
      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">
            Product Information
          </h2>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Code</dt>
              <dd className="mt-1 font-mono text-sm font-semibold text-[#337ab7]">{product.code}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Name</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">{product.name}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Category</dt>
              <dd className="mt-1 text-sm text-foreground">{product.categoryName || "-"}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Brand</dt>
              <dd className="mt-1 text-sm text-foreground">{product.brand || "-"}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Model</dt>
              <dd className="mt-1 text-sm text-foreground">{product.model || "-"}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Status</dt>
              <dd className="mt-1">
                <span
                  className={`inline-block px-2 py-0.5 text-xs font-medium ${
                    product.status === "Active"
                      ? "bg-[#5cb85c] text-white"
                      : "bg-[#999] text-white"
                  }`}
                >
                  {product.status}
                </span>
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Min Stock</dt>
              <dd className="mt-1 text-sm text-foreground">{Number(product.minStock).toFixed(4)}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Stock</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">{Number(product.stock).toFixed(4)}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Last Cost</dt>
              <dd className="mt-1 text-sm text-foreground">{Number(product.lastCost).toFixed(4)}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Avg Cost</dt>
              <dd className="mt-1 text-sm text-foreground">{Number(product.avgCost).toFixed(4)}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Created At</dt>
              <dd className="mt-1 text-sm text-foreground">
                {formatDateTimeLong(product.createdAt, tz)}
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Created By</dt>
              <dd className="mt-1 text-sm text-foreground">{product.createdByName || "-"}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Updated At</dt>
              <dd className="mt-1 text-sm text-foreground">
                {product.updatedAt
                  ? formatDateTimeLong(product.updatedAt, tz)
                  : "-"}
              </dd>
            </div>
            {product.deletedAt && (
              <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
                <dt className="text-xs font-semibold uppercase text-muted-foreground">Deleted At</dt>
                <dd className="mt-1 text-sm text-foreground">
                  {formatDateTimeLong(product.deletedAt, tz)}
                </dd>
              </div>
            )}
            {product.deletedReason && (
              <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4 sm:col-span-2">
                <dt className="text-xs font-semibold uppercase text-muted-foreground">Deleted Reason</dt>
                <dd className="mt-1 text-sm text-foreground">{product.deletedReason}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
