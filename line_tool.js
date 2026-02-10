// Line drawing tool encapsulates grid snapping and preview rendering.

class LineTool {
  constructor(options) {
    this.gridSize = options.gridSize;
    this.hoverRadius = options.hoverRadius;
    this.screenToWorld = options.screenToWorld;
    this.worldToScreen = options.worldToScreen;
    this.getStyle = options.getStyle;
    this.hoverPoint = null;
    this.isDrawing = false;
    this.drawStart = null;
    this.mouse = { x: 0, y: 0 };
  }

  // Reset transient state when switching tools.
  reset() {
    this.hoverPoint = null;
    this.isDrawing = false;
    this.drawStart = null;
  }

  // Update hover point based on the current mouse position.
  updateHover(screenX, screenY) {
    const world = this.screenToWorld(screenX, screenY);
    const snapped = {
      x: Math.round(world.x / this.gridSize) * this.gridSize,
      y: Math.round(world.y / this.gridSize) * this.gridSize
    };
    const screen = this.worldToScreen(snapped.x, snapped.y);
    const dist = Math.hypot(screen.x - screenX, screen.y - screenY);

    if (dist <= this.hoverRadius) {
      this.hoverPoint = snapped;
    } else {
      this.hoverPoint = null;
    }
    return this.hoverPoint;
  }

  // Handle mouse movement for line preview.
  handlePointerMove(screenX, screenY) {
    this.mouse = { x: screenX, y: screenY };
    this.updateHover(screenX, screenY);
  }

  // Begin a line if hovering over a grid node.
  handlePointerDown(screenX, screenY) {
    this.mouse = { x: screenX, y: screenY };
    this.updateHover(screenX, screenY);
    if (this.hoverPoint) {
      this.isDrawing = true;
      this.drawStart = { ...this.hoverPoint };
      return true;
    }
    return false;
  }

  // Finish the line and return a segment if valid.
  handlePointerUp() {
    if (!this.isDrawing) return null;
    const start = this.drawStart;
    const end = this.hoverPoint;
    this.isDrawing = false;
    this.drawStart = null;
    if (!end) return null;
    if (end.x === start.x && end.y === start.y) return null;
    return { start, end };
  }

  // Draw preview line and hover point into the overlay canvas.
  drawOverlay(ctx, scale, setTransform, currentColor, offsetStartX, offsetEndX) {
    ctx.save();
    setTransform(ctx);
    const startOffsetX = offsetStartX || 0;
    const endOffsetX = offsetEndX || 0;

    if (this.drawStart) {
      const style = this.getStyle();
      const strokeWidth = style.width || 1;
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = style.cap || "round";
      if (style.kind === "dashed") {
        ctx.setLineDash([6, 6]);
      }
      const worldPos = this.screenToWorld(this.mouse.x, this.mouse.y);
      const ax = this.drawStart.x + startOffsetX;
      const ay = this.drawStart.y;
      const bx = worldPos.x + endOffsetX;
      const by = worldPos.y;
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy);
      let sx = ax;
      let sy = ay;
      let ex = bx;
      let ey = by;
      if (len > 0 && style.align && style.align !== "center") {
        const nx = -dy / len;
        const ny = dx / len;
        const offset = (strokeWidth / 2) * (style.align === "left" ? 1 : -1);
        sx = ax + nx * offset;
        sy = ay + ny * offset;
        ex = bx + nx * offset;
        ey = by + ny * offset;
      }
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);

      if (style.kind === "double") {
        if (len > 0) {
          const nx = -dy / len;
          const ny = dx / len;
          const offset = Math.max(1.5, strokeWidth * 0.6);
          ctx.lineWidth = Math.max(1, strokeWidth * 0.55);
          ctx.beginPath();
          ctx.moveTo(sx + nx * offset, sy + ny * offset);
          ctx.lineTo(ex + nx * offset, ey + ny * offset);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(sx - nx * offset, sy - ny * offset);
          ctx.lineTo(ex - nx * offset, ey - ny * offset);
          ctx.stroke();
        }
      }

      ctx.fillStyle = currentColor;
      ctx.beginPath();
      ctx.arc(ax, ay, 3 / scale, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.hoverPoint) {
      ctx.strokeStyle = "#c5482a";
      ctx.lineWidth = 2 / scale;
      ctx.beginPath();
      ctx.arc(this.hoverPoint.x + startOffsetX, this.hoverPoint.y, 5 / scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
