import { PaymentMethodsTable } from "@/components/payment-methods/payment-methods-table";
import { getAppTimezone } from "@/lib/settings";
import { requirePageRead } from "@/lib/api-auth";

export const metadata = {
  title: "Payment Methods",
  description: "Manage payment methods",
};

export default async function PaymentMethodsPage() {
  await requirePageRead("/payment-methods");
  const timezone = await getAppTimezone();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Payment Methods</h1>
          <p className="text-sm text-muted-foreground">Manage payment methods.</p>
        </div>
      </div>

      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">
            Payment Methods Management
          </h2>
        </div>
        <div className="p-4">
          <PaymentMethodsTable timezone={timezone} />
        </div>
      </div>
    </div>
  );
}
