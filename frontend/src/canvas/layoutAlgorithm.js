/**
 * Deterministic layout calculation for organisms in the Petri dish.
 * Generation 0 is fixed at center (0, 0).
 * Generations 1..N radiate outward in concentric orbital rings.
 * Angular offset is computed deterministically from prompt_id hash to prevent layout shifting.
 */

function stringToHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export function computeDeterministicLayout(results, lineage, width, height) {
  if (!results || results.length === 0) return {};

  const centerX = width / 2;
  const centerY = height / 2;
  const positions = {};

  // Find Generation 0 root
  const gen0 = results.find(r => r.generation === 0);
  if (gen0) {
    positions[gen0.prompt_id] = {
      x: centerX,
      y: centerY,
      baseRadius: 24,
      generation: 0,
      isRoot: true
    };
  }

  // Group by generation
  const byGen = {};
  results.forEach(r => {
    if (r.generation > 0) {
      if (!byGen[r.generation]) byGen[r.generation] = [];
      byGen[r.generation].push(r);
    }
  });

  // Calculate descendant count per prompt for deterministic sizing
  const descendantCounts = {};
  if (lineage) {
    lineage.forEach(node => {
      descendantCounts[node.prompt_id] = (node.children || []).length;
    });
  }

  // Radii for generation orbits
  const baseRingRadius = Math.min(width, height) * 0.16;
  const ringStep = Math.min(width, height) * 0.11;

  Object.keys(byGen).forEach(genStr => {
    const gen = parseInt(genStr, 10);
    const items = byGen[gen];
    const orbitRadius = baseRingRadius + (gen - 1) * ringStep;
    const count = items.length;

    items.forEach((item, index) => {
      const hash = stringToHash(item.prompt_id);
      // Even angular distribution with subtle deterministic jitter
      const baseAngle = (index / count) * 2 * Math.PI - Math.PI / 2;
      const jitterAngle = ((hash % 100) / 100 - 0.5) * (0.25 / Math.max(1, count));
      const angle = baseAngle + jitterAngle;

      const jitterRadius = ((hash % 40) - 20) * 0.5;
      const r = orbitRadius + jitterRadius;

      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);

      // Deterministic node size: 10px base + 3px per direct child (max 22px)
      const descCount = descendantCounts[item.prompt_id] || 0;
      const baseRadius = Math.min(22, Math.max(10, 10 + descCount * 2.5));

      positions[item.prompt_id] = {
        x,
        y,
        baseRadius,
        generation: gen,
        isRoot: false
      };
    });
  });

  return positions;
}
