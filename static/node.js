
import { throttle, capitalize, dom } from "./utils.js";
import { KernelHelper } from "./kernel.js";
import { slickgridAsync, treeFilter, slickgrid, slickgridTree, SlickgridTree } from "./slickgrid.js";

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

const nodeKinds = [
  "server",
  "kernel",
  "code",
  "text",
  "python-dataframe",
  "terminal",
  "notebook-cell",
  "file-system",
  "kernel",
  "terminal",
  "file-system",
  "notebook",
  "notebook-cell"
]

export function getNode(data, calculator) {

  if (data.kind === "server") {
    return new ServerNode(data, calculator)
  } else if (data.kind === "kernel") {
    return new KernelNode(data, calculator)
  } else if (data.kind === "grid") {

  } else if (data.kind === "code") {
    return new CodeEditorNode(data, calculator);
  } else if (data.kind === "python-dataframe") {
    return new PythonDFNode(data, calculator);
  } else if (data.kind === "text") {
    return new TextNode(data, calculator);	
  } else if (data.kind === "terminal") {
    return new TerminalNode(data, calculator);	
  } else if (data.kind === "notebook-cell") {
    return new NotebookCellNode(data, calculator);
  } else if (data.kind === "file-system") {
    return new FileSystemNode(data, calculator);
  } else if (["kernel", "terminal", "file-system",
              "notebook", "notebook-cell"].includes(data.kind)) {
    return new ServerDependentNode(data, calculator)
  }
  
  return new Node(data, calculator);
}

export class Node {

  canScale = true;

  constructor(data, calculator) {
    this._data = data;
    this._calculator = calculator;
    this._properties = {};
  }

  init(n) {
  }

  renderConf(node, data, el) {

    // TODO: update cyto node data
    
    var conf = document.createElement("div");
    conf.classList.add("basic-box");
    conf.classList.add("node-conf");
    
    ['name',
     'kind',
     'buttons'].forEach((name) => {
       var row = document.createElement("div");
       row.classList.add("row");
       conf.appendChild(row);       

       if (name === "name") {
         row.innerHTML = `
<div style="display:flex;justify-content:space-between;">
  <div>
    name
  </div>
  <input style="width:188px;" value="${data['name'] || ''}" />
</div>
`;
         const input = row.querySelector("input");
         
         dom.on(input, 'keyup', throttle(() => {
           const value = input.value || "";
           const data = node.data();
           data['name'] = value;
           node.data(data);
         }, 100));
         
       } else if (name === "kind") {

         const nodeOptions = nodeKinds.map(
           v => `<option value="${v}" ${v === data['kind'] ? 'selected' : ''}>${v.split('-').map(capitalize).join(' ')}</option>`)
         
         row.innerHTML = `
<div style="display:flex;justify-content:space-between;">
  <div>
    kind
  </div>
  <select style="width:200px;">
    <option>-</option>
    ${nodeOptions}
  </select>
</div>
`;

         const sel = row.querySelector("select");

         dom.on(sel, 'change', () => {
           const value = sel.value || "";
           const data = node.data();
           data['kind'] = value;
           node.data(data);
           const newNode = getNode(node.data(), this._calculator);
           node.scratch(
             'node', { node: newNode });

           el.innerHTML = "";
           var cont = document.createElement("div");
           cont.classList.add("basic-box");
           cont.innerHTML = "Initialising...";
           el.appendChild(cont);
           
           (newNode.init(node) || Promise.resolve())
             .then(() => {
               el.innerHTML = "";
               node.trigger("tap");
             })
           
         });
         
       } else if (name === 'buttons') {

         row.innerHTML = `
<div>
  <img src="/static/images/bootstrap-icons/arrows-fullscreen.svg" />
  <img src="/static/images/bootstrap-icons/arrows-angle-contract.svg" />
  <img src="/static/images/bootstrap-icons/eye-fill.svg" />
  <img src="/static/images/bootstrap-icons/eye-slash.svg" />
  <img src="/static/images/bootstrap-icons/play-fill.svg" />
  <img src="/static/images/bootstrap-icons/stop-fill.svg" />
</div>
`;
         
         //restore/maximise/pin/run'
       } else {
         row.innerHTML = name;
}

       
       

    });
    el.appendChild(conf);    
  }

