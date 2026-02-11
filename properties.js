// Properties panel behavior (selection info + editable properties).

class PropertiesPanel {
  constructor(options) {
    this.state = options.state;
    this.selectionTool = options.selectionTool;
    this.rebuildSelectionIndex = options.rebuildSelectionIndex;
    this.drawLines = options.drawLines;
    this.drawAll = options.drawAll;
    this.colorPanel = options.colorPanel;

    this.lineWidthSelect = document.getElementById("lineWidthSelect");
    this.lineStyleSelect = document.getElementById("lineStyleSelect");
    this.lineStartCapSelect = document.getElementById("lineStartCapSelect");
    this.lineEndCapSelect = document.getElementById("lineEndCapSelect");
    this.lineStartOffset = document.getElementById("lineStartOffset");
    this.lineEndOffset = document.getElementById("lineEndOffset");
    this.lineStartOffsetY = document.getElementById("lineStartOffsetY");
    this.lineEndOffsetY = document.getElementById("lineEndOffsetY");
    this.textOffset = document.getElementById("textOffset");
    this.lineStartOffsetValue = document.getElementById("lineStartOffsetValue");
    this.lineEndOffsetValue = document.getElementById("lineEndOffsetValue");
    this.lineStartOffsetYValue = document.getElementById("lineStartOffsetYValue");
    this.lineEndOffsetYValue = document.getElementById("lineEndOffsetYValue");
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

    this.lineStartCapSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      if (this.state.tool === "select") {
        const item = this.selectionTool.getSelectedItem();
        if (item && item.kind === "line") {
          this.state.lines[item.index].startCapStyle = value;
          this.rebuildSelectionIndex();
          this.drawLines();
          return;
        }
      }
      this.state.lineStartCapStyle = value;
    });

    this.lineEndCapSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      if (this.state.tool === "select") {
        const item = this.selectionTool.getSelectedItem();
        if (item && item.kind === "line") {
          this.state.lines[item.index].endCapStyle = value;
          this.rebuildSelectionIndex();
          this.drawLines();
          return;
        }
      }
      this.state.lineEndCapStyle = value;
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

    this.lineStartOffsetY.addEventListener("input", (e) => {
      const value = Number(e.target.value) || 0;
      this.lineStartOffsetYValue.textContent = String(value);
      if (this.state.tool === "select") {
        const item = this.selectionTool.getSelectedItem();
        if (item && item.kind === "line") {
          this.state.lines[item.index].offsetStartY = value;
          this.rebuildSelectionIndex();
          this.drawLines();
          return;
        }
      }
      this.state.lineOffsetStartY = value;
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

    this.lineEndOffsetY.addEventListener("input", (e) => {
      const value = Number(e.target.value) || 0;
      this.lineEndOffsetYValue.textContent = String(value);
      if (this.state.tool === "select") {
        const item = this.selectionTool.getSelectedItem();
        if (item && item.kind === "line") {
          this.state.lines[item.index].offsetEndY = value;
          this.rebuildSelectionIndex();
          this.drawLines();
          return;
        }
      }
      this.state.lineOffsetEndY = value;
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
    this.lineStartCapSelect.disabled = !canEditLine;
    this.lineEndCapSelect.disabled = !canEditLine;
    this.lineStartOffset.disabled = !canEditLine;
    this.lineEndOffset.disabled = !canEditLine;
    this.lineStartOffsetY.disabled = !canEditLine;
    this.lineEndOffsetY.disabled = !canEditLine;
    this.textOffset.disabled = !canEditText;
    this.colorPanel.setEnabled(canEditLine || canEditText);

    if (isDraw) {
      this.lineWidthSelect.value = String(this.state.lineWidth);
      this.lineStyleSelect.value = this.state.lineStyle;
      this.lineStartCapSelect.value = this.state.lineStartCapStyle;
      this.lineEndCapSelect.value = this.state.lineEndCapStyle;
      this.setOffsetControl(this.lineStartOffset, this.lineStartOffsetValue, this.state.lineOffsetStartX);
      this.setOffsetControl(this.lineStartOffsetY, this.lineStartOffsetYValue, this.state.lineOffsetStartY);
      this.setOffsetControl(this.lineEndOffset, this.lineEndOffsetValue, this.state.lineOffsetEndX);
      this.setOffsetControl(this.lineEndOffsetY, this.lineEndOffsetYValue, this.state.lineOffsetEndY);
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
      this.colorPanel.setSwatch(this.state.currentColor);
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
      this.colorPanel.setSwatch(this.state.currentColor);
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
      this.lineStartCapSelect.value = line.startCapStyle || "none";
      this.lineEndCapSelect.value = line.endCapStyle || "none";
      this.setOffsetControl(this.lineStartOffset, this.lineStartOffsetValue, line.offsetStartX || 0);
      this.setOffsetControl(this.lineStartOffsetY, this.lineStartOffsetYValue, line.offsetStartY || 0);
      this.setOffsetControl(this.lineEndOffset, this.lineEndOffsetValue, line.offsetEndX || 0);
      this.setOffsetControl(this.lineEndOffsetY, this.lineEndOffsetYValue, line.offsetEndY || 0);
      this.colorPanel.setSwatch(line.color || this.state.currentColor);
      this.propText.value = "";
      this.propText.disabled = true;
    } else {
      const text = item.data;
      this.propText.value = text.text;
      this.propText.disabled = false;
      this.setOffsetControl(this.textOffset, this.textOffsetValue, text.offsetX || 0);
      this.colorPanel.setSwatch(text.color || this.state.currentColor);
    }
    this.btnDeleteSelected.disabled = false;
    this.updateLineControlsForContext();
  }

  init() {
    this.lineWidthSelect.value = String(this.state.lineWidth);
    this.lineStyleSelect.value = this.state.lineStyle;
    this.lineStartCapSelect.value = this.state.lineStartCapStyle;
    this.lineEndCapSelect.value = this.state.lineEndCapStyle;
    this.lineStartOffset.value = String(this.state.lineOffsetStartX);
    this.lineEndOffset.value = String(this.state.lineOffsetEndX);
    this.lineStartOffsetY.value = String(this.state.lineOffsetStartY);
    this.lineEndOffsetY.value = String(this.state.lineOffsetEndY);
    this.textOffset.value = String(this.state.textOffsetX);
    this.lineStartOffsetValue.textContent = String(this.state.lineOffsetStartX);
    this.lineEndOffsetValue.textContent = String(this.state.lineOffsetEndX);
    this.lineStartOffsetYValue.textContent = String(this.state.lineOffsetStartY);
    this.lineEndOffsetYValue.textContent = String(this.state.lineOffsetEndY);
    this.textOffsetValue.textContent = String(this.state.textOffsetX);
    this.colorPanel.setSwatch(this.state.currentColor);
    this.update();
  }
}

window.PropertiesPanel = PropertiesPanel;
