"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  CHAINS, NODES, CHOKEPOINTS, PRESETS, TIER_LABELS, CROSS_LINKS, CHAIN_PARAMS,
  type ChainId, type ChokepointId, type Concentration,
} from "./data";
import { runSimulation, type SimParams, type ChainResult } from "./model";

// ─── Legacy geo types (Map tab) ──────────────────────────────
type Kind = "live" | "snapshot" | "absent";
type NodeStatus = "normal" | "constrained" | "disrupted" | "unknown";
type NodeType = "extraction" | "processing" | "manufacture" | "port" | "chokepoint" | "hub" | "market";
type EdgeMode = "sea" | "air" | "road" | "pipeline";

interface Metric { value: number | null; unit: string | null; source: string | null; asOf: string | null; kind: Kind; }
interface SCNode { id: string; name: string; type: NodeType; lat: number; lon: number; chains: string[]; status: NodeStatus; capacity: Metric; explainer: string; }
interface SCEdge { id: string; from: string; to: string; commodity: string; mode: EdgeMode; baselineDays: number; chain: string; via?: string[]; }
interface MacroTick { id: string; label: string; value: string; change: string; up: boolean; source: string; asOf: string; kind?: "live" | "snapshot"; }
interface GdeltArticle { title: string; url: string; domain: string; date: string; }
interface GdeltSignals { [nodeId: string]: { articleCount: number; articles: GdeltArticle[]; error?: string; }; }

// ─── Geo seed data (Map tab) ─────────────────────────────────
const GEO_CHAINS = [
  { id: "crude-oil",      label: "Crude Oil",              color: "#f59e0b" },
  { id: "containers",     label: "Asia–Europe Containers", color: "#60a5fa" },
  { id: "semiconductors", label: "Semiconductors",         color: "#a78bfa" },
];

const GEO_NODES: SCNode[] = [
  { id:"ghawar",       name:"Ghawar Field",           type:"extraction",  lat:25.5,  lon:49.0,   chains:["crude-oil"],                         status:"normal",      capacity:{value:3.8,  unit:"Mbpd",       source:"Saudi Aramco",  asOf:"2025",kind:"snapshot"}, explainer:"World's largest conventional oilfield (~3.8 Mbpd). Supplies the bulk of Saudi Aramco's export volume via the Ras Tanura terminal on the Gulf coast." },
  { id:"ras-tanura",   name:"Ras Tanura Terminal",    type:"port",        lat:26.68, lon:50.16,  chains:["crude-oil"],                         status:"normal",      capacity:{value:null, unit:"Mbpd",       source:null,            asOf:null,  kind:"absent"},   explainer:"Saudi Aramco's primary crude export terminal. Most Saudi outflows load here before transiting the Strait of Hormuz into the Indian Ocean." },
  { id:"hormuz",       name:"Strait of Hormuz",       type:"chokepoint",  lat:26.6,  lon:56.4,   chains:["crude-oil"],                         status:"constrained", capacity:{value:21,   unit:"Mbpd",       source:"EIA",           asOf:"2025",kind:"snapshot"}, explainer:"~21% of global petroleum liquids transit this 33 km-wide strait daily. Shared between Iran and Oman. Effective closure has no viable short-term alternative." },
  { id:"singapore",    name:"Singapore Refinery Hub", type:"processing",  lat:1.26,  lon:103.82, chains:["crude-oil","containers","semiconductors"], status:"normal",  capacity:{value:1.5,  unit:"Mbpd",       source:"IEA",           asOf:"2025",kind:"snapshot"}, explainer:"Asia's largest refining and trading hub. Processes Middle East crude for Asia-Pacific distribution. Also the critical intermediate node for Asia–Europe container routes." },
  { id:"rotterdam",    name:"Port of Rotterdam",      type:"hub",         lat:51.95, lon:4.1,    chains:["crude-oil","containers"],            status:"normal",      capacity:{value:14.8, unit:"M TEU/yr",   source:"Port of Rotterdam",asOf:"2025",kind:"snapshot"}, explainer:"Europe's largest port. Primary crude entry and refining hub for Europe, and the main container gateway connecting Asia–Europe lanes." },
  { id:"shanghai",     name:"Port of Shanghai",       type:"port",        lat:31.22, lon:121.5,  chains:["containers"],                        status:"normal",      capacity:{value:49.5, unit:"M TEU/yr",   source:"Alphaliner",    asOf:"2025",kind:"snapshot"}, explainer:"World's busiest container port by volume. Primary export gateway for Chinese manufactured goods to Europe and the Americas." },
  { id:"shenzhen",     name:"Yantian / Shenzhen",     type:"port",        lat:22.55, lon:114.26, chains:["containers","semiconductors"],        status:"normal",      capacity:{value:30.0, unit:"M TEU/yr",   source:"Alphaliner",    asOf:"2025",kind:"snapshot"}, explainer:"China's southern export gateway. Key for electronics, consumer goods, and semiconductor components moving to Europe and the Americas." },
  { id:"malacca",      name:"Strait of Malacca",      type:"chokepoint",  lat:2.5,   lon:101.5,  chains:["crude-oil","containers","semiconductors"], status:"normal",  capacity:{value:90000,unit:"vessels/yr",source:"IMO",           asOf:"2025",kind:"snapshot"}, explainer:"World's busiest shipping chokepoint — ~25% of global trade and ~80% of China's crude oil imports. 900 km long, minimum 2.8 km wide." },
  { id:"suez",         name:"Suez Canal",             type:"chokepoint",  lat:30.5,  lon:32.35,  chains:["crude-oil","containers"],            status:"constrained", capacity:{value:22000,unit:"vessels/yr",source:"SCA",           asOf:"2025",kind:"snapshot"}, explainer:"~12% of global trade, ~30% of container traffic. Saves ~14 days vs Cape of Good Hope. Houthi attacks rerouted significant volume around the Cape." },
  { id:"felixstowe",   name:"Port of Felixstowe",     type:"port",        lat:51.96, lon:1.35,   chains:["containers"],                        status:"normal",      capacity:{value:4.0,  unit:"M TEU/yr",   source:"Felixstowe",    asOf:"2025",kind:"snapshot"}, explainer:"UK's largest container port. Primary entry point for Asian imports. Feeders connect to Rotterdam and Hamburg." },
  { id:"asml",         name:"ASML (Veldhoven, NL)",   type:"manufacture", lat:51.42, lon:5.47,   chains:["semiconductors"],                    status:"normal",      capacity:{value:60,   unit:"EUV/yr",     source:"ASML",          asOf:"2025",kind:"snapshot"}, explainer:"Sole global supplier of EUV lithography machines — a prerequisite for all chips below 7nm. A structural single point of failure for the global semiconductor supply chain." },
  { id:"tsmc",         name:"TSMC (Hsinchu / Tainan)",type:"manufacture", lat:24.78, lon:120.98, chains:["semiconductors"],                    status:"normal",      capacity:{value:60,   unit:"% adv-node",  source:"TSMC",          asOf:"2025",kind:"snapshot"}, explainer:"World's most advanced semiconductor foundry. ~60% share of sub-7nm logic production. Geopolitical concentration risk: 180 km from mainland China." },
  { id:"samsung-fab",  name:"Samsung Fab (Hwaseong)", type:"manufacture", lat:37.2,  lon:127.06, chains:["semiconductors"],                    status:"normal",      capacity:{value:null, unit:null,          source:null,            asOf:null,  kind:"absent"},   explainer:"Samsung's primary advanced logic foundry near Seoul. Second-largest advanced-node foundry globally, competing at 3–5nm." },
  { id:"kaohsiung",    name:"Port of Kaohsiung",      type:"port",        lat:22.62, lon:120.28, chains:["semiconductors"],                    status:"normal",      capacity:{value:10.4, unit:"M TEU/yr",   source:"Alphaliner",    asOf:"2025",kind:"snapshot"}, explainer:"Taiwan's largest port and primary export gateway for TSMC chip output and electronics. Exposed to the same geopolitical risk as TSMC." },
];

