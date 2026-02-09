// Spatial hash grid for fast line hit-testing.
// Stores line indices in world-space grid cells.

class UniformGridIndex {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  _key(cx, cy) {
    return `${cx},${cy}`;
  }

  _cellCoords(x, y) {
    return {
      cx: Math.floor(x / this.cellSize),
      cy: Math.floor(y / this.cellSize)
    };
  }

  clear() {
    this.cells.clear();
  }

  // Insert a line segment by its bounding box.
  insertLine(index, line) {
    const minX = Math.min(line.start.x, line.end.x);
    const maxX = Math.max(line.start.x, line.end.x);
    const minY = Math.min(line.start.y, line.end.y);
    const maxY = Math.max(line.start.y, line.end.y);

    const start = this._cellCoords(minX, minY);
    const end = this._cellCoords(maxX, maxY);

    for (let cx = start.cx; cx <= end.cx; cx += 1) {
      for (let cy = start.cy; cy <= end.cy; cy += 1) {
        const key = this._key(cx, cy);
        if (!this.cells.has(key)) this.cells.set(key, new Set());
        this.cells.get(key).add(index);
      }
    }
  }

  // Build the index from all lines.
  rebuild(lines) {
    this.clear();
    lines.forEach((line, i) => this.insertLine(i, line));
  }

  // Get candidate indices from the mouse cell and neighbors.
  queryNearby(x, y) {
    const { cx, cy } = this._cellCoords(x, y);
    const result = new Set();
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        const key = this._key(cx + dx, cy + dy);
        const bucket = this.cells.get(key);
        if (bucket) bucket.forEach((idx) => result.add(idx));
      }
    }
    return Array.from(result);
  }
}

// Distance from point P to segment AB in world coordinates.
const distanceToSegment = (px, py, ax, ay, bx, by) => {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLenSq = abx * abx + aby * aby;
  if (abLenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = (apx * abx + apy * aby) / abLenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * abx;
  const cy = ay + t * aby;
  return Math.hypot(px - cx, py - cy);
};

// Find closest line index within a threshold.
const findClosestLine = (lines, candidates, x, y, threshold) => {
  let bestIdx = null;
  let bestDist = Infinity;
  for (const idx of candidates) {
    const line = lines[idx];
    if (!line) continue;
    const d = distanceToSegment(
      x,
      y,
      line.start.x,
      line.start.y,
      line.end.x,
      line.end.y
    );
    if (d < bestDist) {
      bestDist = d;
      bestIdx = idx;
    }
  }
  if (bestDist <= threshold) return bestIdx;
  return null;
};

// Selection manager keeps hit-testing and selection state separate from app logic.
class SelectionManager {
  constructor(options) {
    this.cellSize = options.cellSize;
    this.hitRadius = options.hitRadius;
    this.index = new UniformGridIndex(this.cellSize);
    this.hoverIndex = null;
    this.selectedIndex = null;
  }

  rebuild(lines) {
    lines.forEach((line, i) => {
      line.__index = i;
    });
    this.index.rebuild(lines);
    if (this.selectedIndex !== null && !lines[this.selectedIndex]) {
      this.selectedIndex = null;
    }
  }

  updateHover(lines, worldX, worldY, scale) {
    const candidates = this.index.queryNearby(worldX, worldY);
    this.hoverIndex = findClosestLine(
      lines,
      candidates,
      worldX,
      worldY,
      this.hitRadius / scale
    );
    return this.hoverIndex;
  }

  selectHover() {
    this.selectedIndex = this.hoverIndex;
    return this.selectedIndex;
  }

  clearSelection() {
    this.selectedIndex = null;
  }
}

// Abstract base class for selection/delete behavior using the shared index.
class SelectionToolBase {
  constructor(options) {
    this.manager = new SelectionManager(options);
  }

  rebuild(lines) {
    this.manager.rebuild(lines);
  }

  updateHover(lines, worldX, worldY, scale) {
    return this.manager.updateHover(lines, worldX, worldY, scale);
  }

  selectHover() {
    return this.manager.selectHover();
  }

  clearHover() {
    this.manager.hoverIndex = null;
  }

  clearSelection() {
    this.manager.clearSelection();
  }

  // Remove the hovered line from the list if any.
  deleteHover(lines) {
    if (this.manager.hoverIndex === null) return false;
    lines.splice(this.manager.hoverIndex, 1);
    this.manager.hoverIndex = null;
    return true;
  }

  get hoverIndex() {
    return this.manager.hoverIndex;
  }

  get selectedIndex() {
    return this.manager.selectedIndex;
  }

  set selectedIndex(value) {
    this.manager.selectedIndex = value;
  }

  getSelectedLine(lines) {
    if (this.manager.selectedIndex === null) return null;
    return lines[this.manager.selectedIndex] || null;
  }
}

// Concrete selection tool using the shared abstract behavior.
class SelectionTool extends SelectionToolBase {}
