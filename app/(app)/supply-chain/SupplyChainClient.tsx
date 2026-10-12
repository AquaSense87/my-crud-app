"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────
type Kind = "live" | "snapshot" | "absent";
type NodeStatus = "normal" | "constrained" | "disrupted" | "unknown";
type NodeType = "extraction" | "processing" | "manufacture" | "port" | "chokepoint" | "hub" | "market";
type EdgeMode = "sea" | "air" | "road" | "pipeline";

interface Metric {
  value: number | null;
  unit: string | null;
  source: string | null;
  asOf: string | null;
  kind: Kind;
}

interface SCNode {
  id: string;
  name: string;
  type: NodeType;
  lat: number;
  lon: number;
  chains: string[];
  status: NodeStatus;
  capacity: Metric;
  explainer: string;
}

interface SCEdge {
  id: string;
  from: string;
  to: string;
  commodity: string;
  mode: EdgeMode;
  baselineDays: number;
  chain: string;
  via?: string[];
}

interface MacroTick {
  id: string;
  label: string;
  value: string;
  change: string;
  up: boolean;
  source: string;
  asOf: string;
  kind?: "live" | "snapshot";
}

interface GdeltArticle {
  title: string;
  url: string;
  domain: string;
  date: string;
}

interface GdeltSignals {
  [nodeId: string]: {
    articleCount: number;
    articles: GdeltArticle[];
    error?: string;
  };
}

// ─── Seed data ────────────────────────────────────────────────
const CHAINS = [
  { id: "crude-oil",      label: "Crude Oil",                color: "#f59e0b" },
  { id: "containers",     label: "Asia–Europe Containers",   color: "#60a5fa" },
  { id: "semiconductors", label: "Semiconductors",           color: "#a78bfa" },
];

