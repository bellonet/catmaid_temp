/* -*- mode: espresso; espresso-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set softtabstop=2 shiftwidth=2 tabstop=2 expandtab: */
/* global
  project,
  WindowMaker
*/

(function(CATMAID) {

  "use strict";

  var PaintingStatistics = function()
  {

    this.saveChanegsToPaintingTable = function() {

      // table to Json - before post to controller:
      var tableRows = tableToJson()

      // disable the refresh button until finished
      $("#save-changes-paint-table").prop('disabled', true);
      //update paint objects in DB to match the table:
      CATMAID.fetch(project.id + '/painting/update', "POST", {"paintTable": tableRows, "user": CATMAID.session.userid})
      .then(function(b) {
        // redraw the table from DB:
        $("#painttable").DataTable().clear().draw();
        // reenable the button:
        $("#save-changes-paint-table").prop('disabled', false);
      }).catch(CATMAID.handleError);
      return true;
    };

  };

  // From html table to json:
  function tableToJson() {
    var tableRows = [];

    // Loop through grabbing everything
    var $rows = $("#painttable tbody tr").each(function(index) {
      var $cells = $(this).find("td");
      tableRows[index] = {};

      tableRows[index]["label_id"] = $cells[0].innerText;
      tableRows[index]["to_del"] = $cells[1].children[0].checked;
      tableRows[index]["to_edit"] = $cells[2].children[0].checked;
      tableRows[index]["name"] = $cells[3].children[0].value;
      tableRows[index]["comment"] = $cells[4].children[0].value;
      tableRows[index]["z"] = $cells[5].innerText;
      tableRows[index]["y"] = $cells[6].innerText;
      tableRows[index]["x"] = $cells[7].innerText;

    });

    return tableRows
  };


  PaintingStatistics.prototype.getName = function() {
    return "Painting Info";
  };

  PaintingStatistics.prototype.getWidgetConfiguration = function() {
    var config = {
      contentID: "painting_stats_widget",
      controlsID: "painting_stats_controls",
      createControls: function(controls) {
        var self = this;

        // Add button to save changes to table:
        let save = controls.appendChild(document.createElement('input'));
        save.setAttribute('type', 'button');
        save.setAttribute('value', 'Save changes to database');
        save.setAttribute('id', 'save-changes-paint-table');
        save.onclick = function() {
          self.saveChanegsToPaintingTable();
        };
      },

      createContent: function(container) {
        var self = this;

        this.paintStatsContainer = document.createElement('div');

        let lastLabel = document.createElement('h3');
        lastLabel.setAttribute("id", "last-label-clicked");
        lastLabel.textContent = "Last clicked label: None";

        this.paintStatsContainer.appendChild(lastLabel);

        var paintTable = document.createElement('table');
        paintTable.setAttribute('id', 'painttable');

        paintTable.innerHTML =
            '<thead>' +
            '<tr>' +
                '<th>label id</th>' +
                '<th>delete?</th>' +
                '<th>needs edits?</th>' +
                '<th>object name</th>' +
                '<th>Comments</th>' +
                '<th>Z</th>' +
                '<th>Y</th>' +
                '<th>X</th>' +
            '</tr>' +
            '</thead>' +
            '<tbody>' +
            '<tr>' +
                '<td></td>' +
                '<td></td>' +
                '<td></td>' +
                '<td></td>' +
                '<td></td>' +
                '<td></td>' +
                '<td></td>' +
                '<td></td>' +
            '</tr>' +
            '</tbody>';

        this.paintStatsContainer.appendChild(paintTable);
        container.appendChild(this.paintStatsContainer);

        this.paintTable = $(paintTable).dataTable({
          // http://www.datatables.net/usage/options
          //"bDestroy": true,
          "sDom": '<"H"lr>t<"F"ip>Bt',
          "default": '<"H"lfr>t<"F"ip>',
          //"bProcessing": true,
          "bServerSide": true,
          "bAutoWidth": false,
          "bInfo" : false,
          "iDisplayLength": CATMAID.pageLengthOptions[0],
          "sAjaxSource": CATMAID.makeURL(project.id + '/painting/get'),
          // add button to save the table into csv (defined in "columns":"render")
          "buttons": [
            {
                extend: 'csv',
                text: 'Export to CSV',
                exportOptions: {
                    orthogonal:  'export'
                }
            }
          ],
          "columns": [
            //label ID
            {orderable: false, className: 'dt-center cm-center paint_lbl', "type": "text",
            "render": {"display": function(data, type, row, meta) {
              var mvToStr = '(' + row[5] + ',' + row[6] + ',' + row[7] + ')';
              return '<a onclick="project.getStackViewers()[0].moveTo' + mvToStr + '" href="#">' + data + '</a>';
              }}
            },
            // To delete? 
            {orderable: false, className: 'dt-center cm-center',
            render: function(data, type, row, meta) {
              if (type === 'export') {
                return data ? "Yes" : "No";
              } else {
                return data ? '<input type="checkbox" checked>' : '<input type="checkbox">';
              }
            }}, 
            //To edit?
            {orderable: false, className: 'dt-center cm-center',
            render: function(data, type, row, meta) {
              if (type === 'export') {
                return data ? "Yes" : "No";
              } else {
                return data ? '<input type="checkbox" checked>' : '<input type="checkbox">';
              }
            }}, 
            //name
            {orderable: false,
            render: function(data, type, row, meta) {
              if (type === 'export') {
                return data;
              } else {
                return '<input type="text" style="width:100%" value="' + data + '">';
              }
            }}, 
            //comments
            {orderable: false,
            render: function(data, type, row, meta) {
              if (type === 'export') {
                return data;
              } else {
              return '<input type="text" style="width:100%" value="' + data + '">';
              }
            }}, 
            {orderable: false, className: 'dt-center cm-center'}, // z location
            {orderable: false, className: 'dt-center cm-center'}, // y location
            {orderable: false, className: 'dt-center cm-center'} // x location
          ],
          "createdRow": function(row, data, dataIndex){
            $(row).attr("id", "lbl" + data[0]);
          }
        });

      },

      init: function() {
        var self = this;

      }
    };

    return config;
  };

  // Export statistics widget
  CATMAID.PaintingStatistics = PaintingStatistics;

  // Register widget with CATMAID
  CATMAID.registerWidget({
    name: "Painting Info",
    description: "Show painting info and statistics for this project",
    key: "painting-statistics",
    creator: PaintingStatistics,
    state: {
      getState: function(widget) {
        return {
          includeImports: widget.includeImports
        };
      },
      setState: function(widget, state) {
        CATMAID.tools.copyIfDefined(state, widget, "includeImports");
      }
    }
  });

})(CATMAID);
