
import { simpleTerm } from "./old_test.js";
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

const _handleStyle = [            // some style for the extension

  {
    selector: '.eh-handle',
    style: {
      'background-color': 'white',
      'width': 6,
      'height': 6,
      'shape': 'ellipse',
      'overlay-opacity': 0,
      'border-width': 2, // makes the handle easier to hit
      'border-opacity': 1,
      'border-color': 'green'
    }
  },

  {
    selector: '.eh-hover',
    style: {
      'background-color': 'green'
    }
  },

  {
    selector: '.eh-source',
    style: {
      'border-width': 2,
      'border-color': 'green'
    }
  },

 /* {
    selector: '.eh-target',
    style: {
      'border-width': 2,
      'border-color': 'green'
    }
  },*/

  {
    selector: '.eh-preview, .eh-ghost-edge',
    style: {
      'background-color': 'green',
      'line-color': 'green',
      'target-arrow-color': 'green',
      'source-arrow-color': 'green'
    }
  },

  {
    selector: '.eh-ghost-edge.eh-preview-active',
    style: {
      'opacity': 0
    }
  }

];

function setupCyto() {

  // edge handles
  // https://github.com/cytoscape/cytoscape.js-edgehandles
  // https://cytoscape.org/cytoscape.js-edgehandles/demo-snap.html

  // expand-collapse - this may not be necessary, may be able to hide/show children of compound node
  // http://ivis-at-bilkent.github.io/cytoscape.js-expand-collapse/demo.html?spm=a2c6h.14275010.0.0.18881782RFC5iX

  // *probably need this to make elements linked to nodes
  // https://cytoscape.org/cytoscape.js-popper/

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
         'background-color': '#333' 
        }
      },
    {
      selector: 'node',
      style: {
        'color': '#333',
        'font-family': "Open Sans",
        //"font-weight": "100",
        "font-size": "14",
        
        'content': 'data(name)',

        'text-outline-width': 1,
        'text-outline-color': '#e8e8e8',
        
        'text-valign': 'top',
        'text-halign': 'center',
        'shape': 'rectangle',
        'background-color': '#333',

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
        'background-color': '#333',
        'background-opacity': 0.25,
        'border-width': 0,
      }
    },
    {
      selector: 'edge',
      style: {
        width: 5,
        'color': '#333',
        'font-family': "Open Sans",
        //"font-weight": "100",
        "font-size": "14",

        'text-outline-width': 1,
        'text-outline-color': '#e8e8e8',
        
        
        'content': 'data(name)',
        
        'text-valign': 'top',
        'text-halign': 'center',
        'text-margin-y': -10,
        'text-margin-x': 0,
        
        'line-color': '#333',
        'target-arrow-color': '#333',
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

    ].concat(_handleStyle),

  elements: {
    nodes: [
      { data: { id: 'a123', kind: 'grid', parent: 'b', name: 'grid' } },
      { data: { id: 'b' } },
      { data: { id: 'c', kind: 'code', name: 'code', parent: 'b' } },
      { data: { id: 'd', kind: 'test-webgl', name: 'WebGL' }, },
      { data: { id: 'e' } },
      { data: { id: 'f', parent: 'e', kind: 'test-draw', name: 'Draw' } },
      { data: { id: 'g', parent: 'e', kind: 'terminal', name: 'Terminal' } },
      { data: { id: 'h', parent: 'e', kind: 'notebook', name: 'Notebook' } }
    ],
    edges: [
      { data: { id: 'ad', name: 'peter', source: 'a123', target: 'd' } },
      { data: { id: 'eb', source: 'e', target: 'b' } }
    ]
  },


  });

  var holderDiv = function() {
    var div = document.createElement('div');
    document.body.appendChild( div );
    return div;
  };  

  function updateAll() {
    const updateNodes = cy.scratch('update_nodes') || {};
    const updateEdges = cy.scratch('update_edges') || {};
    
    for (const k in updateNodes) {
      updateNodes[k]();
    }
  }  

  cy.on('pan zoom resize', updateAll);

  function setupConf(el) {
    var conf = document.createElement("div");
    conf.classList.add("basic-box");
    conf['style']['margin-top'] = '-100px';
    conf['style']['background'] = 'white';
    conf['style']['padding'] = '5px';
    // name, kind, expand collapse, show
    ['name', 'kind', 'expand/collapse', 'show/fullscreen/pin'].forEach((name) => {
      var row = document.createElement("div");
      row.innerHTML = name;
      conf.appendChild(row);
    });
    el.appendChild(conf);
  }

  function setupContent(el, data) {
    
    if (data['kind'] === "grid") {
      var cont = document.createElement("div");
      cont.classList.add("basic-box");
      cont.style['margin-top'] = '10px';
      el.appendChild(cont);
      
      cont.style['width'] = '400px';
      cont.style['height'] = '400px';
      slickgrid(cont);
    } else if (data['kind'] === "code") {
      var cont = document.createElement("div");
      cont.classList.add("basic-box");
      cont.style['margin-top'] = '10px';
      el.appendChild(cont);
      
      cont.style['width'] = '400px';
      cont.style['height'] = '400px';
      setupMonaco(cont);
    } else if (data['kind'] === "test-draw") {
      var cont = document.createElement("div");
      cont.classList.add("basic-box");
      cont.style['margin-top'] = '10px';
      el.appendChild(cont);
      
      cont.style['width'] = '400px';
      cont.style['height'] = '400px';
      var can = document.createElement("canvas");
      cont.appendChild(can);

      fabricTest(can);
    } else if (data['kind'] === "test-webgl") {
      var can = document.createElement("canvas");
      can.classList.add("basic-box");
      can.style['margin-top'] = '10px';
      can.style['width'] = '400px';
      can.style['height'] = '400px';
      
      el.appendChild(can);
      twgltest(can);
    } else if (data['kind'] === "terminal") {
      var cont = document.createElement("div");
      cont.classList.add("basic-box");
      cont.style['margin-top'] = '10px';
      el.appendChild(cont);
      
      simpleTerm(cont);
    } else if (data['kind'] === "notebook") {
      var cont = document.createElement("div");
      cont.classList.add("basic-box");
      cont.style['margin-top'] = '10px';
      el.appendChild(cont);

      cont.innerHTML = "testing1<br/>testing2<br/>testing3";
    }
  }

  cy.on('tap', 'node', (evt) => {
    // TODO: refresh all visible, remove if not visible
    
    // create holder
    var el = holderDiv();
    const data = evt.target.data();
    let keysCount = 0;
    for (const k in data) {
      keysCount++;
      if (keysCount > 1) {
        break;
      }
    }

    if (keysCount <= 1) {
      return;
    }

    el.style['margin-left'] = '10px';
    setupConf(el);
    setupContent(el, data);
    
    var state = evt.target.scratch('state') || {};
    state.el = el;
    evt.target.scratch('state', state);
    var ref = evt.target.popperRef({
      content: () => el
    });
    function update() {
      let rect = ref.getBoundingClientRect();
      el.style['position'] = 'absolute';
      el.style['top'] = rect.top + 'px';
      el.style['left'] = (rect.left + rect.width) + 'px';
      el.style['transform'] = `scale(${Math.min(1, cy.zoom())})`;
      el.style['transform-origin'] = 'left top';
    }
    update();
    evt.target.on('position', update);

    // update all visible
    var updateNodes = cy.scratch('update_nodes') || {};
    updateNodes[evt.target.id()] = update;
    cy.scratch('update_nodes', updateNodes);
  });

  cy.on('tap', 'edge', (evt) => {
    // nothing for edges
    console.log(evt.target.id());
  });

  cy.on('unselect', 'node', (evt) => {
    // clear holder
    var el = (evt.target.scratch('state') || {}).el;
    if (el) {
      el.parentNode.removeChild(el);
    }
    evt.target.unbind('position');
    
    var updateNodes = cy.scratch('update_nodes') || {};
    delete updateNodes[evt.target.id()];
    cy.scratch('update_nodes', updateNodes);
  });  
 

  // handles
        var eh = cy.edgehandles({
          snap: false,
          snapFrequency: 15,
          complete: function( sourceNode, targetNode, addedEles ){
            // fired when edgehandles is done and elements are added
            console.log('new', sourceNode, targetNode, addedEles)
          },          
          handlePosition: function( node ){
            return 'right middle'; // sets the position of the handle in the format of "X-AXIS Y-AXIS" such as "left top", "middle top"
          },         
        });

  // additional features
  /*
        document.querySelector('#draw-on').addEventListener('click', function() {
          eh.enableDrawMode();
        });

        document.querySelector('#draw-off').addEventListener('click', function() {
          eh.disableDrawMode();
        });

        document.querySelector('#start').addEventListener('click', function() {
          eh.start( cy.$('node:selected') );
        });  
  */

  // programmatically select
  cy.nodes()[0].select()
  cy.nodes()[0].trigger("tap")
  
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

  // popper




}

