export function isLowMidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const cores = (navigator as any).hardwareConcurrency ?? 4;
  const mem = (navigator as any).deviceMemory ?? 4; // in GB (heuristic)
  return cores <= 4 || mem <= 4;
}

export function getHeapUsageMB(): { usedMB?: number; totalMB?: number; jsHeap?: { totalJSHeapSize?: number; usedJSHeapSize?: number; jsHeapSizeLimit?: number } } {
  const perf: any = (typeof performance !== 'undefined' ? performance : null);
  const mem = perf && perf.memory ? perf.memory : undefined;
  if (!mem) return {};
  const usedMB = Math.round((mem.usedJSHeapSize ?? 0) / (1024 * 1024));
  const totalMB = Math.round((mem.totalJSHeapSize ?? 0) / (1024 * 1024));
  return { usedMB, totalMB, jsHeap: { totalJSHeapSize: mem.totalJSHeapSize, usedJSHeapSize: mem.usedJSHeapSize, jsHeapSizeLimit: mem.jsHeapSizeLimit } };
}

export function shouldEnableVirtualization(params: { itemCount: number; activationMin: number; renderCostMs?: number }): boolean {
  const { itemCount, activationMin, renderCostMs } = params;
  const itemGate = itemCount >= activationMin;
  const perfGate = typeof renderCostMs === 'number' ? renderCostMs >= 12 : false;
  return (itemGate || perfGate) && isLowMidDevice();
}

