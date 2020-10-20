
import { uuid, simpleTerm, testing } from "./old_test.js";
import { slickgrid, slickgridTree } from "./slickgrid.js";

// TODO: probably best to make this a method on a class:
//
// Node -> ServerNode
//      -> OtherNodes
//
// these can then be stateful
//
// methods/properites:
// - current state (dictionary)
// - current value (anything)
// - properties (dictionary)
// - invoke(...arguments...)
//
// instantiate this node on cytoscape node at creation time or when kind is changed
//

export function getNode(data, calculator) {

  if (data.kind === "server") {
    return new ServerNode(data, calculator)
  } else if (data.kind === "kernel") {
    return new KernelNode(data, calculator)
  } else if (data.kind === "grid") {
    
  } else if (["kernel", "terminal", "filesystem",
              "notebook", "notebook-cell"].includes(data.kind)) {
    return new ServerDependentNode(data, calculator)
  }
  
  return new Node(data, calculator);
}

export class Node {

  constructor(data, calculator) {
    this._data = data;
    this._calculator = calculator;
    
    this._currentState = {};
    this._currentValue = undefined;
    this._properties = {};
  }

  updateData(data) {
    this._data = data;
  }

  init(n) {
  }

  invoke(node, data, predecessors, evalId, isManual) {
    // i.e. return promise
    var calculator = this._calculator;

    if (data.kind === "notebook") {
      // TODO: execute each cell, check if stopped, check if evalId is the same, i.e. do guard check
      // calculator.guardCheck()
      throw "collect cells";

      // - TODO: make this work cell by cell for a notebook, which is like a sequence of nodes
      // .... e.g. emit custom events/invocations per cell,
      // thus decompose a notebook into a chain of promises with sideffects
      // -> ? getInvokationFunction() ...
      // ... remember: this may be interrupted too
      // ... remember: it's probably best to stop notebooks creating invocation loops of themselves
      
      return new Promise((resolve, reject) => {
        console.log('invoke: ' + data.kind)
        resolve();
      });
      
    } else if (data.kind === "grid") {
    } else if (data.kind === "tree") {
    } else if (["kernel", "terminal", "filesystem"].includes(data.kind)) {

      
    }

    return new Promise((resolve, reject) => {
      console.log('invoke: ' + data.kind)
      resolve();
    });
    
  }

  render(el, data) {
    // i.e. slickgrid etc.

    if (data['kind'] === "grid") {
      var cont = document.createElement("div");
      cont.classList.add("basic-box");
      cont.style['margin-top'] = '10px';
      el.appendChild(cont);
      
      cont.style['width'] = '400px';
      cont.style['height'] = '400px';
      slickgrid(cont);
    } else if (data['kind'] === "tree") {
      var cont = document.createElement("div");
      cont.classList.add("basic-box");
      cont.style['margin-top'] = '10px';
      el.appendChild(cont);
      
      cont.style['width'] = '400px';
      cont.style['height'] = '400px';
      slickgridTree(cont);
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
  
}

export class ServerNode extends Node {

}

export class ServerDependentNode extends Node {

  getServer(predecessors) {
    const servers = predecessors
          .map(o => o.data())
          .filter(o => o["kind"] === "server");

    if (servers.length !== 1) {
      console.warn("need server to use kernel, terminal, or filesystem")
      return;
    }

    return servers[0]
  }

  invoke(node, data, predecessors, evalId, isManual) {

    const server = this.getServer(predecessors);

    if (!server) {
      throw "no server found";
    }

    const host = (server.data || {}).host;
    if (!host || !host.length) {
      console.warn("no host on server")
      return;
    }

    // probably need stateful connection based on this now
    // if different URL then can close and create a new one
    const scratch = node.scratch('_state') || {};
    
    if (data.kind === "kernel") {

    } else if (data.kind === "terminal") {
      
    } else if (data.kind === "filesystem") {
      
    } else if (data.kind === "notebook") {
      
    } else if (data.kind === "notebook-cell") {
      
    }
  }
  
}

export class KernelNode extends ServerDependentNode {

  constructor(data, calculator) {
    super(data, calculator);
  }

  init(n) {
    this.updateConnection(n);
  }

  updateConnection(n) {
    const predecessors = n.predecessors().filter(o => o.isNode());
    const server = this.getServer(predecessors);

    if (!server) {
      throw "no server found";
    }
    
    var data = this._data.data || {};
    this._haveKernel = false;

    if (server.data.host && data.kernel_name) {
      fetch('http://' + server.data.host + '/api/kernels', {
        method: 'POST',
        body: JSON.stringify({ 'name': data.kernel_name })
        //body: JSON.stringify({ 'name': r['available'][0] })
      }).then(r => r.json())
        .then((r) => {
          console.log('kernel id:', r.id)
        })
        .catch(() => {
        })
      
    } else {
      
    }
  }

}

export class NotebookNode extends ServerNode {

  
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

function setupMonaco(el) {

    let editor = monaco.editor.create(el, {
      value: "function hello() {\n\talert('Hello world!');\n}",
      language: "javascript",
      fontFamily: "Roboto Mono",
      fontSize: 14,
      //theme: "vs-dark"
    });
  
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