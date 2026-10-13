import { NextResponse } from "next/server";

// Cache 6 hours — FRED monthly data, EIA weekly data
export const revalidate = 21600;

// ─── Snapshot fallbacks ───────────────────────────────────────
const SNAPSHOTS: Record<string, { value: number | null; unit: string | null; source: string | null; asOf: string | null }> = {
  "ghawar":       { value: 3.8,    unit: "Mbpd",        source: "Saudi Aramco",               asOf: "2025" },
  "ras-tanura":   { value: null,   unit: "Mbpd",        source: "Saudi Aramco",               asOf: null },
  "hormuz":       { value: 21,     unit: "Mbpd transit",source: "EIA World Oil Transit",       asOf: "2025" },
  "malacca":      { value: 90000,  unit: "vessels/yr",  source: "IMO",                        asOf: "2025" },
  "suez":         { value: 22000,  unit: "vessels/yr",  source: "Suez Canal Authority",       asOf: "2025" },
  "singapore":    { value: 1.5,    unit: "Mbpd refining",source: "IEA",                       asOf: "2025" },
  "rotterdam":    { value: 14.8,   unit: "M TEU/yr",    source: "Port of Rotterdam",          asOf: "2025" },
  "shanghai":     { value: 49.5,   unit: "M TEU/yr",    source: "Alphaliner 2025",            asOf: "2025" },
  "shenzhen":     { value: 30.0,   unit: "M TEU/yr",    source: "Alphaliner 2025",            asOf: "2025" },
  "felixstowe":   { value: 4.0,    unit: "M TEU/yr",    source: "Port of Felixstowe",         asOf: "2025" },
  "asml":         { value: 60,     unit: "EUV units/yr",source: "ASML annual report",         asOf: "2025" },
  "tsmc":         { value: 60,     unit: "% adv-node share", source: "TSMC",                  asOf: "2025" },
  "samsung-fab":  { value: null,   unit: null,          source: null as string | null,        asOf: null },
  "kaohsiung":    { value: 10.4,   unit: "M TEU/yr",    source: "Alphaliner",                 asOf: "2025" },
};

type NodeMetric = {
  value: number | null;
  unit: string | null;
  source: string;
  asOf: string | null;
  kind: "live" | "snapshot" | "absent";
};

async function fetchFRED(seriesId: string, apiKey: string) {
  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("limit", "2");
  url.searchParams.set("sort_order", "desc");
  const res = await fetch(url.toString(), { next: { revalidate: 21600 } });
  if (!res.ok) throw new Error(`FRED ${seriesId} HTTP ${res.status}`);
  const json = await res.json();
  const obs: { date: string; value: string }[] = (json.observations ?? []).filter(
    (o: { value: string }) => o.value !== "."
  );
  if (!obs.length) throw new Error(`FRED ${seriesId}: no valid observations`);
  return obs[0];
}

// EIA petroleum/move/chokepoints — Hormuz and Suez transit volumes
async function fetchEIAChokepoint(apiKey: string, chokepoint: string) {
  const url = new URL("https://api.eia.gov/v2/petroleum/move/chokepoints/data/");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("frequency", "annual");
  url.searchParams.append("data[0]", "value");
  url.searchParams.append("facets[chokepoint][]", chokepoint);
  url.searchParams.append("sort[0][column]", "period");
  url.searchParams.append("sort[0][direction]", "desc");
  url.searchParams.set("length", "1");
  const res = await fetch(url.toString(), { next: { revalidate: 21600 } });
  if (!res.ok) throw new Error(`EIA chokepoint ${chokepoint} HTTP ${res.status}`);
  const json = await res.json();
  const rows: { period: string; value: string }[] = json.response?.data ?? [];
  if (!rows.length) throw new Error(`EIA ${chokepoint}: no data`);
  return rows[0];
}

export async function GET() {
  const FRED_KEY = process.env.FRED_API_KEY;
  const EIA_KEY  = process.env.EIA_API_KEY;

  const metrics: Record<string, NodeMetric> = {};
  const errors: Record<string, string> = {};

  // ── Saudi Arabia total crude production (proxy for Ras Tanura throughput) ──
  // SAUNGDPMBD = Saudi Arabia Crude Oil Production, Thousand Barrels/Day
  if (FRED_KEY) {
    try {
      const obs = await fetchFRED("SAUNGDPMBD", FRED_KEY);
      const val = parseFloat(obs.value);
      // FRED reports in thousand barrels/day → convert to Mbpd
      const mbpd = val / 1000;
      metrics["ras-tanura"] = {
        value: parseFloat(mbpd.toFixed(2)),
        unit: "Mbpd (Saudi exports)",
        source: "FRED · SAUNGDPMBD (Saudi Aramco via EIA)",
        asOf: obs.date,
        kind: "live",
      };
      // Ghawar is ~40-45% of Saudi total; show Saudi total as context
      metrics["ghawar"] = {
        value: parseFloat(mbpd.toFixed(2)),
        unit: "Mbpd (Saudi total)",
        source: "FRED · SAUNGDPMBD (Saudi Aramco via EIA)",
        asOf: obs.date,
        kind: "live",
      };
    } catch (err) {
      errors["saudi"] = String(err);
    }
  }

  // ── EIA chokepoint transit volumes ──
  if (EIA_KEY) {
    // Hormuz
    try {
      const row = await fetchEIAChokepoint(EIA_KEY, "SHO");
      metrics["hormuz"] = {
        value: parseFloat(parseFloat(row.value).toFixed(1)),
        unit: "Mbpd transit",
        source: "EIA World Oil Transit Chokepoints",
        asOf: row.period,
        kind: "live",
      };
    } catch (err) {
      errors["hormuz"] = String(err);
    }

    // Suez
    try {
      const row = await fetchEIAChokepoint(EIA_KEY, "SSU");
      metrics["suez"] = {
        value: parseFloat(parseFloat(row.value).toFixed(1)),
        unit: "Mbpd transit",
        source: "EIA World Oil Transit Chokepoints",
        asOf: row.period,
        kind: "live",
      };
    } catch (err) {
      errors["suez"] = String(err);
    }

    // Malacca
    try {
      const row = await fetchEIAChokepoint(EIA_KEY, "SMA");
      metrics["malacca"] = {
        value: parseFloat(parseFloat(row.value).toFixed(1)),
        unit: "Mbpd transit",
        source: "EIA World Oil Transit Chokepoints",
        asOf: row.period,
        kind: "live",
      };
    } catch (err) {
      errors["malacca"] = String(err);
    }
  }

  // Fill any missing with snapshots
  for (const [id, snap] of Object.entries(SNAPSHOTS)) {
    if (!metrics[id]) {
      metrics[id] = {
        value: snap.value,
        unit: snap.unit,
        source: snap.source ?? "",
        asOf: snap.asOf,
        kind: snap.value === null ? "absent" : "snapshot",
      };
    }
  }

  return NextResponse.json({
    metrics,
    errors: Object.keys(errors).length ? errors : undefined,
    keysConfigured: { fred: !!FRED_KEY, eia: !!EIA_KEY },
    fetchedAt: new Date().toISOString(),
  });
}
