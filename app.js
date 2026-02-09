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
  const btnColor = document.getElementById("btnColor");
  const colorPicker = document.getElementById("colorPicker");
  const colorSwatch = document.getElementById("colorSwatch");
  const propStatus = document.getElementById("propStatus");
  const propId = document.getElementById("propId");
  const propColor = document.getElementById("propColor");
  const btnDeleteSelected = document.getElementById("btnDeleteSelected");

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
    lines: [],
    tool: "draw"
  };

  // Grid size in world units and hover snap radius in screen pixels.
  const gridSize = 10;
  const hoverRadius = 7;
  const selectCellSize = 80;
  const selectHitRadius = 6;
  const selectionTool = new SelectionTool({
    cellSize: selectCellSize,
    hitRadius: selectHitRadius
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
    worldToScreen
  });

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

  // Draw committed line segments.
  const drawLines = () => {
    const ctx = drawCanvas.getContext("2d");
    clearCanvas(ctx, drawCanvas);
    ctx.save();
    setTransform(ctx);
    ctx.lineCap = "round";

    state.lines.forEach((line) => {
      const isHover =
        (state.tool === "select" || state.tool === "delete") &&
        selectionTool.hoverIndex === line.__index;
      const isSelected = selectionTool.selectedIndex === line.__index;
      ctx.strokeStyle = isSelected ? "#8b2f1a" : (isHover ? "#c5482a" : line.color);
      ctx.lineWidth = (isSelected ? 3.5 : (isHover ? 3 : 2)) / state.scale;
      ctx.beginPath();
      ctx.moveTo(line.start.x, line.start.y);
      ctx.lineTo(line.end.x, line.end.y);
      ctx.stroke();
    });

    ctx.restore();
  };

  // Draw hover/preview overlays without committing.
  const drawOverlay = () => {
    const ctx = overlayCanvas.getContext("2d");
    clearCanvas(ctx, overlayCanvas);

    ctx.save();
    setTransform(ctx);

    if (state.tool === "draw") {
      lineTool.drawOverlay(ctx, state.scale, setTransform, state.currentColor);
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
      lineTool.updateHover(x, y);
      return;
    }

    const world = screenToWorld(x, y);
    selectionTool.updateHover(state.lines, world.x, world.y, state.scale);
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
      lineTool.handlePointerMove(x, y);
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
        lineTool.handlePointerDown(x, y);
        return;
      }

      updateHover(x, y);
      if (state.tool === "select") {
        selectionTool.selectHover();
        updateProperties();
        drawAll();
        return;
      }

      if (state.tool === "delete") {
        if (selectionTool.deleteHover(state.lines)) {
          rebuildSelectionIndex();
          updateProperties();
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
      const segment = lineTool.handlePointerUp();
      if (segment) {
        state.lines.push({
          start: segment.start,
          end: segment.end,
          color: state.currentColor
        });
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

    state.lines.forEach((line) => {
      ctx.strokeStyle = line.color;
      ctx.lineWidth = (2 / state.scale) * ratio;
      ctx.beginPath();
      ctx.moveTo(line.start.x, line.start.y);
      ctx.lineTo(line.end.x, line.end.y);
      ctx.stroke();
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
      lines: state.lines
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
          if (Array.isArray(data.lines)) {
            state.lines = data.lines.map((line) => ({
              start: line.start,
              end: line.end,
              color: line.color || state.currentColor
            }));
            rebuildSelectionIndex();
            updateProperties();
            drawAll();
          }
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
    updateProperties();
    drawLines();
    updateHud();
  });

  const rebuildSelectionIndex = () => {
    selectionTool.rebuild(state.lines);
  };

  const updateProperties = () => {
    if (selectionTool.selectedIndex === null) {
      propStatus.textContent = "None";
      propId.textContent = "-";
      propColor.textContent = "-";
      btnDeleteSelected.disabled = true;
      return;
    }
    const line = state.lines[selectionTool.selectedIndex];
    if (!line) {
      propStatus.textContent = "None";
      propId.textContent = "-";
      propColor.textContent = "-";
      btnDeleteSelected.disabled = true;
      return;
    }
    propStatus.textContent = "Selected";
    propId.textContent = String(selectionTool.selectedIndex);
    propColor.textContent = line.color;
    btnDeleteSelected.disabled = false;
  };

  const setTool = (tool) => {
    state.tool = tool;
    btnLine.classList.toggle("active", tool === "draw");
    btnSelect.classList.toggle("active", tool === "select");
    btnDelete.classList.toggle("active", tool === "delete");
    selectionTool.clearHover();
    lineTool.reset();
    drawAll();
  };

  btnSelect.addEventListener("click", () => setTool("select"));
  btnDelete.addEventListener("click", () => setTool("delete"));
  btnLine.addEventListener("click", () => setTool("draw"));

  btnDeleteSelected.addEventListener("click", () => {
    if (selectionTool.selectedIndex === null) return;
    state.lines.splice(selectionTool.selectedIndex, 1);
    rebuildSelectionIndex();
    selectionTool.clearSelection();
    updateProperties();
    drawAll();
  });

  btnColor.addEventListener("click", () => colorPicker.click());
  colorPicker.addEventListener("input", (e) => {
    state.currentColor = e.target.value;
    colorSwatch.style.background = state.currentColor;
  });

  overlayCanvas.addEventListener("mousedown", onPointerDown);
  overlayCanvas.addEventListener("mousemove", onPointerMove);
  overlayCanvas.addEventListener("mouseup", onPointerUp);
  overlayCanvas.addEventListener("mouseleave", () => {
    lineTool.reset();
    selectionTool.clearHover();
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
    updateProperties();
    resize();
  };

  init();
})();
