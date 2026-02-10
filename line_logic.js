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
      cap: this.state.lineCap,
      align: this.state.lineAlign,
      offsetStartX: this.state.lineOffsetStartX || 0,
      offsetEndX: this.state.lineOffsetEndX || 0
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
      const align = line.align || "center";
      const cap = line.cap || "round";
      const ax = line.start.x + (line.offsetStartX || 0);
      const ay = line.start.y;
      const bx = line.end.x + (line.offsetEndX || 0);
      const by = line.end.y;
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy);
      let sx = ax;
      let sy = ay;
      let ex = bx;
      let ey = by;
      if (len > 0 && align !== "center") {
        const nx = -dy / len;
        const ny = dx / len;
        const offset = (strokeWidth / 2) * (align === "left" ? 1 : -1);
        sx = ax + nx * offset;
        sy = ay + ny * offset;
        ex = bx + nx * offset;
        ey = by + ny * offset;
      }
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
      this.state.lineOffsetEndX
    );
  }

  drawLinesForExport(ctx, ratio) {
    this.state.lines.forEach((line) => {
      const strokeWidth = line.width || 1;
      const align = line.align || "center";
      const cap = line.cap || "round";
      const ax = line.start.x + (line.offsetStartX || 0);
      const ay = line.start.y;
      const bx = line.end.x + (line.offsetEndX || 0);
      const by = line.end.y;
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy);
      let sx = ax;
      let sy = ay;
      let ex = bx;
      let ey = by;
      if (len > 0 && align !== "center") {
        const nx = -dy / len;
        const ny = dx / len;
        const offset = (strokeWidth / 2) * (align === "left" ? 1 : -1);
        sx = ax + nx * offset;
        sy = ay + ny * offset;
        ex = bx + nx * offset;
        ey = by + ny * offset;
      }
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
}
