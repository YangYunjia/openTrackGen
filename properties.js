// Properties panel behavior (selection info + editable properties).

class PropertiesPanel {
  constructor(options) {
    this.state = options.state;
    this.selectionTool = options.selectionTool;
    this.rebuildSelectionIndex = options.rebuildSelectionIndex;
    this.drawLines = options.drawLines;
    this.drawAll = options.drawAll;

    this.lineWidthSelect = document.getElementById("lineWidthSelect");
    this.lineStyleSelect = document.getElementById("lineStyleSelect");
    this.lineCapSelect = document.getElementById("lineCapSelect");
    this.lineAlignSelect = document.getElementById("lineAlignSelect");
    this.lineStartOffset = document.getElementById("lineStartOffset");
    this.lineEndOffset = document.getElementById("lineEndOffset");
    this.textOffset = document.getElementById("textOffset");
    this.lineStartOffsetValue = document.getElementById("lineStartOffsetValue");
    this.lineEndOffsetValue = document.getElementById("lineEndOffsetValue");
    this.textOffsetValue = document.getElementById("textOffsetValue");
    this.propStatus = document.getElementById("propStatus");
    this.propType = document.getElementById("propType");
    this.propId = document.getElementById("propId");
    this.propText = document.getElementById("propText");
    this.btnDeleteSelected = document.getElementById("btnDeleteSelected");

    this.bindEvents();
  }

