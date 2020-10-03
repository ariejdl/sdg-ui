

import { test } from "./test.js";

test();

function previewFile(file) {
  let reader = new FileReader()
  reader.onload = function(e) {
    console.log(e.target.result);
  }
  reader.readAsText(file);
}

// ?
// https://www.smashingmagazine.com/2018/01/drag-drop-file-uploader-vanilla-js/
function setupDD() {

  d3.select(document.body)
    .on('dragenter', (e) => {
      console.log('enter')
      e.preventDefault();
    })
    .on('dragleave', (e) => {
      console.log('leave')
      e.preventDefault();
    })
    .on('dragover', (e) => {
      console.log('over')
      e.preventDefault();
    })
    .on('drop', (e) => {
      console.log('drop', e)
      var dt = e.dataTransfer
      var files = dt.files
      files = [...files]
      files.forEach(previewFile)
      e.preventDefault();
    })

  
}

function dropdownMenus() {
  // https://getbootstrap.com/2.3.2/components.html
  // replicate CSS from here, may want a slight delay on expansion like OSX
  d3.selectAll(".menu-item")
    .on("click", function(e) {
      const el = d3.select(this)
            .select(".dropdown-menu");

      const shown = !el.classed("show")

      // hide others
      d3.selectAll(".dropdown-menu")
        .classed("show", false);

      el.classed("show", shown);
      
      e.stopPropagation();
    });

  d3.select(document.body)
    .on("click", () => {
      d3.selectAll(".dropdown-menu")
        .classed("show", false);
    })
}

// https://gist.github.com/NicoleY77/5606796
function getScript(url, callback) {
  var head	= document.getElementsByTagName("head")[0];
  var script	= document.createElement("script");
  var done 	= false; // Handle Script loading

  script.onload = script.onreadystatechange = function() { // Attach handlers for all browsers
    if ( !done && (!this.readyState || this.readyState === "loaded" || this.readyState === "complete") ) {
      done = true;
      if (callback) { callback(); }
      script.onload = script.onreadystatechange = null; // Handle memory leak in IE
    }
  };
  script.src	= url;  
  head.appendChild(script);		
}

// https://stackoverflow.com/questions/14919894/getscript-but-for-stylesheets-in-jquery
function getStylesheet(url, callback) {
  var linkElem = document.createElement('link');
  var head	= document.getElementsByTagName("head")[0];
  var done 	= false; // Handle Script loading

  linkElem.rel = 'stylesheet';
  linkElem.type = 'text/css';
  linkElem.onload = linkElem.onreadystatechange = function() { // Attach handlers for all browsers
    if ( !done && (!this.readyState || this.readyState === "loaded" || this.readyState === "complete") ) {
      done = true;
      if (callback) { callback(); }
      linkElem.onload = linkElem.onreadystatechange = null; // Handle memory leak in IE
    }
  };
  linkElem.href = url;  
  head.appendChild(linkElem);		

}

