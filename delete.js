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

  // Insert an axis-aligned bounding box into the grid.
  insertAabb(index, minX, minY, maxX, maxY) {
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

  // Insert a line segment by its bounding box.
  insertLine(index, line) {
    const minX = Math.min(line.start.x, line.end.x);
    const maxX = Math.max(line.start.x, line.end.x);
    const minY = Math.min(line.start.y, line.end.y);
    const maxY = Math.max(line.start.y, line.end.y);
    this.insertAabb(index, minX, minY, maxX, maxY);
  }

  // Build the index from all lines.
  rebuild(items, getAabb) {
    this.clear();
    items.forEach((item, i) => {
      const box = getAabb(item);
      if (!box) return;
      this.insertAabb(i, box.minX, box.minY, box.maxX, box.maxY);
    });
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
const findClosestItem = (items, candidates, x, y, threshold, distanceFn) => {
  let bestIdx = null;
  let bestDist = Infinity;
  for (const idx of candidates) {
    const item = items[idx];
    if (!item) continue;
    const d = distanceFn(item, x, y);
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
    this.selectedIndices = new Set();
  }

  rebuild(items, getAabb) {
    items.forEach((item, i) => {
      item.__index = i;
    });
    this.index.rebuild(items, getAabb);
    if (this.selectedIndex !== null && !items[this.selectedIndex]) {
      this.selectedIndex = null;
    }
    if (this.selectedIndices.size) {
      const next = new Set();
      this.selectedIndices.forEach((idx) => {
        if (items[idx]) next.add(idx);
      });
      this.selectedIndices = next;
      if (this.selectedIndex !== null && !this.selectedIndices.has(this.selectedIndex)) {
        this.selectedIndex = this.selectedIndices.size ? Array.from(this.selectedIndices)[0] : null;
      }
    }
  }

  updateHover(items, worldX, worldY, scale, distanceFn) {
    const candidates = this.index.queryNearby(worldX, worldY);
    this.hoverIndex = findClosestItem(
      items,
      candidates,
      worldX,
      worldY,
      this.hitRadius / scale
      ,
      distanceFn
    );
    return this.hoverIndex;
  }

  selectHover() {
    this.selectedIndex = this.hoverIndex;
    this.selectedIndices.clear();
    if (this.hoverIndex !== null) {
      this.selectedIndices.add(this.hoverIndex);
    }
    return this.selectedIndex;
  }

  clearSelection() {
    this.selectedIndex = null;
    this.selectedIndices.clear();
  }
}

// Abstract base class for selection/delete behavior using the shared index.
class SelectionToolBase {
  constructor(options) {
    this.manager = new SelectionManager(options);
    this.items = [];
    this.getAabb = options.getAabb;
    this.distanceFn = options.distanceFn;
  }

  rebuild(items) {
    this.items = items;
    this.manager.rebuild(items, this.getAabb);
  }

  updateHover(items, worldX, worldY, scale) {
    this.items = items;
    return this.manager.updateHover(items, worldX, worldY, scale, this.distanceFn);
  }

  selectHover() {
    return this.manager.selectHover();
  }

  setSelection(indices) {
    this.manager.selectedIndices.clear();
    indices.forEach((idx) => {
      if (idx !== null && idx !== undefined) this.manager.selectedIndices.add(idx);
    });
    this.manager.selectedIndex = this.manager.selectedIndices.size
      ? Array.from(this.manager.selectedIndices)[0]
      : null;
  }

  toggleSelect(index) {
    if (index === null || index === undefined) return;
    if (this.manager.selectedIndices.has(index)) {
      this.manager.selectedIndices.delete(index);
    } else {
      this.manager.selectedIndices.add(index);
    }
    this.manager.selectedIndex = this.manager.selectedIndices.size
      ? Array.from(this.manager.selectedIndices)[0]
      : null;
  }

  addSelect(index) {
    if (index === null || index === undefined) return;
    this.manager.selectedIndices.add(index);
    this.manager.selectedIndex = index;
  }

  clearHover() {
    this.manager.hoverIndex = null;
  }

  clearSelection() {
    this.manager.clearSelection();
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

  getSelectedItem() {
    if (this.manager.selectedIndex === null) return null;
    return this.items[this.manager.selectedIndex] || null;
  }

  getSelectedItems() {
    if (!this.manager.selectedIndices.size) return [];
    const result = [];
    this.manager.selectedIndices.forEach((idx) => {
      const item = this.items[idx];
      if (item) result.push(item);
    });
    return result;
  }

  isSelectedIndex(index) {
    return this.manager.selectedIndices.has(index);
  }

  getHoveredItem() {
    if (this.manager.hoverIndex === null) return null;
    return this.items[this.manager.hoverIndex] || null;
  }
}

// Concrete selection tool using the shared abstract behavior.
class SelectionTool extends SelectionToolBase {}
