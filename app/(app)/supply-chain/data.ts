// Supply Web — full data model
// 8 chains · 5 tiers · ~110 nodes · 8 chokepoints · 6 cross-chain links

export type ChainId = "oil" | "gas" | "steel" | "chips" | "batteries" | "food" | "pharma" | "aircraft";
export type TierIdx = 0 | 1 | 2 | 3 | 4;
export type ChokepointId = "hormuz" | "malacca" | "babel" | "suez" | "panama" | "gibraltar" | "taiwan" | "bosporus";
export type Concentration = "spread" | "moderate" | "concentrated" | "single";

export interface Chain {
  id: ChainId;
  label: string;
  short: string;
  cargo: string;
  color: string;
}

export interface Chokepoint {
  id: ChokepointId;
  name: string;
  reroutable: number; // 0–1
  alt: string;
  lat: number;
  lon: number;
}

export interface WebNode {
  id: string;
  name: string;
  region: string;
  chain: ChainId;
  tier: TierIdx;
  share: number;      // share of its tier, 0–1
  concentration: Concentration;
  est: boolean;
  chokepoints: ChokepointId[];
  note: string;
}

export interface CrossLink {
  fromChain: ChainId;
  toChain: ChainId;
  toTier: TierIdx;
  weight: number;   // 0–1
  lagWeeks: number;
  why: string;
}

export interface ChainParams {
  bufferWeeks: [number, number, number, number, number];
  releaseRate: [number, number, number, number, number];
  leadTime: [number, number, number, number, number];
}

export interface Preset {
  id: string;
  label: string;
  closures: Partial<Record<ChokepointId, number>>;
  outages: Record<string, number>;
  durationWeeks: number;
}

// ─── Chains ───────────────────────────────────────────────────
export const CHAINS: Chain[] = [
  { id: "oil",      label: "Crude oil to fuels",      short: "Oil",      cargo: "tanker",    color: "#f59e0b" },
  { id: "gas",      label: "Natural gas and LNG",      short: "Gas",      cargo: "lng",       color: "#60a5fa" },
  { id: "steel",    label: "Iron, steel and copper",   short: "Steel",    cargo: "dry_bulk",  color: "#94a3b8" },
  { id: "chips",    label: "Semiconductors",           short: "Chips",    cargo: "air",       color: "#a78bfa" },
  { id: "batteries",label: "Batteries and magnets",   short: "Batt.",    cargo: "container", color: "#34d399" },
  { id: "food",     label: "Fertiliser and food",      short: "Food",     cargo: "dry_bulk",  color: "#fbbf24" },
  { id: "pharma",   label: "Pharmaceuticals",          short: "Pharma",   cargo: "air",       color: "#f472b6" },
  { id: "aircraft", label: "Commercial aircraft",      short: "Aircraft", cargo: "air",       color: "#fb923c" },
];

export const TIER_LABELS: [string, string, string, string, string] = [
  "Extract", "Process", "Intermediate", "Assemble & Distribute", "Demand",
];

// ─── Chokepoints ──────────────────────────────────────────────
export const CHOKEPOINTS: Record<ChokepointId, Chokepoint> = {
  hormuz:    { id: "hormuz",    name: "Strait of Hormuz",    reroutable: 0.25, alt: "Saudi/UAE pipelines (crude only)",       lat: 26.6,  lon: 56.4 },
  malacca:   { id: "malacca",   name: "Strait of Malacca",   reroutable: 0.85, alt: "Lombok / Sunda straits (+2–3 days)",     lat: 2.5,   lon: 101.5 },
  babel:     { id: "babel",     name: "Bab el-Mandeb",       reroutable: 0.90, alt: "Cape of Good Hope (+14 days)",           lat: 12.6,  lon: 43.4 },
  suez:      { id: "suez",      name: "Suez Canal",          reroutable: 0.90, alt: "Cape of Good Hope (+14 days)",           lat: 30.5,  lon: 32.35 },
  panama:    { id: "panama",    name: "Panama Canal",        reroutable: 0.60, alt: "Suez routing or US rail land bridge",    lat: 9.1,   lon: -79.7 },
  gibraltar: { id: "gibraltar", name: "Strait of Gibraltar", reroutable: 0.20, alt: "Few alternatives for Med traffic",       lat: 35.9,  lon: -5.5 },
  taiwan:    { id: "taiwan",    name: "Taiwan Strait",       reroutable: 0.70, alt: "Passage east of Taiwan (+1 day)",        lat: 24.5,  lon: 119.5 },
  bosporus:  { id: "bosporus",  name: "Turkish Straits",     reroutable: 0.05, alt: "None — landlocked Black Sea",            lat: 41.1,  lon: 29.1 },
};

// ─── Cross-chain links ────────────────────────────────────────
export const CROSS_LINKS: CrossLink[] = [
  { fromChain: "gas",      toChain: "food",     toTier: 1, weight: 0.40, lagWeeks: 2,  why: "Gas → ammonia → nitrogen fertiliser" },
  { fromChain: "oil",      toChain: "pharma",   toTier: 0, weight: 0.15, lagWeeks: 2,  why: "Petrochemical solvents and reagents" },
  { fromChain: "oil",      toChain: "food",     toTier: 3, weight: 0.10, lagWeeks: 1,  why: "Diesel for farming, milling and freight" },
  { fromChain: "chips",    toChain: "batteries",toTier: 3, weight: 0.25, lagWeeks: 4,  why: "Battery management and vehicle electronics" },
  { fromChain: "chips",    toChain: "aircraft", toTier: 2, weight: 0.20, lagWeeks: 4,  why: "Avionics and engine controls" },
  { fromChain: "batteries",toChain: "aircraft", toTier: 0, weight: 0.15, lagWeeks: 4,  why: "Rare-earth magnets and cobalt for superalloys" },
];

