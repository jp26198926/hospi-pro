import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

function getUtcOffset(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === "timeZoneName");
    return offsetPart ? offsetPart.value : "";
  } catch {
    return "";
  }
}

function getAbbreviation(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    });
    const parts = formatter.formatToParts(now);
    const abbrevPart = parts.find((p) => p.type === "timeZoneName");
    return abbrevPart ? abbrevPart.value : "";
  } catch {
    return "";
  }
}

async function seed() {
  console.log("Seeding timezones...");

  const timezones = Intl.supportedValuesOf("timeZone");
  console.log(`Found ${timezones.length} timezones`);

  // Clear existing data
  await sql`DELETE FROM timezones`;
  console.log("Cleared existing timezones");

  // Insert in batches
  const batchSize = 50;
  for (let i = 0; i < timezones.length; i += batchSize) {
    const batch = timezones.slice(i, i + batchSize);

    for (const tz of batch) {
      const utcOffset = getUtcOffset(tz);
      const abbreviation = getAbbreviation(tz);
      await sql`INSERT INTO timezones (timezone, utc_offset, abbreviation) VALUES (${tz}, ${utcOffset}, ${abbreviation}) ON CONFLICT (timezone) DO NOTHING`;
    }

    console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(timezones.length / batchSize)}`);
  }

  const count = await sql`SELECT COUNT(*) as count FROM timezones`;
  console.log(`Successfully seeded ${count[0].count} timezones`);
  await sql.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
