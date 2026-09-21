import { PharAdjustmentsTable } from "@/components/phar-adjustments/phar-adjustments-table";
import { getAppTimezone, getAppSettings } from "@/lib/settings";
import { requirePageRead } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { locations } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const metadata = {
  title: "Phar Adjustments",
  description: "Stock adjustments at the pharmacy location only",
};

const PHARMACY_LOCATION_NAME = "pharmacy";

export default async function PharAdjustmentsPage() {
  await requirePageRead("/phar-adjustments");
  const timezone = await getAppTimezone();
  const appSettings = await getAppSettings();

  const [phar] = await db
    .select({ id: locations.id, name: locations.name })
    .from(locations)
    .where(
      and(
        eq(locations.status, "Active"),
        sql`lower(${locations.name}) = ${PHARMACY_LOCATION_NAME}`
      )
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Phar Adjustments</h1>
          <p className="text-sm text-muted-foreground">
            Stock adjustments at the <strong>pharmacy</strong> location only.
          </p>
        </div>
      </div>

      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">
            Phar Adjustments Management
          </h2>
        </div>
        <div className="p-4">
          <PharAdjustmentsTable
            timezone={timezone}
            appSettings={{
              appName: appSettings.appName,
              appLogo: appSettings.appLogo,
              address: appSettings.address,
              phone: appSettings.phone,
            }}
            pharmacyLocation={phar ? { id: phar.id, name: phar.name } : null}
          />
        </div>
      </div>
    </div>
  );
}