// ─── Nodes ────────────────────────────────────────────────────
export const NODES: WebNode[] = [

  // ── OIL ──
  { id:"oil_x_mideast",   name:"Middle East fields",         region:"Saudi Arabia / Iraq / Kuwait / UAE", chain:"oil", tier:0, share:0.35, concentration:"moderate",     est:false, chokepoints:["hormuz"],              note:"~35% world liquids; Ghawar, Rumaila, Bu Hasa. EIA 2025." },
  { id:"oil_x_russia",    name:"Russia / CIS fields",        region:"Western Siberia / Volga-Ural",       chain:"oil", tier:0, share:0.12, concentration:"moderate",     est:false, chokepoints:["bosporus"],            note:"~12% world production; Lukoil, Rosneft, Gazprom Neft." },
  { id:"oil_x_us",        name:"US tight oil",               region:"Permian / Bakken / Eagle Ford",      chain:"oil", tier:0, share:0.13, concentration:"spread",       est:false, chokepoints:[],                      note:"~13% world; IEA 2025 estimate." },
  { id:"oil_x_other",     name:"Other producers",            region:"Africa / Latin America / North Sea", chain:"oil", tier:0, share:0.40, concentration:"spread",       est:false, chokepoints:["hormuz","babel","suez"],note:"Rest of world; diverse geography." },

  { id:"oil_p_mideast",   name:"Middle East refineries",     region:"Saudi Arabia / UAE / Kuwait",        chain:"oil", tier:1, share:0.10, concentration:"moderate",     est:false, chokepoints:["hormuz","babel","suez"],note:"Saudi Aramco Jubail; Ruwais (UAE). Growing export-refining model." },
  { id:"oil_p_asia",      name:"Asia-Pacific refineries",    region:"China / India / Singapore / Japan",  chain:"oil", tier:1, share:0.35, concentration:"spread",       est:false, chokepoints:["malacca"],             note:"~35% world refining capacity; IEA." },
  { id:"oil_p_europe",    name:"European refineries",        region:"Netherlands / Italy / Germany / UK", chain:"oil", tier:1, share:0.15, concentration:"moderate",     est:false, chokepoints:["suez","gibraltar"],     note:"Rotterdam, Antwerp, Fawley; declining capacity post-2020." },
  { id:"oil_p_americas",  name:"Americas refineries",        region:"US Gulf Coast / Brazil / Canada",    chain:"oil", tier:1, share:0.25, concentration:"spread",       est:false, chokepoints:["panama"],              note:"US Gulf dominates; ~18% world." },

  { id:"oil_i_diesel",    name:"Diesel / gasoil",            region:"Global",                             chain:"oil", tier:2, share:0.30, concentration:"spread",       est:false, chokepoints:["hormuz","suez","malacca"],note:"~30% of refined product by volume. Key for transport and agriculture." },
  { id:"oil_i_jet",       name:"Jet fuel / kerosene",        region:"Global",                             chain:"oil", tier:2, share:0.08, concentration:"spread",       est:false, chokepoints:["hormuz","suez"],        note:"~8% refined product; aviation demand recovery post-2022." },
  { id:"oil_i_naptha",    name:"Naphtha / petrochemical feed",region:"Global",                            chain:"oil", tier:2, share:0.12, concentration:"moderate",     est:false, chokepoints:["hormuz","malacca"],     note:"Feedstock for plastics and chemicals. Middle East→Asia arbitrage." },

  { id:"oil_a_vlcc",      name:"VLCC tanker fleet",          region:"Global (flagged Panama/Marshall Is)",chain:"oil", tier:3, share:0.40, concentration:"spread",       est:false, chokepoints:["hormuz","babel","suez","malacca"],note:"~800 VLCCs globally; Clarksons Research." },
  { id:"oil_a_product",   name:"Product tanker fleet",       region:"Global",                             chain:"oil", tier:3, share:0.30, concentration:"spread",       est:false, chokepoints:["babel","suez","hormuz"],note:"~4,000 product tankers; MR / LR1 / LR2 sizes." },
  { id:"oil_a_pipeline",  name:"Crude / product pipelines",  region:"US / Russia / Middle East",         chain:"oil", tier:3, share:0.30, concentration:"moderate",     est:false, chokepoints:[],                      note:"US Colonial, Trans-Arabia, Druzhba; partially bypass chokepoints." },

  { id:"oil_d_transport", name:"Road transport fuel",        region:"Global",                             chain:"oil", tier:4, share:0.46, concentration:"spread",       est:false, chokepoints:[],                      note:"~46% end demand; IEA." },
  { id:"oil_d_aviation",  name:"Aviation fuel",              region:"Global",                             chain:"oil", tier:4, share:0.07, concentration:"spread",       est:false, chokepoints:[],                      note:"~7% end demand; IATA." },
  { id:"oil_d_industry",  name:"Industrial / power",         region:"Global",                             chain:"oil", tier:4, share:0.24, concentration:"spread",       est:false, chokepoints:[],                      note:"Heating oil, residual fuel, power generation." },
  { id:"oil_d_petrochem", name:"Petrochemicals",             region:"Global",                             chain:"oil", tier:4, share:0.23, concentration:"moderate",     est:false, chokepoints:[],                      note:"Plastics, solvents, fibres. IEA: fastest-growing oil demand driver." },

  // ── GAS ──
  { id:"gas_x_qatar",     name:"Qatar (North Field)",        region:"Qatar",                              chain:"gas", tier:0, share:0.21, concentration:"single",       est:false, chokepoints:["hormuz","babel"],       note:"World's largest single gas reservoir; ~77Mtpa LNG capacity. Est. remains post-2026 expansion." },
  { id:"gas_x_aus",       name:"Australia LNG fields",       region:"NW Shelf / Gorgon / Ichthys",        chain:"gas", tier:0, share:0.22, concentration:"moderate",     est:false, chokepoints:["malacca"],             note:"~22% global LNG supply; IEA 2025." },
  { id:"gas_x_us",        name:"US natural gas",             region:"Permian / Marcellus / Haynesville",  chain:"gas", tier:0, share:0.20, concentration:"spread",       est:false, chokepoints:[],                      note:"~24% world gas production; growing LNG export volumes." },
  { id:"gas_x_russia",    name:"Russia gas fields",          region:"West Siberia / Yamal",               chain:"gas", tier:0, share:0.17, concentration:"moderate",     est:false, chokepoints:["bosporus"],            note:"TurkStream / Blue Stream for Europe; Sakhalin-2 LNG for Asia." },
  { id:"gas_x_other",     name:"Other gas producers",        region:"Africa / Middle East / SE Asia",     chain:"gas", tier:0, share:0.20, concentration:"spread",       est:false, chokepoints:["babel","hormuz","suez"],note:"Nigeria, Mozambique, Malaysia; diverse." },

  { id:"gas_p_qatar_lng", name:"Qatar LNG plants",           region:"Ras Laffan, Qatar",                  chain:"gas", tier:1, share:0.21, concentration:"single",       est:false, chokepoints:["hormuz"],              note:"14 LNG trains at Ras Laffan; 99+ Mtpa. IEA." },
  { id:"gas_p_aus_lng",   name:"Australia LNG plants",       region:"Darwin / Gladstone / WA",            chain:"gas", tier:1, share:0.22, concentration:"moderate",     est:false, chokepoints:[],                      note:"Gorgon (Chevron), Ichthys (Inpex), APLNG, GLNG." },
  { id:"gas_p_us_lng",    name:"US Gulf LNG terminals",      region:"Sabine Pass / Freeport / Corpus Christi",chain:"gas",tier:1,share:0.20,concentration:"moderate",    est:false, chokepoints:[],                      note:"Cheniere / Freeport / Venture Global; ~14 Bcf/d export cap." },
  { id:"gas_p_other",     name:"Other liquefaction / pipelines",region:"Russia / Nigeria / Malaysia",    chain:"gas", tier:1, share:0.37, concentration:"spread",       est:false, chokepoints:["bosporus","babel","hormuz"],note:"Yamal LNG, Nigeria NLNG, Malaysia LNG." },

  { id:"gas_i_lng",       name:"LNG cargoes in transit",     region:"Global",                             chain:"gas", tier:2, share:0.65, concentration:"spread",       est:false, chokepoints:["hormuz","babel","suez","malacca"],note:"~600 LNG carriers globally; 90% of LNG trade." },
  { id:"gas_i_pipeline",  name:"Pipeline gas flows",         region:"Europe / Central Asia / E Asia",     chain:"gas", tier:2, share:0.35, concentration:"moderate",     est:false, chokepoints:["bosporus"],            note:"TurkStream, TAP, Trans-Adriatic; lower flexibility than LNG." },

  { id:"gas_a_fleet",     name:"LNG tanker fleet",           region:"Global",                             chain:"gas", tier:3, share:0.65, concentration:"spread",       est:false, chokepoints:["hormuz","babel","suez","malacca"],note:"~660 LNG carriers; growing fleet (QCCO orders). Clarksons." },
  { id:"gas_a_regas",     name:"Asian regas terminals",      region:"Japan / Korea / China / India",      chain:"gas", tier:3, share:0.50, concentration:"spread",       est:false, chokepoints:["malacca"],             note:"~350 Mtpa regas capacity in Asia; GIIGNL 2025." },
  { id:"gas_a_eugrid",    name:"European gas grid",          region:"EU / UK",                            chain:"gas", tier:3, share:0.35, concentration:"moderate",     est:false, chokepoints:["bosporus"],            note:"ENTSOG network; Flude, TTF virtual hubs." },

  { id:"gas_d_power",     name:"Power generation",           region:"Global",                             chain:"gas", tier:4, share:0.40, concentration:"spread",       est:false, chokepoints:[],                      note:"~40% gas end use; IEA." },
  { id:"gas_d_fert",      name:"Ammonia / nitrogen fertiliser",region:"Global",                          chain:"gas", tier:4, share:0.25, concentration:"moderate",     est:false, chokepoints:[],                      note:"Gas feedstock for Haber-Bosch; ~2 tcf/yr demand. IFA." },
  { id:"gas_d_heat",      name:"Residential / commercial heat",region:"Europe / North America",          chain:"gas", tier:4, share:0.20, concentration:"spread",       est:false, chokepoints:[],                      note:"EU and North America largest markets; seasonal swing." },
  { id:"gas_d_other",     name:"Industry / LNG bunker",      region:"Global",                             chain:"gas", tier:4, share:0.15, concentration:"spread",       est:true,  chokepoints:[],                      note:"Chemicals, LNG marine fuel; fast-growing." },

  // ── STEEL ──
  { id:"stl_x_aus_ore",   name:"Australian iron ore (Pilbara)",region:"Western Australia",               chain:"steel",tier:0,share:0.38, concentration:"concentrated", est:false, chokepoints:["malacca"],             note:"BHP, Rio Tinto, FMG; ~900 Mt exported 2024. USGS." },
  { id:"stl_x_bra_ore",   name:"Brazilian iron ore (Vale)",   region:"Carajás / Minas Gerais",           chain:"steel",tier:0,share:0.23, concentration:"moderate",     est:false, chokepoints:["panama","suez"],        note:"~380 Mt exported 2024; Vale S.A. World's largest miner." },
  { id:"stl_x_cu_chile",  name:"Copper: Chile / Peru",        region:"Atacama / Andes",                  chain:"steel",tier:0,share:0.40, concentration:"concentrated", est:false, chokepoints:["panama"],              note:"~40% world mine copper; Codelco, Antofagasta. USGS." },
  { id:"stl_x_cu_drc",    name:"Copper: DRC / Zambia",        region:"Copperbelt",                       chain:"steel",tier:0,share:0.12, concentration:"moderate",     est:false, chokepoints:["babel","suez"],         note:"Ivanhoe, Glencore; ~12% world mine output." },
  { id:"stl_x_other",     name:"Other iron ore / scrap",      region:"India / Ukraine / Canada",         chain:"steel",tier:0,share:0.27, concentration:"spread",       est:false, chokepoints:[],                      note:"Global scrap trade partially offsets ore concentration." },

  { id:"stl_p_china",     name:"China steel (BF/BOF)",        region:"Hebei / Jiangsu / Shandong",       chain:"steel",tier:1,share:0.55, concentration:"concentrated", est:false, chokepoints:["malacca"],             note:"~1,000 Mt/yr; ~55% world; worldsteel 2025." },
  { id:"stl_p_india",     name:"India steel",                 region:"Odisha / Jharkhand / Maharashtra", chain:"steel",tier:1,share:0.07, concentration:"moderate",     est:false, chokepoints:["hormuz","malacca"],     note:"Tata, JSW, SAIL; ~130 Mt/yr; fastest growing. worldsteel." },
  { id:"stl_p_eu",        name:"EU steel mills",              region:"Germany / France / Italy / Spain", chain:"steel",tier:1,share:0.08, concentration:"moderate",     est:false, chokepoints:["suez","gibraltar"],     note:"ArcelorMittal, Thyssenkrupp; ~130 Mt/yr; worldsteel." },
  { id:"stl_p_cu_refine", name:"Copper smelting / refining",  region:"China / Chile / Japan",            chain:"steel",tier:1,share:0.45, concentration:"concentrated", est:false, chokepoints:["malacca"],             note:"China ~45% world refined copper; USGS 2025." },
  { id:"stl_p_rest",      name:"Rest of world steel",         region:"Americas / SE Asia / ME",          chain:"steel",tier:1,share:0.30, concentration:"spread",       est:false, chokepoints:["panama","suez"],        note:"US (Nucor), Korea (POSCO), Turkey, Japan (JFE)." },

  { id:"stl_i_flat",      name:"Flat products (HRC / plate)", region:"Global",                           chain:"steel",tier:2,share:0.45, concentration:"spread",       est:false, chokepoints:["malacca","suez"],       note:"Automotive and construction backbone. ~800 Mt/yr." },
  { id:"stl_i_long",      name:"Long products (rebar / wire)",region:"Global",                           chain:"steel",tier:2,share:0.30, concentration:"spread",       est:false, chokepoints:[],                      note:"Rebar dominant in EM construction." },
  { id:"stl_i_copper",    name:"Refined copper cathode",      region:"Global",                           chain:"steel",tier:2,share:0.25, concentration:"concentrated", est:false, chokepoints:["malacca","suez"],       note:"~26 Mt/yr; CME/LME settlement grade; USGS." },

  { id:"stl_a_bulk",      name:"Dry bulk fleet (Cape / Panamax)",region:"Global",                        chain:"steel",tier:3,share:0.60, concentration:"spread",       est:false, chokepoints:["malacca","suez","panama"],note:"~2,300 Capesize vessels; Clarksons Research." },
  { id:"stl_a_svc",       name:"Steel service centres",       region:"Global",                           chain:"steel",tier:3,share:0.25, concentration:"spread",       est:false, chokepoints:[],                      note:"Stockholding, processing and distribution." },
  { id:"stl_a_cu_fab",    name:"Copper rod and wire mills",   region:"China / Germany / US",             chain:"steel",tier:3,share:0.15, concentration:"moderate",     est:false, chokepoints:[],                      note:"Downstream processing to wire rod before OEM use." },

  { id:"stl_d_constr",    name:"Construction",                region:"Global",                           chain:"steel",tier:4,share:0.52, concentration:"spread",       est:false, chokepoints:[],                      note:"~52% steel demand; worldsteel. Rebar + structural." },
  { id:"stl_d_auto",      name:"Automotive and machinery",    region:"Global",                           chain:"steel",tier:4,share:0.20, concentration:"spread",       est:false, chokepoints:[],                      note:"Flat steel dominant; BEV growth adds copper demand." },
  { id:"stl_d_energy",    name:"Energy infrastructure",       region:"Global",                           chain:"steel",tier:4,share:0.15, concentration:"spread",       est:false, chokepoints:[],                      note:"Wind towers, transformers, grid conductors." },
  { id:"stl_d_elec",      name:"Electrical and electronics",  region:"Global",                           chain:"steel",tier:4,share:0.13, concentration:"spread",       est:false, chokepoints:[],                      note:"~13% copper demand; Copper Alliance." },

  // ── CHIPS ──
  { id:"chp_x_euv",       name:"ASML EUV lithography",        region:"Veldhoven, Netherlands",           chain:"chips",tier:0,share:1.00, concentration:"single",       est:false, chokepoints:[],                      note:"Sole global supplier of EUV tools; prerequisite for <7nm. ASML." },
  { id:"chp_x_equip",     name:"Dep / etch equipment",        region:"US (AMAT, Lam, KLA)",              chain:"chips",tier:0,share:0.60, concentration:"concentrated", est:false, chokepoints:[],                      note:"AMAT + Lam + KLA ~60% global dep/etch/inspect revenue." },
  { id:"chp_x_wafer",     name:"Ultra-pure silicon wafers",   region:"Japan (Shin-Etsu / SUMCO)",        chain:"chips",tier:0,share:0.60, concentration:"concentrated", est:false, chokepoints:["taiwan"],              note:"~60% global prime wafer supply; SEMI." },
  { id:"chp_x_gases",     name:"Specialty process gases",     region:"US / EU / Japan",                  chain:"chips",tier:0,share:0.50, concentration:"moderate",     est:true,  chokepoints:[],                      note:"Neon, krypton, fluorine compounds; Air Liquide, ISCO." },
  { id:"chp_x_rare",      name:"Critical rare-earth inputs",  region:"China (85% processing)",           chain:"chips",tier:0,share:0.85, concentration:"single",       est:false, chokepoints:["malacca","taiwan"],     note:"Rare-earth processing; USGS. Export controls invoked 2024." },

  { id:"chp_p_tsmc",      name:"Leading-edge logic, Taiwan",  region:"Hsinchu / Tainan (TSMC N3/N2)",    chain:"chips",tier:1,share:0.60, concentration:"single",       est:false, chokepoints:["taiwan"],              note:"~60% <7nm wafer share; TSMC 2025 annual report." },
  { id:"chp_p_samsung",   name:"Leading-edge logic, Korea",   region:"Hwaseong / Pyeongtaek (Samsung)",  chain:"chips",tier:1,share:0.15, concentration:"concentrated", est:false, chokepoints:[],                      note:"Samsung ~15% <7nm; ramping 2nm in 2026 est." },
  { id:"chp_p_memory",    name:"Memory DRAM / NAND, Korea",   region:"Korea (Samsung / SK Hynix)",       chain:"chips",tier:1,share:0.65, concentration:"concentrated", est:false, chokepoints:[],                      note:"Samsung + Hynix ~65% DRAM; Omdia 2025." },
  { id:"chp_p_pkg",       name:"Advanced packaging, Taiwan",  region:"ASE / Amkor / TSMC CoWoS",         chain:"chips",tier:1,share:0.55, concentration:"concentrated", est:false, chokepoints:["taiwan"],              note:"CoWoS, SoIC, EMIB; Taiwan dominates HBM stacking." },
  { id:"chp_p_mature",    name:"Trailing-edge foundry",       region:"China / Japan / EU / US",          chain:"chips",tier:1,share:0.25, concentration:"spread",       est:false, chokepoints:[],                      note:"SMIC, UMC, GlobalFoundries, Tower; mature nodes <28nm." },

  { id:"chp_i_logic",     name:"Advanced logic ICs",          region:"Global",                           chain:"chips",tier:2,share:0.35, concentration:"single",       est:false, chokepoints:["taiwan","malacca"],     note:"CPUs, GPUs, AI accelerators; ~35% chip revenue." },
  { id:"chp_i_memory",    name:"Memory (DRAM / NAND)",        region:"Global",                           chain:"chips",tier:2,share:0.30, concentration:"concentrated", est:false, chokepoints:[],                      note:"~30% chip revenue; SIA." },
  { id:"chp_i_analog",    name:"Analog, power, MCU",          region:"Global",                           chain:"chips",tier:2,share:0.20, concentration:"spread",       est:false, chokepoints:[],                      note:"Texas Instruments, NXP, Renesas; more dispersed supply." },
  { id:"chp_i_adv",       name:"Chiplets and HBM modules",    region:"Taiwan / Korea / US",              chain:"chips",tier:2,share:0.15, concentration:"concentrated", est:true,  chokepoints:["taiwan"],              note:"HBM, 2.5D, 3D-IC; fastest-growing packaging segment." },

  { id:"chp_a_atp",       name:"ATP — SE Asia hubs",          region:"Malaysia / Vietnam / Thailand / Philippines",chain:"chips",tier:3,share:0.55,concentration:"concentrated",est:false,chokepoints:["malacca","taiwan"],note:"Assembly, test and packaging moved to SE Asia. ~55% global." },
  { id:"chp_a_air",       name:"Air freight (SIN / ICN / KHH)",region:"Singapore / Seoul / Kaohsiung",  chain:"chips",tier:3,share:0.90, concentration:"spread",       est:false, chokepoints:["malacca","taiwan"],     note:"~90% chip value moved by air freight; IATA." },
  { id:"chp_a_wh",        name:"Bonded warehouses / hubs",    region:"Netherlands / US / Singapore",     chain:"chips",tier:3,share:0.10, concentration:"spread",       est:true,  chokepoints:[],                      note:"Safety-stock hub strategy; post-2021 shortage driven." },

  { id:"chp_d_consumer",  name:"Consumer electronics",        region:"Global",                           chain:"chips",tier:4,share:0.33, concentration:"spread",       est:false, chokepoints:[],                      note:"~33% chip demand; SIA 2025." },
  { id:"chp_d_dc",        name:"Data centres and AI",         region:"Global",                           chain:"chips",tier:4,share:0.28, concentration:"concentrated", est:false, chokepoints:[],                      note:"AI accelerator demand growing >30%/yr; SIA." },
  { id:"chp_d_auto",      name:"Automotive",                  region:"Global",                           chain:"chips",tier:4,share:0.15, concentration:"spread",       est:false, chokepoints:[],                      note:"~$900 chips/vehicle (ICE) to $3,500 (full EV)." },
  { id:"chp_d_ind",       name:"Industrial and IoT",          region:"Global",                           chain:"chips",tier:4,share:0.24, concentration:"spread",       est:false, chokepoints:[],                      note:"Automation, sensors, energy management." },

  // ── BATTERIES ──
  { id:"bat_x_li",        name:"Lithium — Chile / Argentina", region:"Atacama / Salta / Jujuy",          chain:"batteries",tier:0,share:0.60,concentration:"concentrated",est:false,chokepoints:["panama"],             note:"~60% world lithium mining; USGS 2025." },
  { id:"bat_x_co",        name:"Cobalt — DRC",                region:"Katanga / Lualaba provinces",      chain:"batteries",tier:0,share:0.72,concentration:"single",      est:false,chokepoints:["babel","suez"],       note:"~72% world mine cobalt; Glencore, CMOC. USGS." },
  { id:"bat_x_ni",        name:"Nickel — Indonesia",          region:"Sulawesi / Maluku",                chain:"batteries",tier:0,share:0.52,concentration:"concentrated", est:false,chokepoints:["malacca"],            note:"~52% world nickel mine supply; INSG 2025." },
  { id:"bat_x_graph",     name:"Graphite — China",            region:"Heilongjiang / Sichuan",           chain:"batteries",tier:0,share:0.77,concentration:"single",       est:false,chokepoints:["malacca"],            note:"~77% global flake graphite; USGS. Export restrictions 2023." },
  { id:"bat_x_magnet",    name:"Rare-earth magnets — China",  region:"Inner Mongolia / Jiangxi",         chain:"batteries",tier:0,share:0.85,concentration:"single",       est:false,chokepoints:["malacca","taiwan"],   note:"NdFeB magnets ~85% global; USGS / Adamas." },

  { id:"bat_p_lichem",    name:"Lithium chemicals — China",   region:"Jiangxi / Sichuan / Qinghai",      chain:"batteries",tier:1,share:0.65,concentration:"concentrated", est:false,chokepoints:["malacca"],            note:"~65% global lithium hydroxide + carbonate; BloombergNEF." },
  { id:"bat_p_cathode",   name:"Cathode materials (NMC/LFP)", region:"China (CNGR / Umicore / BASF)",    chain:"batteries",tier:1,share:0.70,concentration:"concentrated", est:false,chokepoints:["malacca"],            note:"~70% global cathode production China; Benchmark Minerals." },
  { id:"bat_p_anode",     name:"Anode graphite — China",      region:"China",                            chain:"batteries",tier:1,share:0.80,concentration:"single",       est:false,chokepoints:["malacca"],            note:"~80% global anode material; BloombergNEF 2025." },
  { id:"bat_p_ndmag",     name:"NdFeB permanent magnets",     region:"China",                            chain:"batteries",tier:1,share:0.85,concentration:"single",       est:false,chokepoints:["malacca","taiwan"],   note:"Critical for EV motors, wind turbines, headphones." },

  { id:"bat_i_cells_cn",  name:"Li-ion cells — China (CATL/BYD)",region:"Guangdong / Fujian / Qinghai", chain:"batteries",tier:2,share:0.62,concentration:"concentrated", est:false,chokepoints:["malacca"],            note:"CATL ~37% global, BYD ~18%; BloombergNEF Q1 2026." },
  { id:"bat_i_cells_kr",  name:"Li-ion cells — Korea",        region:"Korea (LG/Samsung/SK)",            chain:"batteries",tier:2,share:0.24,concentration:"moderate",     est:false,chokepoints:[],                     note:"LG Energy + Samsung SDI + SK On; ~24% global." },
  { id:"bat_i_modules",   name:"Battery modules and packs",   region:"China / Korea / EU / US",          chain:"batteries",tier:2,share:0.55,concentration:"concentrated", est:false,chokepoints:["malacca"],            note:"China dominates pack assembly; growing US/EU domestic." },

  { id:"bat_a_ev",        name:"EV battery packs — China OEMs",region:"China",                          chain:"batteries",tier:3,share:0.60,concentration:"concentrated", est:false,chokepoints:["malacca","taiwan"],   note:"BYD, SAIC, NIO, Xpeng; ~60% global EV pack assembly." },
  { id:"bat_a_ev_west",   name:"EV battery packs — Korea/Japan",region:"Korea / Japan / EU",            chain:"batteries",tier:3,share:0.30,concentration:"moderate",     est:false,chokepoints:[],                     note:"Hyundai, Toyota, VW (European gigafactories ramping)." },
  { id:"bat_a_bess",      name:"Grid storage (BESS)",          region:"Global",                          chain:"batteries",tier:3,share:0.10,concentration:"spread",       est:true,  chokepoints:[],                     note:"Utility-scale battery storage; fastest-growing segment est." },

  { id:"bat_d_ev",        name:"Battery electric vehicles",   region:"Global",                           chain:"batteries",tier:4,share:0.70,concentration:"spread",       est:false,chokepoints:[],                     note:"~70% battery demand; IEA Global EV Outlook 2025." },
  { id:"bat_d_grid",      name:"Grid energy storage",         region:"Global",                           chain:"batteries",tier:4,share:0.15,concentration:"spread",       est:false,chokepoints:[],                     note:"BESS, pumped hydro excluded; BloombergNEF." },
  { id:"bat_d_consumer",  name:"Consumer electronics",        region:"Global",                           chain:"batteries",tier:4,share:0.10,concentration:"spread",       est:false,chokepoints:[],                     note:"Phones, laptops, power tools; mature segment." },
  { id:"bat_d_aero",      name:"Industrial and aerospace",    region:"Global",                           chain:"batteries",tier:4,share:0.05,concentration:"spread",       est:true,  chokepoints:[],                     note:"Aerospace batteries, UPS, forklifts." },

  // ── FOOD ──
  { id:"fod_x_bsea",      name:"Black Sea grains (Ukraine/Russia)",region:"Ukraine / Rostov / Krasnodar", chain:"food",tier:0,share:0.28,concentration:"concentrated",  est:false, chokepoints:["bosporus"],            note:"~28% global wheat + corn exports; USDA 2025." },
  { id:"fod_x_us",        name:"US corn / soybeans",          region:"Iowa / Illinois / Indiana",        chain:"food", tier:0,share:0.28,concentration:"moderate",     est:false, chokepoints:["panama","babel"],       note:"~40% world corn exports, ~35% soy exports; USDA." },
  { id:"fod_x_bra",       name:"Brazil soy (Mato Grosso)",    region:"Mato Grosso / Mato Grosso do Sul", chain:"food", tier:0,share:0.50,concentration:"concentrated", est:false, chokepoints:["panama","suez"],        note:"~50% global soy exports; Abiove 2025." },
  { id:"fod_x_aus",       name:"Australia wheat",             region:"Western Australia / Victoria",     chain:"food", tier:0,share:0.13,concentration:"moderate",     est:false, chokepoints:["malacca"],             note:"~13% global wheat exports; ABARES 2025." },
  { id:"fod_x_other",     name:"Other grains / oilseeds",     region:"Argentina / EU / Canada",          chain:"food", tier:0,share:0.31,concentration:"spread",       est:false, chokepoints:["suez","babel","panama"],note:"Argentina corn/soy, EU/Canada wheat." },

  { id:"fod_p_nfert",     name:"Nitrogen fertiliser (ammonia)",region:"China / Russia / EU / US",        chain:"food", tier:1,share:0.50,concentration:"spread",       est:false, chokepoints:[],                      note:"Gas feedstock 80-90% of cost; IFA 2025. Gas shortage = fert shortage." },
  { id:"fod_p_phosph",    name:"Phosphate fertiliser",        region:"Morocco (OCP, 70% reserves)",      chain:"food", tier:1,share:0.22,concentration:"concentrated", est:false, chokepoints:["gibraltar","suez"],     note:"OCP Group dominates; USGS. Russia second-largest." },
  { id:"fod_p_potash",    name:"Potash",                      region:"Canada (Nutrien) / Russia / Belarus",chain:"food",tier:1,share:0.65,concentration:"concentrated",est:false, chokepoints:["bosporus","panama"],   note:"~50% world potash from Canada (Nutrien) + Belarus; USGS." },
  { id:"fod_p_mill",      name:"Grain milling and crushing",  region:"Global (dispersed)",               chain:"food", tier:1,share:0.90,concentration:"spread",       est:false, chokepoints:[],                      note:"Dispersed; ADM, Bunge, Cargill, Louis Dreyfus." },

  { id:"fod_i_flour",     name:"Wheat flour / bread grains",  region:"Global",                           chain:"food", tier:2,share:0.38,concentration:"spread",       est:false, chokepoints:["bosporus","babel","suez"],note:"~38% food calories globally; FAO." },
  { id:"fod_i_oil",       name:"Vegetable oils",              region:"Global",                           chain:"food", tier:2,share:0.30,concentration:"concentrated", est:false, chokepoints:["malacca","bosporus"],   note:"Palm (Indonesia/Malaysia 85%), soy, sunflower." },
  { id:"fod_i_feed",      name:"Animal feed grains",          region:"Global",                           chain:"food", tier:2,share:0.22,concentration:"spread",       est:false, chokepoints:["panama","suez"],        note:"~50% of grain use is animal feed; FAO." },
  { id:"fod_i_sugar",     name:"Refined sugar",               region:"Brazil / India / EU",              chain:"food", tier:2,share:0.10,concentration:"moderate",     est:false, chokepoints:["suez","panama"],        note:"Brazil ~40% global exports; USDA." },

  { id:"fod_a_bulk",      name:"Dry bulk fleet (Panamax / Handysize)",region:"Global",                   chain:"food", tier:3,share:0.60,concentration:"spread",       est:false, chokepoints:["suez","panama","bosporus"],note:"~3,500 Panamax + Handysize bulk carriers; Clarksons." },
  { id:"fod_a_road",      name:"Road / rail inland distribution",region:"Global",                        chain:"food", tier:3,share:0.35,concentration:"spread",       est:false, chokepoints:[],                      note:"Domestic supply chains mostly resilient; exceptions: landlocked states." },
  { id:"fod_a_cold",      name:"Refrigerated containers (reefer)",region:"Global",                       chain:"food", tier:3,share:0.05,concentration:"spread",       est:false, chokepoints:["suez","panama"],        note:"~2M reefer TEUs; fruit, meat, dairy." },

  { id:"fod_d_cereals",   name:"Bread and cereals (direct)",  region:"Global",                           chain:"food", tier:4,share:0.48,concentration:"spread",       est:false, chokepoints:[],                      note:"~48% food calories; FAO FAOSTAT." },
  { id:"fod_d_meat",      name:"Meat and dairy (indirect grain)",region:"Global",                        chain:"food", tier:4,share:0.28,concentration:"spread",       est:false, chokepoints:[],                      note:"~7 kg grain per kg beef equiv." },
  { id:"fod_d_oils",      name:"Cooking oils",                region:"Global",                           chain:"food", tier:4,share:0.15,concentration:"spread",       est:false, chokepoints:[],                      note:"Palm + soy + sunflower dominant." },
  { id:"fod_d_proc",      name:"Industrial food processing",  region:"Global",                           chain:"food", tier:4,share:0.09,concentration:"spread",       est:false, chokepoints:[],                      note:"Ultra-processed food, beverages." },

  // ── PHARMA ──
  { id:"pha_x_cn_api",    name:"API precursors — China",      region:"Zhejiang / Jiangsu / Shanghai",    chain:"pharma",tier:0,share:0.60,concentration:"concentrated", est:false, chokepoints:["malacca","taiwan"],    note:"~60% global pharmaceutical chemical intermediates; CDER 2024." },
  { id:"pha_x_ferm",      name:"Fermentation inputs",         region:"Global (sugar cane / corn starch)",chain:"pharma",tier:0,share:0.20,concentration:"spread",       est:false, chokepoints:["panama","suez"],       note:"Bio-based APIs (antibiotics, vitamins); ADM, Cargill suppliers." },
  { id:"pha_x_spec",      name:"Specialty chemicals EU / US", region:"EU / US / Japan",                  chain:"pharma",tier:0,share:0.20,concentration:"spread",       est:false, chokepoints:[],                      note:"BASF, Lonza, Evonik; high-value small-volume." },

  { id:"pha_p_india",     name:"API manufacturing — India",   region:"Hyderabad / Ahmedabad / Mumbai",   chain:"pharma",tier:1,share:0.20,concentration:"concentrated", est:false, chokepoints:["hormuz","malacca"],    note:"~20% global finished drug dose; Sun, Dr Reddy, Cipla. FDA/EMA." },
  { id:"pha_p_china",     name:"API manufacturing — China",   region:"Zhejiang / Shandong",              chain:"pharma",tier:1,share:0.35,concentration:"concentrated", est:false, chokepoints:["malacca","taiwan"],    note:"~35% global API; rising geopolitical scrutiny post-COVID." },
  { id:"pha_p_west",      name:"API manufacturing EU / US",   region:"EU / US / Switzerland",            chain:"pharma",tier:1,share:0.35,concentration:"spread",       est:false, chokepoints:[],                      note:"Pfizer, Novartis, Roche; near-shoring trend post-2021." },
  { id:"pha_p_bio",       name:"Biologics (CDMOs)",           region:"US / EU / Singapore",              chain:"pharma",tier:1,share:0.45,concentration:"moderate",     est:true,  chokepoints:[],                      note:"Lonza, Samsung Biologics, Wuxi Biologics; growing share." },

  { id:"pha_i_generic",   name:"Generic APIs",                region:"India / China",                    chain:"pharma",tier:2,share:0.55,concentration:"concentrated", est:false, chokepoints:["malacca","hormuz"],    note:"~55% global generics by value; IQVIA 2025." },
  { id:"pha_i_branded",   name:"Branded drug substances",     region:"US / EU",                          chain:"pharma",tier:2,share:0.30,concentration:"spread",       est:false, chokepoints:[],                      note:"Patent-protected; higher margin, lower volume." },
  { id:"pha_i_bio",       name:"Biologics / vaccines",        region:"Global",                           chain:"pharma",tier:2,share:0.15,concentration:"moderate",     est:false, chokepoints:[],                      note:"mRNA, antibody therapies; cold chain requirement." },

  { id:"pha_a_air",       name:"Air freight cold chain",      region:"Global (FRA / AMS / DXB / SIN)",  chain:"pharma",tier:3,share:0.70,concentration:"spread",       est:false, chokepoints:["hormuz","babel","suez","taiwan"],note:"~70% high-value pharma by air; IATA pharma SLA." },
  { id:"pha_a_sea",       name:"Sea container (ambient)",     region:"Global",                           chain:"pharma",tier:3,share:0.20,concentration:"spread",       est:false, chokepoints:["suez","malacca"],      note:"Bulk generics, packaging materials." },
  { id:"pha_a_road",      name:"Road / rail final mile",      region:"Global",                           chain:"pharma",tier:3,share:0.10,concentration:"spread",       est:false, chokepoints:[],                      note:"Domestic last-mile to hospital and pharmacy." },

  { id:"pha_d_hospital",  name:"Hospital / acute care",       region:"Global",                           chain:"pharma",tier:4,share:0.35,concentration:"spread",       est:false, chokepoints:[],                      note:"~35% pharma value; IQVIA." },
  { id:"pha_d_retail",    name:"Retail pharmacy",             region:"Global",                           chain:"pharma",tier:4,share:0.40,concentration:"spread",       est:false, chokepoints:[],                      note:"~40% pharma value; IQVIA." },
  { id:"pha_d_vaccine",   name:"Vaccines and preventive",     region:"Global",                           chain:"pharma",tier:4,share:0.15,concentration:"moderate",     est:false, chokepoints:[],                      note:"UNICEF/WHO procurement; cold chain critical." },
  { id:"pha_d_vet",       name:"Veterinary and agricultural", region:"Global",                           chain:"pharma",tier:4,share:0.10,concentration:"spread",       est:true,  chokepoints:[],                      note:"Antibiotics and hormones in livestock production." },

  // ── AIRCRAFT ──
  { id:"air_x_ti",        name:"Titanium (Russia / Japan / USA)",region:"Ural / Osaka / Henderson NV",  chain:"aircraft",tier:0,share:0.35,concentration:"concentrated",est:false, chokepoints:["bosporus"],            note:"VSMPO-Avisma ~35% world (Russia); Toho Titanium Japan; USGS." },
  { id:"air_x_alloy",     name:"Specialty alloys / Inconel",  region:"US / UK / Germany",               chain:"aircraft",tier:0,share:0.40,concentration:"moderate",    est:false, chokepoints:[],                     note:"Haynes, ATI, Special Metals; nickel superalloys for hot section." },
  { id:"air_x_cf",        name:"Carbon fibre (Japan / US)",   region:"Toray / Toho / Hexcel / Solvay",  chain:"aircraft",tier:0,share:0.65,concentration:"concentrated", est:false, chokepoints:["malacca"],            note:"Toray ~35% global aerospace CF; Hexcel/Solvay US/EU. ACMA." },
  { id:"air_x_al",        name:"Aerospace aluminium",         region:"US / Canada / EU / Russia",        chain:"aircraft",tier:0,share:0.60,concentration:"moderate",    est:false, chokepoints:["bosporus"],            note:"Arconic, Novelis, Constellium; 7xxx + 2xxx alloys. USGS." },

  { id:"air_p_engine",    name:"Jet engine components",       region:"US / UK / France",                 chain:"aircraft",tier:1,share:0.60,concentration:"concentrated", est:false, chokepoints:[],                     note:"GE Aerospace, Rolls-Royce, Safran; ~60% Western supply." },
  { id:"air_p_struct",    name:"Aerostructures / fuselage",   region:"UK / France / US / Japan",         chain:"aircraft",tier:1,share:0.60,concentration:"concentrated", est:false, chokepoints:[],                     note:"Spirit AeroSystems, Triumph, Stelia, Subaru." },
  { id:"air_p_elec",      name:"Hydraulic / electrical systems",region:"US / France",                    chain:"aircraft",tier:1,share:0.40,concentration:"moderate",    est:false, chokepoints:[],                     note:"Parker Hannifin, Safran Electrical, Eaton." },

  { id:"air_i_engine",    name:"Jet engines (LEAP / Trent / GEnx)",region:"US / UK / France",           chain:"aircraft",tier:2,share:0.90,concentration:"concentrated", est:false, chokepoints:[],                     note:"CFM (GE+Safran) ~60% deliveries; RR + P&W split the rest." },
  { id:"air_i_struct",    name:"Aerostructures assembled",    region:"US / France",                      chain:"aircraft",tier:2,share:0.60,concentration:"concentrated", est:false, chokepoints:[],                     note:"787 fuselage sections (Spirit, Japan partners); A320 (Stelia, Premium)." },
  { id:"air_i_avionics",  name:"Avionics and flight systems", region:"US (Collins / Honeywell)",         chain:"aircraft",tier:2,share:0.80,concentration:"concentrated", est:false, chokepoints:[],                     note:"Collins Aerospace + Honeywell ~80% large aircraft avionics." },

  { id:"air_a_airbus",    name:"Airbus final assembly",       region:"Toulouse / Hamburg / Mobile / Tianjin",chain:"aircraft",tier:3,share:0.50,concentration:"single",  est:false, chokepoints:[],                     note:"~800 deliveries/yr at full rate; Airbus 2025 annual." },
  { id:"air_a_boeing",    name:"Boeing final assembly",       region:"Everett WA / North Charleston SC",chain:"aircraft",tier:3,share:0.45,concentration:"single",       est:false, chokepoints:[],                     note:"737 MAX and 787 primary lines; ~450 deliveries 2025 est." },
  { id:"air_a_mro",       name:"MRO (maintenance / repair / overhaul)",region:"Global",                 chain:"aircraft",tier:3,share:0.95,concentration:"spread",       est:false, chokepoints:[],                     note:"~$100B market; global fleet maintenance. IATA." },

  { id:"air_d_commercial",name:"Commercial scheduled aviation",region:"Global",                          chain:"aircraft",tier:4,share:0.78,concentration:"spread",       est:false, chokepoints:[],                     note:"IATA SRS Analyser; Airbus / Boeing backlogs ~12,000 aircraft." },
  { id:"air_d_cargo",     name:"Cargo aviation",              region:"Global",                           chain:"aircraft",tier:4,share:0.12,concentration:"spread",       est:false, chokepoints:[],                     note:"~900 dedicated freighters; FedEx, UPS, Qatar Cargo." },
  { id:"air_d_biz",       name:"Regional and business aviation",region:"Global",                         chain:"aircraft",tier:4,share:0.07,concentration:"spread",       est:false, chokepoints:[],                     note:"Embraer, Bombardier, Gulfstream, Textron." },
  { id:"air_d_mil",       name:"Military / government",       region:"Global",                           chain:"aircraft",tier:4,share:0.03,concentration:"spread",       est:true,  chokepoints:[],                     note:"Defense procurement; Lockheed, Boeing Defense." },
];

