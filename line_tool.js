// Line drawing tool encapsulates grid snapping and preview rendering.

class LineTool {
  constructor(options) {
    this.gridSize = options.gridSize;
    this.hoverRadius = options.hoverRadius;
    this.screenToWorld = options.screenToWorld;
    this.worldToScreen = options.worldToScreen;
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
  drawOverlay(ctx, scale, setTransform, currentColor) {
    ctx.save();
    setTransform(ctx);

    if (this.drawStart) {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([6 / scale, 6 / scale]);
      const worldPos = this.screenToWorld(this.mouse.x, this.mouse.y);
      ctx.beginPath();
      ctx.moveTo(this.drawStart.x, this.drawStart.y);
      ctx.lineTo(worldPos.x, worldPos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = currentColor;
      ctx.beginPath();
      ctx.arc(this.drawStart.x, this.drawStart.y, 3 / scale, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.hoverPoint) {
      ctx.strokeStyle = "#c5482a";
      ctx.lineWidth = 2 / scale;
      ctx.beginPath();
      ctx.arc(this.hoverPoint.x, this.hoverPoint.y, 5 / scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
