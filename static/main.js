

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
        "font-weight": "100",
        "font-size": "20",
        
        'content': 'data(id)',

        //'text-outline-width': 1,
        //'text-outline-color': 'black',
        
        'text-valign': 'top',
        'text-halign': 'center',
        'shape': 'rectangle',
        'background-color': '#666'
      }
    },
    {
      selector: ':parent',
      style: {
        'text-valign': 'top',
        'text-halign': 'center',
        'background-color': 'black',
        'background-opacity': 0.5,
        'border-width': 0,
      }
    },
    {
      selector: 'edge',
      style: {
        width: 5,
        'color': 'white',
        'font-family': "IBM Plex Mono",
        "font-weight": "100",
        "font-size": "20",
        
        'content': 'data(id)',
        
        'text-valign': 'top',
        'text-halign': 'center',
        'text-margin-y': -10,
        
        'line-color': '#666',
        'target-arrow-color': '#666',
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

function grid() {
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
}

function setupMonac() {

/*
	<script>var require = { paths: { 'vs': 'node_modules/monaco-editor/min/vs' } };</script>
	<script src="node_modules/monaco-editor/min/vs/loader.js"></script>
	<script src="node_modules/monaco-editor/min/vs/editor/editor.main.nls.js"></script>
	<script src="node_modules/monaco-editor/min/vs/editor/editor.main.js"></script>
*/


monaco.editor.create(document.getElementById("container"), {
	value: "function hello() {\n\talert('Hello world!');\n}",
	language: "javascript"
});

  // <div id="container" style="height:100%;"></div>


  
}

document.addEventListener("DOMContentLoaded", function() {

  setupDD();
  dropdownMenus();
  setupCyto();
  
});