const NODES: SCNode[] = [
  // ── Crude oil ──
  {
    id: "ghawar", name: "Ghawar Field", type: "extraction",
    lat: 25.5, lon: 49.0, chains: ["crude-oil"], status: "normal",
    capacity: { value: 3.8, unit: "Mbpd", source: "Saudi Aramco", asOf: "2025", kind: "snapshot" },
    explainer: "World's largest conventional oilfield (~3.8 Mbpd). Supplies the bulk of Saudi Aramco's export volume via the Ras Tanura terminal on the Gulf coast.",
  },
  {
    id: "ras-tanura", name: "Ras Tanura Terminal", type: "port",
    lat: 26.68, lon: 50.16, chains: ["crude-oil"], status: "normal",
    capacity: { value: null, unit: "Mbpd", source: null, asOf: null, kind: "absent" },
    explainer: "Saudi Aramco's primary crude export terminal. Most Saudi outflows load here before transiting the Strait of Hormuz into the Indian Ocean.",
  },
  {
    id: "hormuz", name: "Strait of Hormuz", type: "chokepoint",
    lat: 26.6, lon: 56.4, chains: ["crude-oil"], status: "constrained",
    capacity: { value: 21, unit: "Mbpd", source: "EIA", asOf: "2025", kind: "snapshot" },
    explainer: "~21% of global petroleum liquids transit this 33 km-wide strait daily. Shared between Iran and Oman. Effective closure has no viable short-term alternative. Connects the Arabian Gulf to the Indian Ocean.",
  },
  {
    id: "singapore", name: "Singapore Refinery Hub", type: "processing",
    lat: 1.26, lon: 103.82, chains: ["crude-oil", "containers", "semiconductors"], status: "normal",
    capacity: { value: 1.5, unit: "Mbpd refining cap.", source: "IEA", asOf: "2025", kind: "snapshot" },
    explainer: "Asia's largest refining and trading hub. Processes Middle East crude for Asia-Pacific distribution. Also the critical intermediate node for Asia–Europe container routes and semiconductor freight.",
  },
  {
    id: "rotterdam", name: "Port of Rotterdam", type: "hub",
    lat: 51.95, lon: 4.1, chains: ["crude-oil", "containers"], status: "normal",
    capacity: { value: 14.8, unit: "M TEU/yr", source: "Port of Rotterdam", asOf: "2025", kind: "snapshot" },
    explainer: "Europe's largest port. Primary crude entry and refining hub for Europe, and the main container gateway connecting Asia–Europe lanes to European inland distribution.",
  },

  // ── Containers ──
  {
    id: "shanghai", name: "Port of Shanghai", type: "port",
    lat: 31.22, lon: 121.5, chains: ["containers"], status: "normal",
    capacity: { value: 49.5, unit: "M TEU/yr", source: "Alphaliner 2025", asOf: "2025", kind: "snapshot" },
    explainer: "World's busiest container port by volume. Primary export gateway for Chinese manufactured goods to Europe and the Americas. Home lanes dominated by COSCO, MSC, Maersk.",
  },
  {
    id: "shenzhen", name: "Yantian / Shenzhen", type: "port",
    lat: 22.55, lon: 114.26, chains: ["containers", "semiconductors"], status: "normal",
    capacity: { value: 30.0, unit: "M TEU/yr", source: "Alphaliner 2025", asOf: "2025", kind: "snapshot" },
    explainer: "China's southern export gateway. Key for electronics, consumer goods, and semiconductor components moving to Europe and the Americas. CMA CGM and Evergreen maintain strong calls here.",
  },
  {
    id: "malacca", name: "Strait of Malacca", type: "chokepoint",
    lat: 2.5, lon: 101.5, chains: ["crude-oil", "containers", "semiconductors"], status: "normal",
    capacity: { value: 90000, unit: "vessels/yr", source: "IMO", asOf: "2025", kind: "snapshot" },
    explainer: "World's busiest shipping chokepoint — ~25% of global trade and ~80% of China's crude oil imports. 900 km long, minimum 2.8 km wide. Alternatives (Lombok, Sunda Straits) add 2–3 days.",
  },
  {
    id: "suez", name: "Suez Canal", type: "chokepoint",
    lat: 30.5, lon: 32.35, chains: ["crude-oil", "containers"], status: "constrained",
    capacity: { value: 22000, unit: "vessels/yr", source: "Suez Canal Authority", asOf: "2025", kind: "snapshot" },
    explainer: "~12% of global trade, ~30% of container traffic. Saves ~14 days vs Cape of Good Hope. Houthi attacks from late 2024 rerouted significant container volume around the Cape, elevating WCI and adding ~$1M per voyage in fuel costs.",
  },
  {
    id: "felixstowe", name: "Port of Felixstowe", type: "port",
    lat: 51.96, lon: 1.35, chains: ["containers"], status: "normal",
    capacity: { value: 4.0, unit: "M TEU/yr", source: "Port of Felixstowe", asOf: "2025", kind: "snapshot" },
    explainer: "UK's largest container port. Primary entry point for Asian imports. Feeders connect to Rotterdam and Hamburg. Controlled by CK Hutchison (Hong Kong).",
  },

  // ── Semiconductors ──
  {
    id: "asml", name: "ASML HQ (Veldhoven, NL)", type: "manufacture",
    lat: 51.42, lon: 5.47, chains: ["semiconductors"], status: "normal",
    capacity: { value: 60, unit: "EUV machines/yr", source: "ASML", asOf: "2025", kind: "snapshot" },
    explainer: "Sole global supplier of EUV lithography machines — a prerequisite for all chips below 7nm. A structural single point of failure for the global semiconductor supply chain. Dutch export licences required; shipments to China blocked since 2023.",
  },
  {
    id: "tsmc", name: "TSMC (Hsinchu / Tainan)", type: "manufacture",
    lat: 24.78, lon: 120.98, chains: ["semiconductors"], status: "normal",
    capacity: { value: 60, unit: "% advanced-node share", source: "TSMC", asOf: "2025", kind: "snapshot" },
    explainer: "World's most advanced semiconductor foundry. ~60% share of sub-7nm logic production. Geopolitical concentration risk: 180 km from mainland China. N2 fab in Arizona is ramping. TSMC disruption would cascade through consumer electronics, automotive, AI hardware globally.",
  },
  {
    id: "samsung-fab", name: "Samsung Fab (Hwaseong)", type: "manufacture",
    lat: 37.2, lon: 127.06, chains: ["semiconductors"], status: "normal",
    capacity: { value: null, unit: null, source: null, asOf: null, kind: "absent" },
    explainer: "Samsung's primary advanced logic foundry near Seoul. Second-largest advanced-node foundry globally, competing at 3–5nm. Also produces DRAM and NAND at Pyeongtaek.",
  },
  {
    id: "kaohsiung", name: "Port of Kaohsiung", type: "port",
    lat: 22.62, lon: 120.28, chains: ["semiconductors"], status: "normal",
    capacity: { value: 10.4, unit: "M TEU/yr", source: "Alphaliner", asOf: "2025", kind: "snapshot" },
    explainer: "Taiwan's largest port and primary export gateway for TSMC chip output and electronics. Exposed to the same geopolitical risk as TSMC — a Taiwan Strait contingency would affect both simultaneously.",
  },
];

