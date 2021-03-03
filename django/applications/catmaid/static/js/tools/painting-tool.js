(function(CATMAID) {

  "use strict";

  /**
  * Constructor for the paint tool.
  */
  function PaintingTool() {
    this.prototype = new CATMAID.Navigator();
    this.toolname = "paintingtool";

    this._bindings = new Map();

  };


  PaintingTool.prototype.createBindings = function(stackViewer, layer, mouseCatcher) {

    let self = this;

    let stackViewerBindings = {
      onpointerdown: function(e) {

        // get xyz position on stack:
        let xzyPosition = getMouseDownStackPosition(e);

        // get label layer pixel value:
        var label_layer_name = project.getStackViewers()[0].getLayerOrder()[1];
        project.getStackViewers()[0].getLayer(label_layer_name).pixelValueInScaleLevel(xzyPosition[0], xzyPosition[1], xzyPosition[2]).then( function(labelID) { 

          // get all label ids existing in paint tool widget table:
          var table_labels = $('.paint_lbl').map((_,el) => el.innerText).get();
          
          // set the "last clicked label" in the paint tool widget:
          $("#last-label-clicked").text('Last clicked label: ' + labelID);

          if((labelID) && (!table_labels.some(item => item === labelID.toString()))){
            // only if the labelID clicked is not in the table, add its row to the wdget table:
            updatePaintToolWidget(labelID, xzyPosition);

          }

        });
      },
    };

    for (let fn in stackViewerBindings) {
      mouseCatcher[fn] = stackViewerBindings[fn];
    }

    this._bindings.set(stackViewer, stackViewerBindings);

  };

  function getMouseDownStackPosition(e) {
    var m = CATMAID.ui.getMouse( e, project.getStackViewers()[0].getView() );
    var s = project.getStackViewers()[0];
    var posX = s.primaryStack.translation.x + ( s.x + ( m.offsetX - s.viewWidth / 2 ) / s.scale ) * s.primaryStack.resolution.x;
    var posY = s.primaryStack.translation.x + ( s.y + ( m.offsetY - s.viewHeight / 2 ) / s.scale ) * s.primaryStack.resolution.y;
    return [posX, posY, s.z];
  };

  function updatePaintToolWidget(labelID, xzyPosition) {
    $('#painttable tr:last').after('<tr id="lbl' + labelID + '" role="row">' +
      '<td class="dt-center cm-center paint_lbl">' + 
      '<a onclick="project.getStackViewers()[0].moveTo(' +
      xzyPosition[2] + ', ' + xzyPosition[1] + ', ' + xzyPosition[0] + ');" href="#">' + labelID + '</a></td>' + 
      '<td class=" dt-center cm-center"><input type="checkbox"></td>' + 
      '<td class=" dt-center cm-center"><input type="checkbox"></td>' +
      '<td><input style="width:100%" type="text"></td>' + 
      '<td><input style="width:100%" type="text"></td>' +
      '<td class=" dt-center cm-center">' + xzyPosition[2] + '</td>' +
      '<td class=" dt-center cm-center">' + xzyPosition[1] + '</td>' +
      '<td class=" dt-center cm-center">' + xzyPosition[0] + '</td></tr>');
  };


  PaintingTool.prototype.register = function(parentStackViewer) {
    this.setupSubTools();

    let layer = prepareStackViewer(parentStackViewer);
    this.prototype.setMouseCatcher(layer.view);
    this.prototype.register(parentStackViewer, "edit_button_painting");

    if (!this._bindings.has(parentStackViewer)) {
      this.createBindings(parentStackViewer, layer, layer.view);
    }
  };

  function prepareStackViewer(stackViewer) {
    let layerName = getPaintingLayerName(stackViewer);
    let layer = stackViewer.getLayer(layerName);

    if(!layer) {
      layer = new CATMAID.PaintingLayer(stackViewer);
      stackViewer.addLayer(layerName, layer);
    };

    return layer;
  };


  function getPaintingLayerName(stackViewer) {
    return "PaintingLayer" + stackViewer.getId();
  };

  PaintingTool.prototype.unregister = function() {
    this.prototype.unregister();
  };

  function removePaintingLayersFromStackViewer(stackViewer) {
    let layerName = getPaintingLayerName(stackViewer);
    let layer = stackViewer.getLayer(layerName);

    if (layer) {
      stackViewer.removeLayer(layerName);
    }
  };

  PaintingTool.prototype.destroy = function() {
    project.getStackViewers().forEach(removePaintingLayersFromStackViewer);
    $('#paintingbuttons').remove();
    this.prototype.destroy("edit_button_painting");
  };

  PaintingTool.prototype.resize = function(width, height) {
    this.prototype.resize(width, height);
  };

  PaintingTool.prototype.redraw = function() {
    this.prototype.redraw();
  };

  PaintingTool.prototype.getActions = function() {
    let actions = this.prototype.getActions();
    return actions;
  };

  let actions = [

    new CATMAID.Action({
      helpText: "Painting Statistics: Display all annotated paint objects",
      buttonID: "painting_button_stats",
      buttonName: 'paint_stats',
      run: function (e) {
        WindowMaker.show('painting-statistics');
        return true;
      }
    }),
  ];

  PaintingTool.prototype.setupSubTools = function() {
    var box;
    if ( !this.prototype.stackViewer ) {
      box = CATMAID.createButtonsFromActions (
        actions,
        "paintingbuttons",
        "painting_");
      $( "#toolbar_nav" ).prepend(box);
    }
  };

  PaintingTool.prototype.handleKeyPress = function(e) {
    return this.prototype.handleKeyPress(e);
  };

  CATMAID.PaintingTool = PaintingTool;

})(CATMAID);
