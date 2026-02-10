(() => {
  const gridCanvas = document.getElementById("gridCanvas");
  const drawCanvas = document.getElementById("drawCanvas");
  const overlayCanvas = document.getElementById("overlayCanvas");
  const hud = document.getElementById("hud");

  const btnOpen = document.getElementById("btnOpen");
  const btnSave = document.getElementById("btnSave");
  const btnExport = document.getElementById("btnExport");
  const btnLine = document.getElementById("btnLine");
  const btnUndo = document.getElementById("btnUndo");
  const btnSelect = document.getElementById("btnSelect");
  const btnDelete = document.getElementById("btnDelete");
  const btnText = document.getElementById("btnText");
  const btnColor = document.getElementById("btnColor");
  const colorPicker = document.getElementById("colorPicker");
  const colorSwatch = document.getElementById("colorSwatch");
  let propertiesPanel = null;

  // Device pixel ratio helper for crisp rendering.
  const dpr = () => window.devicePixelRatio || 1;
  // App state in world coordinates.
  const state = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    isPanning: false,
    panStart: { x: 0, y: 0 },
    offsetStart: { x: 0, y: 0 },
    currentColor: "#000000",
    lineWidth: 1,
    lineStyle: "solid",
    lineCap: "round",
    lineAlign: "center",
    lineOffsetStartX: 0,
    lineOffsetEndX: 0,
    textOffsetX: 0,
    lines: [],
    texts: [],
    tool: "draw"
  };

  // Grid size in world units and hover snap radius in screen pixels.
  const gridSize = 10;
  const hoverRadius = 7;
  const selectCellSize = 80;
  const selectHitRadius = 6;
  const selectionTool = new SelectionTool({
    cellSize: selectCellSize,
    hitRadius: selectHitRadius,
    getAabb: () => null,
    distanceFn: () => Infinity
  });

  // Resize all canvases to match the CSS size and DPR.
  const resize = () => {
    const ratio = dpr();
    [gridCanvas, drawCanvas, overlayCanvas].forEach((c) => {
      const { width, height } = c.getBoundingClientRect();
      c.width = Math.round(width * ratio);
      c.height = Math.round(height * ratio);
    });
    drawAll();
  };

  // Convert from screen (CSS pixels) to world coordinates.
  const screenToWorld = (x, y) => {
    return {
      x: (x - state.offsetX) / state.scale,
      y: (y - state.offsetY) / state.scale
    };
  };

  // Convert from world coordinates to screen (CSS pixels).
  const worldToScreen = (x, y) => {
    return {
      x: x * state.scale + state.offsetX,
      y: y * state.scale + state.offsetY
    };
  };

  const lineTool = new LineTool({
    gridSize,
    hoverRadius,
    screenToWorld,
    worldToScreen,
    getStyle: () => ({
      width: state.lineWidth,
      kind: state.lineStyle,
      cap: state.lineCap,
      align: state.lineAlign
    })
  });
  const lineController = new LineController({ state, lineTool });

  const textFontFamily = "\"Avenir Next\", \"Futura\", \"Noto Sans\", sans-serif";
  const defaultTextSize = 12;
  let textHoverPoint = null;

  const measureTextBox = (text, fontSize) => {
    const ctx = drawCanvas.getContext("2d");
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = `${fontSize}px ${textFontFamily}`;
    const metrics = ctx.measureText(text);
    ctx.restore();
    return {
      width: metrics.width,
      height: fontSize
    };
  };

  const buildSelectionItems = () => {
    const items = [];
    state.lines.forEach((line, index) => {
      items.push({ kind: "line", index, data: line });
    });
    state.texts.forEach((text, index) => {
      const box = measureTextBox(text.text, text.fontSize);
      items.push({
        kind: "text",
        index,
        data: { ...text, __box: box }
      });
    });
    return items;
  };

  const getItemAabb = (item) => {
    if (!item) return null;
    if (item.kind === "line") {
      const line = item.data;
      const ax = line.start.x + (line.offsetStartX || 0);
      const ay = line.start.y;
      const bx = line.end.x + (line.offsetEndX || 0);
      const by = line.end.y;
      const half = (line.width || 1) / 2;
      const minX = Math.min(ax, bx) - half;
      const maxX = Math.max(ax, bx) + half;
      const minY = Math.min(ay, by) - half;
      const maxY = Math.max(ay, by) + half;
      return { minX, minY, maxX, maxY };
    }
    if (item.kind === "text") {
      const text = item.data;
      const box = text.__box || measureTextBox(text.text, text.fontSize);
      const minX = text.x + (text.offsetX || 0);
      const minY = text.y;
      return { minX, minY, maxX: minX + box.width, maxY: minY + box.height };
    }
    return null;
  };

  const distanceToRect = (x, y, minX, minY, maxX, maxY) => {
    const dx = Math.max(minX - x, 0, x - maxX);
    const dy = Math.max(minY - y, 0, y - maxY);
    return Math.hypot(dx, dy);
  };

  const distanceFn = (item, x, y) => {
    if (item.kind === "line") {
      const line = item.data;
      return distanceToSegment(
        x,
        y,
        line.start.x + (line.offsetStartX || 0),
        line.start.y,
        line.end.x + (line.offsetEndX || 0),
        line.end.y
      );
    }
    if (item.kind === "text") {
      const text = item.data;
      const box = text.__box || measureTextBox(text.text, text.fontSize);
      const ox = text.offsetX || 0;
      return distanceToRect(
        x,
        y,
        text.x + ox,
        text.y,
        text.x + ox + box.width,
        text.y + box.height
      );
    }
    return Infinity;
  };

  selectionTool.getAabb = getItemAabb;
  selectionTool.distanceFn = distanceFn;

  // Apply current pan/zoom transform in device pixels.
  const setTransform = (ctx) => {
    const ratio = dpr();
    ctx.setTransform(
      state.scale * ratio,
      0,
      0,
      state.scale * ratio,
      state.offsetX * ratio,
      state.offsetY * ratio
    );
  };

  // Clear a canvas in device pixels.
  const clearCanvas = (ctx, canvas) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Draw the background grid for the current viewport.
  const drawGrid = () => {
    const ctx = gridCanvas.getContext("2d");
    clearCanvas(ctx, gridCanvas);
    const ratio = dpr();
    const rect = gridCanvas.getBoundingClientRect();
    const w = rect.width * ratio;
    const h = rect.height * ratio;

    const topLeft = screenToWorld(0, 0);
    const bottomRight = screenToWorld(w / ratio, h / ratio);

    const startX = Math.floor(topLeft.x / gridSize) * gridSize;
    const endX = Math.ceil(bottomRight.x / gridSize) * gridSize;
    const startY = Math.floor(topLeft.y / gridSize) * gridSize;
    const endY = Math.ceil(bottomRight.y / gridSize) * gridSize;

    ctx.save();
    setTransform(ctx);
    ctx.lineWidth = 1 / state.scale;

    for (let x = startX; x <= endX; x += gridSize) {
      const strong = (Math.round(x / gridSize) % 5) === 0;
      ctx.strokeStyle = strong ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.10)";
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }

    for (let y = startY; y <= endY; y += gridSize) {
      const strong = (Math.round(y / gridSize) % 5) === 0;
      ctx.strokeStyle = strong ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.10)";
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    ctx.restore();
  };

  // Draw committed line segments and texts.
  const drawLines = () => {
    const ctx = drawCanvas.getContext("2d");
    clearCanvas(ctx, drawCanvas);
    lineController.drawLines(ctx, selectionTool, setTransform);

    ctx.save();
    setTransform(ctx);
    state.texts.forEach((text) => {
      ctx.fillStyle = text.color;
      ctx.font = `${text.fontSize}px ${textFontFamily}`;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillText(text.text, text.x + (text.offsetX || 0), text.y);
    });

    const hovered = selectionTool.getHoveredItem();
    const selected = selectionTool.getSelectedItem();
    const highlightText = (item, color) => {
      if (!item || item.kind !== "text") return;
      const box = item.data.__box || measureTextBox(item.data.text, item.data.fontSize);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1 / state.scale;
      ctx.setLineDash([]);
      ctx.strokeRect(
        item.data.x + (item.data.offsetX || 0),
        item.data.y,
        box.width,
        box.height
      );
    };
    highlightText(hovered, "#c5482a");
    highlightText(selected, "#8b2f1a");

    ctx.restore();
  };

  // Draw hover/preview overlays without committing.
  const drawOverlay = () => {
    const ctx = overlayCanvas.getContext("2d");
    clearCanvas(ctx, overlayCanvas);

    ctx.save();
    setTransform(ctx);

    if (state.tool === "draw") {
      lineController.drawOverlay(ctx, state.scale, setTransform);
    }
    if (state.tool === "text" && textHoverPoint) {
      ctx.strokeStyle = "#c5482a";
      ctx.lineWidth = 2 / state.scale;
      ctx.beginPath();
      ctx.arc(textHoverPoint.x, textHoverPoint.y, 4 / state.scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  };

  // Full redraw (grid, lines, overlays, HUD).
  const drawAll = () => {
    drawGrid();
    drawLines();
    drawOverlay();
    updateHud();
  };

  const updateHud = () => {
    hud.textContent = `Zoom ${(state.scale * 100).toFixed(0)}%  |  Lines ${state.lines.length}`;
  };

  // Update the snapped hover point if the cursor is near a grid node.
  const updateHover = (x, y) => {
    if (state.tool === "draw") {
      lineController.updateHover(x, y);
      return;
    }

    if (state.tool === "text") {
      const world = screenToWorld(x, y);
      textHoverPoint = {
        x: Math.round(world.x / gridSize) * gridSize,
        y: Math.round(world.y / gridSize) * gridSize
      };
      return;
    }

    const world = screenToWorld(x, y);
    const items = buildSelectionItems();
    selectionTool.updateHover(items, world.x, world.y, state.scale);
  };

  // Mouse move: handle panning or hover/preview.
  const onPointerMove = (e) => {
    const rect = overlayCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (state.isPanning) {
      const dx = x - state.panStart.x;
      const dy = y - state.panStart.y;
      state.offsetX = state.offsetStart.x + dx;
      state.offsetY = state.offsetStart.y + dy;
      drawAll();
      return;
    }

    if (state.tool === "draw") {
      lineController.handlePointerMove(x, y);
    } else {
      updateHover(x, y);
    }
    if (state.tool === "select" || state.tool === "delete") {
      drawLines();
    }
    drawOverlay();
  };

  // Mouse down: middle button pans, left button starts a line.
  const onPointerDown = (e) => {
    const rect = overlayCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (e.button === 1) {
      state.isPanning = true;
      state.panStart = { x, y };
      state.offsetStart = { x: state.offsetX, y: state.offsetY };
      return;
    }

    if (e.button === 0) {
      if (state.tool === "draw") {
        lineController.handlePointerDown(x, y);
        return;
      }

      if (state.tool === "text") {
        const world = screenToWorld(x, y);
        const snapped = {
          x: Math.round(world.x / gridSize) * gridSize,
          y: Math.round(world.y / gridSize) * gridSize
        };
        state.texts.push({
          x: snapped.x,
          y: snapped.y,
          text: "Text",
          fontSize: defaultTextSize,
          color: state.currentColor,
          offsetX: state.textOffsetX || 0
        });
        rebuildSelectionIndex();
        drawAll();
        return;
      }

      updateHover(x, y);
      if (state.tool === "select") {
        selectionTool.selectHover();
        propertiesPanel.update();
        drawAll();
        return;
      }

      if (state.tool === "delete") {
        const hovered = selectionTool.getHoveredItem();
        if (hovered) {
          if (hovered.kind === "line") {
            state.lines.splice(hovered.index, 1);
          }
          if (hovered.kind === "text") {
            state.texts.splice(hovered.index, 1);
          }
          rebuildSelectionIndex();
          propertiesPanel.update();
          drawAll();
        }
        return;
      }
    }
  };

  // Mouse up: commit a line if a valid end point is selected.
  const onPointerUp = (e) => {
    if (e.button === 1) {
      state.isPanning = false;
      return;
    }

    if (e.button === 0 && state.tool === "draw") {
      const added = lineController.handlePointerUp();
      if (added) {
        rebuildSelectionIndex();
        drawLines();
      }
      drawOverlay();
      updateHud();
    }
  };

  // Wheel zoom around the cursor.
  const onWheel = (e) => {
    e.preventDefault();
    const rect = overlayCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const worldBefore = screenToWorld(x, y);

    const zoomIntensity = 0.0015;
    const nextScale = Math.min(4, Math.max(0.25, state.scale * (1 - e.deltaY * zoomIntensity)));
    state.scale = nextScale;

    const screenAfter = worldToScreen(worldBefore.x, worldBefore.y);
    state.offsetX += x - screenAfter.x;
    state.offsetY += y - screenAfter.y;

    drawAll();
  };

  // Export the current view (including grid) to PNG.
  const exportPng = () => {
    const rect = drawCanvas.getBoundingClientRect();
    const ratio = dpr();
    const out = document.createElement("canvas");
    out.width = Math.round(rect.width * ratio);
    out.height = Math.round(rect.height * ratio);
    const ctx = out.getContext("2d");

    ctx.fillStyle = "#f6f0e6";
    ctx.fillRect(0, 0, out.width, out.height);

    ctx.save();
    ctx.scale(ratio, ratio);
    ctx.setTransform(
      state.scale * ratio,
      0,
      0,
      state.scale * ratio,
      state.offsetX * ratio,
      state.offsetY * ratio
    );

    const topLeft = screenToWorld(0, 0);
    const bottomRight = screenToWorld(rect.width, rect.height);
    const startX = Math.floor(topLeft.x / gridSize) * gridSize;
    const endX = Math.ceil(bottomRight.x / gridSize) * gridSize;
    const startY = Math.floor(topLeft.y / gridSize) * gridSize;
    const endY = Math.ceil(bottomRight.y / gridSize) * gridSize;

    ctx.lineWidth = (1 / state.scale) * ratio;
    for (let x = startX; x <= endX; x += gridSize) {
      const strong = (Math.round(x / gridSize) % 5) === 0;
      ctx.strokeStyle = strong ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.10)";
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    for (let y = startY; y <= endY; y += gridSize) {
      const strong = (Math.round(y / gridSize) % 5) === 0;
      ctx.strokeStyle = strong ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.10)";
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    lineController.drawLinesForExport(ctx, ratio);

    state.texts.forEach((text) => {
      ctx.fillStyle = text.color;
      ctx.font = `${text.fontSize}px ${textFontFamily}`;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillText(text.text, text.x + (text.offsetX || 0), text.y);
    });

    ctx.restore();

    const a = document.createElement("a");
    a.download = "canvas.png";
    a.href = out.toDataURL("image/png");
    a.click();
  };

  // Save line data to JSON.
  const saveJson = () => {
    const data = {
      version: 1,
      gridSize,
      lines: state.lines,
      texts: state.texts
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.download = "canvas.json";
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Load line data from JSON.
  const openJson = () => {
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
          state.lines = lines.map((line) => ({
            start: line.start,
            end: line.end,
            color: line.color || state.currentColor,
            width: line.width || 1,
            style: line.style || "solid",
            cap: line.cap || "round",
            align: line.align || "center",
            offsetStartX: line.offsetStartX || 0,
            offsetEndX: line.offsetEndX || 0
          }));
          state.texts = texts.map((text) => ({
            x: text.x,
            y: text.y,
            text: text.text || "Text",
            fontSize: text.fontSize || defaultTextSize,
            color: text.color || state.currentColor,
            offsetX: text.offsetX || 0
          }));
          rebuildSelectionIndex();
          propertiesPanel.update();
          drawAll();
        } catch (err) {
          console.error("Failed to read file", err);
        }
      };
      reader.readAsText(file);
    });
    input.click();
  };

  btnExport.addEventListener("click", exportPng);
  btnSave.addEventListener("click", saveJson);
  btnOpen.addEventListener("click", openJson);

  btnUndo.addEventListener("click", () => {
    state.lines.pop();
    rebuildSelectionIndex();
    propertiesPanel.update();
    drawLines();
    updateHud();
  });

  const rebuildSelectionIndex = () => {
    const items = buildSelectionItems();
    selectionTool.rebuild(items);
  };

  const setTool = (tool) => {
    state.tool = tool;
    btnLine.classList.toggle("active", tool === "draw");
    btnSelect.classList.toggle("active", tool === "select");
    btnDelete.classList.toggle("active", tool === "delete");
    btnText.classList.toggle("active", tool === "text");
    selectionTool.clearHover();
    if (tool !== "select") {
      selectionTool.clearSelection();
      propertiesPanel.update();
    }
    lineController.reset();
    textHoverPoint = null;
    drawAll();
    propertiesPanel.updateLineControlsForContext();
  };

  btnSelect.addEventListener("click", () => setTool("select"));
  btnDelete.addEventListener("click", () => setTool("delete"));
  btnLine.addEventListener("click", () => setTool("draw"));
  btnText.addEventListener("click", () => setTool("text"));

  btnColor.addEventListener("click", () => colorPicker.click());
  colorPicker.addEventListener("input", (e) => {
    state.currentColor = e.target.value;
    colorSwatch.style.background = state.currentColor;
  });

  overlayCanvas.addEventListener("mousedown", onPointerDown);
  overlayCanvas.addEventListener("mousemove", onPointerMove);
  overlayCanvas.addEventListener("mouseup", onPointerUp);
  overlayCanvas.addEventListener("mouseleave", () => {
    lineController.reset();
    selectionTool.clearHover();
    textHoverPoint = null;
    drawLines();
    drawOverlay();
  });
  overlayCanvas.addEventListener("wheel", onWheel, { passive: false });

  window.addEventListener("resize", resize);

  // Initialize defaults and render.
  const init = () => {
    state.scale = 1;
    state.offsetX = 40;
    state.offsetY = 40;
    colorSwatch.style.background = state.currentColor;
    rebuildSelectionIndex();
    propertiesPanel = new PropertiesPanel({
      state,
      selectionTool,
      rebuildSelectionIndex,
      drawLines,
      drawAll
    });
    propertiesPanel.init();
    resize();
  };

  init();
})();