function slickgrid(el) {
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
    {id: "sel", name: "", field: "num", behavior: "select", cssClass: "cell-selection", width: 40, resizable: false, selectable: false },    
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

      d["num"] = i + 1;
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

function setupMonaco(el) {

    let editor = monaco.editor.create(el, {
      value: "function hello() {\n\talert('Hello world!');\n}",
      language: "javascript",
      fontFamily: "Roboto Mono",
      fontSize: 14,
      //theme: "vs-dark"
    });
  
}

function twgltest(el) {

  const gl = el.getContext("webgl");


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

function fabricTest(el) {
  var canvas = new fabric.Canvas(el, {
    width: el.parentNode.offsetWidth-2,
    height: el.parentNode.offsetHeight-2,
//    width: window.innerWidth,
//    height: window.innerWidth - 50,
    isDrawingMode: false,
    backgroundColor: '#fff'
  });

  canvas.add(new fabric.Rect({left: 40, top: 20, fill: '#f00', width: 100, height: 100}));

  canvas.add(new fabric.Circle({radius: 50, fill: '#00f', left: 150, top: 20}));

  canvas.setActiveObject(canvas.item(1));

}

document.addEventListener("DOMContentLoaded", function() {

  setupDD();
  dropdownMenus();
  setupCyto();
  //setupMonaco(document.getElementById("monaco_test"));
  //slickgrid(document.getElementById("slickgrid"));
  //twgltest(document.getElementById("twgl_test"));
  //fabricTest(document.getElementById('fabric_test'));

  // prism vs themes
  // https://github.com/JeremyJeanson/prismjs-vs
  
});
