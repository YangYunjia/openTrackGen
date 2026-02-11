// IO operations: open/save/export.

class IOController {
  constructor(options) {
    this.state = options.state;
    this.gridSize = options.gridSize;
    this.drawCanvas = options.drawCanvas;
    this.dpr = options.dpr;
    this.screenToWorld = options.screenToWorld;
    this.lineController = options.lineController;
    this.textFontFamily = options.textFontFamily;
    this.defaultTextSize = options.defaultTextSize;
    this.rebuildSelectionIndex = options.rebuildSelectionIndex;
    this.afterLoad = options.afterLoad;

    this.btnExport = document.getElementById("btnExport");
    this.btnSave = document.getElementById("btnSave");
    this.btnOpen = document.getElementById("btnOpen");
    this.exportTransparent = document.getElementById("exportTransparent");

    this.bindEvents();
  }

  bindEvents() {
    this.btnExport.addEventListener("click", () => this.exportPng());
    this.btnSave.addEventListener("click", () => this.saveJson());
    this.btnOpen.addEventListener("click", () => this.openJson());
  }

  exportPng() {
    const rect = this.drawCanvas.getBoundingClientRect();
    const ratio = this.dpr();
    const out = document.createElement("canvas");
    out.width = Math.round(rect.width * ratio);
    out.height = Math.round(rect.height * ratio);
    const ctx = out.getContext("2d");

    const transparent = this.exportTransparent && this.exportTransparent.checked;
    if (!transparent) {
      ctx.fillStyle = "#f6f0e6";
      ctx.fillRect(0, 0, out.width, out.height);
    }

    ctx.save();
    ctx.scale(ratio, ratio);
    ctx.setTransform(
      this.state.scale * ratio,
      0,
      0,
      this.state.scale * ratio,
      this.state.offsetX * ratio,
      this.state.offsetY * ratio
    );

    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(rect.width, rect.height);
    const startX = Math.floor(topLeft.x / this.gridSize) * this.gridSize;
    const endX = Math.ceil(bottomRight.x / this.gridSize) * this.gridSize;
    const startY = Math.floor(topLeft.y / this.gridSize) * this.gridSize;
    const endY = Math.ceil(bottomRight.y / this.gridSize) * this.gridSize;

    if (!transparent) {
      ctx.lineWidth = (1 / this.state.scale) * ratio;
      for (let x = startX; x <= endX; x += this.gridSize) {
        const strong = (Math.round(x / this.gridSize) % 5) === 0;
        ctx.strokeStyle = strong ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.10)";
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }
      for (let y = startY; y <= endY; y += this.gridSize) {
        const strong = (Math.round(y / this.gridSize) % 5) === 0;
        ctx.strokeStyle = strong ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.10)";
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }
    }

    this.lineController.drawLinesForExport(ctx, ratio);

    this.state.texts.forEach((text) => {
      const offset = Array.isArray(text.offset) ? text.offset : [text.offsetX || 0, text.offsetY || 0];
      ctx.fillStyle = text.color;
      ctx.font = `${text.fontSize}px ${this.textFontFamily}`;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillText(text.text, text.x + (offset[0] || 0), text.y + (offset[1] || 0));
    });

    ctx.restore();

    const a = document.createElement("a");
    a.download = "canvas.png";
    a.href = out.toDataURL("image/png");
    a.click();
  }

  saveJson() {
    const data = {
      version: 1,
      gridSize: this.gridSize,
      lines: this.state.lines,
      texts: this.state.texts
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.download = "canvas.json";
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
  }

  openJson() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.addEventListener("change", () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          const lines = Array.isArray(data.lines) ? data.lines : [];
          const texts = Array.isArray(data.texts) ? data.texts : [];
          this.state.lines = lines.map((line) => {
            let offsets = line.offsets;
            if (!Array.isArray(offsets)) {
              offsets = [
                [line.offsetStartX || 0, line.offsetStartY || 0],
                [line.offsetEndX || 0, line.offsetEndY || 0]
              ];
            }
            return {
              start: line.start,
              end: line.end,
              color: line.color || this.state.currentColor,
              width: line.width || 1,
              style: line.style || "solid",
              startCapStyle: line.startCapStyle || "none",
              endCapStyle: line.endCapStyle || "none",
              offsets
            };
          });
          this.state.texts = texts.map((text) => {
            const offset = Array.isArray(text.offset)
              ? text.offset
              : [text.offsetX || 0, text.offsetY || 0];
            return {
              x: text.x,
              y: text.y,
              text: text.text || "Text",
              fontSize: text.fontSize || this.defaultTextSize,
              color: text.color || this.state.currentColor,
              offset
            };
          });
          this.rebuildSelectionIndex();
          this.afterLoad();
        } catch (err) {
          console.error("Failed to read file", err);
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }
}

window.IOController = IOController;
