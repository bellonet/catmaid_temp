(function(CATMAID) {

  "use strict";

  /**
   * A GridLayer object can render a SVG grid to a view. Its offset is relative to
   * the project's origin.
   */
  var GridLayer = function(stackViewer, options) {
    this.stackViewer = stackViewer;
    // Make sure there is an options object
    options = options || {};
    this.opacity = 1;
    this.isHideable = true;
    this.lineColor = options.lineColor || '#FFFFFF';
    this.lineWidth = options.lineWidth || 2;
    // Cell width and cell height in nanometers
    this.cellWidth = options.cellWidth || 1000;
    this.cellHeight = options.cellHeight || 1000;
    this.xOffset = options.xOffset || 0;
    this.yOffset = options.yOffset || 0;

    // Create grid view, aligned to the upper left
    this.view = document.createElement("div");
    this.view.style.position = "absolute";
    this.view.style.left = 0;
    this.view.style.top = 0;

    // Append it to DOM
    stackViewer.getView().appendChild(this.view);

    // Create SVG
    this.paper = Raphael(this.view, stackViewer.viewWidth, stackViewer.viewHeight);
  };

  GridLayer.prototype = {};

  GridLayer.prototype.getLayerName = function()
  {
    return "Grid";
  };

  GridLayer.prototype.setOpacity = function( val )
  {
      this.view.style.opacity = val;
      this.opacity = val;
  };

  GridLayer.prototype.getOpacity = function()
  {
      return this.opacity;
  };

  /**
   * Allows to set all grid options at once
   */
  GridLayer.prototype.setOptions = function(cellWidth, cellHeight, xOffset, yOffset, lineWidth)
  {
    if (cellWidth) this.cellWidth = cellWidth;
    if (cellHeight) this.cellHeight = cellHeight;
    if (xOffset) this.xOffset = xOffset;
    if (yOffset) this.yOffset = yOffset;
    if (lineWidth) this.lineWidth = lineWidth;
  };

  GridLayer.prototype.resize = function(width, height)
  {
    this.paper.setSize(width, height);
    this.redraw();
  };

  GridLayer.prototype.redraw = function(completionCallback)
  {
    // Get view box in local/stack and world/project coordinates
    var localViewBox = this.stackViewer.createStackViewBox();
    var worldViewBox = this.stackViewer.primaryStack.createStackToProjectBox(localViewBox);

    // Find first horizontal and vertical start coordinate for grid, in
    // world/project coordinates.
    var xGridStartW = this.cellWidth - (worldViewBox.min.x - this.xOffset) % this.cellWidth;
    var yGridStartW = this.cellHeight - (worldViewBox.min.y - this.yOffset) % this.cellHeight;

    // TODO: Make this work with different orientations
    // The drawing math should be done in local/stack coordinates to avoid a
    // performance hit.
    var xGridStartL = (xGridStartW - this.stackViewer.primaryStack.translation.x) * (this.stackViewer.scale / this.stackViewer.primaryStack.resolution.x);
    var yGridStartL = (yGridStartW - this.stackViewer.primaryStack.translation.y) * (this.stackViewer.scale / this.stackViewer.primaryStack.resolution.y);
    // Round later to not let rounding errors add up
    var cellWidthL = (this.cellWidth * this.stackViewer.scale) / this.stackViewer.primaryStack.resolution.x;
    var cellHeightL = (this.cellHeight * this.stackViewer.scale) / this.stackViewer.primaryStack.resolution.y;

    // Number of cells and grid height/width
    var numHCells = Math.ceil((worldViewBox.max.x - worldViewBox.min.x - xGridStartW) / this.cellWidth) + 1;
    var numVCells = Math.ceil((worldViewBox.max.y - worldViewBox.min.y - yGridStartW) / this.cellHeight) + 1;
    var width = (localViewBox.max.x - localViewBox.min.x) * this.stackViewer.scale;
    var height = (localViewBox.max.y - localViewBox.min.y) * this.stackViewer.scale;

    // Clean paper
    this.paper.clear();
    // Horizontal lines
    for (var r=0; r<numVCells; ++r) {
      var yFrom = Math.round(yGridStartL +  r * cellHeightL);
      var line = this.paper.path("M0," + yFrom + "H" + width + "Z");
      line.attr('stroke', this.lineColor);
      line.attr('stroke-width', this.lineWidth);
    }
    // Vertical lines
    for (var c=0; c<numHCells; ++c) {
      var xFrom = Math.round(xGridStartL + c * cellWidthL);
      var line = this.paper.path("M" + xFrom + ",0V" + height + "Z");
      line.attr('stroke', this.lineColor);
      line.attr('stroke-width', this.lineWidth);
    }

    if (completionCallback) {
        completionCallback();
    }

    return;
  };

  GridLayer.prototype.unregister = function()
  {
    this.stackViewer.getView().removeChild(this.view);
  };

  // Export the grid layer into the CATMAID namespace
  CATMAID.GridLayer = GridLayer;

})(CATMAID);