function setupCyto() {

  // TODO: snap
  // https://cytoscape.org/cytoscape.js-edgehandles/demo-snap.html

  // https://js.cytoscape.org/demos/compound-nodes/code.js
  const cy = cytoscape({
    container: document.getElementById("cytoscape_container"),
    //boxSelectionEnabled: false,
    style: [
      {
        selector: 'core',
        style: {
          'active-bg-size': 0,
          'active-bg-opacity': 0,
          //'outside-texture-bg-opacity': 0
          //'selection-box-opacity': 50,
          //'selection-box-border-width': 10,
          //'selection-box-border-color': ,
          //'overlay-opacity': 0
        }
      },
      {
        selector: ':selected',
        style: {
          // seems to be hard coded as a rounded rectangle
          'overlay-color': '#EFA94E',
          'overlay-opacity': 0.5,
          'overlay-padding': 5,
          //'background-image': 'rectangle',
          //'overlay-padding': 0,
         'background-color': '#EFA94E' 
        }
      },
    {
      selector: 'node',
      style: {
        'color': 'white',
        'font-family': "IBM Plex Mono",
        //"font-weight": "100",
        "font-size": "14",
        
        'content': 'data(id)',

        'text-outline-width': 0.5,
        'text-outline-color': '#333',
        
        'text-valign': 'top',
        'text-halign': 'center',
        'shape': 'rectangle',
        'background-color': '#eee',

        'ghost': 'yes',
        'ghost-offset-x': 0,
        'ghost-offset-y': 4,
        'ghost-opacity': 0.2
        
      }
    },
    {
      selector: ':parent',
      style: {
        'text-valign': 'top',
        'text-halign': 'center',
        'background-color': 'white',
        'background-opacity': 0.25,
        'border-width': 0,
      }
    },
    {
      selector: 'edge',
      style: {
        width: 5,
        'color': 'white',
        'font-family': "IBM Plex Mono",
        //"font-weight": "100",
        "font-size": "14",

        'text-outline-width': 0.5,
        'text-outline-color': '#333',
        
        
        'content': 'data(id)',
        
        'text-valign': 'top',
        'text-halign': 'center',
        'text-margin-y': -10,
        'text-margin-x': 0,
        
        'line-color': '#eee',
        'target-arrow-color': '#eee',
        'arrow-scale': 2,
        "curve-style": "unbundled-bezier",   
        'control-point-weights': '0.25 0.75',
        'control-point-distances': 'data(controlPointDistances)',        
        'target-arrow-shape': 'triangle',

        'ghost': 'yes',
        'ghost-offset-x': 0,
        'ghost-offset-y': 4,
        'ghost-opacity': 0.2
      }
    },
      {
        selector: ':active, :selected', // higher precedence at end, show border for parents
        style: {
          // seems to be hard coded as a rounded rectangle
          //'overlay-border-color': '#EFA94E',
          //'overlay-border-width': 2,

          'overlay-opacity': 0,
          /*
          'overlay-color': '#EFA94E',
          'overlay-padding': 5,
          */
          'color': '#EFA94E',

          'border-color': '#EFA94E',
          'border-width': 2,
          /* not worth it
          'background-image': (node) => {
              console.log(node)
            // memoize
            return {
              width: 10,
              height: 10
            }
          }*/
        }
      },
      {
        selector: 'edge:active, edge:selected', // higher precedence at end, show border for parents
        style: {
          'line-color': '#EFA94E',
          'target-arrow-color': '#EFA94E',
          /*
          'overlay-opacity': 0,
          'overlay-color': '#EFA94E',
          'overlay-padding': 0,
          */
        }
      }
  ],

  elements: {
    nodes: [
      { data: { id: 'a123', parent: 'b' }, position: { x: 215, y: 85 } },
      { data: { id: 'b' } },
      { data: { id: 'c', parent: 'b' }, position: { x: 300, y: 85 } },
      { data: { id: 'd' }, position: { x: 215, y: 175 } },
      { data: { id: 'e' } },
      { data: { id: 'f', parent: 'e' }, position: { x: 300, y: 175 } }
    ],
    edges: [
      { data: { id: 'ad', source: 'a123', target: 'd' } },
      { data: { id: 'eb', source: 'e', target: 'b' } }

    ]
  },


  });

  cy.on('tap', 'node', (evt) => {
    console.log(evt.target.id());
  });

  cy.on('tap', 'edge', (evt) => {
    console.log(evt.target.id());
  });
  
/*

  cy.add({
    group: 'nodes',
    data: { weight: 75 },
    position: { x: 200, y: 250 }
  });

  var eles = cy.add([
    { group: 'nodes', data: { id: 'n0', type: 'bezier' }, position: { x: 100, y: 100 } },
    { group: 'nodes', data: { id: 'n1' }, position: { x: 200, y: 200 } },
    { group: 'edges', data: { id: 'e0', source: 'n0', target: 'n1' } },

  ]);  
*/

}

