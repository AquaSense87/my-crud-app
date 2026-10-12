import { NextResponse } from "next/server";

// Cache 15 minutes — GDELT updates every ~15 min
export const revalidate = 900;

// Queries keyed to node IDs in the supply chain map
const QUERIES: Record<string, string> = {
  hormuz: '"strait of hormuz" OR "hormuz" shipping disruption OR tension OR tanker',
  suez:   '"suez canal" disruption OR reroute OR attack OR houthi OR closure',
  malacca:'"strait of malacca" OR "malacca strait" shipping disruption OR piracy',
  tsmc:   'TSMC Taiwan semiconductor disruption OR conflict OR attack OR sanctions',
  asml:   'ASML semiconductor export control OR sanctions OR disruption',
  rotterdam: 'Rotterdam port disruption OR strike OR congestion OR closure',
  shanghai:  '"port of shanghai" OR Shanghai port disruption OR congestion OR closure',
};

interface GdeltArticle {
  title: string;
  url: string;
  domain: string;
  date: string;
}

async function queryGDELT(nodeId: string, query: string): Promise<{
  nodeId: string;
  articles: GdeltArticle[];
  error?: string;
}> {
  const params = new URLSearchParams({
    query,
    mode: "artlist",
    maxrecords: "4",
    timespan: "48h",
    format: "json",
  });

  const url = `https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 900 },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return { nodeId, articles: [], error: `HTTP ${res.status}` };
    }

    const text = await res.text();
    // GDELT occasionally returns empty body or HTML error pages
    if (!text.trim().startsWith("{")) {
      return { nodeId, articles: [], error: "non-JSON response" };
    }

    const data = JSON.parse(text);
    const raw: any[] = data.articles ?? [];

    const articles: GdeltArticle[] = raw.map((a) => ({
      title: a.title ?? "(no title)",
      url: a.url ?? "",
      domain: a.domain ?? "",
      date: a.seendate ?? "",
    }));

    return { nodeId, articles };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : String(err);
    return { nodeId, articles: [], error: msg };
  }
}

export async function GET() {
  // Run all queries in parallel; never throw — always return something
  const results = await Promise.all(
    Object.entries(QUERIES).map(([nodeId, query]) => queryGDELT(nodeId, query))
  );

  const signals: Record<string, {
    articleCount: number;
    articles: GdeltArticle[];
    error?: string;
  }> = {};

  for (const r of results) {
    signals[r.nodeId] = {
      articleCount: r.articles.length,
      articles: r.articles,
      ...(r.error ? { error: r.error } : {}),
    };
  }

  return NextResponse.json({
    signals,
    queryWindow: "48h",
    fetchedAt: new Date().toISOString(),
  });
}
