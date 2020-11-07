
import { throttle } from "./utils.js";

export function treeFilter(item) {

  if (item.parent_obj !== null) {
    var parent = item.parent_obj;

    while (parent) {

      // + other filters
      if (parent._collapsed) {
        return false;
      }

      parent = parent.parent_obj;
    }
  }

  return true;
}

function requiredFieldValidator(value) {
  if (value == null || value == undefined || !value.length) {
    return {valid: false, msg: "This is a required field"};
  } else {
    return {valid: true, msg: null};
  }
}

export class SlickgridTree {

  setup(el, callback, collapseCallback) {

    this.data = [];

    const TitleFormatter = (row, cell, value, columnDef, dataContext) => {
      value = value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      
      var spacer = "<span style='display:inline-block;height:1px;width:" +
          (15 * dataContext["indent"]) + "px'></span>";

      if (dataContext.has_children) {
        if (dataContext._collapsed) {
          return spacer + " <span class='toggle expand'></span>&nbsp;" + value;
        } else {
          return spacer + " <span class='toggle collapse'></span>&nbsp;" + value;
        }
      } else {
        return spacer + " <span class='toggle'></span>&nbsp;" + value;
      }

    }

    var columns = [
      {id: "title", name: "Title", field: "title", width: 220, cssClass: "cell-title",
       formatter: TitleFormatter, editor: Slick.Editors.Text, validator: requiredFieldValidator},
      {id: "duration", name: "Duration", field: "duration", editor: Slick.Editors.Text},
    ];

    var options = {
      editable: false,
      enableAddRow: false,
      enableCellNavigation: true,
      asyncEditorLoading: false
    };

    var percentCompleteThreshold = 0;
    var searchString = "";

    // initialize the model
    this.dataView = new Slick.Data.DataView({ inlineFilters: true });

    this.dataView.beginUpdate();
    this.dataView.setItems(this.data);
    this.dataView.setFilter(treeFilter);
    this.dataView.endUpdate();

    // initialize the grid
    this.grid = new Slick.Grid(el, this.dataView, columns, options);

    this.grid.onClick.subscribe((e, args) => {
      if ($(e.target).hasClass("toggle")) {
        // TODO: click toggle, callback
        var item = this.dataView.getItem(args.row);
        if (item) {
          if (!item._collapsed) {
            console.log('close')
            item.children = [];
            item._collapsed = true;
            collapseCallback()
          } else {
            console.log('open')
            item._collapsed = false;
            item.children = [];
            callback(item.path, item);
          }
          this.dataView.updateItem(item.id, item);
        }
        e.stopImmediatePropagation();
      }
    });

    // wire up model events to drive the grid
    this.dataView.onRowCountChanged.subscribe((e, args) => {
      console.log('row count changed')
      this.grid.updateRowCount();
      this.grid.render();
    });

    this.dataView.onRowsChanged.subscribe((e, args) => {
      console.log('rows changed')
      this.grid.invalidateRows(args.rows);
      this.grid.render();
    });

    callback("");

  }
  
}

export function slickgridTree(el) {

  function TitleFormatter(row, cell, value, columnDef, dataContext) {
    value = value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    
    var spacer = "<span style='display:inline-block;height:1px;width:" +
        (15 * dataContext["indent"]) + "px'></span>";
    
    var idx = dataView.getIdxById(dataContext.id);

    if (data[idx + 1] && data[idx + 1].indent > data[idx].indent) {
      if (dataContext._collapsed) {
        return spacer + " <span class='toggle expand'></span>&nbsp;" + value;
      } else {
        return spacer + " <span class='toggle collapse'></span>&nbsp;" + value;
      }
    } else {
      return spacer + " <span class='toggle'></span>&nbsp;" + value;
    }
  }

  var dataView;
  var grid;
  var data = [];
  
  var columns = [
    {id: "title", name: "Title", field: "title", width: 220, cssClass: "cell-title",
     formatter: TitleFormatter, editor: Slick.Editors.Text, validator: requiredFieldValidator},
    {id: "duration", name: "Duration", field: "duration", editor: Slick.Editors.Text},
  ];

  var options = {
    editable: false,
    enableAddRow: false,
    enableCellNavigation: true,
    asyncEditorLoading: false
  };

  var percentCompleteThreshold = 0;
  var searchString = "";

  var indent = 0;
  var parents = [];

  // create the data
  for (var i = 0; i < 100; i++) {
    var d = (data[i] = {});
    var parent;

    if (Math.random() > 0.8 && i > 0) {
      indent++;
      parents.push(i - 1);
    } else if (Math.random() < 0.3 && indent > 0) {
      indent--;
      parents.pop();
    } 
    
    if (parents.length > 0) {
      parent = parents[parents.length - 1];
    } else {
      parent = null;
    }

    d["id"] = "id_" + i;
    d["indent"] = indent;
    d["parent"] = parent;
    d["title"] = "Task " + i;
  }

  // set parent information
  for (var i = 0; i < data.length; i++) {
    var obj = data[i];
    if (obj.parent !== null) {
      obj.parent_obj = data[obj.parent];
    }
    delete obj['parent'];
  }

  // initialize the model
  dataView = new Slick.Data.DataView({ inlineFilters: true });

  dataView.beginUpdate();
  dataView.setItems(data);
  dataView.setFilter(treeFilter);
  dataView.endUpdate();

  // initialize the grid
  grid = new Slick.Grid(el, dataView, columns, options);

  grid.onClick.subscribe(function (e, args) {
    if ($(e.target).hasClass("toggle")) {
      // TODO: click toggle, callback
      var item = dataView.getItem(args.row);
      if (item) {
        if (!item._collapsed) {
          console.log('close')
          item._collapsed = true;
        } else {
          console.log('open')
          item._collapsed = false;
        }
        dataView.updateItem(item.id, item);
      }
      e.stopImmediatePropagation();
    }
  });

  // wire up model events to drive the grid
  dataView.onRowCountChanged.subscribe(function (e, args) {
    grid.updateRowCount();
    grid.render();
  });

  dataView.onRowsChanged.subscribe(function (e, args) {
    grid.invalidateRows(args.rows);
    grid.render();
  });

  return { dataView: dataView, grid: grid };
  
}