// ─── Chain sim params (bufferWeeks, releaseRate, leadTime per tier) ──
export const CHAIN_PARAMS: Record<ChainId, ChainParams> = {
  oil:       { bufferWeeks:[8,4,3,2,6],    releaseRate:[0.03,0.03,0.04,0.04,0.05], leadTime:[1,2,1,2,1] },
  gas:       { bufferWeeks:[2,1,0,1,2],    releaseRate:[0.05,0.05,0.06,0.06,0.06], leadTime:[1,1,1,1,1] },
  steel:     { bufferWeeks:[4,3,6,4,2],    releaseRate:[0.03,0.03,0.03,0.04,0.04], leadTime:[3,2,2,2,1] },
  chips:     { bufferWeeks:[12,8,6,4,3],   releaseRate:[0.02,0.02,0.03,0.03,0.04], leadTime:[2,12,2,2,1] },
  batteries: { bufferWeeks:[8,6,4,3,2],    releaseRate:[0.02,0.03,0.03,0.03,0.04], leadTime:[3,4,2,2,1] },
  food:      { bufferWeeks:[20,8,6,3,2],   releaseRate:[0.02,0.03,0.04,0.05,0.05], leadTime:[1,2,1,2,1] },
  pharma:    { bufferWeeks:[16,12,8,6,3],  releaseRate:[0.02,0.02,0.02,0.03,0.04], leadTime:[4,8,4,2,1] },
  aircraft:  { bufferWeeks:[12,26,52,8,4], releaseRate:[0.01,0.01,0.01,0.02,0.02], leadTime:[4,12,26,4,1] },
};

