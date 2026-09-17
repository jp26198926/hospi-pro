import { ProductsTable } from "@/components/products/products-table";
import { getAppTimezone } from "@/lib/settings";
import { requirePageRead } from "@/lib/api-auth";

export const metadata = {
  title: "Products",
  description: "Manage system products",
};

export default async function ProductsPage() {
  await requirePageRead("/products");
  const timezone = await getAppTimezone();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage system products and inventory.
          </p>
        </div>
      </div>

      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">
            Products Management
          </h2>
        </div>
        <div className="p-4">
          <ProductsTable timezone={timezone} />
        </div>
      </div>
    </div>
  );
}
