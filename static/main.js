
import { uuid, simpleTerm, testing } from "./old_test.js";
import { Calculator } from "./calculator.js";
import { addCytoNetwork, setupCyto } from "./cyto.js";

function previewFile(file) {
  let reader = new FileReader()
  reader.onload = function(e) {
    console.log(e.target.result.substring(0,10));
  }
  reader.readAsText(file);
}

// ?
// https://www.smashingmagazine.com/2018/01/drag-drop-file-uploader-vanilla-js/
function setupDD(cy) {

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

      // TODO: make position exact

      cy.add([
        { group: 'nodes',
          data: { id: uuid(), kind: 'grid', parent: 'b', name: 'grid' },
          renderedPosition: { x: e.clientX, y: e.clientY }
        }
      ])
      
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

document.addEventListener("DOMContentLoaded", function() {

  dropdownMenus();
  const cy = setupCyto();

  setupDD(cy);

  let calc = new Calculator(cy);

  addCytoNetwork(cy, calc);

  document.addEventListener('keydown', event => {
    if (event.key === "x") {
      const sel = cy.$(':selected');
      const len = sel.length;
      if (len && confirm(`Do you wish to delete ${len} node(s)/edges(s)?`)) {
        sel.remove();
      }
    }
  });
  
  //testing()

  calc.evalNode('#a123');

  calc.evalNode('#x1');

  
});
