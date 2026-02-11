// Line-specific rendering and interaction logic.

class LineController {
  constructor(options) {
    this.state = options.state;
    this.lineTool = options.lineTool;
  }

  updateHover(screenX, screenY) {
    return this.lineTool.updateHover(screenX, screenY);
  }

  handlePointerMove(screenX, screenY) {
    this.lineTool.handlePointerMove(screenX, screenY);
  }

  handlePointerDown(screenX, screenY) {
    return this.lineTool.handlePointerDown(screenX, screenY);
  }

  handlePointerUp() {
    const segment = this.lineTool.handlePointerUp();
    if (!segment) return null;
    const line = {
      start: segment.start,
      end: segment.end,
      color: this.state.currentColor,
      width: this.state.lineWidth,
      style: this.state.lineStyle,
      startCapStyle: this.state.lineStartCapStyle || "none",
      endCapStyle: this.state.lineEndCapStyle || "none",
      offsetStartX: this.state.lineOffsetStartX || 0,
      offsetEndX: this.state.lineOffsetEndX || 0,
      offsetStartY: this.state.lineOffsetStartY || 0,
      offsetEndY: this.state.lineOffsetEndY || 0
    };
    this.state.lines.push(line);
    return line;
  }

  reset() {
    this.lineTool.reset();
  }

  drawLines(ctx, selectionTool, setTransform) {
    ctx.save();
    setTransform(ctx);
    ctx.lineCap = "round";

    const hoveredItem = selectionTool.getHoveredItem();
    const selectedItem = selectionTool.getSelectedItem();

    this.state.lines.forEach((line, index) => {
      const isHover =
        (this.state.tool === "select" || this.state.tool === "delete") &&
        hoveredItem &&
        hoveredItem.kind === "line" &&
        hoveredItem.index === index;
      const isSelected =
        selectedItem &&
        selectedItem.kind === "line" &&
        selectedItem.index === index;
      const strokeWidth = line.width || 1;
      const cap = "round";
      const ax = line.start.x + (line.offsetStartX || 0);
      const ay = line.start.y + (line.offsetStartY || 0);
      const bx = line.end.x + (line.offsetEndX || 0);
      const by = line.end.y + (line.offsetEndY || 0);
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy);
      let sx = ax;
      let sy = ay;
      let ex = bx;
      let ey = by;
      ctx.strokeStyle = isSelected ? "#8b2f1a" : (isHover ? "#c5482a" : line.color);
      ctx.lineWidth = (isSelected ? strokeWidth * 1.3 : (isHover ? strokeWidth * 1.15 : strokeWidth));
      ctx.lineCap = cap;
      if (line.style === "dashed") {
        ctx.setLineDash([6, 6]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      this.drawEndCaps(ctx, line, sx, sy, ex, ey, len, 1);

      if (line.style === "double") {
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
      ctx.setLineDash([]);
    });

    ctx.restore();
  }

  drawOverlay(ctx, scale, setTransform) {
    this.lineTool.drawOverlay(
      ctx,
      scale,
      setTransform,
      this.state.currentColor,
      this.state.lineOffsetStartX,
      this.state.lineOffsetEndX,
      this.state.lineOffsetStartY,
      this.state.lineOffsetEndY,
      this.state.lineStartCapStyle,
      this.state.lineEndCapStyle
    );
  }

  drawLinesForExport(ctx, ratio) {
    this.state.lines.forEach((line) => {
      const strokeWidth = line.width || 1;
      const cap = "round";
      const ax = line.start.x + (line.offsetStartX || 0);
      const ay = line.start.y + (line.offsetStartY || 0);
      const bx = line.end.x + (line.offsetEndX || 0);
      const by = line.end.y + (line.offsetEndY || 0);
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy);
      let sx = ax;
      let sy = ay;
      let ex = bx;
      let ey = by;
      ctx.strokeStyle = line.color;
      ctx.lineWidth = strokeWidth * ratio;
      ctx.lineCap = cap;
      if (line.style === "dashed") {
        ctx.setLineDash([6 * ratio, 6 * ratio]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      this.drawEndCaps(ctx, line, sx, sy, ex, ey, len, ratio);

      if (line.style === "double") {
        if (len > 0) {
          const nx = -dy / len;
          const ny = dx / len;
          const offset = Math.max(1.5, strokeWidth * 0.6);
          ctx.lineWidth = Math.max(1, strokeWidth * 0.55) * ratio;
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
      ctx.setLineDash([]);
    });
  }

  drawEndCaps(ctx, line, sx, sy, ex, ey, len, ratio) {
    if (!len) return;
    const ux = (ex - sx) / len;
    const uy = (ey - sy) / len;
    const size = Math.max(6, (line.width || 1) * 3) * ratio;
    const half = size * 0.6;
    const drawArrow = (x, y, dirX, dirY) => {
      const nx = -dirY;
      const ny = dirX;
      const tipX = x + dirX * size;
      const tipY = y + dirY * size;
      ctx.fillStyle = ctx.strokeStyle;
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
      const halfW = (line.width || 1) * 0.5 * ratio;
      const halfL = halfW;
      ctx.fillStyle = ctx.strokeStyle;
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

    if (line.startCapStyle === "arrow") {
      drawArrow(sx, sy, -ux, -uy);
    } else if (line.startCapStyle === "c") {
      drawCCap(sx, sy, ux, uy);
    } else if (line.startCapStyle === "t") {
      drawTCap(sx, sy, ux, uy);
    } else if (line.startCapStyle === "square") {
      drawSquareCap(sx, sy, -ux, -uy);
    }

    if (line.endCapStyle === "arrow") {
      drawArrow(ex, ey, ux, uy);
    } else if (line.endCapStyle === "c") {
      drawCCap(ex, ey, -ux, -uy);
    } else if (line.endCapStyle === "t") {
      drawTCap(ex, ey, -ux, -uy);
    } else if (line.endCapStyle === "square") {
      drawSquareCap(ex, ey, ux, uy);
    }
  }
}