  getPreviousValues(predecessors) {
    const lookup = {};
    predecessors.forEach((n) => {
      const scratchEval = n.scratch("eval");
      lookup[n.data()['id']] = scratchEval['last_return_value'];
    });
    return lookup;
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
    } else if (["kernel", "terminal", "file-system"].includes(data.kind)) {

      
    }

    return new Promise((resolve, reject) => {
      console.log('invoke: ' + data.kind)
      resolve();
    });
    
  }

  render(el, data, last_value) {
    // i.e. slickgrid etc.
    // TODO: regard width/height e.g. restore/maximise

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
    } else if (data['kind'] === "notebook") {
      var cont = document.createElement("div");
      cont.classList.add("basic-box");
      cont.style['margin-top'] = '10px';
      el.appendChild(cont);

      cont.innerHTML = "testing1<br/>testing2<br/>testing3";
    } else if (data['kind'] === "text") {
      var cont = document.createElement("div");
      cont.classList.add("basic-box");
      cont.style['margin-top'] = '10px';
      el.appendChild(cont);

      cont.innerHTML = last_value
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
      console.warn("need server to use kernel, terminal, or file-system")
      return;
    }

    return servers[0]
  }

  invoke(node, data, predecessors, evalId, isManual) {

    const values = this.getPreviousValues(predecessors);
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
      
    } else if (data.kind === "file-system") {
      
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
    return this.updateConnection(n);
  }

  invoke(node, data, predecessors, evalId, isManual) {
    // TODO: check this code is right
    
    // if host has changed, update the kernel, the kernel is state
    const updated = this.updateConnection(node);
    if (updated !== undefined) {
      return updated.then(() => {
        return super.invoke(node, data, predecessors, evalId, isManual);
      })
    }

    return super.invoke(node, data, predecessors, evalId, isManual);
  }

  updateConnection(n) {
    const predecessors = n.predecessors().filter(o => o.isNode());
    const server = this.getServer(predecessors);

    if (!server) {
      return;
    }

    if (server.data.host === this._currentHost) {
      return;
    }

    if (this._currentHost !== undefined) {
      // TODO: clean up old connection and close it if changes
    }

    var data = this._data.data || {};

    if (server.data.host && data.kernel_name) {

      this._currentHost = undefined;
      this._currentKernel = undefined;

      return new Promise((resolve, reject) => {
        
        const kernel = new KernelHelper(server.data.host, data.kernel_name)
        kernel.create()
          .then((id) => {
            kernel.connect()
              .then(() => {
                this._currentHost = server.data.host;
                this._currentKernel = kernel;
                resolve();
              })
              .catch(() => {
                reject();
                throw "error connecting to new kernel";
              });
          })
          .catch(() => {
            reject();
            throw "error creating kernel";
          })

      });
      
    }
  }

}

export class NotebookNode extends Node {
  
}

export class TextNode extends Node {

  invoke(node, data, predecessors, evalId, isManual) {
    const values = this.getPreviousValues(predecessors) || {};
    
    return new Promise((resolve) => {
      resolve(JSON.stringify(values));
    })
  }
}

export class NotebookCellNode extends Node {

  invoke(node, data, predecessors, evalId, isManual) {

    const code = data['data']['code'];
    const kernels = predecessors
          .filter(o => o.data()["kind"] === "kernel");

    if (!code) {
      return;
    }

    if (kernels.length !== 1) {
      throw "expected one kernel";
    }

    const kernelNode = kernels[0].scratch('node');
    const kernelHelper = kernelNode.node._currentKernel;

    if (kernelHelper) {
      return kernelHelper.execCodeSimple(code)
        .then((res) => {
          return res;
        });
    }
  }
  
}


export class TerminalNode extends ServerDependentNode {

  canScale = false;