function RemoteModel(size, query) {
  // private
  var data = { length: size };
  var searchstr = "";
  var sortcol = null;
  var sortdir = 1;
  var h_request = null;
  var req = null; // ajax request

  // events
  var onDataLoading = new Slick.Event();
  var onDataLoaded = new Slick.Event();

  function init() {
  }

  function isDataLoaded(from, to) {
    for (var i = from; i <= to; i++) {
      if (data[i] == undefined || data[i] == null) {
        return false;
      }
    }

    return true;
  }

  function clear() {
    for (var key in data) {
      delete data[key];
    }
    data.length = 0;
  }


  function _ensureData(from, to) {
    // throttle this
    query(from, to)
      .then((res) => {
        onSuccess(from, to, JSON.parse(res.substring(1, res.length - 1)));
      })
      .catch(onError)
  }

  const ensureData = throttle(_ensureData, 100);


  function onError(fromPage, toPage) {
    throw "error loading pages " + (fromPage + " to " + toPage);
  }

  function onSuccess(from, to, results) {
    for (var i = 0; i < results.length; i++) {
      data[from + i] = results[i];
      data[from + i].__index = from + i;
    }

    req = null;

    onDataLoaded.notify({from: from, to: to});
  }

  function reloadData(from, to) {
    for (var i = from; i <= to; i++) {
      delete data[i];
    }

    ensureData(from, to);
  }


  function setSort(column, dir) {
    sortcol = column;
    sortdir = dir;
    clear();
  }

  function setSearch(str) {
    searchstr = str;
    clear();
  }


  init();

  return {
    // properties
    "data": data,

    // methods
    "clear": clear,
    "isDataLoaded": isDataLoaded,
    "ensureData": ensureData,
    "reloadData": reloadData,
    "setSort": setSort,
    "setSearch": setSearch,

    // events
    "onDataLoading": onDataLoading,
    "onDataLoaded": onDataLoaded
  };
}

export function slickgridAsync(el, rows, cols, query) {

  var grid;
  var loader = new RemoteModel(rows, query);

  function basicFormatter (row, cell, value, columnDef, dataContext) {
    return value
  }  

  var columns = [
    {id: "sel", name: "", field: "__index", behavior: "select", cssClass: "cell-selection", width: 40, resizable: false, selectable: false }
  ].concat(cols.map((n) => ({id: n, name: n, width: 120, field: n, formatter: basicFormatter })));

  //{id: "title", name: "Title", field: "title", width: 220, cssClass: "cell-title",
  //formatter: TitleFormatter, editor: Slick.Editors.Text, validator: requiredFieldValidator},


  var options = {
    editable: false,
    enableAddRow: false,
    enableCellNavigation: false
  };

  var loadingIndicator = null;

  grid = new Slick.Grid(el, loader.data, columns, options);

  grid.onViewportChanged.subscribe(function (e, args) {
    var vp = grid.getViewport();
    loader.ensureData(vp.top, vp.bottom);
  });

  grid.onSort.subscribe(function (e, args) {
    var vp = grid.getViewport();
    loader.ensureData(vp.top, vp.bottom);
  });

  loader.onDataLoading.subscribe(function () {
    if (!loadingIndicator) {
      loadingIndicator = $("<span class='loading-indicator'><label>Loading...</label></span>").appendTo(document.body);
      var $g = $(el);

      loadingIndicator
        .css("position", "absolute")
        .css("top", $g.position().top + $g.height() / 2 - loadingIndicator.height() / 2)
        .css("left", $g.position().left + $g.width() / 2 - loadingIndicator.width() / 2);
    }

    loadingIndicator.show();
  });

  loader.onDataLoaded.subscribe(function (e, args) {
    for (var i = args.from; i <= args.to; i++) {
      grid.invalidateRow(i);
    }

    grid.updateRowCount();
    grid.render();

    //loadingIndicator.hide();

  })

    // load the first page
  grid.onViewportChanged.notify();  

  
}

