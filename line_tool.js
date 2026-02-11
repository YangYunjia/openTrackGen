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
  drawOverlay(ctx, scale, setTransform, currentColor, offsetStartX, offsetEndX, offsetStartY, offsetEndY, startCapStyle, endCapStyle) {
    ctx.save();
    setTransform(ctx);
    const startOffsetX = offsetStartX || 0;
    const endOffsetX = offsetEndX || 0;
    const startOffsetY = offsetStartY || 0;
    const endOffsetY = offsetEndY || 0;

    if (this.drawStart) {
      const style = this.getStyle();
      const strokeWidth = style.width || 1;
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      if (style.kind === "dashed") {
        ctx.setLineDash([6, 6]);
      }
      const worldPos = this.screenToWorld(this.mouse.x, this.mouse.y);
      const ax = this.drawStart.x + startOffsetX;
      const ay = this.drawStart.y + startOffsetY;
      const bx = worldPos.x + endOffsetX;
      const by = worldPos.y + endOffsetY;
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

      if (len > 0) {
        const ux = (ex - sx) / len;
        const uy = (ey - sy) / len;
        const size = Math.max(6, strokeWidth * 3);
        const half = size * 0.6;
        const drawArrow = (x, y, dirX, dirY) => {
          const nx = -dirY;
          const ny = dirX;
          const tipX = x + dirX * size;
          const tipY = y + dirY * size;
          ctx.fillStyle = currentColor;
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(x + nx * half, y + ny * half);
          ctx.lineTo(x - nx * half, y - ny * half);
          ctx.closePath();
          ctx.fill();
        };
        const drawCCap = (x, y, dirX, dirY) => {
          const nx = -dirY;
          const ny = dirX;
          const depth = size * 0.8;
          const innerX = x + dirX * depth;
          const innerY = y + dirY * depth;
          const outerX = x - dirX * depth;
          const outerY = y - dirY * depth;
          ctx.beginPath();
          ctx.moveTo(outerX + nx * half, outerY + ny * half);
          ctx.lineTo(outerX - nx * half, outerY - ny * half);
          ctx.lineTo(innerX - nx * half, innerY - ny * half);
          ctx.moveTo(outerX + nx * half, outerY + ny * half);
          ctx.lineTo(innerX + nx * half, innerY + ny * half);
          ctx.stroke();
        };
        const drawSquareCap = (x, y, dirX, dirY) => {
          const nx = -dirY;
          const ny = dirX;
          const halfW = (strokeWidth * 0.5);
          const halfL = halfW;
          ctx.fillStyle = currentColor;
          ctx.beginPath();
          ctx.moveTo(x + nx * halfW + dirX * halfL, y + ny * halfW + dirY * halfL);
          ctx.lineTo(x - nx * halfW + dirX * halfL, y - ny * halfW + dirY * halfL);
          ctx.lineTo(x - nx * halfW - dirX * halfL, y - ny * halfW - dirY * halfL);
          ctx.lineTo(x + nx * halfW - dirX * halfL, y + ny * halfW - dirY * halfL);
          ctx.closePath();
          ctx.fill();
        };
        const drawTCap = (x, y, dirX, dirY) => {
          const nx = -dirY;
          const ny = dirX;
          ctx.beginPath();
          ctx.moveTo(x + nx * half, y + ny * half);
          ctx.lineTo(x - nx * half, y - ny * half);
          ctx.stroke();
        };
        if (startCapStyle === "arrow") {
          drawArrow(sx, sy, -ux, -uy);
        } else if (startCapStyle === "c") {
          drawCCap(sx, sy, ux, uy);
        } else if (startCapStyle === "t") {
          drawTCap(sx, sy, ux, uy);
        } else if (startCapStyle === "square") {
          drawSquareCap(sx, sy, -ux, -uy);
        }
        if (endCapStyle === "arrow") {
          drawArrow(ex, ey, ux, uy);
        } else if (endCapStyle === "c") {
          drawCCap(ex, ey, -ux, -uy);
        } else if (endCapStyle === "t") {
          drawTCap(ex, ey, -ux, -uy);
        } else if (endCapStyle === "square") {
          drawSquareCap(ex, ey, ux, uy);
        }
      }

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
      ctx.arc(this.hoverPoint.x + startOffsetX, this.hoverPoint.y + startOffsetY, 5 / scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