  init(n) {

    const predecessors = n.predecessors().filter(o => o.isNode());
    const server = this.getServer(predecessors);

    if (!server) {
      return;
    }
    
    const url = server.data.host;
    const ws_url = "ws://" + url + "/terminals/websocket/1";

    return new Promise((resolve) => {

      const size = { cols: 90, rows: 10 };
      var ws = new WebSocket(ws_url);
      var term = new Terminal({
        cols: size.cols,
        rows: size.rows,
        screenKeys: true,
        useStyle: true
      });
      
      ws.onopen = function(event) {
        ws.send(JSON.stringify(["set_size", size.rows, size.cols,
                                window.innerHeight, window.innerWidth]));

        term.onData(function(data) {
          // TODO: could create an event hook here, e.g. look for e.g. token '%%'
          ws.send(JSON.stringify(['stdin', data]));
        });

        ws.onmessage = function(event) {
          let json_msg = JSON.parse(event.data);
          switch(json_msg[0]) {
          case "stdout":
            term.write(json_msg[1]);
            break;
          case "disconnect":
            term.write("\r\n\r\n[Finished... Terminado]\r\n");
            break;
          }
        };
        resolve();
      };

      this._term = term;

    });

  }
  
  render(el, data, last_value) {
    var cont = document.createElement("div");
    cont.classList.add("basic-box");
    cont.style['margin-top'] = '10px';
    el.appendChild(cont);

    this._term.open(cont);
    this._term.focus();
    //this._term.fit();

    // TODO: figure out sending text... xterm js?
    //this._term.write('echo "arie"\r\n')
  }
}

// make this a notebook cell?
export class PythonDFNode extends ServerDependentNode {

  canScale = false;

  constructor(data, calculator) {
    super(data, calculator);
    this._initInProgress = false;
    this._init = false;
    this._rowCount = undefined;
    this._columns = undefined;
  }

  render(el, data, last_value) {
    var cont = document.createElement("div");
    cont.classList.add("basic-box");
    cont.style['margin-top'] = '10px';
    el.appendChild(cont);
    
    cont.style['width'] = '400px';
    cont.style['height'] = '400px';

    // need:
    // - row count
    // - column names
    // - row data

    // need callback to fetch and populate DF data

    if (this._rowCount && this._columns) {
      slickgridAsync(cont, this._rowCount, this._columns, (from, to) => {
        return this._currentKernelHelper.execCodeSimple(
          `json.dumps(${this._sym}[${from}:${to}].to_dict('records'))`);
      });
    } else {
      cont.innerHTML = "Initialising...";
    }
  }