export function slickgrid(el) {
  // https://mleibman.github.io/SlickGrid/examples/
  // https://mleibman.github.io/SlickGrid/examples/example-spreadsheet.html
  // https://mleibman.github.io/SlickGrid/examples/example3a-compound-editors.html

  // https://github.com/mleibman/SlickGrid/wiki/Grid-Events
  /* for tab/enter
grid.onKeyDown.subscribe(function(e) {
   if (e.which == 13) {
      // open modal window
   }
});
  */

  // tree view
  // https://mleibman.github.io/SlickGrid/examples/example5-collapsing.html

  // https://github.com/myliang/x-spreadsheet


  var grid;
  var data = [];

  var ed = Slick.Editors.Text; // FormulaEditor
  
  var columns = [
    {id: "sel", name: "", field: "__index", behavior: "select", cssClass: "cell-selection", width: 40, resizable: false, selectable: false },    
    {id: "t1", name: "Title", field: "_t1", width: 120, editor: ed }, //
    {id: "t2", name: "Title2", field: "_t2", width: 120, editor: ed },
    {id: "t3", name: "Title3", field: "_t3", width: 120, editor: ed },
    {id: "t4", name: "Title4", field: "_t4", width: 120, editor: ed }
  ];

  var options = {
    editable: true,
    enableAddRow: false,
    enableCellNavigation: true,
    asyncEditorLoading: false,
//    autoEdit: false
  };

  /***
   * A proof-of-concept cell editor with Excel-like range selection and insertion.
   */
  /*
  function FormulaEditor(args) {
    var _self = this;
    var _editor = new Slick.Editors.Text(args);
    var _selector;

    $.extend(this, _editor);

    function init() {
      // register a plugin to select a range and append it to the textbox
      // since events are fired in reverse order (most recently added are executed first),
      // this will override other plugins like moverows or selection model and will
      // not require the grid to not be in the edit mode
      _selector = new Slick.CellRangeSelector();
      _selector.onCellRangeSelected.subscribe(_self.handleCellRangeSelected);
      args.grid.registerPlugin(_selector);
    }

    this.destroy = function () {
      _selector.onCellRangeSelected.unsubscribe(_self.handleCellRangeSelected);
      grid.unregisterPlugin(_selector);
      _editor.destroy();
    };

    this.handleCellRangeSelected = function (e, args) {
      _editor.setValue(
          _editor.getValue() +
              grid.getColumns()[args.range.fromCell].name +
              args.range.fromRow +
              ":" +
              grid.getColumns()[args.range.toCell].name +
              args.range.toRow
      );
    };


    init();
  }  
  */

//  $(function () {
    for (var i = 0; i < 500; i++) {
      var d = (data[i] = {});

      d["__index"] = i + 1;
      d["_t1"] = "Task " + i;
      d["_t2"] = Math.random();
      d["_t3"] = Math.random();
      d["_t4"] = Math.random();
    }

    grid = new Slick.Grid(el, data, columns, options);

    grid.onValidationError.subscribe(function (e, args) {
      alert(args.validationResults.msg);
    });
  //  })

  // TODO: fix when transform:scale() affects cell selection
  grid.setSelectionModel(new Slick.CellSelectionModel());
  grid.registerPlugin(new Slick.AutoTooltips());

  // set keyboard focus on the grid
  grid.getCanvasNode().focus();

  var copyManager = new Slick.CellCopyManager();
  grid.registerPlugin(copyManager);

  copyManager.onPasteCells.subscribe(function (e, args) {
    if (args.from.length !== 1 || args.to.length !== 1) {
      throw "This implementation only supports single range copy and paste operations";
    }

    var from = args.from[0];
    var to = args.to[0];
    var val;
    for (var i = 0; i <= from.toRow - from.fromRow; i++) {
      for (var j = 0; j <= from.toCell - from.fromCell; j++) {
        if (i <= to.toRow - to.fromRow && j <= to.toCell - to.fromCell) {
          val = data[from.fromRow + i][columns[from.fromCell + j].field];
          data[to.fromRow + i][columns[to.fromCell + j].field] = val;
          grid.invalidateRow(to.fromRow + i);
        }
      }
    }
    grid.render();
  });

  /*
  grid.onAddNewRow.subscribe(function (e, args) {
    var item = args.item;
    var column = args.column;
    grid.invalidateRow(data.length);
    data.push(item);
    grid.updateRowCount();
    grid.render();
  });
  */
  
}