const GEO_EDGES: SCEdge[] = [
  { id:"e-gh-rt",       from:"ghawar",    to:"ras-tanura", commodity:"Crude Oil",    mode:"pipeline",chain:"crude-oil",     baselineDays:0.1 },
  { id:"e-rt-hz",       from:"ras-tanura",to:"hormuz",     commodity:"Crude Oil",    mode:"sea",     chain:"crude-oil",     baselineDays:0.5 },
  { id:"e-hz-sg",       from:"hormuz",    to:"singapore",  commodity:"Crude Oil",    mode:"sea",     chain:"crude-oil",     baselineDays:12, via:["malacca"] },
  { id:"e-hz-rot",      from:"hormuz",    to:"rotterdam",  commodity:"Crude Oil",    mode:"sea",     chain:"crude-oil",     baselineDays:24, via:["suez"] },
  { id:"e-sh-ml",       from:"shanghai",  to:"malacca",    commodity:"Containers",   mode:"sea",     chain:"containers",    baselineDays:7 },
  { id:"e-sz-ml",       from:"shenzhen",  to:"malacca",    commodity:"Containers",   mode:"sea",     chain:"containers",    baselineDays:5 },
  { id:"e-ml-sg",       from:"malacca",   to:"singapore",  commodity:"Containers",   mode:"sea",     chain:"containers",    baselineDays:1 },
  { id:"e-sg-sz",       from:"singapore", to:"suez",       commodity:"Containers",   mode:"sea",     chain:"containers",    baselineDays:14 },
  { id:"e-sz-rot",      from:"suez",      to:"rotterdam",  commodity:"Containers",   mode:"sea",     chain:"containers",    baselineDays:7 },
  { id:"e-rot-fx",      from:"rotterdam", to:"felixstowe", commodity:"Containers",   mode:"sea",     chain:"containers",    baselineDays:1 },
  { id:"e-asml-tsmc",   from:"asml",      to:"tsmc",       commodity:"EUV Equipment",mode:"road",    chain:"semiconductors",baselineDays:1 },
  { id:"e-tsmc-kh",     from:"tsmc",      to:"kaohsiung",  commodity:"Chips",        mode:"road",    chain:"semiconductors",baselineDays:0.3 },
  { id:"e-sam-sz",      from:"samsung-fab",to:"shenzhen",  commodity:"Chips",        mode:"sea",     chain:"semiconductors",baselineDays:2 },
  { id:"e-kh-sg",       from:"kaohsiung", to:"singapore",  commodity:"Chips",        mode:"sea",     chain:"semiconductors",baselineDays:5, via:["malacca"] },
  { id:"e-sg-rot-semi", from:"singapore", to:"rotterdam",  commodity:"Chips (air)",  mode:"pipeline",chain:"semiconductors",baselineDays:1 },
];

const MACRO_SEED: MacroTick[] = [
  { id:"brent",  label:"Brent Crude", value:"$73.40", change:"—",  up:false, source:"EIA",         asOf:"2025", kind:"snapshot" },
  { id:"dxy",    label:"DXY",         value:"104.2",  change:"—",  up:true,  source:"FRED",        asOf:"2025", kind:"snapshot" },
  { id:"gold",   label:"Gold",        value:"$3,180", change:"—",  up:true,  source:"LBMA/FRED",   asOf:"2025", kind:"snapshot" },
  { id:"ust10y", label:"UST 10Y",     value:"4.52%",  change:"—",  up:false, source:"FRED",        asOf:"2025", kind:"snapshot" },
  { id:"wci",    label:"WCI",         value:"$4,351", change:"—",  up:false, source:"Drewry",      asOf:"Oct 2026", kind:"snapshot" },
];

// ─── Constants ────────────────────────────────────────────────
const STATUS_COLOR: Record<NodeStatus, string> = { normal:"#22c55e", constrained:"#f59e0b", disrupted:"#ef4444", unknown:"#6b7280" };
const MODE_LABEL: Record<EdgeMode, string> = { sea:"Sea freight", air:"Air freight", road:"Road / rail", pipeline:"Pipeline" };
const CONC_COLOR: Record<Concentration, string> = { spread:"#22c55e", moderate:"#f59e0b", concentrated:"#ef4444", single:"#dc2626" };
const CONC_LABEL: Record<Concentration, string> = { spread:"Spread", moderate:"Moderate", concentrated:"Concentrated", single:"Single point" };

function nodeById(id: string) { return GEO_NODES.find(n => n.id === id); }
function geoChainColor(id: string) { return GEO_CHAINS.find(c => c.id === id)?.color ?? "#888"; }

// ─── Sub-components ───────────────────────────────────────────
function KindBadge({ kind, asOf }: { kind: Kind; asOf: string | null }) {
  const cfg = {
    live:    { bg:"rgba(34,197,94,0.12)",  border:"rgba(34,197,94,0.3)",  color:"#4ade80", label:"LIVE" },
    snapshot:{ bg:"rgba(245,158,11,0.1)",  border:"rgba(245,158,11,0.25)",color:"#f59e0b", label:"SNAPSHOT" },
    absent:  { bg:"rgba(107,114,128,0.1)", border:"rgba(107,114,128,0.2)",color:"#6b7280", label:"NOT CONNECTED" },
  }[kind];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:9, fontWeight:700, letterSpacing:"0.15em", padding:"2px 7px", borderRadius:4, background:cfg.bg, border:`1px solid ${cfg.border}`, color:cfg.color }}>
      {kind === "live" && <span style={{ width:5, height:5, borderRadius:"50%", background:"#4ade80", display:"inline-block" }} />}
      {cfg.label}{asOf && kind === "snapshot" ? ` · ${asOf}` : ""}
    </span>
  );
}

function StatusDot({ status }: { status: NodeStatus }) {
  return <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:STATUS_COLOR[status], flexShrink:0 }} />;
}