// Chain processing order: dependencies first
export const CHAIN_ORDER: ChainId[] = ["oil","gas","steel","chips","batteries","food","pharma","aircraft"];

// ─── Presets ──────────────────────────────────────────────────
export const PRESETS: Preset[] = [
  {
    id: "hormuz",
    label: "Hormuz closure",
    closures: { hormuz: 0.90 },
    outages: {},
    durationWeeks: 12,
  },
  {
    id: "red_sea",
    label: "Red Sea / Suez avoided",
    closures: { babel: 1.0, suez: 1.0 },
    outages: {},
    durationWeeks: 26,
  },
  {
    id: "taiwan_blockade",
    label: "Taiwan blockade",
    closures: { taiwan: 1.0 },
    outages: { chp_p_tsmc: 0.80, chp_p_pkg: 0.80 },
    durationWeeks: 26,
  },
  {
    id: "black_sea",
    label: "Black Sea shut",
    closures: { bosporus: 1.0 },
    outages: {},
    durationWeeks: 16,
  },
  {
    id: "panama_drought",
    label: "Panama drought",
    closures: { panama: 0.40 },
    outages: {},
    durationWeeks: 20,
  },
  {
    id: "rare_earth",
    label: "Chinese rare-earth export halt",
    closures: {},
    outages: { bat_p_lichem: 0.30, bat_p_ndmag: 0.60 },
    durationWeeks: 20,
  },
];