const EDGES: SCEdge[] = [
  // Crude oil chain
  { id: "e-gh-rt",  from: "ghawar",     to: "ras-tanura", commodity: "Crude Oil",     mode: "pipeline", chain: "crude-oil",      baselineDays: 0.1 },
  { id: "e-rt-hz",  from: "ras-tanura", to: "hormuz",     commodity: "Crude Oil",     mode: "sea",      chain: "crude-oil",      baselineDays: 0.5 },
  { id: "e-hz-sg",  from: "hormuz",     to: "singapore",  commodity: "Crude Oil",     mode: "sea",      chain: "crude-oil",      baselineDays: 12,  via: ["malacca"] },
  { id: "e-hz-rot", from: "hormuz",     to: "rotterdam",  commodity: "Crude Oil",     mode: "sea",      chain: "crude-oil",      baselineDays: 24,  via: ["suez"] },

  // Container chain
  { id: "e-sh-ml",  from: "shanghai",   to: "malacca",    commodity: "Containers",    mode: "sea",      chain: "containers",     baselineDays: 7 },
  { id: "e-sz-ml",  from: "shenzhen",   to: "malacca",    commodity: "Containers",    mode: "sea",      chain: "containers",     baselineDays: 5 },
  { id: "e-ml-sg",  from: "malacca",    to: "singapore",  commodity: "Containers",    mode: "sea",      chain: "containers",     baselineDays: 1 },
  { id: "e-sg-sz",  from: "singapore",  to: "suez",       commodity: "Containers",    mode: "sea",      chain: "containers",     baselineDays: 14 },
  { id: "e-sz-rot", from: "suez",       to: "rotterdam",  commodity: "Containers",    mode: "sea",      chain: "containers",     baselineDays: 7 },
  { id: "e-rot-fx", from: "rotterdam",  to: "felixstowe", commodity: "Containers",    mode: "sea",      chain: "containers",     baselineDays: 1 },

  // Semiconductor chain
  { id: "e-asml-tsmc",  from: "asml",       to: "tsmc",      commodity: "EUV Equipment", mode: "road",     chain: "semiconductors", baselineDays: 1 },
  { id: "e-tsmc-kh",    from: "tsmc",       to: "kaohsiung", commodity: "Chips",         mode: "road",     chain: "semiconductors", baselineDays: 0.3 },
  { id: "e-sam-sz",     from: "samsung-fab",to: "shenzhen",  commodity: "Chips",         mode: "sea",      chain: "semiconductors", baselineDays: 2 },
  { id: "e-kh-sg",      from: "kaohsiung",  to: "singapore", commodity: "Chips",         mode: "sea",      chain: "semiconductors", baselineDays: 5,   via: ["malacca"] },
  { id: "e-sg-rot-semi",from: "singapore",  to: "rotterdam", commodity: "Chips (air)",   mode: "pipeline", chain: "semiconductors", baselineDays: 1 },
];

const MACRO_SEED: MacroTick[] = [
  { id: "brent",  label: "Brent Crude", value: "$73.40",  change: "—",     up: false, source: "EIA",          asOf: "2025", kind: "snapshot" },
  { id: "dxy",    label: "DXY",         value: "104.2",   change: "—",     up: true,  source: "FRED",         asOf: "2025", kind: "snapshot" },
  { id: "gold",   label: "Gold",        value: "$3,180",  change: "—",     up: true,  source: "LBMA/FRED",    asOf: "2025", kind: "snapshot" },
  { id: "ust10y", label: "UST 10Y",     value: "4.52%",   change: "—",     up: false, source: "FRED",         asOf: "2025", kind: "snapshot" },
  { id: "wci",    label: "WCI",         value: "$4,351",  change: "—",     up: false, source: "Drewry",       asOf: "Oct 2026", kind: "snapshot" },
];

// ─── Constants ────────────────────────────────────────────────
const STATUS_COLOR: Record<NodeStatus, string> = {
  normal: "#22c55e",
  constrained: "#f59e0b",
  disrupted: "#ef4444",
  unknown: "#6b7280",
};