function MetricRow({ label, metric }: { label: string; metric: Metric }) {
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ fontSize:9, letterSpacing:"0.2em", color:"#f59e0b", textTransform:"uppercase", opacity:0.7, marginBottom:3 }}>{label}</div>
      {metric.kind === "absent" ? (
        <div style={{ display:"flex", alignItems:"center", gap:6 }}><KindBadge kind="absent" asOf={null} /><span style={{ fontSize:11, opacity:0.3 }}>no data available</span></div>
      ) : (
        <div style={{ display:"flex", alignItems:"baseline", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:18, fontWeight:700, color:"white" }}>{metric.value?.toLocaleString() ?? "—"}{metric.unit && <span style={{ fontSize:11, fontWeight:400, opacity:0.5, marginLeft:4 }}>{metric.unit}</span>}</span>
          <KindBadge kind={metric.kind} asOf={metric.asOf} />
        </div>
      )}
      {metric.source && <div style={{ fontSize:10, opacity:0.3, marginTop:2 }}>source: {metric.source}</div>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────
type Tab = "map" | "chains" | "chokepoints" | "shock";

export default function SupplyChainClient() {
  const [tab, setTab] = useState<Tab>("map");

  // Map tab state
  const [activeChains, setActiveChains] = useState<string[]>(["crude-oil","containers","semiconductors"]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [macroTicks, setMacroTicks] = useState<MacroTick[]>(MACRO_SEED);
  const [gdeltSignals, setGdeltSignals] = useState<GdeltSignals>({});
  const [nodeMetrics, setNodeMetrics] = useState<Record<string, Metric>>({});
  const [feedsConnected, setFeedsConnected] = useState(false);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const polylinesRef = useRef<Record<string, any>>({});

  // Chains tab state
  const [selectedChain, setSelectedChain] = useState<ChainId>("oil");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Shock tab state
  const [closures, setClosures] = useState<Partial<Record<ChokepointId, number>>>({});
  const [outages, setOutages] = useState<Record<string, number>>({});
  const [durationWeeks, setDurationWeeks] = useState(12);
  const [simResult, setSimResult] = useState<ReturnType<typeof runSimulation> | null>(null);
  const [showExport, setShowExport] = useState(false);

  const selectedNode = selectedId ? nodeById(selectedId) : null;
  const visibleNodes = GEO_NODES.filter(n => n.chains.some(c => activeChains.includes(c)));
  const visibleEdges = GEO_EDGES.filter(e => activeChains.includes(e.chain));
  const connectedIds = selectedId
    ? new Set(GEO_EDGES.flatMap(e => (e.from === selectedId || e.to === selectedId) ? [e.from, e.to] : []))
    : null;

  const toggleGeoChain = (id: string) => setActiveChains(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  // ── Live feeds ───────────────────────────────────────────────
  useEffect(() => {
    async function loadMacro() {
      try {
        const res = await fetch("/api/feeds/macro");
        if (!res.ok) return;
        const data = await res.json();
        const items = data.items as Record<string, { value: string; unit: string | null; change: string | null; up: boolean; source: string; asOf: string; kind: "live" | "snapshot"; }>;
        const LABEL: Record<string, string> = { brent:"Brent Crude", dxy:"DXY", gold:"Gold", ust10y:"UST 10Y", wci:"WCI" };
        setMacroTicks(MACRO_SEED.map(seed => {
          const item = items[seed.id];
          if (!item) return seed;
          return { id:seed.id, label:LABEL[seed.id]??seed.label, value:item.value, change:item.change??"—", up:item.up, source:item.source, asOf:item.asOf, kind:item.kind };
        }));
        setFeedsConnected(true);
      } catch {}
    }
    loadMacro();
    const id = setInterval(loadMacro, 3_600_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    async function loadNodes() {
      try {
        const res = await fetch("/api/feeds/nodes");
        if (!res.ok) return;
        const data = await res.json();
        const raw = data.metrics as Record<string, { value: number|null; unit: string|null; source: string; asOf: string|null; kind: "live"|"snapshot"|"absent"; }>;
        const mapped: Record<string, Metric> = {};
        for (const [id, m] of Object.entries(raw)) mapped[id] = { value:m.value, unit:m.unit, source:m.source, asOf:m.asOf, kind:m.kind };
        setNodeMetrics(mapped);
        setFeedsConnected(true);
      } catch {}
    }
    loadNodes();
    const id = setInterval(loadNodes, 21_600_000);
    return () => clearInterval(id);
  }, []);

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

  // ── URL hash for shock presets ───────────────────────────────
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const newClosures: Partial<Record<ChokepointId, number>> = {};
    const newOutages: Record<string, number> = {};
    for (const cpId of Object.keys(CHOKEPOINTS) as ChokepointId[]) {
      const v = params.get(cpId);
      if (v) newClosures[cpId] = Math.min(1, parseFloat(v) / 100);
    }
    const weeks = params.get("weeks");
    if (weeks) setDurationWeeks(Math.min(52, Math.max(1, parseInt(weeks))));
    const out = params.get("out");
    if (out) {
      for (const part of out.split(",")) {
        const [id, pct] = part.split(":");
        if (id && pct) newOutages[id] = Math.min(1, parseFloat(pct) / 100);
      }
    }
    if (Object.keys(newClosures).length || Object.keys(newOutages).length) {
      setClosures(newClosures);
      setOutages(newOutages);
      setTab("shock");
    }
  }, []);

  // ── Shock simulation ─────────────────────────────────────────
  useEffect(() => {
    const hasAnyInput = Object.values(closures).some(v => v && v > 0) || Object.keys(outages).length > 0;
    if (!hasAnyInput) { setSimResult(null); return; }
    const result = runSimulation({ closures, outages, durationWeeks } as SimParams);
    setSimResult(result);
  }, [closures, outages, durationWeeks]);

  // ── Leaflet map ──────────────────────────────────────────────
  useEffect(() => {
    if (tab !== "map") return;
    if (mapDivRef.current && !leafletRef.current) {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css"; link.rel = "stylesheet";
        link.href = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      import("leaflet").then((L) => {
        if (!mapDivRef.current || leafletRef.current) return;
        const map = L.map(mapDivRef.current, { center:[20,60], zoom:3, zoomControl:true, attributionControl:true });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom:19, crossOrigin:true,
        }).addTo(map);
        leafletRef.current = map;
      });
    }
    return () => {
      if (tab !== "map" && leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
        markersRef.current = {};
        polylinesRef.current = {};
      }
    };
  }, [tab]);

  const drawMap = useCallback(async () => {
    const map = leafletRef.current;
    if (!map) return;
    const L = (await import("leaflet")).default ?? (await import("leaflet"));
    Object.values(markersRef.current).forEach((m: any) => m.remove());
    Object.values(polylinesRef.current).forEach((p: any) => p.remove());
    markersRef.current = {}; polylinesRef.current = {};

    visibleEdges.forEach(edge => {
      const from = nodeById(edge.from), to = nodeById(edge.to);
      if (!from || !to) return;
      const hl = selectedId ? (edge.from === selectedId || edge.to === selectedId) : true;
      const color = geoChainColor(edge.chain);
      const dashArray = edge.mode === "pipeline" ? "4 6" : edge.mode === "road" ? "6 4" : null;
      const pl = L.polyline([[from.lat, from.lon],[to.lat, to.lon]], { color, weight:hl?2.5:1, opacity:hl?0.85:0.18, dashArray:dashArray??undefined }).addTo(map);
      pl.bindTooltip(`<div style="font-family:monospace;font-size:11px;color:white;background:#1a1730;border:1px solid rgba(255,255,255,0.12);padding:6px 10px;border-radius:6px"><b>${edge.commodity}</b><br/>${from.name} → ${to.name}<br/>${MODE_LABEL[edge.mode]} · ~${edge.baselineDays < 1 ? "<1" : edge.baselineDays}d${edge.via?.length ? `<br/>via ${edge.via.join(", ")}` : ""}</div>`, { sticky:true, opacity:1, className:"sc-tooltip" });
      polylinesRef.current[edge.id] = pl;
    });

    visibleNodes.forEach(node => {
      const isSel = node.id === selectedId;
      const isConn = connectedIds?.has(node.id) ?? false;
      const dimmed = selectedId && !isSel && !isConn;
      const statusCol = STATUS_COLOR[node.status];
      const size = node.type === "chokepoint" ? 14 : node.type === "hub" ? 13 : 11;
      const gdelt = gdeltSignals[node.id];
      const hasNews = gdelt && gdelt.articleCount > 0;
      const sz2 = size + 12;
      const icon = L.divIcon({
        className: "",
        html:`<div style="position:relative;width:${sz2}px;height:${sz2}px;display:flex;align-items:center;justify-content:center;">${hasNews?`<div style="position:absolute;inset:0;border-radius:50%;border:1.5px solid rgba(248,113,113,0.7);animation:gdelt-ping 1.8s ease-out infinite;"></div>`:""}<div style="width:${size}px;height:${size}px;border-radius:${node.type==="manufacture"?"2px":node.type==="chokepoint"?"0":"50%"};background:${statusCol};border:2px solid ${isSel?"white":"rgba(0,0,0,0.4)"};box-shadow:${isSel?`0 0 0 2px ${statusCol}, 0 0 12px ${statusCol}`:`0 0 6px ${statusCol}88`};opacity:${dimmed?0.2:1};transition:all 0.2s;clip-path:${node.type==="chokepoint"?"polygon(50% 0%, 0% 100%, 100% 100%)":"none"};"></div></div>`,
        iconSize:[sz2,sz2], iconAnchor:[sz2/2,sz2/2],
      });
      const marker = L.marker([node.lat, node.lon], { icon }).addTo(map)
        .on("click", () => setSelectedId(prev => prev === node.id ? null : node.id));
      marker.bindTooltip(`<div style="font-family:monospace;font-size:11px;color:white;background:#1a1730;border:1px solid rgba(255,255,255,0.12);padding:6px 10px;border-radius:6px"><b>${node.name}</b><br/><span style="color:${statusCol}">${node.status.toUpperCase()}</span> · ${node.type}</div>`, { opacity:1, className:"sc-tooltip" });
      markersRef.current[node.id] = marker;
    });
  }, [visibleNodes, visibleEdges, selectedId, connectedIds, gdeltSignals]);

  useEffect(() => {
    if (tab !== "map") return;
    if (!leafletRef.current) {
      const interval = setInterval(() => { if (leafletRef.current) { clearInterval(interval); drawMap(); } }, 100);
      return () => clearInterval(interval);
    }
    drawMap();
  }, [drawMap, tab]);

  // ── Styles ───────────────────────────────────────────────────
  const glass = { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)" };

  function applyPreset(presetId: string) {
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    const cl: Partial<Record<ChokepointId, number>> = {};
    for (const [k, v] of Object.entries(preset.closures)) cl[k as ChokepointId] = v;
    setClosures(cl);
    setOutages({ ...preset.outages });
    setDurationWeeks(preset.durationWeeks);
  }

  function exportJSON() {
    if (!simResult) return;
    const obj = {
      source: "supply-web",
      version: 1,
      generated: new Date().toISOString(),
      basis: "Reference structure (mid-2026 snapshot); shares indicative; buffers and lead times are assumptions",
      scenario: {
        chokepoints_closed_pct: Object.fromEntries(Object.entries(closures).map(([k, v]) => [k, Math.round((v ?? 0) * 100)])),
        node_outages_pct: Object.fromEntries(Object.entries(outages).map(([k, v]) => [k, Math.round(v * 100)])),
        duration_weeks: durationWeeks,
      },
      clearing_price_supply_shift_pct: simResult.supplyShiftPct,
      chains: simResult.chains.map(c => ({ id:c.id, cargo:c.cargo, peak_shortfall_pct:c.peakShortfall, peak_week:c.peakWeek, first_felt_week:c.firstFeltWeek, recovered_week:c.recoveredWeek })),
    };
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2)).then(() => { setShowExport(true); setTimeout(() => setShowExport(false), 2000); });
  }

  // ── Concentration grid (Chains tab) ─────────────────────────
  function concentrationForCell(chainId: ChainId, tier: number): { conc: Concentration; hasCp: boolean } | null {
    const nodes = NODES.filter(n => n.chain === chainId && n.tier === tier);
    if (!nodes.length) return null;
    const order: Concentration[] = ["single","concentrated","moderate","spread"];
    const worst = order.find(c => nodes.some(n => n.concentration === c)) ?? "spread";
    const hasCp = nodes.some(n => n.chokepoints.length > 0);
    return { conc: worst, hasCp };
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", fontFamily:"ui-monospace,'Geist Mono',monospace", color:"white", overflow:"hidden" }}>

      {/* ── Header ── */}
      <div style={{ ...glass, flexShrink:0, padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid rgba(255,255,255,0.07)", zIndex:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:9, letterSpacing:"0.3em", color:"#f59e0b", opacity:0.8 }}>SYS/SC</span>
          <span style={{ fontSize:14, fontWeight:800, letterSpacing:"0.02em" }}>SUPPLY<span style={{ color:"#f59e0b" }}>_</span>WEB</span>
          <span style={{ fontSize:10, opacity:0.2 }}>8 chains · 5 tiers · shock model</span>
        </div>
        {/* Tab bar */}
        <div style={{ display:"flex", gap:4 }}>
          {(["map","chains","chokepoints","shock"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding:"5px 14px", borderRadius:8, fontSize:10, fontWeight:700, cursor:"pointer", letterSpacing:"0.08em",
              background: tab===t ? "rgba(245,158,11,0.15)" : "transparent",
              border: `1px solid ${tab===t ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.08)"}`,
              color: tab===t ? "#f59e0b" : "rgba(255,255,255,0.4)",
            }}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <KindBadge kind={feedsConnected?"live":"snapshot"} asOf={feedsConnected?null:"2025 seed data"} />
        </div>
      </div>

      {/* ── MAP TAB ── */}
      {tab === "map" && (
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
          {/* Left panel */}
          <div style={{ ...glass, width:210, flexShrink:0, display:"flex", flexDirection:"column", borderRight:"1px solid rgba(255,255,255,0.07)", overflowY:"auto", padding:"16px 14px", gap:20 }}>
            <div>
              <div style={{ fontSize:9, letterSpacing:"0.25em", color:"#f59e0b", opacity:0.7, marginBottom:10 }}>CHAINS</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {GEO_CHAINS.map(chain => {
                  const active = activeChains.includes(chain.id);
                  return (
                    <button key={chain.id} onClick={() => toggleGeoChain(chain.id)} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", borderRadius:8, cursor:"pointer", background:active?`${chain.color}18`:"transparent", border:`1px solid ${active?chain.color+"50":"rgba(255,255,255,0.07)"}`, color:active?"white":"rgba(255,255,255,0.3)", fontSize:11, fontWeight:active?600:400, transition:"all 0.15s", textAlign:"left" }}>
                      <span style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, background:active?chain.color:"rgba(255,255,255,0.15)" }} />
                      {chain.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div style={{ fontSize:9, letterSpacing:"0.25em", color:"#f59e0b", opacity:0.7, marginBottom:10 }}>STATUS</div>
              {(Object.entries(STATUS_COLOR) as [NodeStatus, string][]).map(([s,c]) => (
                <div key={s} style={{ display:"flex", alignItems:"center", gap:7, fontSize:10, marginBottom:5 }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:c, flexShrink:0 }} />
                  <span style={{ opacity:0.55 }}>{s}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop:"auto", paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize:9, opacity:0.3, lineHeight:1.7 }}>
                {visibleNodes.length} nodes · {visibleEdges.length} edges<br />
                {activeChains.length}/{GEO_CHAINS.length} chains active
              </div>
            </div>
          </div>

          {/* Map */}
          <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
            <div ref={mapDivRef} style={{ width:"100%", height:"100%", background:"#0f0c29" }} />
            {selectedId && (
              <button onClick={() => setSelectedId(null)} style={{ position:"absolute", top:12, left:"50%", transform:"translateX(-50%)", zIndex:1000, padding:"5px 14px", background:"rgba(15,12,41,0.85)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:20, color:"rgba(255,255,255,0.6)", fontSize:10, cursor:"pointer", backdropFilter:"blur(10px)" }}>
                ✕ clear selection
              </button>
            )}
            <style>{`
              .leaflet-container { background: #0f0c29; }
              .leaflet-tile-pane { filter: invert(100%) hue-rotate(180deg) brightness(90%) contrast(88%) saturate(60%); }
              .leaflet-control-zoom a { background: rgba(20,17,50,0.9) !important; color: rgba(255,255,255,0.7) !important; border-color: rgba(255,255,255,0.1) !important; }
              .leaflet-control-zoom a:hover { background: rgba(40,35,80,0.95) !important; }
              .leaflet-control-attribution { background: rgba(15,12,41,0.7) !important; color: rgba(255,255,255,0.25) !important; font-family: monospace; font-size: 9px; }
              .leaflet-control-attribution a { color: rgba(255,255,255,0.4) !important; }
              .sc-tooltip .leaflet-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
              @keyframes gdelt-ping { 0%{transform:scale(1);opacity:0.8} 70%{transform:scale(2.4);opacity:0} 100%{transform:scale(2.4);opacity:0} }
            `}</style>
          </div>

          {/* Right panel */}
          <div style={{ ...glass, width:300, flexShrink:0, borderLeft:"1px solid rgba(255,255,255,0.07)", overflowY:"auto", padding:"16px" }}>
            {selectedNode ? (
              <>
                <div style={{ marginBottom:16, paddingBottom:14, borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                    <StatusDot status={selectedNode.status} />
                    <span style={{ fontSize:9, letterSpacing:"0.2em", color:STATUS_COLOR[selectedNode.status], textTransform:"uppercase" }}>{selectedNode.status}</span>
                    <span style={{ fontSize:9, opacity:0.3 }}>·</span>
                    <span style={{ fontSize:9, opacity:0.4 }}>{selectedNode.type}</span>
                  </div>
                  <h2 style={{ fontSize:15, fontWeight:700, margin:"0 0 4px", lineHeight:1.3 }}>{selectedNode.name}</h2>
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    {selectedNode.chains.map(c => { const chain = GEO_CHAINS.find(ch => ch.id === c); return chain ? <span key={c} style={{ fontSize:9, padding:"1px 6px", borderRadius:4, background:`${chain.color}18`, border:`1px solid ${chain.color}40`, color:chain.color }}>{chain.label}</span> : null; })}
                  </div>
                </div>
                <div style={{ marginBottom:16, padding:"10px 12px", borderRadius:8, background:"rgba(245,158,11,0.05)", border:"1px solid rgba(245,158,11,0.12)" }}>
                  <div style={{ fontSize:9, color:"#f59e0b", letterSpacing:"0.2em", marginBottom:5 }}>HOW THIS CONNECTS</div>
                  <p style={{ fontSize:11, lineHeight:1.65, margin:0, opacity:0.75 }}>{selectedNode.explainer}</p>
                </div>
                <MetricRow label="Capacity / Throughput" metric={nodeMetrics[selectedNode.id] ?? selectedNode.capacity} />
                <div style={{ marginTop:16, paddingTop:14, borderTop:"1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ fontSize:9, letterSpacing:"0.2em", color:"#f59e0b", opacity:0.7, marginBottom:10 }}>CONNECTED FLOWS</div>
                  {GEO_EDGES.filter(e => (e.from === selectedNode.id || e.to === selectedNode.id) && activeChains.includes(e.chain)).map(edge => {
                    const other = nodeById(edge.from === selectedNode.id ? edge.to : edge.from);
                    if (!other) return null;
                    const dir = edge.from === selectedNode.id ? "→" : "←";
                    return (
                      <div key={edge.id} onClick={() => setSelectedId(other.id)} style={{ padding:"7px 10px", borderRadius:7, cursor:"pointer", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", marginBottom:6 }}
                        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.08)"}
                        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.04)"}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                          <span style={{ fontSize:9, color:geoChainColor(edge.chain) }}>{dir}</span>
                          <span style={{ fontSize:11, fontWeight:600 }}>{other.name}</span>
                        </div>
                        <div style={{ fontSize:9, opacity:0.4 }}>{edge.commodity} · {MODE_LABEL[edge.mode]} · ~{edge.baselineDays<1?"<1":edge.baselineDays}d</div>
                      </div>
                    );
                  })}
                </div>
                {gdeltSignals[selectedNode.id] && gdeltSignals[selectedNode.id].articleCount > 0 && (
                  <div style={{ marginTop:16, paddingTop:14, borderTop:"1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
                      <div style={{ fontSize:9, letterSpacing:"0.2em", color:"#f87171" }}>GDELT SIGNALS</div>
                      <span style={{ fontSize:8, color:"#f87171", background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.25)", padding:"1px 5px", borderRadius:4 }}>{gdeltSignals[selectedNode.id].articleCount} articles · 48h</span>
                    </div>
                    {gdeltSignals[selectedNode.id].articles.slice(0,4).map((a,i) => (
                      <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" style={{ display:"block", padding:"7px 10px", borderRadius:7, textDecoration:"none", background:"rgba(248,113,113,0.05)", border:"1px solid rgba(248,113,113,0.15)", marginBottom:6 }}
                        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(248,113,113,0.1)"}
                        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="rgba(248,113,113,0.05)"}>
                        <div style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,0.8)", lineHeight:1.4, marginBottom:3 }}>{a.title}</div>
                        <div style={{ fontSize:9, opacity:0.35 }}>{a.domain}{a.date?` · ${a.date.slice(0,8)}`:""}</div>
                      </a>
                    ))}
                  </div>
                )}
                <div style={{ marginTop:14, fontSize:9, opacity:0.2 }}>{selectedNode.lat.toFixed(2)}°, {selectedNode.lon.toFixed(2)}°</div>
              </>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:10, opacity:0.25, textAlign:"center" }}>
                <span style={{ fontSize:24 }}>◎</span>
                <p style={{ fontSize:12, margin:0 }}>Click a node on the map to inspect it</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CHAINS TAB ── */}
      {tab === "chains" && (
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
          <div style={{ ...glass, width:220, flexShrink:0, borderRight:"1px solid rgba(255,255,255,0.07)", overflowY:"auto", padding:"16px 12px" }}>
            <div style={{ fontSize:9, letterSpacing:"0.25em", color:"#f59e0b", opacity:0.7, marginBottom:12 }}>CHAINS</div>
            {CHAINS.map(c => (
              <button key={c.id} onClick={() => { setSelectedChain(c.id); setSelectedNodeId(null); }} style={{ display:"flex", flexDirection:"column", gap:2, width:"100%", padding:"8px 10px", borderRadius:8, cursor:"pointer", background:selectedChain===c.id?`${c.color}18`:"transparent", border:`1px solid ${selectedChain===c.id?c.color+"50":"rgba(255,255,255,0.07)"}`, color:selectedChain===c.id?"white":"rgba(255,255,255,0.4)", textAlign:"left", marginBottom:4 }}>
                <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.03em" }}>{c.short}</span>
                <span style={{ fontSize:9, opacity:0.5 }}>{c.label}</span>
              </button>
            ))}
            <div style={{ marginTop:16, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize:9, letterSpacing:"0.2em", color:"#f59e0b", opacity:0.6, marginBottom:8 }}>CONCENTRATION</div>
              {(Object.entries(CONC_COLOR) as [Concentration,string][]).map(([c,col]) => (
                <div key={c} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4, fontSize:9 }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:col, flexShrink:0 }} />
                  <span style={{ opacity:0.55 }}>{CONC_LABEL[c]}</span>
                </div>
              ))}
              <div style={{ marginTop:8, fontSize:9, opacity:0.35 }}>◆ chokepoint crossed</div>
            </div>
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:"20px" }}>
            {/* Concentration grid */}
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:9, letterSpacing:"0.25em", color:"#f59e0b", opacity:0.7, marginBottom:12 }}>CONCENTRATION GRID — all chains × tiers</div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ borderCollapse:"collapse", width:"100%", fontSize:10 }}>
                  <thead>
                    <tr>
                      <th style={{ padding:"6px 10px", textAlign:"left", opacity:0.4, fontWeight:400, fontSize:9 }}>CHAIN</th>
                      {TIER_LABELS.map((t,i) => <th key={i} style={{ padding:"6px 8px", textAlign:"center", opacity:0.4, fontWeight:400, fontSize:9, whiteSpace:"nowrap" }}>{t.toUpperCase()}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {CHAINS.map(chain => (
                      <tr key={chain.id} onClick={() => { setSelectedChain(chain.id); setSelectedNodeId(null); }} style={{ cursor:"pointer" }}>
                        <td style={{ padding:"5px 10px", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <span style={{ width:6, height:6, borderRadius:"50%", background:chain.color, flexShrink:0 }} />
                            <span style={{ fontWeight:selectedChain===chain.id?700:400, color:selectedChain===chain.id?"white":"rgba(255,255,255,0.55)", letterSpacing:"0.02em" }}>{chain.short}</span>
                          </div>
                        </td>
                        {[0,1,2,3,4].map(tier => {
                          const cell = concentrationForCell(chain.id, tier as any);
                          if (!cell) return <td key={tier} style={{ padding:"5px 8px", borderBottom:"1px solid rgba(255,255,255,0.05)", textAlign:"center" }}><span style={{ opacity:0.15 }}>—</span></td>;
                          return (
                            <td key={tier} style={{ padding:"5px 8px", borderBottom:"1px solid rgba(255,255,255,0.05)", textAlign:"center" }}>
                              <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 7px", borderRadius:4, fontSize:8, fontWeight:700, background:`${CONC_COLOR[cell.conc]}18`, border:`1px solid ${CONC_COLOR[cell.conc]}40`, color:CONC_COLOR[cell.conc] }}>
                                {cell.hasCp && <span>◆</span>}
                                {CONC_LABEL[cell.conc]}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected chain — tier detail */}
            {(() => {
              const chain = CHAINS.find(c => c.id === selectedChain)!;
              const cp = CHAIN_PARAMS[selectedChain];
              return (
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
                    <span style={{ width:8, height:8, borderRadius:"50%", background:chain.color }} />
                    <span style={{ fontSize:13, fontWeight:700 }}>{chain.label}</span>
                    <span style={{ fontSize:9, opacity:0.3 }}>cargo: {chain.cargo}</span>
                  </div>
                  {TIER_LABELS.map((tierLabel, t) => {
                    const nodes = NODES.filter(n => n.chain === selectedChain && n.tier === t);
                    return (
                      <div key={t} style={{ marginBottom:16, padding:"12px 14px", borderRadius:10, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)" }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontSize:9, letterSpacing:"0.2em", color:"#f59e0b", opacity:0.8 }}>T{t} · {tierLabel.toUpperCase()}</span>
                          </div>
                          <div style={{ fontSize:9, opacity:0.3 }}>buffer {cp.bufferWeeks[t]}wk · lead {cp.leadTime[t]}wk</div>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                          {nodes.map(node => (
                            <div key={node.id} onClick={() => setSelectedNodeId(selectedNodeId === node.id ? null : node.id)} style={{ padding:"8px 10px", borderRadius:8, cursor:"pointer", background:selectedNodeId===node.id?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.02)", border:`1px solid ${selectedNodeId===node.id?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.05)"}` }}>
                              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:3 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                  <span style={{ width:6, height:6, borderRadius:"50%", background:CONC_COLOR[node.concentration], flexShrink:0 }} />
                                  <span style={{ fontSize:11, fontWeight:600 }}>{node.name}</span>
                                  {node.est && <span style={{ fontSize:8, opacity:0.4, fontStyle:"italic" }}>est.</span>}
                                </div>
                                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                                  {node.chokepoints.map(cp => <span key={cp} style={{ fontSize:8, padding:"1px 5px", borderRadius:3, background:"rgba(248,113,113,0.12)", border:"1px solid rgba(248,113,113,0.25)", color:"#f87171" }}>◆ {cp}</span>)}
                                </div>
                              </div>
                              <div style={{ fontSize:9, opacity:0.4, marginBottom:selectedNodeId===node.id?6:0 }}>{node.region} · {Math.round(node.share*100)}% tier share · {CONC_LABEL[node.concentration]}</div>
                              {selectedNodeId === node.id && <div style={{ fontSize:10, opacity:0.65, lineHeight:1.5, paddingTop:6, borderTop:"1px solid rgba(255,255,255,0.06)" }}>{node.note}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── CHOKEPOINTS TAB ── */}
      {tab === "chokepoints" && (
        <div style={{ flex:1, overflowY:"auto", padding:"20px" }}>
          <div style={{ fontSize:9, letterSpacing:"0.25em", color:"#f59e0b", opacity:0.7, marginBottom:16 }}>CHOKEPOINT EXPOSURE — share of most-exposed tier · after rerouting</div>

          {/* Chokepoint cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(340px, 1fr))", gap:12, marginBottom:28 }}>
            {(Object.values(CHOKEPOINTS)).map(cp => (
              <div key={cp.id} style={{ padding:"12px 14px", borderRadius:10, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:12, fontWeight:700 }}>{cp.name}</span>
                  <span style={{ fontSize:9, opacity:0.35 }}>{Math.round(cp.reroutable*100)}% reroutable</span>
                </div>
                <div style={{ fontSize:9, opacity:0.4, marginBottom:10 }}>{cp.alt}</div>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  {CHAINS.map(chain => {
                    const chainNodes = NODES.filter(n => n.chain === chain.id && n.chokepoints.includes(cp.id));
                    if (!chainNodes.length) return null;
                    const tierShares: Record<number, number> = {};
                    for (const n of chainNodes) {
                      tierShares[n.tier] = (tierShares[n.tier] ?? 0) + n.share;
                    }
                    const maxTier = Object.entries(tierShares).sort((a,b) => parseFloat(b[1].toString())-parseFloat(a[1].toString()))[0];
                    const exposed = parseFloat(maxTier[1].toString());
                    const afterReroute = exposed * (1 - cp.reroutable);
                    return (
                      <div key={chain.id} style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ width:6, height:6, borderRadius:"50%", background:chain.color, flexShrink:0 }} />
                        <span style={{ fontSize:10, flex:1, opacity:0.7 }}>{chain.short}</span>
                        <div style={{ width:80, height:4, borderRadius:2, background:"rgba(255,255,255,0.08)", position:"relative", overflow:"hidden" }}>
                          <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${Math.min(100,exposed*100)}%`, background:chain.color, opacity:0.4, borderRadius:2 }} />
                          <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${Math.min(100,afterReroute*100)}%`, background:chain.color, borderRadius:2 }} />
                        </div>
                        <span style={{ fontSize:9, opacity:0.5, width:36, textAlign:"right" }}>{Math.round(afterReroute*100)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Cross-chain links */}
          <div style={{ fontSize:9, letterSpacing:"0.25em", color:"#f59e0b", opacity:0.7, marginBottom:12 }}>CROSS-CHAIN DEPENDENCIES</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {CROSS_LINKS.map((link,i) => {
              const from = CHAINS.find(c => c.id === link.fromChain)!;
              const to = CHAINS.find(c => c.id === link.toChain)!;
              return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ fontSize:10, fontWeight:700, color:from.color }}>{from.short}</span>
                  <span style={{ fontSize:10, opacity:0.4 }}>→</span>
                  <span style={{ fontSize:10, fontWeight:700, color:to.color }}>{to.short}</span>
                  <span style={{ fontSize:9, opacity:0.3 }}>T{link.toTier} ({TIER_LABELS[link.toTier]})</span>
                  <span style={{ fontSize:9, padding:"1px 6px", borderRadius:4, background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.2)", color:"#f59e0b" }}>{Math.round(link.weight*100)}% · {link.lagWeeks}wk lag</span>
                  <span style={{ fontSize:9, opacity:0.45, flex:1, textAlign:"right" }}>{link.why}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SHOCK TAB ── */}
      {tab === "shock" && (
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
          {/* Left: controls */}
          <div style={{ ...glass, width:280, flexShrink:0, borderRight:"1px solid rgba(255,255,255,0.07)", overflowY:"auto", padding:"16px 14px" }}>
            {/* Presets */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:9, letterSpacing:"0.25em", color:"#f59e0b", opacity:0.7, marginBottom:10 }}>PRESETS</div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {PRESETS.map(p => (
                  <button key={p.id} onClick={() => applyPreset(p.id)} style={{ padding:"7px 10px", borderRadius:7, fontSize:10, cursor:"pointer", textAlign:"left", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.7)" }}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.08)"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.04)"}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chokepoint sliders */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:9, letterSpacing:"0.25em", color:"#f59e0b", opacity:0.7, marginBottom:10 }}>CHOKEPOINT CLOSURE %</div>
              {(Object.values(CHOKEPOINTS)).map(cp => {
                const val = Math.round((closures[cp.id] ?? 0) * 100);
                return (
                  <div key={cp.id} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontSize:9, opacity:0.6 }}>{cp.name.replace("Strait of ","").replace(" Canal","")}</span>
                      <span style={{ fontSize:9, color:val>0?"#f87171":"rgba(255,255,255,0.25)", fontWeight:700 }}>{val}%</span>
                    </div>
                    <input type="range" min={0} max={100} value={val}
                      onChange={e => setClosures(prev => ({ ...prev, [cp.id]: parseInt(e.target.value)/100 }))}
                      style={{ width:"100%", accentColor:"#f87171", cursor:"pointer" }} />
                  </div>
                );
              })}
            </div>

            {/* Duration */}
            <div style={{ marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:9, letterSpacing:"0.25em", color:"#f59e0b", opacity:0.7 }}>DURATION</span>
                <span style={{ fontSize:9, fontWeight:700 }}>{durationWeeks} weeks</span>
              </div>
              <input type="range" min={1} max={52} value={durationWeeks}
                onChange={e => setDurationWeeks(parseInt(e.target.value))}
                style={{ width:"100%", accentColor:"#f59e0b", cursor:"pointer" }} />
            </div>

            {/* Reset + Export */}
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={() => { setClosures({}); setOutages({}); }} style={{ flex:1, padding:"7px", borderRadius:7, fontSize:10, cursor:"pointer", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.5)" }}>Reset</button>
              <button onClick={exportJSON} disabled={!simResult} style={{ flex:1, padding:"7px", borderRadius:7, fontSize:10, cursor:simResult?"pointer":"not-allowed", background:simResult?"rgba(245,158,11,0.12)":"rgba(255,255,255,0.02)", border:`1px solid ${simResult?"rgba(245,158,11,0.3)":"rgba(255,255,255,0.06)"}`, color:simResult?"#f59e0b":"rgba(255,255,255,0.2)" }}>
                {showExport ? "Copied ✓" : "Export JSON"}
              </button>
            </div>

            {/* GDELT live disruption signals */}
            {Object.keys(gdeltSignals).some(k => gdeltSignals[k].articleCount > 0) && (
              <div style={{ marginTop:16, paddingTop:14, borderTop:"1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ fontSize:9, letterSpacing:"0.2em", color:"#f87171", opacity:0.9, marginBottom:8 }}>GDELT LIVE SIGNALS</div>
                {Object.entries(gdeltSignals).filter(([,v]) => v.articleCount > 0).map(([nodeId, sig]) => (
                  <div key={nodeId} style={{ marginBottom:6, padding:"6px 8px", borderRadius:6, background:"rgba(248,113,113,0.05)", border:"1px solid rgba(248,113,113,0.15)" }}>
                    <div style={{ fontSize:9, fontWeight:700, opacity:0.8, marginBottom:2 }}>{nodeId}</div>
                    <div style={{ fontSize:8, opacity:0.5 }}>{sig.articleCount} articles · 48h window</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: results */}
          <div style={{ flex:1, overflowY:"auto", padding:"20px" }}>
            {!simResult ? (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:12, opacity:0.25, textAlign:"center" }}>
                <span style={{ fontSize:32 }}>⚡</span>
                <p style={{ fontSize:13, margin:0 }}>Set a chokepoint closure or select a preset to run the shock model</p>
                <p style={{ fontSize:10, margin:0, opacity:0.6 }}>Weekly stock-and-flow simulation · 52-week horizon</p>
              </div>
            ) : (
              <>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                  <div style={{ fontSize:9, letterSpacing:"0.25em", color:"#f59e0b", opacity:0.7 }}>SHOCK RESULTS — delivered supply at end demand</div>
                  <div style={{ fontSize:9, opacity:0.3 }}>duration {durationWeeks}wk · horizon 52wk</div>
                </div>

                {/* Summary table */}
                <div style={{ overflowX:"auto", marginBottom:24 }}>
                  <table style={{ borderCollapse:"collapse", width:"100%", fontSize:10 }}>
                    <thead>
                      <tr>
                        {["Chain","Cargo","Peak shortfall","Peak wk","First felt","Recovered"].map(h => <th key={h} style={{ padding:"6px 10px", textAlign:"left", opacity:0.4, fontWeight:400, fontSize:9, borderBottom:"1px solid rgba(255,255,255,0.07)" }}>{h.toUpperCase()}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {simResult.chains.map(cr => {
                        const chain = CHAINS.find(c => c.id === cr.id)!;
                        const severity = cr.peakShortfall > 10 ? "#ef4444" : cr.peakShortfall > 3 ? "#f59e0b" : "#22c55e";
                        return (
                          <tr key={cr.id}>
                            <td style={{ padding:"6px 10px", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                <span style={{ width:6, height:6, borderRadius:"50%", background:chain.color, flexShrink:0 }} />
                                {chain.short}
                              </div>
                            </td>
                            <td style={{ padding:"6px 10px", borderBottom:"1px solid rgba(255,255,255,0.05)", opacity:0.4 }}>{cr.cargo}</td>
                            <td style={{ padding:"6px 10px", borderBottom:"1px solid rgba(255,255,255,0.05)", color:severity, fontWeight:700 }}>{cr.peakShortfall > 0 ? `${cr.peakShortfall}%` : "—"}</td>
                            <td style={{ padding:"6px 10px", borderBottom:"1px solid rgba(255,255,255,0.05)", opacity:0.6 }}>{cr.peakShortfall > 0 ? `wk ${cr.peakWeek}` : "—"}</td>
                            <td style={{ padding:"6px 10px", borderBottom:"1px solid rgba(255,255,255,0.05)", opacity:0.6 }}>{cr.firstFeltWeek > 0 ? `wk ${cr.firstFeltWeek}` : "—"}</td>
                            <td style={{ padding:"6px 10px", borderBottom:"1px solid rgba(255,255,255,0.05)", opacity:0.6 }}>{cr.recoveredWeek ? `wk ${cr.recoveredWeek}` : cr.peakShortfall > 0 ? ">wk 52" : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Sparkline charts per chain */}
                {simResult.chains.filter(cr => cr.peakShortfall > 0.5).map(cr => {
                  const chain = CHAINS.find(c => c.id === cr.id)!;
                  const W = 52;
                  const H = 40;
                  const pts = cr.deliveredPct.map((v,i) => `${(i/(W-1))*100},${H - (v/100)*H}`).join(" ");
                  return (
                    <div key={cr.id} style={{ marginBottom:12, padding:"10px 14px", borderRadius:8, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ width:7, height:7, borderRadius:"50%", background:chain.color }} />
                          <span style={{ fontSize:11, fontWeight:600 }}>{chain.label}</span>
                        </div>
                        <span style={{ fontSize:9, opacity:0.4 }}>peak shortfall {cr.peakShortfall}% · wk {cr.peakWeek}</span>
                      </div>
                      <svg width="100%" viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" style={{ height:H, display:"block" }}>
                        {/* Shock duration band */}
                        <rect x={0} y={0} width={`${(durationWeeks/W)*100}`} height={H} fill="rgba(248,113,113,0.06)" />
                        {/* 100% baseline */}
                        <line x1={0} y1={0} x2={100} y2={0} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
                        {/* Delivered supply */}
                        <polyline points={pts} fill="none" stroke={chain.color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                        {/* Fill under curve */}
                        <polygon points={`0,${H} ${pts} 100,${H}`} fill={chain.color} opacity={0.08} />
                      </svg>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:8, opacity:0.3, marginTop:2 }}>
                        <span>wk 1</span>
                        <span>wk {durationWeeks} (shock ends)</span>
                        <span>wk 52</span>
                      </div>
                    </div>
                  );
                })}

                {/* Model notes */}
                <div style={{ marginTop:8, padding:"10px 12px", borderRadius:8, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", fontSize:9, opacity:0.35, lineHeight:1.7 }}>
                  Volume only — cost and transit-time effects of rerouting are not modelled. No demand response. Rerouting shares are constant. Basis: mid-2026 snapshot; buffers and lead times are assumptions. One-year horizon; aircraft effects may extend past week 52.
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Macro ticker ── */}
      <div style={{ ...glass, flexShrink:0, borderTop:"1px solid rgba(255,255,255,0.07)", padding:"0 20px", height:52, display:"flex", alignItems:"center", gap:0, overflowX:"auto" }}>
        <span style={{ fontSize:9, letterSpacing:"0.2em", color:"#f59e0b", opacity:0.6, marginRight:20, flexShrink:0 }}>MACRO</span>
        {macroTicks.map((item, i) => (
          <div key={item.id} style={{ display:"flex", alignItems:"center", gap:20 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:1, minWidth:100 }}>
              <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                <span style={{ fontSize:11, fontWeight:700 }}>{item.value}</span>
                <span style={{ fontSize:9, color:item.up?"#4ade80":"#f87171" }}>{item.change}</span>
              </div>
              <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                <span style={{ fontSize:9, opacity:0.35 }}>{item.label}</span>
                {item.kind === "live"
                  ? <span style={{ fontSize:8, color:"#4ade80", opacity:0.7 }}>· live · {item.asOf}</span>
                  : <span style={{ fontSize:8, opacity:0.2 }}>· snapshot · {item.asOf}</span>}
              </div>
            </div>
            {i < macroTicks.length - 1 && <div style={{ width:1, height:28, background:"rgba(255,255,255,0.07)", flexShrink:0 }} />}
          </div>
        ))}
        <div style={{ marginLeft:"auto", flexShrink:0, display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:9, opacity:0.2 }}>GDELT · macro feeds:</span>
          {feedsConnected
            ? <span style={{ fontSize:9, color:"#4ade80", background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.25)", padding:"1px 6px", borderRadius:4, display:"flex", alignItems:"center", gap:4 }}><span style={{ width:5, height:5, borderRadius:"50%", background:"#4ade80", display:"inline-block" }} />CONNECTED</span>
            : <span style={{ fontSize:9, color:"#6b7280", background:"rgba(107,114,128,0.1)", border:"1px solid rgba(107,114,128,0.2)", padding:"1px 6px", borderRadius:4 }}>CONNECTING…</span>}
        </div>
      </div>
    </div>
  );
}
