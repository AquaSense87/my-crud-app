// Supply Web shock simulation — weekly stock-and-flow model

import {
  NODES, CHAINS, CHOKEPOINTS, CROSS_LINKS, CHAIN_PARAMS, CHAIN_ORDER,
  type ChainId, type ChokepointId,
} from "./data";

export interface SimParams {
  closures: Partial<Record<ChokepointId, number>>; // fraction closed 0–1
  outages: Record<string, number>;                  // nodeId → fraction out 0–1
  durationWeeks: number;                            // shock duration
  totalWeeks?: number;                              // simulation horizon (default 52)
}

export interface ChainResult {
  id: ChainId;
  cargo: string;
  deliveredPct: number[];       // per-week delivered supply (0–100)
  peakShortfall: number;        // max shortfall %
  peakWeek: number;
  firstFeltWeek: number;
  recoveredWeek: number | null;
}

export interface SimResult {
  chains: ChainResult[];
  supplyShiftPct: Record<string, number>; // cargo class → worst supply shift
}

export function runSimulation(params: SimParams): SimResult {
  const { closures, outages, durationWeeks, totalWeeks = 52 } = params;

  // delivered[chainId][week] = 0–1 normalised
  const delivered: Record<ChainId, number[]> = {} as Record<ChainId, number[]>;

  for (const chainId of CHAIN_ORDER) {
    const chain = CHAINS.find(c => c.id === chainId)!;
    const cp = CHAIN_PARAMS[chainId];
    const nodes = NODES.filter(n => n.chain === chainId);

    // Pre-compute tier-level effective capacity during shock (weeks 0..durationWeeks-1)
    // and during recovery (weeks durationWeeks..totalWeeks-1)
    const tierNodes = [0,1,2,3,4].map(t => nodes.filter(n => n.tier === t));

    function tierCapacity(tier: number, week: number): number {
      const inShock = week < durationWeeks;
      const tNodes = tierNodes[tier];
      if (!tNodes.length) return 1;

      let shareSum = 0;
      let capacitySum = 0;

      for (const node of tNodes) {
        const nodeOutage = inShock ? (outages[node.id] ?? 0) : 0;

        // Chokepoint impact
        let chokepointLoss = 0;
        for (const cpId of node.chokepoints) {
          const closure = inShock ? (closures[cpId] ?? 0) : 0;
          const reroutable = CHOKEPOINTS[cpId].reroutable;
          chokepointLoss = Math.max(chokepointLoss, closure * (1 - reroutable));
        }

        const nodeCap = Math.max(0, 1 - nodeOutage - chokepointLoss);
        shareSum += node.share;
        capacitySum += node.share * nodeCap;
      }

      let cap = shareSum > 0 ? capacitySum / shareSum : 1;

      // Cross-chain inputs: reduce capacity by upstream delivered shortfall
      for (const link of CROSS_LINKS) {
        if (link.toChain !== chainId || link.toTier !== tier) continue;
        const lag = link.lagWeeks;
        const srcDelivered = delivered[link.fromChain];
        if (!srcDelivered) continue;
        const srcWeek = Math.max(0, week - lag);
        const srcShortfall = Math.max(0, 1 - srcDelivered[srcWeek]);
        cap = Math.max(0, cap - srcShortfall * link.weight);
      }

      return Math.min(1, Math.max(0, cap));
    }

    // Stock (in weeks of throughput above minimum)
    const stock = cp.bufferWeeks.slice() as [number,number,number,number,number];
    // Production at each tier, kept for lead-time delay
    const prodHistory: number[][] = [0,1,2,3,4].map(() => Array(totalWeeks).fill(1));

    const chainDelivered: number[] = Array(totalWeeks).fill(1);

    for (let w = 0; w < totalWeeks; w++) {
      const prevTierOutput: number[] = Array(5).fill(1);

      for (let t = 0; t < 5; t++) {
        const lead = cp.leadTime[t];
        const releaseRate = cp.releaseRate[t];
        const buf = cp.bufferWeeks[t];

        // Arrivals from previous tier (with lead time)
        let arrivals: number;
        if (t === 0) {
          arrivals = tierCapacity(0, w); // extraction is capacity-limited directly
        } else {
          const srcWeek = Math.max(0, w - lead);
          arrivals = prodHistory[t - 1][srcWeek];
        }

        // Available from stock draw
        const stockDraw = stock[t] * releaseRate;

        // Capacity
        const cap = t === 0 ? arrivals : tierCapacity(t, w);

        // Target: normal (1.0) unless in recovery (surge up to 10%)
        const target = (w >= durationWeeks && stock[t] < buf * 0.8)
          ? Math.min(1.1, cap)
          : 1.0;

        // Production: min(capacity, arrivals + stockDraw, target)
        const production = Math.min(
          cap,
          (t === 0 ? arrivals : arrivals + stockDraw),
          target
        );

        // Update stock: replenish if production > arrivals
        const netToStock = production - (t === 0 ? 0 : arrivals);
        stock[t] = Math.max(0, Math.min(buf, stock[t] - stockDraw + Math.max(0, netToStock)));

        prodHistory[t][w] = Math.max(0, Math.min(1.1, production));
        prevTierOutput[t] = production;
      }

      // Delivered = demand tier production, capped at 100%
      chainDelivered[w] = Math.min(1, prevTierOutput[4]);
    }

    delivered[chainId] = chainDelivered;
  }

  // Build chain results
  const chainResults: ChainResult[] = CHAIN_ORDER.map(chainId => {
    const chain = CHAINS.find(c => c.id === chainId)!;
    const del = delivered[chainId];
    const shortfalls = del.map(d => Math.max(0, 1 - d) * 100);

    const peakShortfall = Math.max(...shortfalls);
    const peakWeek = shortfalls.indexOf(peakShortfall) + 1;
    const firstFeltWeek = shortfalls.findIndex(s => s > 0.5) + 1 || 0;
    const recoveredIdx = del.findIndex((d, i) => i >= durationWeeks && d >= 0.99);
    const recoveredWeek = recoveredIdx >= 0 ? recoveredIdx + 1 : null;

    return {
      id: chainId,
      cargo: chain.cargo,
      deliveredPct: del.map(d => Math.round(Math.min(100, d * 100) * 10) / 10),
      peakShortfall: Math.round(peakShortfall * 10) / 10,
      peakWeek,
      firstFeltWeek,
      recoveredWeek,
    };
  });

  // Supply shift by cargo class (worst chain in each class)
  const supplyShiftPct: Record<string, number> = {};
  for (const cr of chainResults) {
    const current = supplyShiftPct[cr.cargo] ?? 0;
    supplyShiftPct[cr.cargo] = Math.min(current, -cr.peakShortfall);
  }

  return { chains: chainResults, supplyShiftPct };
}

