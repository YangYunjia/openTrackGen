(() => {
  const gridCanvas = document.getElementById("gridCanvas");
  const drawCanvas = document.getElementById("drawCanvas");
  const overlayCanvas = document.getElementById("overlayCanvas");
  const hud = document.getElementById("hud");

  const btnLine = document.getElementById("btnLine");
  const btnUndo = document.getElementById("btnUndo");
  const btnSelect = document.getElementById("btnSelect");
  const btnDelete = document.getElementById("btnDelete");
  const btnText = document.getElementById("btnText");
  let colorPanel = null;
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
    lineStartCapStyle: "none",
    lineEndCapStyle: "none",
    lineOffsets: [[0, 0], [0, 0]],
    textOffset: [0, 0],
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
      kind: state.lineStyle
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
      const offsets = Array.isArray(line.offsets) ? line.offsets : [[0, 0], [0, 0]];
      const ax = line.start.x + (offsets[0]?.[0] || 0);
      const ay = line.start.y + (offsets[0]?.[1] || 0);
      const bx = line.end.x + (offsets[1]?.[0] || 0);
      const by = line.end.y + (offsets[1]?.[1] || 0);
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
      const offset = Array.isArray(text.offset) ? text.offset : [text.offsetX || 0, text.offsetY || 0];
      const minX = text.x + (offset[0] || 0);
      const minY = text.y + (offset[1] || 0);
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
      const offsets = Array.isArray(line.offsets) ? line.offsets : [[0, 0], [0, 0]];
      return distanceToSegment(
        x,
        y,
        line.start.x + (offsets[0]?.[0] || 0),
        line.start.y + (offsets[0]?.[1] || 0),
        line.end.x + (offsets[1]?.[0] || 0),
        line.end.y + (offsets[1]?.[1] || 0)
      );
    }
    if (item.kind === "text") {
      const text = item.data;
      const box = text.__box || measureTextBox(text.text, text.fontSize);
      const offset = Array.isArray(text.offset) ? text.offset : [text.offsetX || 0, text.offsetY || 0];
      return distanceToRect(
        x,
        y,
        text.x + (offset[0] || 0),
        text.y + (offset[1] || 0),
        text.x + (offset[0] || 0) + box.width,
        text.y + (offset[1] || 0) + box.height
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
      const offset = Array.isArray(text.offset) ? text.offset : [text.offsetX || 0, text.offsetY || 0];
      ctx.fillStyle = text.color;
      ctx.font = `${text.fontSize}px ${textFontFamily}`;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillText(text.text, text.x + (offset[0] || 0), text.y + (offset[1] || 0));
    });

    const hovered = selectionTool.getHoveredItem();
    const selected = selectionTool.getSelectedItem();
    const highlightText = (item, color) => {
      if (!item || item.kind !== "text") return;
      const box = item.data.__box || measureTextBox(item.data.text, item.data.fontSize);
      const offset = Array.isArray(item.data.offset) ? item.data.offset : [item.data.offsetX || 0, item.data.offsetY || 0];
      ctx.strokeStyle = color;
      ctx.lineWidth = 1 / state.scale;
      ctx.setLineDash([]);
      ctx.strokeRect(
        item.data.x + (offset[0] || 0),
        item.data.y + (offset[1] || 0),
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
          offset: [state.textOffset[0] || 0, state.textOffset[1] || 0]
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
    rebuildSelectionIndex();
    new IOController({
      state,
      gridSize,
      drawCanvas,
      dpr,
      screenToWorld,
      lineController,
      textFontFamily,
      defaultTextSize,
      rebuildSelectionIndex,
      afterLoad: () => {
        propertiesPanel.update();
        drawAll();
      }
    });
    colorPanel = new ColorPanel({
      state,
      selectionTool,
      drawLines
    });
    propertiesPanel = new PropertiesPanel({
      state,
      selectionTool,
      rebuildSelectionIndex,
      drawLines,
      drawAll,
      colorPanel
    });
    propertiesPanel.init();
    resize();
  };

  init();
})();