const TYPE_SYMBOL: Record<NodeType, string> = {
  extraction: "◆",
  processing: "⬡",
  manufacture: "■",
  port: "⚓",
  chokepoint: "▲",
  hub: "★",
  market: "●",
};

const MODE_LABEL: Record<EdgeMode, string> = {
  sea: "Sea freight",
  air: "Air freight",
  road: "Road / rail",
  pipeline: "Pipeline",
};

function chainColor(chainId: string) {
  return CHAINS.find(c => c.id === chainId)?.color ?? "#888";
}

function nodeById(id: string) {
  return NODES.find(n => n.id === id);
}

// ─── Sub-components ───────────────────────────────────────────
function KindBadge({ kind, asOf }: { kind: Kind; asOf: string | null }) {
  const cfg = {
    live:     { bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.3)",  color: "#4ade80", label: "LIVE" },
    snapshot: { bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)",color: "#f59e0b", label: "SNAPSHOT" },
    absent:   { bg: "rgba(107,114,128,0.1)", border: "rgba(107,114,128,0.2)",color: "#6b7280", label: "NOT CONNECTED" },
  }[kind];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 9, fontWeight: 700, letterSpacing: "0.15em",
      padding: "2px 7px", borderRadius: 4,
      background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
    }}>
      {kind === "live" && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />}
      {cfg.label}{asOf && kind === "snapshot" ? ` · ${asOf}` : ""}
    </span>
  );
}

function StatusDot({ status }: { status: NodeStatus }) {
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: STATUS_COLOR[status], flexShrink: 0,
    }} />
  );
}