  bindEvents() {
    this.btnDeleteSelected.addEventListener("click", () => {
      const item = this.selectionTool.getSelectedItem();
      if (!item) return;
      if (item.kind === "line") {
        this.state.lines.splice(item.index, 1);
      }
      if (item.kind === "text") {
        this.state.texts.splice(item.index, 1);
      }
      this.rebuildSelectionIndex();
      this.selectionTool.clearSelection();
      this.update();
      this.drawAll();
    });

    this.propText.addEventListener("input", (e) => {
      const item = this.selectionTool.getSelectedItem();
      if (!item || item.kind !== "text") return;
      this.state.texts[item.index].text = e.target.value;
      this.rebuildSelectionIndex();
      this.drawAll();
    });

    this.lineWidthSelect.addEventListener("change", (e) => {
      const value = Number(e.target.value);
      if (this.state.tool === "select") {
        const item = this.selectionTool.getSelectedItem();
        if (item && item.kind === "line") {
          this.state.lines[item.index].width = value;
          this.rebuildSelectionIndex();
          this.drawLines();
          return;
        }
      }
      this.state.lineWidth = value;
    });

    this.lineStyleSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      if (this.state.tool === "select") {
        const item = this.selectionTool.getSelectedItem();
        if (item && item.kind === "line") {
          this.state.lines[item.index].style = value;
          this.rebuildSelectionIndex();
          this.drawLines();
          return;
        }
      }
      this.state.lineStyle = value;
    });

    this.lineCapSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      if (this.state.tool === "select") {
        const item = this.selectionTool.getSelectedItem();
        if (item && item.kind === "line") {
          this.state.lines[item.index].cap = value;
          this.rebuildSelectionIndex();
          this.drawLines();
          return;
        }
      }
      this.state.lineCap = value;
    });

    this.lineAlignSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      if (this.state.tool === "select") {
        const item = this.selectionTool.getSelectedItem();
        if (item && item.kind === "line") {
          this.state.lines[item.index].align = value;
          this.rebuildSelectionIndex();
          this.drawLines();
          return;
        }
      }
      this.state.lineAlign = value;
    });

    this.lineStartOffset.addEventListener("input", (e) => {
      const value = Number(e.target.value) || 0;
      this.lineStartOffsetValue.textContent = String(value);
      if (this.state.tool === "select") {
        const item = this.selectionTool.getSelectedItem();
        if (item && item.kind === "line") {
          this.state.lines[item.index].offsetStartX = value;
          this.rebuildSelectionIndex();
          this.drawLines();
          return;
        }
      }
      this.state.lineOffsetStartX = value;
    });

    this.lineEndOffset.addEventListener("input", (e) => {
      const value = Number(e.target.value) || 0;
      this.lineEndOffsetValue.textContent = String(value);
      if (this.state.tool === "select") {
        const item = this.selectionTool.getSelectedItem();
        if (item && item.kind === "line") {
          this.state.lines[item.index].offsetEndX = value;
          this.rebuildSelectionIndex();
          this.drawLines();
          return;
        }
      }
      this.state.lineOffsetEndX = value;
    });

    this.textOffset.addEventListener("input", (e) => {
      const value = Number(e.target.value) || 0;
      this.textOffsetValue.textContent = String(value);
      if (this.state.tool === "select") {
        const item = this.selectionTool.getSelectedItem();
        if (item && item.kind === "text") {
          this.state.texts[item.index].offsetX = value;
          this.rebuildSelectionIndex();
          this.drawLines();
          return;
        }
      }
      this.state.textOffsetX = value;
    });
  }

  setOffsetControl(input, valueEl, value) {
    const v = Number(value) || 0;
    input.value = String(v);
    valueEl.textContent = String(v);
  }

  updateLineControlsForContext() {
    const selected = this.selectionTool.getSelectedItem();
    const isDraw = this.state.tool === "draw";
    const isText = this.state.tool === "text";
    const canEditLine =
      isDraw ||
      (this.state.tool === "select" && selected && selected.kind === "line");
    const canEditText =
      isText ||
      (this.state.tool === "select" && selected && selected.kind === "text");

    this.lineWidthSelect.disabled = !canEditLine;
    this.lineStyleSelect.disabled = !canEditLine;
    this.lineCapSelect.disabled = !canEditLine;
    this.lineAlignSelect.disabled = !canEditLine;
    this.lineStartOffset.disabled = !canEditLine;
    this.lineEndOffset.disabled = !canEditLine;
    this.textOffset.disabled = !canEditText;

    if (isDraw) {
      this.lineWidthSelect.value = String(this.state.lineWidth);
      this.lineStyleSelect.value = this.state.lineStyle;
      this.lineCapSelect.value = this.state.lineCap;
      this.lineAlignSelect.value = this.state.lineAlign;
      this.setOffsetControl(this.lineStartOffset, this.lineStartOffsetValue, this.state.lineOffsetStartX);
      this.setOffsetControl(this.lineEndOffset, this.lineEndOffsetValue, this.state.lineOffsetEndX);
    }

    if (isText) {
      this.setOffsetControl(this.textOffset, this.textOffsetValue, this.state.textOffsetX);
    }
  }

  update() {
    if (this.selectionTool.selectedIndex === null) {
      this.propStatus.textContent = "None";
      this.propType.textContent = "-";
      this.propId.textContent = "-";
      this.propText.value = "";
      this.propText.disabled = true;
      this.btnDeleteSelected.disabled = true;
      this.updateLineControlsForContext();
      return;
    }
    const item = this.selectionTool.getSelectedItem();
    if (!item) {
      this.propStatus.textContent = "None";
      this.propType.textContent = "-";
      this.propId.textContent = "-";
      this.propText.value = "";
      this.propText.disabled = true;
      this.btnDeleteSelected.disabled = true;
      this.updateLineControlsForContext();
      return;
    }
    this.propStatus.textContent = "Selected";
    this.propType.textContent = item.kind;
    this.propId.textContent = String(item.index);
    if (item.kind === "line") {
      const line = item.data;
      this.lineWidthSelect.value = String(line.width || 1);
      this.lineStyleSelect.value = line.style || "solid";
      this.lineCapSelect.value = line.cap || "round";
      this.lineAlignSelect.value = line.align || "center";
      this.setOffsetControl(this.lineStartOffset, this.lineStartOffsetValue, line.offsetStartX || 0);
      this.setOffsetControl(this.lineEndOffset, this.lineEndOffsetValue, line.offsetEndX || 0);
      this.propText.value = "";
      this.propText.disabled = true;
    } else {
      const text = item.data;
      this.propText.value = text.text;
      this.propText.disabled = false;
      this.setOffsetControl(this.textOffset, this.textOffsetValue, text.offsetX || 0);
    }
    this.btnDeleteSelected.disabled = false;
    this.updateLineControlsForContext();
  }

  init() {
    this.lineWidthSelect.value = String(this.state.lineWidth);
    this.lineStyleSelect.value = this.state.lineStyle;
    this.lineCapSelect.value = this.state.lineCap;
    this.lineAlignSelect.value = this.state.lineAlign;
    this.lineStartOffset.value = String(this.state.lineOffsetStartX);
    this.lineEndOffset.value = String(this.state.lineOffsetEndX);
    this.textOffset.value = String(this.state.textOffsetX);
    this.lineStartOffsetValue.textContent = String(this.state.lineOffsetStartX);
    this.lineEndOffsetValue.textContent = String(this.state.lineOffsetEndX);
    this.textOffsetValue.textContent = String(this.state.textOffsetX);
    this.update();
  }
}

window.PropertiesPanel = PropertiesPanel;