  refresh() {
    return Promise.all([
      this._currentKernelHelper.execCodeSimple(`len(${this._sym})`),
      this._currentKernelHelper.execCodeSimple(`list(${this._sym}.columns)`)
    ]).then((res) => {
      const len = +res[0];
      const cols = JSON.parse(res[1].replace(/\'/ig, '"'))
      if (cols) {
        this._rowCount = len;
        this._columns = cols;
      }
    });
  }

  invoke(node, data, predecessors, evalId, isManual) {

    if (this._initInProgress) {
      return;
    }

    this._currentKernelHelper = undefined;

    // in kernel, use node id for variable of grid

    const az = data['id'].match(/[a-z0-9]+/ig);

    if (!az) {
      throw 'invalid id';
    }
    
    this._sym = '_sym_' + az[0];

    const kernels = predecessors
          .filter(o => o.data()["kind"] === "kernel");
    const codeNode = predecessors
          .filter(o => o.data()["kind"] === "code");

    if (codeNode.length !== 1) {
      throw "expected one code node for initisalisation";
    }

    if (kernels.length !== 1) {
      throw "expected one kernel";
    }

    const code = ((codeNode[0].data() || {}).data || {}).code;

    if (!code) {
      throw "expected initialisation code";
    }    

    if (!code.match(/\$sym/)) {
      throw "initialisation code should have a $sym variable to capture dataframe"
    }

    const kernelNode = kernels[0].scratch('node');
    const kernelHelper = kernelNode.node._currentKernel;
    this._currentKernelHelper = kernelHelper;

    if (this._init) {
      return this.refresh();
    }
    
    this._initInProgress = true;

    if (kernelHelper) {
      return kernelHelper.execCodeSimple(code.replace(/\$sym/ig, this._sym), "execute_reply")
        .then((res) => {
          this._init = true;
          this._initInProgress = false;
          return this.refresh(kernelHelper);
        })
        .catch(() => {
        })
    }
  }  
  
}

function depthFirstFlattenTree(treeItems) {
  let flat = [];
  for (var i = 0; i < treeItems.length; i++) {
    var obj = treeItems[i];
    flat.push(obj);
    if (obj.has_children) {
      flat = flat.concat(depthFirstFlattenTree(obj.children));
    }
  }
  return flat;
}

export class CodeEditorNode extends Node {

  render(el, data, last_value) {

    var cont = document.createElement("div");
    cont.classList.add("basic-box");
    cont.style['margin-top'] = '10px';
    el.appendChild(cont);
    
    cont.style['width'] = '400px';
    cont.style['height'] = '400px';
    setupMonaco(cont, data.data['language'], data.data['code']);
  }

}

export class FileSystemNode extends ServerDependentNode {

  init(n) {

    this._tree = new SlickgridTree();
    
    return this.updateConnection(n);
  }

  updateConnection(n) {
    const predecessors = n.predecessors().filter(o => o.isNode());
    const server = this.getServer(predecessors);

    if (!server) {
      return;
    }
    
    this._url = "http://" + server.data.host;
  }

  invoke(node, data, predecessors, evalId, isManual) {
    this.updateConnection(node);
    super.invoke(node, data, predecessors, evalId, isManual);
  }

  render(el, data, last_value) {

    var cont = document.createElement("div");
    cont.classList.add("basic-box");
    cont.style['margin-top'] = '10px';
    el.appendChild(cont);
    
    cont.style['width'] = '400px';
    cont.style['height'] = '400px';

    // TODO: clean up this code
    var base;

    this._tree.setup(cont, (path, obj) => {

      fetch(this._url + "/api/contents/" + path) // +path
        .then(r => r.json())
        .then((r) => {

          // TODO: ensure reconstruct from tree
          
          const fsObjs = r.content.map((row) => {

            return {
              id: "id_" + row.path,
              indent: obj ? obj.indent + 1 : 0,
              title: row.name,
              path: row.path,
              parent: null,
              _collapsed: true,
              has_children: row.type === "directory",
              parent_obj: obj,
              children: []
            };
          });

          if (!path) {
            base = fsObjs;
          }          

          let newData = base;

          if (obj) {
            obj.children = fsObjs;
          } else {
            newData = fsObjs;
          }
          
          // this needs to be flattened tree
          //debugger
          var data = depthFirstFlattenTree(newData);

          this._tree.dataView.beginUpdate();
          this._tree.dataView.setItems(data);
          this._tree.data = data
          this._tree.dataView.setFilter(treeFilter);
          this._tree.dataView.endUpdate();
          this._tree.dataView.refresh();

          this._tree.grid.invalidate();
          //this._tree.grid.invalidateRows(this._tree.data.map((v, i) => i));
          this._tree.grid.render();
          
          // .type === "directory"
        })
      
      depthFirstFlattenTree
    }, () => {

      if (!base) {
        throw "no data";
      }
      
      var data = depthFirstFlattenTree(base);

      this._tree.dataView.beginUpdate();
      this._tree.dataView.setItems(data);
      this._tree.data = data
      this._tree.dataView.setFilter(treeFilter);
      this._tree.dataView.endUpdate();
      this._tree.dataView.refresh();

      this._tree.grid.invalidate();
      this._tree.grid.render();
      
    });



  }

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

function setupMonaco(el, language, value) {

    let editor = monaco.editor.create(el, {
      value: value || "function hello() {\n\talert('Hello world!');\n}",
      language: language,
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
