import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { paymentMethods } from "@/lib/db/schema";
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
  const [paymentMethod] = await db
    .select()
    .from(paymentMethods)
    .where(and(eq(paymentMethods.id, parseInt(id)), ne(paymentMethods.status, "Deleted")));
  return {
    title: paymentMethod
      ? `Payment Method: ${paymentMethod.name}`
      : "Payment Method Not Found",
  };
}

export default async function PaymentMethodDetailPage({ params }: Props) {
  await requirePageRead("/payment-methods");
  const { id } = await params;
  const paymentMethodId = parseInt(id);

  if (isNaN(paymentMethodId)) notFound();

  const [paymentMethod] = await db
    .select()
    .from(paymentMethods)
    .where(
      and(eq(paymentMethods.id, paymentMethodId), ne(paymentMethods.status, "Deleted"))
    );

  if (!paymentMethod) notFound();

  const tz = await getAppTimezone();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">
            Payment Method Details
          </h1>
          <p className="text-sm text-muted-foreground">
            View payment method information and details.
          </p>
        </div>
        <Link href="/payment-methods">
          <Button variant="outline" size="sm" className="border-[#ccc]">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Payment Methods
          </Button>
        </Link>
      </div>

      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">
            Payment Method Information
          </h2>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">ID</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {paymentMethod.id}
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Name
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#337ab7]">
                {paymentMethod.name}
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4 sm:col-span-2">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Description
              </dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {paymentMethod.description}
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Status
              </dt>
              <dd className="mt-1">
                <span
                  className={`inline-block px-2 py-0.5 text-xs font-medium ${
                    paymentMethod.status === "Active"
                      ? "bg-[#5cb85c] text-white"
                      : "bg-[#999] text-white"
                  }`}
                >
                  {paymentMethod.status}
                </span>
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Created At
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {formatDateTimeLong(paymentMethod.createdAt, tz)}
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Updated At
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {paymentMethod.updatedAt
                  ? formatDateTimeLong(paymentMethod.updatedAt, tz)
                  : "-"}
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Deleted At
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {paymentMethod.deletedAt
                  ? formatDateTimeLong(paymentMethod.deletedAt, tz)
                  : "-"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
