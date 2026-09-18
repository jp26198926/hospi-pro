import { PaymentTermsTable } from "@/components/payment-terms/payment-terms-table";
import { getAppTimezone } from "@/lib/settings";
import { requirePageRead } from "@/lib/api-auth";

export const metadata = {
  title: "Payment Terms",
  description: "Manage payment terms",
};

export default async function PaymentTermsPage() {
  await requirePageRead("/payment-terms");
  const timezone = await getAppTimezone();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Payment Terms</h1>
          <p className="text-sm text-muted-foreground">Manage payment terms.</p>
        </div>
      </div>

      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">
            Payment Terms Management
          </h2>
        </div>
        <div className="p-4">
          <PaymentTermsTable timezone={timezone} />
        </div>
      </div>
    </div>
  );
}
