
import { getNode, Node, ServerNode, NotebookNode } from "./node.js";

const greenColor = '#11dd22';

const _handleStyle = [            // some style for the extension

  {
    selector: '.eh-handle',
    style: {
      'background-color': greenColor,
      'width': 6,
      'height': 6,
      'shape': 'ellipse',
      'overlay-opacity': 0,
      'border-width': 2, // makes the handle easier to hit
      'border-opacity': 1,
      'border-color': greenColor
    }
  },

  {
    selector: '.eh-hover',
    style: {
      'background-color': greenColor
    }
  },

  {
    selector: '.eh-source',
    style: {
      'border-width': 2,
      'border-color': greenColor
    }
  },

 /* {
    selector: '.eh-target',
    style: {
      'border-width': 2,
      'border-color': greenColor
    }
  },*/

  {
    selector: '.eh-preview, .eh-ghost-edge',
    style: {
      'background-color': greenColor,
      'line-color': greenColor,
      'target-arrow-color': greenColor,
      'source-arrow-color': greenColor
    }
  },

  {
    selector: '.eh-ghost-edge.eh-preview-active',
    style: {
      'opacity': 0
    }
  }

];

export function setupCyto() {

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

    ].concat(_handleStyle)


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

  cy.on('tap', 'node', (evt) => {
    // TODO: refresh all visible, remove if not visible
    
    // create holder
    var el = holderDiv();
    const data = evt.target.data();
    const scratchNode = evt.target.scratch('node');
    const scratchEval = evt.target.scratch('eval') || {};
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

    scratchNode['node'].renderConf(evt.target, data, el);

    scratchNode['node'].render(el, data, scratchEval['last_return_value']);
    
    var state = evt.target.scratch('state') || {};
    state.el = el;
    evt.target.scratch('state', state);
    var ref = evt.target.popperRef({
      content: () => el
    });
    function update() {
      const canScale = scratchNode['node'].canScale;
      
      let rect = ref.getBoundingClientRect();
      el.style['position'] = 'absolute';
      el.style['top'] = rect.top + 'px';
      el.style['left'] = (rect.left + rect.width) + 'px';
      el.style['transform'] = `scale(${canScale ? Math.min(1, cy.zoom()) : 1})`;
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
    //console.log(evt.target.id());
  });

  const remove = (evt) => {
    // clear holder
    var el = (evt.target.scratch('state') || {}).el;
    if (el) {
      el.parentNode.removeChild(el);
    }
    evt.target.unbind('position');
    
    var updateNodes = cy.scratch('update_nodes') || {};
    delete updateNodes[evt.target.id()];
    cy.scratch('update_nodes', updateNodes);

    const scratchNode = evt.target.scratch('node');
    if (scratchNode) {
      scratchNode['node'].clearRender();
    }
  }

  cy.on('remove', 'node', remove);
  cy.on('unselect', 'node', remove);

  cy.on('keydown', (evt) => {
    //console.log('keydown')
  })

  cy.on('add', 'node', (evt) => {
    //console.log('->>', evt.target.json(), evt.target.data())
  });

  cy.on('move', 'node', (evt) => {

  });

  cy.on('move', 'edge', (evt) => {

  });

  // TODO: if parent is moved, child is also moved in location, so popup needs to move

  // handles
  var eh = cy.edgehandles({
    snap: false,
    snapFrequency: 15,
    complete: function( sourceNode, targetNode, addedEles ){
      // fired when edgehandles is done and elements are added
      console.log('new edge', sourceNode, targetNode, addedEles)

      // TODO:
      // may be best to invoke calculator here...

      return;
      
      sourceNode.trigger('update', ['x', 100, -1])
      targetNode.trigger('update')
      
    },          
    handlePosition: function(node) {
      return 'right middle';
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
  
  cy.$("#a124").select()
  cy.$("#a124").trigger("tap")

  return cy;
}

export function addCytoNetwork(cy, calc, initCallback) {

  const data = [
    { group: 'nodes',
      data: { id: 'x1', kind: 'server', name: 'Server', data: { 'host': 'localhost:8001' } },
      position: { x: 50, y: 200 } },
    { group: 'nodes',
      data: { id: 'x2', kind: 'kernel', name: 'Kernel', data: { 'kernel-name': 'python3' } },
      position: { x: 200, y: 200 } },
    { group: 'nodes',
      data: { id: 'x10', kind: 'server-file', name: 'notebook file', data: { 'value': '/static/test_data/2016-09-10-jupyter-features.ipynb' } },
      position: { x: 200, y: 150 } },
    { group: 'nodes',
      data: { id: 'x3', kind: 'terminal', name: 'Terminal' },
      position: { x: 200, y: 250 } },
    { group: 'nodes',
      data: { id: 'x4', kind: 'file-system', name: 'File System' },
      position: { x: 200, y: 300 } },
    { group: 'nodes',
      data: { id: 'x9', kind: 'code', name: 'Init Code',
              data: { language: 'python', code: `
import pandas as pd
import numpy as np
import json
$sym = pd.DataFrame(np.random.randn(3000, 4), columns=['A1', 'B', 'C3', 'D'])
$sym['B'][2:10] = 'overwrite test'
` } },
      position: { x: 200, y: 350 } },
    
    { group: 'nodes',
      data: { id: 'x5', kind: 'notebook', name: 'Notebook' },
      position: { x: 350, y: 200 } },
    { group: 'nodes',
      data: { id: 'x6', kind: 'notebook-cell', name: 'Notebook Cell',
              data: { code: 'print("hello 1")\nprint("hello 2")\n24 ** 3' } },
      position: { x: 350, y: 250 } },
    { group: 'nodes',
      data: { id: 'x7', kind: 'text', name: 'Text Rep.' }, // TODO: show value
      position: { x: 500, y: 250 } },
    { group: 'nodes',
      data: { id: 'x8', kind: 'python-dataframe', name: 'Py Dataframe',
              data: { } },
      position: { x: 350, y: 300 } },

    { group: 'nodes',
      data: { id: 'a123', kind: 'grid', parent: 'b', name: 'grid' },
      position: { x: 400, y: 500 } },
    { group: 'nodes',
      data: { id: 'a124', kind: 'tree', parent: 'b', name: 'tree' },
      position: { x: 500, y: 600 } },
    { group: 'nodes',
      data: { id: 'b' } },
    { group: 'nodes',
      data: { id: 'c', kind: 'code', name: 'code', parent: 'b' },
      position: { x: 300, y: 400 } },
    { group: 'nodes',
      data: { id: 'd', kind: 'test-webgl', name: 'WebGL' },
      position: { x: 100, y: 500 } },
    { group: 'nodes',
      data: { id: 'e' },
      position: { x: 200, y: 100 } },
    { group: 'nodes',
      data: { id: 'f', parent: 'e', kind: 'test-draw', name: 'Draw' },
      position: { x: 150, y: 100 } },
    { group: 'nodes',
      data: { id: 'h', parent: 'e', kind: 'notebook', name: 'Notebook' },
      position: { x: 450, y: 100 } },
    
    { group: 'edges',
      data: { id: 'ad', name: 'peter', source: 'a123', target: 'd' } },
    { group: 'edges',
      data: { id: 'eb', source: 'e', target: 'b' } },

    { group: 'edges',
      data: { id: 'ac', source: 'a123', target: 'c' } },
    { group: 'edges',
      data: { id: 'ca', source: 'c', target: 'a123' } },

    { group: 'edges',
      data: { id: 'x1x2', source: 'x1', target: 'x2' } },
    { group: 'edges',
      data: { id: 'x1x3', source: 'x1', target: 'x3' } },
    { group: 'edges',
      data: { id: 'x1x4', source: 'x1', target: 'x4' } },
    { group: 'edges',
      data: { id: 'x2x5', source: 'x2', target: 'x5' } },
    { group: 'edges',
      data: { id: 'x2x6', source: 'x2', target: 'x6' } },
    { group: 'edges',
      data: { id: 'x6x7', source: 'x6', target: 'x7' } },
    { group: 'edges',
      data: { id: 'x2x8', source: 'x2', target: 'x8' } },
    { group: 'edges',
      data: { id: 'x9x8', source: 'x9', target: 'x8' } },
    { group: 'edges',
      data: { id: 'x10x5', source: 'x10', target: 'x5' } }
    
  ];

  data.forEach((n) => {
    if (n.group === "nodes") {
      n.scratch = { node: { node: getNode(n.data, calc) } };
    }
  });

  cy.add(data);

  let promises = [];

  cy.nodes().forEach((n) => {
    const node = n.scratch('node');
    const ret = node.node.init(n);
    if (ret !== undefined) {
      promises.push(ret);
    }
  });

  Promise.all(promises)
    .then(initCallback)

  // after add, init
  
}
