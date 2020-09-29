

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

document.addEventListener("DOMContentLoaded", function() {

  setupDD();
  
});
