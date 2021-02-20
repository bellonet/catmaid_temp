(function (CATMAID) {

  "use strict";

  let PaintingLayer = function(stackViewer) {
    this.opacity = 1;
    this.isHideable = true;
    this.stackViewer = stackViewer;

    this.view = document.createElement("canvas");
    this.view.style.position = "absolute";
    this.view.style.left = 0;
    this.view.style.top = 0;

    stackViewer.getView().appendChild(this.view);

    // // For canvas drawing:
    // this.ctx = this.view.getContext("2d");
    // this.prevX = 0;
    // this.currX = 0;
    // this.prevY = 0;
    // this.currY = 0;
    // this.mouseDownFlag = false;

    // // The collection of objects that will be drawn
    // this.paintedObjs = [];

  };

  PaintingLayer.prototype.unregister = function() {
    this.stackViewer.getView().removeChild(this.view);
  };

  PaintingLayer.prototype.getLayerName = function() {
    return "Painting";
  };

  // PaintingLayer.prototype.initNewShape = function() {
  //   this.newPaintedObj = {
  //     x:[],
  //     y:[],
  //     z:this.stackViewer.z,
  //     label:false
  //   };
  // };

  // PaintingLayer.prototype.onmousedown = function(e) {
    
  //   let stackViewer = this.stackViewer;
  //   let m = CATMAID.ui.getMouse(e, stackViewer.getView(), true);
  //   if (m) {
  //     let screenPosition = stackViewer.screenPosition();
  //     let lastX = screenPosition.left + m.offsetX / stackViewer.scale / stackViewer.primaryStack.anisotropy(0).x;
  //     let lastY = screenPosition.top  + m.offsetY / stackViewer.scale / stackViewer.primaryStack.anisotropy(0).y;
  //   }
    

  //   this.mouseDownFlag = true;
  //   this.initNewShape()

  //   this.currX = e.clientX; // - this.view.style.left;
  //   this.currY = e.clientY; // why -100?
  // };

  // PaintingLayer.prototype.onmousemove = function(e) {

  //   if (this.mouseDownFlag) {
  //     this.prevX = this.currX;
  //     this.prevY = this.currY;
  //     this.newPaintedObj.x.push(this.prevX);
  //     this.newPaintedObj.y.push(this.prevY);

  //     this.currX = e.clientX; 
  //     this.currY = e.clientY; 

  //     this.ctx.strokeStyle = "#FF0000";
  //     this.ctx.lineWidth = 5;
  //     this.draw();
  //   }
  // };

  // PaintingLayer.prototype.onmouseup = function(e) {
  //   this.mouseDownFlag = false;
  //   this.paintedObjs.push(this.newPaintedObj);
  //   this.ctx.clearRect(0, 0, this.view.width, this.view.height);
  //   this.redrawAllObjs();
  // };

  // PaintingLayer.prototype.draw = function() {
  //   this.ctx.beginPath();
  //   this.ctx.moveTo(this.prevX, this.prevY);
  //   this.ctx.lineTo(this.currX, this.currY);
  //   this.ctx.stroke();
  //   this.ctx.closePath();
  // };

  // PaintingLayer.prototype.redrawAllObjs = function() {
  //   this.ctx.strokeStyle = "#32CD32";
  //   this.ctx.lineWidth = 5;
  //   var l = this.paintedObjs.length;
  //   for (var i=0; i<l; i++) {
  //     var currObj = this.paintedObjs[i];
  //     var ll = currObj.x.length-1;

  //     for (var j=0; j<ll; j++) {
  //       this.ctx.beginPath();
  //       this.ctx.moveTo(currObj.x[j], currObj.y[j]);
  //       this.ctx.lineTo(currObj.x[j]+1, currObj.y[j]+1);
  //       this.ctx.stroke();
  //       this.ctx.closePath();
  //     }

  //   }
  // };

  PaintingLayer.prototype.setOpacity = function(opacity) {
    this.opacity = opacity;
  };

  PaintingLayer.prototype.getOpacity = function() {
    return this.opacity;
  };

  PaintingLayer.prototype.redraw = function(completionCallback) {
    CATMAID.tools.callIfFn(completionCallback);
  };

  PaintingLayer.prototype.resize = function(width, height) {
    this.view.style.width = width + 'px';
    this.view.style.height = height + 'px';
    this.view.width = width;
    this.view.height = height;

    this.redraw();
  };

  CATMAID.PaintingLayer = PaintingLayer;

})(CATMAID);
