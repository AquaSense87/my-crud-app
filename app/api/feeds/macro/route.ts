import { NextResponse } from "next/server";

// Cache 1 hour server-side — commodity/treasury data publishes daily
export const revalidate = 3600;

// ─── Snapshot fallbacks (used when env vars absent or API fails) ──
const SNAPSHOTS: Record<string, { value: string; unit: string | null; source: string; asOf: string }> = {
  brent:  { value: "$73.40", unit: "USD/bbl",  source: "EIA (snapshot)",       asOf: "2025" },
  dxy:    { value: "104.2",  unit: "index",     source: "FRED DTWEXBGS (snapshot)", asOf: "2025" },
  gold:   { value: "$3,180", unit: "USD/oz",    source: "LBMA/FRED (snapshot)", asOf: "2025" },
  ust10y: { value: "4.52%",  unit: null,        source: "FRED DGS10 (snapshot)", asOf: "2025" },
  wci:    { value: "$4,351", unit: "USD/40ft",  source: "Drewry (snapshot)",    asOf: "Oct 2026" },
};

// ─── FRED helper ──────────────────────────────────────────────
async function fetchFRED(seriesId: string, apiKey: string) {
  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("limit", "2");
  url.searchParams.set("sort_order", "desc");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`FRED ${seriesId} HTTP ${res.status}`);
  const json = await res.json();

  // Filter out missing observations (FRED returns "." for non-published days)
  const obs: { date: string; value: string }[] = (json.observations ?? []).filter(
    (o: { value: string }) => o.value !== "."
  );
  if (!obs.length) throw new Error(`FRED ${seriesId}: no valid observations`);
  return { current: obs[0], previous: obs[1] ?? null };
}

function pctChange(curr: number, prev: number | null): string | null {
  if (prev === null) return null;
  const pct = ((curr - prev) / prev) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function bpChange(curr: number, prev: number | null): string | null {
  if (prev === null) return null;
  const bp = Math.round((curr - prev) * 100);
  return `${bp >= 0 ? "+" : ""}${bp}bp`;
}

// ─── EIA Brent crude ─────────────────────────────────────────
async function fetchBrent(apiKey: string) {
  const url = new URL("https://api.eia.gov/v2/petroleum/pri/spt/data/");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("frequency", "daily");
  url.searchParams.append("data[0]", "value");
  url.searchParams.append("facets[series][]", "RBRTE");
  url.searchParams.append("sort[0][column]", "period");
  url.searchParams.append("sort[0][direction]", "desc");
  url.searchParams.set("length", "2");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`EIA Brent HTTP ${res.status}`);
  const json = await res.json();
  const rows: { period: string; value: string }[] = json.response?.data ?? [];
  if (!rows.length) throw new Error("EIA Brent: no data");
  return rows;
}

// ─── Route handler ────────────────────────────────────────────
export async function GET() {
  const FRED_KEY = process.env.FRED_API_KEY;
  const EIA_KEY  = process.env.EIA_API_KEY;

  type LiveItem = {
    value: string;
    unit: string | null;
    change: string | null;
    up: boolean;
    source: string;
    asOf: string;
    kind: "live" | "snapshot";
  };

  const items: Record<string, LiveItem> = {};
  const errors: Record<string, string> = {};

  // ── Brent crude (EIA) ──
  if (EIA_KEY) {
    try {
      const rows = await fetchBrent(EIA_KEY);
      const curr = parseFloat(rows[0].value);
      const prev = rows[1] ? parseFloat(rows[1].value) : null;
      const chg  = pctChange(curr, prev);
      items.brent = {
        value: `$${curr.toFixed(2)}`,
        unit: "USD/bbl",
        change: chg,
        up: chg ? parseFloat(chg) > 0 : false,
        source: "EIA",
        asOf: rows[0].period,
        kind: "live",
      };
    } catch (err) {
      errors.brent = String(err);
    }
  }

  // ── FRED series (DGS10, DTWEXBGS, gold) ──
  if (FRED_KEY) {
    // UST 10Y
    try {
      const { current, previous } = await fetchFRED("DGS10", FRED_KEY);
      const curr = parseFloat(current.value);
      const prev = previous ? parseFloat(previous.value) : null;
      const chg  = bpChange(curr, prev);
      items.ust10y = {
        value: `${curr.toFixed(2)}%`,
        unit: null,
        change: chg,
        up: chg ? parseFloat(chg) > 0 : false,
        source: "FRED · DGS10",
        asOf: current.date,
        kind: "live",
      };
    } catch (err) {
      errors.ust10y = String(err);
    }

    // DXY proxy — Nominal Broad USD Index
    try {
      const { current, previous } = await fetchFRED("DTWEXBGS", FRED_KEY);
      const curr = parseFloat(current.value);
      const prev = previous ? parseFloat(previous.value) : null;
      const chg  = pctChange(curr, prev);
      items.dxy = {
        value: curr.toFixed(1),
        unit: "USD index",
        change: chg,
        up: chg ? parseFloat(chg) > 0 : false,
        source: "FRED · DTWEXBGS",
        asOf: current.date,
        kind: "live",
      };
    } catch (err) {
      errors.dxy = String(err);
    }

    // Gold — LBMA AM fix
    try {
      const { current, previous } = await fetchFRED("GOLDAMGBD228NLBM", FRED_KEY);
      const curr = parseFloat(current.value);
      const prev = previous ? parseFloat(previous.value) : null;
      const chg  = pctChange(curr, prev);
      items.gold = {
        value: `$${Math.round(curr).toLocaleString()}`,
        unit: "USD/oz",
        change: chg,
        up: chg ? parseFloat(chg) > 0 : false,
        source: "LBMA via FRED",
        asOf: current.date,
        kind: "live",
      };
    } catch (err) {
      errors.gold = String(err);
    }
  }

  // ── WCI — no free API; keep snapshot ──
  // Drewry publishes weekly on Thursday at drewry.co.uk (paywalled API)

  // Fill any missing items with snapshots
  for (const [id, snap] of Object.entries(SNAPSHOTS)) {
    if (!items[id]) {
      items[id] = {
        value: snap.value,
        unit: snap.unit,
        change: null,
        up: false,
        source: snap.source,
        asOf: snap.asOf,
        kind: "snapshot",
      };
    }
  }

  return NextResponse.json({
    items,
    errors: Object.keys(errors).length ? errors : undefined,
    keysConfigured: { fred: !!FRED_KEY, eia: !!EIA_KEY },
    fetchedAt: new Date().toISOString(),
  });
}
