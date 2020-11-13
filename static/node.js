
import { throttle, capitalize, dom } from "./utils.js";
import { KernelHelper } from "./kernel.js";
import { slickgridAsync, treeFilter, SlickgridTree } from "./slickgrid.js";

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
  "scalar",  
  "kernel",
  "code",
  "text",
  "python-dataframe",
  "terminal",
  "file-system",
  "kernel",
  "terminal",
  "file-system",
  "notebook",
  "notebook-cell", // could be a very versatile and useful cell
  "server-file"
]

export function getNode(data, calculator) {

  if (data.kind === "server") {
    return new ServerNode(data, calculator)
  } else if (data.kind === "server-file") {
    return new ServerFileNode(data, calculator)
  } else if (data.kind === "kernel") {
    return new KernelNode(data, calculator)
  } else if (data.kind === "scalar") {
    return new ScalarNode(data, calculator)
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
  } else if (data.kind === "notebook") {
    return new NotebookNode(data, calculator);
  } else if (data.kind === "file-system") {
    return new FileSystemNode(data, calculator);
  } else if (["kernel", "terminal", "file-system"].includes(data.kind)) {
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

  getExtraConf() {
    return [];
  }

  renderConf(node, data, el) {

    // TODO: update cyto node data
    
    var conf = document.createElement("div");
    conf.classList.add("basic-box");
    conf.classList.add("node-conf");

    let confItems = [];

    confItems.push(['name', 'input']);
    confItems.push(['kind']);
    confItems = confItems.concat(this.getExtraConf());
    confItems.push(['buttons']);

    const refreshNode = () => {
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
        });
    }
    
    confItems.forEach(([name, kind]) => {
       var row = document.createElement("div");
       row.classList.add("row");
       conf.appendChild(row);

      if (kind === "input") {

        const _data = name === "name" ? data : data.data;
        
         row.innerHTML = `
<div style="display:flex;justify-content:space-between;">
  <span class="text">
    ${name.split('-').map(capitalize).join(' ')}
  </span>
  <input style="width:190px;" value="${_data[name] || ''}" />
</div>
`;
         const input = row.querySelector("input");
         
         dom.on(input, 'keyup', throttle(() => {
           const value = input.value || "";
           const data = node.data();
           if (name === 'name') {
             data[name] = value;
           } else {
             data.data[name] = value;
           }
           node.data(data);
         }, 100));
         
       } else if (name === "kind") {

         const nodeOptions = nodeKinds.map(
           v => `<option value="${v}" ${v === data['kind'] ? 'selected' : ''}>${v.split('-').map(capitalize).join(' ')}</option>`)
         
         row.innerHTML = `
<div style="display:flex;justify-content:space-between;">
  <span class="text">
    Kind
  </span>
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
           refreshNode();
         });
         
       } else if (name === 'buttons') {

         row.innerHTML = `
<div style="display:flex;justify-content:flex-end;">
  <span class="run-node node-button" title="run node">
    <img src="/static/images/bootstrap-icons/play-fill.svg" />
  </span>
<!--  <span class="node-button" title="stop">
    <img src="/static/images/bootstrap-icons/stop-fill.svg" />
  </span> -->
  <span class="node-button" title="full screen">
    <img src="/static/images/bootstrap-icons/arrows-fullscreen.svg" />
  </span>
<!--  <span class="node-button" title="restore size">
    <img src="/static/images/bootstrap-icons/arrows-angle-contract.svg" />
  </span> -->
<!--  <span class="node-button" title="show content">
    <img src="/static/images/bootstrap-icons/eye-fill.svg" />
  </span> -->
  <span class="node-button" title="hide content">
    <img src="/static/images/bootstrap-icons/eye-slash.svg" />
  </span>
  <span class="run-node node-button" title="pin/keep open">
    <img src="/static/images/bootstrap-icons/asterisk.svg" />
  </span>
  <span class="refresh-node node-button" title="pin/keep open">
    <img src="/static/images/bootstrap-icons/arrow-clockwise.svg" />
  </span>
</div>
`;

         dom.on(row.querySelector(".run-node"), 'click', () => {
           const data = node.data();
           this._calculator.evalNode('#' + data['id']);
         });

         dom.on(row.querySelector(".refresh-node"), 'click', refreshNode)
         
         //restore/maximise/pin/run'
       } else {
         row.innerHTML = name;
       }

    });
    el.appendChild(conf);    
  }

  getPreviousValues(incomers) {
    const lookup = {};
    incomers.forEach((n) => {
      const scratchEval = n.scratch("eval") || {};
      lookup[n.data()['id']] = scratchEval['last_return_value'];
    });
    return lookup;
  }

  invoke(node, data, incomers, evalId, isManual) {
    // i.e. return promise
    var calculator = this._calculator;

    if (data.kind === "notebook") {

      
    } else if (data.kind === "grid") {
    } else if (data.kind === "tree") {
    } else if (["kernel", "terminal", "file-system"].includes(data.kind)) {

      
    }

    return new Promise((resolve, reject) => {
      console.log('invoke: ' + data.kind)
      resolve();
    });
    
  }

  clearRender() {
    this._renderOpen = false;
  }

  render(n, el, data, last_value) {
    this._renderOpen = true;
    // i.e. slickgrid etc.
    // TODO: regard width/height e.g. restore/maximise,
    // e.g. window.innerWidth etc. if maximised,
    // may just want 'restore' icon in top right, use esc key too,
    // keep menu on top

    if (data['kind'] === "grid") {
      var cont = document.createElement("div");
      cont.classList.add("basic-box");
      cont.style['margin-top'] = '10px';
      el.appendChild(cont);
      
      cont.style['width'] = '400px';
      cont.style['height'] = '400px';
    } else if (data['kind'] === "tree") {
      var cont = document.createElement("div");
      cont.classList.add("basic-box");
      cont.style['margin-top'] = '10px';
      el.appendChild(cont);
      
      cont.style['width'] = '400px';
      cont.style['height'] = '400px';
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
    } else if (data['kind'] === "text") {
    }
    
  }
  
}

export class ServerNode extends Node {

  getExtraConf() {
    return [['host', 'input']];
  }
  
}

export class ScalarNode extends Node {

  getExtraConf() {
    return [['value', 'input']];
  }
  
}


export class ServerDependentNode extends Node {

  getServer(incomers) {
    const servers = incomers
          .map(o => o.data())
          .filter(o => o["kind"] === "server");

    if (servers.length !== 1) {
      console.warn("need server to use kernel, terminal, or file-system")
      return;
    }

    return servers[0]
  }

  invoke(node, data, incomers, evalId, isManual) {

    const values = this.getPreviousValues(incomers);
    const server = this.getServer(incomers);

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

  getExtraConf() {
    return [['kernel-name', 'input']];
  }

  init(n) {
    return this.updateConnection(n);
  }

  invoke(node, data, incomers, evalId, isManual) {
    // TODO: check this code is right
    
    // if host has changed, update the kernel, the kernel is state
    const updated = this.updateConnection(node);
    if (updated !== undefined) {
      return updated.then(() => {
        return super.invoke(node, data, incomers, evalId, isManual);
      })
    }

    return super.invoke(node, data, incomers, evalId, isManual);
  }

  updateConnection(n) {
    const incomers = n.incomers().filter(o => o.isNode());
    const server = this.getServer(incomers);

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

    if (server.data.host && data['kernel-name']) {

      this._currentHost = undefined;
      this._currentKernel = undefined;

      return new Promise((resolve, reject) => {
        
        const kernel = new KernelHelper(server.data.host, data['kernel-name'])
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

export class ServerFileNode extends Node {

  constructor(data, calculator) {
    super(data, calculator);
    this._currentFileName = undefined;
    this._currentFile = undefined;
    this._fetching = false;
  }
  
  getExtraConf() {
    return [['value', 'input']];
  }

  init(n) {
    const fileName = (n.data().data || {}).value;

    if ((this._currentFile === undefined || fileName !== this._currentFile)
        && fileName && fileName.length &&
        !this._fetching) {

      this._fetching = true;
      return fetch(fileName)
        .then((d) => d.text())
        .then((data) => {
          this._currentFileName = fileName;
          this._currentFile = data;
          this._fetching = false;
        })
    }
    
  }
  
}

export class NotebookCell {

  constructor(el, cell, notebookLanguage) {
    this._el = el;
    this._cell = cell;
    this._lang = notebookLanguage;
  }

  render() {
    const el = this._el;
    const cell = this._cell;
    const lang = this._lang;

    const execCount = cell.execution_count;
   
    const cont = dom.ce("div");
    const _in = dom.ce("div");
    const _inCount = dom.ce("div");
    const _inBody = dom.ce("div");
    const _out = dom.ce("div");
    const _outCount = dom.ce("div");
    const _outBody = dom.ce("div");
    const execCountWidth = 60;

    el['style']['width'] = '100%';

    // TODO: use stylesheet/class

    [_in, _out].map((el) => {
      el['style']['display'] = 'flex';
      el['style']['flex-direction'] = 'row';
      el['style']['align-items'] = 'stretch';
    });
    [_inCount, _outCount].map((el) => {
      el.style['width'] = `${execCountWidth}px`;
    });
    [_inBody, _outBody].map((el) => {
      el.style['width'] = `calc(100% - ${execCountWidth}px)`;
    });

    _inCount.innerHTML = `In&nbsp;[${execCount || '&nbsp;'}]`;

    dom.ap(el, cont);
    
    dom.ap(cont, _in);
    dom.ap(_in, _inCount);
    dom.ap(_in, _inBody);

    // create jupyter notebook cell
    // input - vs code (e.g. google collab, disconnect renderer?)
    // output - cell msg_id output or static output
    //   -> different types of output, images, text, html
    //   -> TODO: custom events
    // buttons/actions/info
    //  - In[] Out[] count
    //  - run cell
    //  - insert below
    //  - insert above (if first cell)
    //  - change cell type, e.g. code/markdown
    //  - delete cell

    //

    const value = (cell.source || []).join("");

    if (cell.cell_type === "code") {
      new AutoBlurMonaco(_inBody, lang, value);
    } else if (cell.cell_type === "markdown") {
      _inBody.classList.add("rendered_html")
      _inBody.innerHTML = downa.render(value);
    } else {
      throw `unrecognised cell type "${cell.cell_type}"`;
    }

    if (cell.outputs && cell.outputs.length) {

      dom.ap(cont, _out);
      dom.ap(_out, _outCount);
      dom.ap(_out, _outBody);

      let outExecCount;
      
      cell.outputs.forEach((obj) => {

        let objEl = dom.ce("div");
        
        if (obj.execution_count && outExecCount === undefined) {
          outExecCount = obj.execution_count;
        }

        if (obj.output_type === "execute_result" || obj.output_type === "display_data") {
          if (!('data' in obj)) {
            throw "expected 'data' key in cell output";
          }
          let text
          let haveOther = false;

          for (const k in obj['data']) {
            if (k === "text/plain") {
              text = obj['data']['text/plain'].join('');
              continue;
            } else if (!!k.match('^image\/')) {
              haveOther = true;
              const img = dom.ce("img")
              img.alt = text;
              img.src = `data:${k};base64,${obj['data'][k]}`;
              dom.ap(objEl, img);
            } else {
              throw `unexpected data found in cell output ${k}`;
            }
          }

          if (!haveOther) {
            objEl.innerHTML = text;
          }
          
        } else if (obj.output_type === "stream") {
          if (!('text' in obj)) {
            throw "expected 'data' key in cell output";
          }
          objEl['style']['white-space'] = 'break-spaces';
          objEl.innerHTML = obj['text'].join('');
        } else {
          throw `unrecognised cell output type "${obj.output_type}"`;
        }

        dom.ap(_outBody, objEl);
        
      });

      _outCount.innerHTML = `Out&nbsp;[${outExecCount || '&nbsp;'}]`;
    }

  }

}

export class NotebookNode extends Node {

  render(n, el, data, last_value) {
    // TODO: execute each cell, check if stopped, check if evalId is the same, i.e. do guard check
    // calculator.guardCheck()
    const incomers = n.incomers().filter(n => n.isNode())

    // - TODO: make this work cell by cell for a notebook, which is like a sequence of nodes
    // .... e.g. emit custom events/invocations per cell,
    // thus decompose a notebook into a chain of promises with sideffects
    // -> ? getInvokationFunction() ...
    // ... remember: this may be interrupted too
    // ... remember: it's probably best to stop notebooks creating invocation loops of themselves

    const file = incomers.filter(o => o.data()["kind"] === "server-file");
    const kernel = incomers.filter(o => o.data()["kind"] === "kernel");
    
    this._currentFile = undefined;

    if (file.length > 1) {
      throw "expected at most one file for notebook";
    }

    if (file.length === 1) {
      const fileContent  = file.scratch().node.node._currentFile;
      if (fileContent) {
        this._currentFile = JSON.parse(fileContent)
      }
    }

    if (kernel.length !== 1) {
      throw "need a single language for notebook from kernel";
    }

    const kernelName = (kernel[0].data().data || {})['kernel-name'];

    if (!kernelName) {
      throw "No kernel name for notebook set in kernel";
    }

    let notebookLanguage;
    if (!!kernelName.match(/^python/)) {
      notebookLanguage = "python";
    } else if (!!kernelName.match(/^javascript/)) {
      notebookLanguage = "javascript";
    }

    if (!notebookLanguage) {
      throw "No matching language from kernel found, e.g. python or javascript.";
    }
    
    // 
    
    var cont = document.createElement("div");
    cont.classList.add("basic-box");
    cont.style['margin-top'] = '10px';

    cont.style['height'] = '400px';
    cont.style['width'] = '400px';
    cont.style['overflow-y'] = 'scroll';
    
    el.appendChild(cont);

    // TODO: global actions/buttons
    // - run all notebook
    // - run all cells above
    // - run cell
    // - restart kernel
    // - stop/interrupt kernel
    // - insert cell
    // - delete cell
    // - export to python code

    if (this._currentFile) {
      this._currentFile.cells.forEach((cell) => {

        const el = dom.ce("div");
        /*
        el.innerHTML = `
${cell.source.join("\n")}
${(cell.outputs || []).join("\n")}
<hr/>
`;*/
        dom.ap(cont, el);

        const obj = new NotebookCell(el, cell, notebookLanguage);
        obj.render();
        
        
      });
    }

  }
  
}

export class TextNode extends Node {

  invoke(node, data, incomers, evalId, isManual) {
    const values = this.getPreviousValues(incomers) || {};
    
    return new Promise((resolve) => {
      resolve(JSON.stringify(values));
    })
  }

  render(n, el, data, last_value) {
    var cont = document.createElement("div");
    cont.classList.add("basic-box");
    cont.style['margin-top'] = '10px';
    el.appendChild(cont);

    cont.innerHTML = last_value
  }
  
}

export class NotebookCellNode extends Node {

  invoke(node, data, incomers, evalId, isManual) {

    const code = data['data']['code'];
    const kernels = incomers
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

    const incomers = n.incomers().filter(o => o.isNode());
    const server = this.getServer(incomers);

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
  
  render(n, el, data, last_value) {
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

  render(n, el, data, last_value) {
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

  invoke(node, data, incomers, evalId, isManual) {

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

    const kernels = incomers
          .filter(o => o.data()["kind"] === "kernel");
    const codeNode = incomers
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

  getExtraConf() {
    return [['language', 'input']];
  }

  render(n, el, data, last_value) {

    var cont = document.createElement("div");
    cont.style['margin-top'] = '10px';
    el.appendChild(cont);
    
    cont.classList.add("basic-box");
    cont.style['width'] = '400px';
    cont.style['height'] = '400px';

    new AutoBlurMonaco(
      cont,
      data.data['language'],
      data.data['code']
    );
    
  }

}

export class FileSystemNode extends ServerDependentNode {

  init(n) {
    this._tree = new SlickgridTree();
    return this.updateConnection(n);
  }

  updateConnection(n) {
    const incomers = n.incomers().filter(o => o.isNode());
    const server = this.getServer(incomers);

    if (!server) {
      return;
    }
    
    this._url = "http://" + server.data.host;
  }

  invoke(node, data, incomers, evalId, isManual) {
    this.updateConnection(node);
    super.invoke(node, data, incomers, evalId, isManual);
  }

  render(n, el, data, last_value) {

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

class JupyterCell {

  constructor() {
  }
  
}



class AutoBlurMonaco {

  constructor(el, language, value) {
    this._fontSize = 14;
    this.makeStatic(el, language, value);
  }

  makeDynamic(el, language, value) {

    let editor = monaco.editor.create(el, {
      value: value || "",
      language: language,
      fontFamily: "Roboto Mono",
      fontSize: this._fontSize,
      lineHeight: this._fontSize * 1.5,
      //theme: "vs-dark"      

      minimap: {
	enabled: false
      },

      //automaticLayout: true,

      scrollBeyondLastLine: false,

      // https://stackoverflow.com/questions/53448735/
      lineNumbers: 'off',
      glyphMargin: false,
      folding: false,

    });

    editor.onDidBlurEditorWidget(()=>{
      this.makeStatic(el, language, editor.getModel().getValue());
      editor.dispose();
    });

    this._editor = editor;
    
  }

  makeStatic(el, language, value) {

    // width, height?

  // N.B. need this font loaded before this - otherwise seems to cache wrong value

    monaco.editor.colorize(value, language)
      .then((d) => {
        const el2 = dom.ce("div");

        el2.innerHTML = d;

        dom.on(el2, "click", (e) => {

          // https://stackoverflow.com/questions/3234256/find-mouse-position-relative-to-element
          const rect = el2.getBoundingClientRect();
          const x = e.clientX - rect.left; //x position within the element.
          const y = e.clientY - rect.top;  //y position within the element.
          
          el.innerHTML = "";
          el.style['height'] = `${rect.height}px`;
          this.makeDynamic(el, language, value);

          // https://microsoft.github.io/monaco-editor/api/enums/monaco.editor.editoroption.html#fontinfo
          const EDITOR_OPTION_FONT_INFO = 36;
          const fontInfo = this._editor.getOption(EDITOR_OPTION_FONT_INFO);
          const fontWidth = fontInfo['typicalHalfwidthCharacterWidth']

          const rowIdx = Math.floor(y / fontInfo.lineHeight) + 1;
          const colIdx = Math.round(x / fontWidth);

          this._editor.setSelection(
            new monaco.Selection(
              rowIdx, colIdx, rowIdx, colIdx
            )
          )
          this._editor.focus();
          
          
        })

        // add these to scss
        el2['style']['padding-left'] = "10px"; // monaco editor has the same
        //el2['style']['margin-top'] = "10px";
        el2['style']['background'] = "white";
        el2['style']['font-family'] = "Roboto Mono";
        el2['style']['font-size'] = `${this._fontSize}px`;
        el2['style']['line-height'] = `${this._fontSize * 1.5}px`;
        el2['style']['overflow-x'] = 'hidden';
        el2['style']['white-space'] = 'nowrap';
        el2['style']['height'] = '100%';
        
        el.appendChild(el2);
      });
    
  }

  dispose() {
  }
  
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