function MetricRow({ label, metric }: { label: string; metric: Metric }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "#f59e0b", textTransform: "uppercase", opacity: 0.7, marginBottom: 3 }}>
        {label}
      </div>
      {metric.kind === "absent" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <KindBadge kind="absent" asOf={null} />
          <span style={{ fontSize: 11, opacity: 0.3 }}>no data available</span>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "white" }}>
            {metric.value?.toLocaleString() ?? "—"}
            {metric.unit && <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.5, marginLeft: 4 }}>{metric.unit}</span>}
          </span>
          <KindBadge kind={metric.kind} asOf={metric.asOf} />
        </div>
      )}
      {metric.source && <div style={{ fontSize: 10, opacity: 0.3, marginTop: 2 }}>source: {metric.source}</div>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────
export default function SupplyChainClient() {
  const [activeChains, setActiveChains] = useState<string[]>(["crude-oil", "containers", "semiconductors"]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [macroTicks, setMacroTicks] = useState<MacroTick[]>(MACRO_SEED);
  const [gdeltSignals, setGdeltSignals] = useState<GdeltSignals>({});
  const [feedsConnected, setFeedsConnected] = useState(false);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const polylinesRef = useRef<Record<string, any>>({});

  const selectedNode = selectedId ? nodeById(selectedId) : null;

  // Visible nodes/edges based on active chains
  const visibleNodes = NODES.filter(n => n.chains.some(c => activeChains.includes(c)));
  const visibleEdges = EDGES.filter(e => activeChains.includes(e.chain));

  // Nodes connected to the selected node (upstream + downstream)
  const connectedIds = selectedId
    ? new Set(EDGES.flatMap(e => (e.from === selectedId || e.to === selectedId) ? [e.from, e.to] : []))
    : null;

  const toggleChain = (id: string) => {
    setActiveChains(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  // ── Fetch macro feed ────────────────────────────────────────
  useEffect(() => {
    async function loadMacro() {
      try {
        const res = await fetch("/api/feeds/macro");
        if (!res.ok) return;
        const data = await res.json();
        const items = data.items as Record<string, {
          value: string; unit: string | null; change: string | null;
          up: boolean; source: string; asOf: string; kind: "live" | "snapshot";
        }>;
        const LABEL: Record<string, string> = {
          brent: "Brent Crude", dxy: "DXY", gold: "Gold", ust10y: "UST 10Y", wci: "WCI",
        };
        setMacroTicks(MACRO_SEED.map(seed => {
          const item = items[seed.id];
          if (!item) return seed;
          return {
            id: seed.id,
            label: LABEL[seed.id] ?? seed.label,
            value: item.value,
            change: item.change ?? "—",
            up: item.up,
            source: item.source,
            asOf: item.asOf,
            kind: item.kind,
          };
        }));
        setFeedsConnected(true);
      } catch {}
    }
    loadMacro();
    const id = setInterval(loadMacro, 3600_000);
    return () => clearInterval(id);
  }, []);

  // ── Fetch GDELT feed ─────────────────────────────────────────
  useEffect(() => {
    async function loadGdelt() {
      try {
        const res = await fetch("/api/feeds/gdelt");
        if (!res.ok) return;
        const data = await res.json();
        setGdeltSignals(data.signals ?? {});
        setFeedsConnected(true);
      } catch {}
    }
    loadGdelt();
    const id = setInterval(loadGdelt, 900_000);
    return () => clearInterval(id);
  }, []);

  // ── Init Leaflet ────────────────────────────────────────────
  useEffect(() => {
    if (!mapDivRef.current || leafletRef.current) return;

    // Inject Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    import("leaflet").then((L) => {
      if (!mapDivRef.current || leafletRef.current) return;
      const map = L.map(mapDivRef.current, {
        center: [20, 60],
        zoom: 3,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>',
        maxZoom: 18,
      }).addTo(map);

      leafletRef.current = map;
    });

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
        markersRef.current = {};
        polylinesRef.current = {};
      }
    };
  }, []);

  // ── Draw/update map elements ────────────────────────────────
  const drawMap = useCallback(async () => {  // eslint-disable-line
    const map = leafletRef.current;
    if (!map) return;

    const L = (await import("leaflet")).default ?? (await import("leaflet"));

    // Clear existing
    Object.values(markersRef.current).forEach((m: any) => m.remove());
    Object.values(polylinesRef.current).forEach((p: any) => p.remove());
    markersRef.current = {};
    polylinesRef.current = {};

    // Draw edges first (behind markers)
    visibleEdges.forEach(edge => {
      const fromNode = nodeById(edge.from);
      const toNode = nodeById(edge.to);
      if (!fromNode || !toNode) return;

      const isHighlighted = selectedId
        ? (edge.from === selectedId || edge.to === selectedId)
        : true;

      const color = chainColor(edge.chain);
      const dashArray = edge.mode === "pipeline" ? "4 6"
        : edge.mode === "road" ? "6 4"
        : null;

      const pl = L.polyline(
        [[fromNode.lat, fromNode.lon], [toNode.lat, toNode.lon]],
        {
          color,
          weight: isHighlighted ? 2.5 : 1,
          opacity: isHighlighted ? 0.85 : 0.18,
          dashArray: dashArray ?? undefined,
        }
      ).addTo(map);

      pl.bindTooltip(
        `<div style="font-family:monospace;font-size:11px;color:white;background:#1a1730;border:1px solid rgba(255,255,255,0.12);padding:6px 10px;border-radius:6px">
          <b>${edge.commodity}</b><br/>
          ${fromNode.name} → ${toNode.name}<br/>
          ${MODE_LABEL[edge.mode]} · ~${edge.baselineDays < 1 ? "<1" : edge.baselineDays} day${edge.baselineDays !== 1 ? "s" : ""}
          ${edge.via?.length ? `<br/>via ${edge.via.join(", ")}` : ""}
        </div>`,
        { sticky: true, opacity: 1, className: "sc-tooltip" }
      );

      polylinesRef.current[edge.id] = pl;
    });

    // Draw nodes
    visibleNodes.forEach(node => {
      const isSelected = node.id === selectedId;
      const isConnected = connectedIds?.has(node.id) ?? false;
      const dimmed = selectedId && !isSelected && !isConnected;

      const statusCol = STATUS_COLOR[node.status];
      const size = node.type === "chokepoint" ? 14 : node.type === "hub" ? 13 : 11;

      const gdelt = gdeltSignals[node.id];
      const hasNews = gdelt && gdelt.articleCount > 0;
      const iconSize2 = size + 12;

      const icon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:${iconSize2}px;height:${iconSize2}px;display:flex;align-items:center;justify-content:center;">
          ${hasNews ? `<div style="
            position:absolute;inset:0;border-radius:50%;
            border:1.5px solid rgba(248,113,113,0.7);
            animation:gdelt-ping 1.8s ease-out infinite;
          "></div>` : ""}
          <div style="
            width:${size}px;height:${size}px;
            border-radius:${node.type === "manufacture" ? "2px" : node.type === "chokepoint" ? "0" : "50%"};
            background:${statusCol};
            border:2px solid ${isSelected ? "white" : "rgba(0,0,0,0.4)"};
            box-shadow:${isSelected ? `0 0 0 2px ${statusCol}, 0 0 12px ${statusCol}` : `0 0 6px ${statusCol}88`};
            opacity:${dimmed ? 0.2 : 1};
            transition:all 0.2s;
            clip-path:${node.type === "chokepoint" ? "polygon(50% 0%, 0% 100%, 100% 100%)" : "none"};
          "></div>
        </div>`,
        iconSize: [iconSize2, iconSize2],
        iconAnchor: [iconSize2 / 2, iconSize2 / 2],
      });

      const marker = L.marker([node.lat, node.lon], { icon })
        .addTo(map)
        .on("click", () => setSelectedId(prev => prev === node.id ? null : node.id));

      marker.bindTooltip(
        `<div style="font-family:monospace;font-size:11px;color:white;background:#1a1730;border:1px solid rgba(255,255,255,0.12);padding:6px 10px;border-radius:6px">
          <b>${node.name}</b><br/>
          <span style="color:${statusCol}">${node.status.toUpperCase()}</span>
          · ${node.type}
        </div>`,
        { opacity: 1, className: "sc-tooltip" }
      );

      markersRef.current[node.id] = marker;
    });
  }, [visibleNodes, visibleEdges, selectedId, connectedIds, gdeltSignals]);

  // Re-draw map when data or selection changes
  useEffect(() => {
    if (!leafletRef.current) {
      const interval = setInterval(() => {
        if (leafletRef.current) {
          clearInterval(interval);
          drawMap();
        }
      }, 100);
      return () => clearInterval(interval);
    }
    drawMap();
  }, [drawMap]);

  // ── Styles ──────────────────────────────────────────────────
  const glass = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      fontFamily: "ui-monospace, 'Geist Mono', monospace",
      color: "white",
      overflow: "hidden",
    }}>
      {/* ── Header bar ── */}
      <div style={{
        ...glass,
        flexShrink: 0,
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 9, letterSpacing: "0.3em", color: "#f59e0b", opacity: 0.8 }}>SYS/SC</span>
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.02em" }}>
            SUPPLY<span style={{ color: "#f59e0b" }}>_</span>CHAIN
          </span>
          <span style={{ fontSize: 10, opacity: 0.2 }}>global market map · v1</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <KindBadge kind={feedsConnected ? "live" : "snapshot"} asOf={feedsConnected ? null : "2025 seed data"} />
          {!feedsConnected && <span style={{ fontSize: 9, opacity: 0.25 }}>live feeds: connecting…</span>}
        </div>
      </div>

      {/* ── Main body: left | map | right ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left panel — chain selector */}
        <div style={{
          ...glass,
          width: 210,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          overflowY: "auto",
          padding: "16px 14px",
          gap: 20,
        }}>
          {/* Chain toggles */}
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.25em", color: "#f59e0b", opacity: 0.7, marginBottom: 10 }}>CHAINS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {CHAINS.map(chain => {
                const active = activeChains.includes(chain.id);
                return (
                  <button
                    key={chain.id}
                    onClick={() => toggleChain(chain.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "7px 10px", borderRadius: 8, cursor: "pointer",
                      background: active ? `${chain.color}18` : "transparent",
                      border: `1px solid ${active ? chain.color + "50" : "rgba(255,255,255,0.07)"}`,
                      color: active ? "white" : "rgba(255,255,255,0.3)",
                      fontSize: 11, fontWeight: active ? 600 : 400,
                      transition: "all 0.15s", textAlign: "left",
                    }}
                  >
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                      background: active ? chain.color : "rgba(255,255,255,0.15)",
                    }} />
                    {chain.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status legend */}
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.25em", color: "#f59e0b", opacity: 0.7, marginBottom: 10 }}>STATUS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {(Object.entries(STATUS_COLOR) as [NodeStatus, string][]).map(([s, c]) => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, flexShrink: 0 }} />
                  <span style={{ opacity: 0.55 }}>{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Node type legend */}
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.25em", color: "#f59e0b", opacity: 0.7, marginBottom: 10 }}>NODE TYPES</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {(Object.entries(TYPE_SYMBOL) as [NodeType, string][]).map(([t, sym]) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10 }}>
                  <span style={{ width: 16, textAlign: "center", opacity: 0.5, fontSize: 9 }}>{sym}</span>
                  <span style={{ opacity: 0.5 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Edge legend */}
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.25em", color: "#f59e0b", opacity: 0.7, marginBottom: 10 }}>ROUTES</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {(["sea", "air", "road", "pipeline"] as EdgeMode[]).map(mode => (
                <div key={mode} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10 }}>
                  <span style={{
                    display: "inline-block", width: 18, height: 2,
                    background: mode === "sea" ? "rgba(255,255,255,0.5)" : "none",
                    borderTop: mode !== "sea"
                      ? `2px ${mode === "air" ? "dashed" : mode === "pipeline" ? "dotted" : "dashed"} rgba(255,255,255,0.4)`
                      : "none",
                  }} />
                  <span style={{ opacity: 0.5 }}>{mode}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 9, opacity: 0.3, lineHeight: 1.7 }}>
              {visibleNodes.length} nodes · {visibleEdges.length} edges<br />
              {activeChains.length}/{CHAINS.length} chains active
            </div>
          </div>
        </div>

        {/* Centre — map */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <div
            ref={mapDivRef}
            style={{ width: "100%", height: "100%", background: "#0f0c29" }}
          />

          {/* Click-to-deselect hint */}
          {selectedId && (
            <button
              onClick={() => setSelectedId(null)}
              style={{
                position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
                zIndex: 1000, padding: "5px 14px",
                background: "rgba(15,12,41,0.85)", border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 20, color: "rgba(255,255,255,0.6)", fontSize: 10, cursor: "pointer",
                backdropFilter: "blur(10px)",
              }}
            >
              ✕ clear selection
            </button>
          )}

          {/* Leaflet style override */}
          <style>{`
            .leaflet-container { background: #0f0c29; }
            .leaflet-control-zoom a { background: rgba(20,17,50,0.9) !important; color: rgba(255,255,255,0.7) !important; border-color: rgba(255,255,255,0.1) !important; }
            .leaflet-control-zoom a:hover { background: rgba(40,35,80,0.95) !important; }
            .leaflet-control-attribution { background: rgba(15,12,41,0.7) !important; color: rgba(255,255,255,0.25) !important; font-family: monospace; font-size: 9px; }
            .leaflet-control-attribution a { color: rgba(255,255,255,0.4) !important; }
            .sc-tooltip .leaflet-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
            @keyframes gdelt-ping {
              0%   { transform: scale(1);   opacity: 0.8; }
              70%  { transform: scale(2.4); opacity: 0; }
              100% { transform: scale(2.4); opacity: 0; }
            }
          `}</style>
        </div>

        {/* Right panel — node detail */}
        <div style={{
          ...glass,
          width: 300,
          flexShrink: 0,
          borderLeft: "1px solid rgba(255,255,255,0.07)",
          overflowY: "auto",
          padding: "16px 16px",
        }}>
          {selectedNode ? (
            <>
              {/* Node header */}
              <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <StatusDot status={selectedNode.status} />
                  <span style={{ fontSize: 9, letterSpacing: "0.2em", color: STATUS_COLOR[selectedNode.status], textTransform: "uppercase" }}>
                    {selectedNode.status}
                  </span>
                  <span style={{ fontSize: 9, opacity: 0.3 }}>·</span>
                  <span style={{ fontSize: 9, opacity: 0.4 }}>{selectedNode.type}</span>
                </div>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px", lineHeight: 1.3 }}>
                  {selectedNode.name}
                </h2>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {selectedNode.chains.map(c => {
                    const chain = CHAINS.find(ch => ch.id === c);
                    return chain ? (
                      <span key={c} style={{
                        fontSize: 9, padding: "1px 6px", borderRadius: 4,
                        background: `${chain.color}18`, border: `1px solid ${chain.color}40`,
                        color: chain.color,
                      }}>{chain.label}</span>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Explainer */}
              <div style={{
                marginBottom: 16, padding: "10px 12px", borderRadius: 8,
                background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)",
              }}>
                <div style={{ fontSize: 9, color: "#f59e0b", letterSpacing: "0.2em", marginBottom: 5 }}>HOW THIS CONNECTS</div>
                <p style={{ fontSize: 11, lineHeight: 1.65, margin: 0, opacity: 0.75 }}>{selectedNode.explainer}</p>
              </div>

              {/* Capacity metric */}
              <MetricRow label="Capacity / Throughput" metric={selectedNode.capacity} />

              {/* Connected edges */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "#f59e0b", opacity: 0.7, marginBottom: 10 }}>CONNECTED FLOWS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {EDGES.filter(e => e.from === selectedNode.id || e.to === selectedNode.id)
                    .filter(e => activeChains.includes(e.chain))
                    .map(edge => {
                      const other = nodeById(edge.from === selectedNode.id ? edge.to : edge.from);
                      if (!other) return null;
                      const dir = edge.from === selectedNode.id ? "→" : "←";
                      return (
                        <div
                          key={edge.id}
                          onClick={() => setSelectedId(other.id)}
                          style={{
                            padding: "7px 10px", borderRadius: 7, cursor: "pointer",
                            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            <span style={{ fontSize: 9, color: chainColor(edge.chain) }}>{dir}</span>
                            <span style={{ fontSize: 11, fontWeight: 600 }}>{other.name}</span>
                          </div>
                          <div style={{ fontSize: 9, opacity: 0.4 }}>
                            {edge.commodity} · {MODE_LABEL[edge.mode]} · ~{edge.baselineDays < 1 ? "<1" : edge.baselineDays}d
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* GDELT news signals */}
              {gdeltSignals[selectedNode.id] && gdeltSignals[selectedNode.id].articleCount > 0 && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "#f87171", opacity: 0.9 }}>GDELT SIGNALS</div>
                    <span style={{ fontSize: 8, color: "#f87171", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", padding: "1px 5px", borderRadius: 4 }}>
                      {gdeltSignals[selectedNode.id].articleCount} articles · 48h
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {gdeltSignals[selectedNode.id].articles.slice(0, 4).map((article, i) => (
                      <a
                        key={i}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "block", padding: "7px 10px", borderRadius: 7, textDecoration: "none",
                          background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.15)",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.1)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.05)"; }}
                      >
                        <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.8)", lineHeight: 1.4, marginBottom: 3 }}>
                          {article.title}
                        </div>
                        <div style={{ fontSize: 9, opacity: 0.35 }}>
                          {article.domain}{article.date ? ` · ${article.date.slice(0, 8)}` : ""}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Coordinates */}
              <div style={{ marginTop: 14, fontSize: 9, opacity: 0.2 }}>
                {selectedNode.lat.toFixed(2)}°, {selectedNode.lon.toFixed(2)}°
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, opacity: 0.25, textAlign: "center" }}>
              <span style={{ fontSize: 24 }}>◎</span>
              <p style={{ fontSize: 12, margin: 0 }}>Click a node on the map to inspect it</p>
              <p style={{ fontSize: 10, margin: 0, opacity: 0.6 }}>upstream / downstream links · metrics · explainer</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Macro ticker ── */}
      <div style={{
        ...glass,
        flexShrink: 0,
        borderTop: "1px solid rgba(255,255,255,0.07)",
        padding: "0 20px",
        height: 52,
        display: "flex",
        alignItems: "center",
        gap: 0,
        overflowX: "auto",
      }}>
        <span style={{ fontSize: 9, letterSpacing: "0.2em", color: "#f59e0b", opacity: 0.6, marginRight: 20, flexShrink: 0 }}>MACRO</span>
        {macroTicks.map((item, i) => (
          <div key={item.id} style={{
            display: "flex", alignItems: "center", gap: 20,
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 100 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{item.value}</span>
                <span style={{
                  fontSize: 9,
                  color: item.up ? "#4ade80" : "#f87171",
                }}>{item.change}</span>
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ fontSize: 9, opacity: 0.35 }}>{item.label}</span>
                {item.kind === "live"
                  ? <span style={{ fontSize: 8, color: "#4ade80", opacity: 0.7 }}>· live · {item.asOf}</span>
                  : <span style={{ fontSize: 8, opacity: 0.2 }}>· snapshot · {item.asOf}</span>
                }
              </div>
            </div>
            {i < macroTicks.length - 1 && (
              <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.07)", flexShrink: 0 }} />
            )}
          </div>
        ))}
        <div style={{ marginLeft: "auto", flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 9, opacity: 0.2 }}>GDELT · macro feeds:</span>
          {feedsConnected
            ? <span style={{ fontSize: 9, color: "#4ade80", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", padding: "1px 6px", borderRadius: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                CONNECTED
              </span>
            : <span style={{ fontSize: 9, color: "#6b7280", background: "rgba(107,114,128,0.1)", border: "1px solid rgba(107,114,128,0.2)", padding: "1px 6px", borderRadius: 4 }}>CONNECTING…</span>
          }
        </div>
      </div>
    </div>
  );
}