function slickgrid() {
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

  // https://github.com/myliang/x-spreadsheet


  var grid;
  var data = [];

  var ed = Slick.Editors.Text; // FormulaEditor
  
  var columns = [
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

      d["_t1"] = "Task " + i;
      d["_t2"] = Math.random();
      d["_t3"] = Math.random();
      d["_t4"] = Math.random();
    }

    grid = new Slick.Grid("#slickgrid", data, columns, options);

    grid.onValidationError.subscribe(function (e, args) {
      alert(args.validationResults.msg);
    });
  //  })

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

    grid.onAddNewRow.subscribe(function (e, args) {
      var item = args.item;
      var column = args.column;
      grid.invalidateRow(data.length);
      data.push(item);
      grid.updateRowCount();
      grid.render();
    });
  
}

function setupMonaco() {

/*
	<script>var require = { paths: { 'vs': 'node_modules/monaco-editor/min/vs' } };</script>
	<script src="node_modules/monaco-editor/min/vs/loader.js"></script>
	<script src="node_modules/monaco-editor/min/vs/editor/editor.main.nls.js"></script>
	<script src="node_modules/monaco-editor/min/vs/editor/editor.main.js"></script>
*/

    let editor = monaco.editor.create(document.getElementById("monaco_test"), {
      value: "function hello() {\n\talert('Hello world!');\n}",
      language: "javascript",
      fontFamily: "IBM Plex Mono",
      fontSize: 14
    });


  return;

  require(["/static/libs/monaco/editor/editor.main"], function () {

/*    
    monaco.editor.create(document.getElementById("monaco_test"), {
      value: "function hello() {\n\talert('Hello world!');\n}",
      language: "javascript"
    });
*/
  })
  
  return;



  // <div id="container" style="height:100%;"></div>


  
}

function twgltest() {

  const gl = document.getElementById("twgl_test").getContext("webgl");


  const vs = `attribute vec4 position;

void main() {
  gl_Position = position;
}`;

  const fs = `precision mediump float;

uniform vec2 resolution;
uniform float time;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  float color = 0.0;
  // lifted from glslsandbox.com
  color += sin( uv.x * cos( time / 3.0 ) * 60.0 ) + cos( uv.y * cos( time / 2.80 ) * 10.0 );
  color += sin( uv.y * sin( time / 2.0 ) * 40.0 ) + cos( uv.x * sin( time / 1.70 ) * 40.0 );
  color += sin( uv.x * sin( time / 1.0 ) * 10.0 ) + sin( uv.y * sin( time / 3.50 ) * 80.0 );
  color *= sin( time / 10.0 ) * 0.5;

  gl_FragColor = vec4( vec3( color * 0.5, sin( color + time / 2.5 ) * 0.75, color ), 1.0 );
}`
  
  const programInfo = twgl.createProgramInfo(gl, [vs, fs]);
 
  const arrays = {
    position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
  };
  const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
 
  function render(time) {
    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
 
    const uniforms = {
      time: time * 0.001,
      resolution: [gl.canvas.width, gl.canvas.height],
    };
 
    gl.useProgram(programInfo.program);
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    twgl.setUniforms(programInfo, uniforms);
    twgl.drawBufferInfo(gl, bufferInfo);
 
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
  
}

function fabricTest() {
  var el = document.getElementById('fabric_test');

  var canvas = new fabric.Canvas(el, {
    width: el.parentNode.offsetWidth,
    height: el.parentNode.offsetHeight,
//    width: window.innerWidth,
//    height: window.innerWidth - 50,
    isDrawingMode: false,
    backgroundColor: '#fff'
  });

  canvas.add(new fabric.Rect({left: 40, top: 20, fill: '#000', width: 100, height: 100}));

  canvas.add(new fabric.Circle({radius: 50, fill: '#000', left: 150, top: 20}));

  canvas.setActiveObject(canvas.item(1));

}

document.addEventListener("DOMContentLoaded", function() {

  setupDD();
  dropdownMenus();
  setupCyto();
  setupMonaco();
  slickgrid();
  twgltest();
  fabricTest();
  
});
