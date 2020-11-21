
import { throttle, capitalize, dom } from "./utils.js";
import { KernelHelper } from "./kernel.js";
import { slickgridAsync, treeFilter, SlickgridTree } from "./slickgrid.js";
import { AutoBlurMonaco, stringToLines, runCell, renderNotebookCell } from "./notebook.js";

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
  <span class="log-info node-button" title="logging status">
    <img src="/static/images/bootstrap-icons/card-text.svg" />
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

  invoke(node, data, incomers, evalId, isForced) {
    // i.e. return promise
    var calculator = this._calculator;

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

    if (data['kind'] === "test-draw") {
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

  invoke(node, data, incomers, evalId, isForced) {

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

  invoke(node, data, incomers, evalId, isForced) {
    // TODO: check this code is right
    
    // if host has changed, update the kernel, the kernel is state
    const updated = this.updateConnection(node);
    if (updated !== undefined) {
      return updated.then(() => {
        return super.invoke(node, data, incomers, evalId, isForced);
      })
    }

    return super.invoke(node, data, incomers, evalId, isForced);
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

                // TODO: remove
                // testing:
                //
                //kernel.execCodeSimple("print('hello world')");
                //kernel.execCodeSimple("2 * 10");
                //kernel.execCodeSimple("a = 4");
                /*
                kernel.execCodeSimple(`
from time import sleep
for i in range(4):
  print('hello world')
  sleep(1)
`);
                */

                //kernel.execCodeSimple("raise Exception()");
                // execute_reply -> status - error
                
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



function getChildNumber(node) {
  return Array.prototype.indexOf.call(node.parentNode.childNodes, node);
}

export class NotebookNode extends Node {

  constructor(data, calculator) {
    super(data, calculator);
    this._cells = [];

    this._running = false;
    this._cellRunIdx = 0;
  }

  invoke(node, data, incomers, evalId, isForced) {

    // deserialise notebook if available
    if (!this._initFile) {
      const file = incomers.filter(o => o.data()["kind"] === "server-file");
      
      this._currentFile = undefined;

      if (file.length > 1) {
        throw "expected at most one file for notebook";
      }

      if (file.length === 1) {
        const fileContent  = file.scratch().node.node._currentFile;
        if (fileContent) {
          try {
            this._currentFile = JSON.parse(fileContent)
            this._initFile = true;
          } catch (e) {
          }
        }
      }
    }

    if (this._currentFile) {
      this.deserializeNotebook(this._currentFile);
      this._currentFile = undefined;
    }    

    if (!isForced) {
      return;
    }

    this._currentKernelHelper = undefined;

    const kernels = incomers
          .filter(o => o.data()["kind"] === "kernel");

    if (kernels.length !== 1) {
      throw "expected one kernel";
    }

    const kernelNode = kernels[0].scratch('node');
    const kernelHelper = kernelNode.node._currentKernel;
    this._currentKernelHelper = kernelHelper;

    this.runAllCells(evalId)
  }

  stopRun() {
    this._running = false;
  }

  _getNextCodeCell(minIdx) {
    for (var i = minIdx; i < this._cells.length; i++) {
      const cell = this._cells[i];
      if (cell && cell.cell && cell.cell.cell_type === "code") {
        return i;
      }
    }
  }

  runAllCells(evalId) {
    // - effectively a mini calculator
    // - run the code cells sequentially

    this._running = true;
    this._cellRunIdx = 0;

    return this._runCellContinuous(evalId);
  }

  _runCellContinuous(evalId) {
    // stop
    if (!this._running || this._calculator.guardCheck(evalId)) {
      return;
    }
    
    const nextIdx = this._getNextCodeCell(this._cellRunIdx);
    // no more cells
    if (nextIdx === undefined) {
      return;
    }
    this._cellRunIdx++;

    const cell = this._cells[nextIdx];
    return runCell(cell, this._currentKernelHelper).then(() => {
      this._runCellContinuous(evalId);
    });
  }
  
  serializeNotebook() {
    return {
      cells: (this._cells || []).map(o => o.cell),
      metadata: this._metadata || {},
      nbformat: this._nbformat || 4,
      nbformat_minor: this._nbformat_minor || 0,
    }
  }

  deserializeNotebook(conf) {
    this._cells = (conf.cells || []).map(c => ({ cell: c }));
    this._metadata = conf.metadata;
    this._nbformat = conf.nbformat;
    this._nbformat_minor = conf.nbformat_minor;
  }

  removeFocusCell() {
    if (this._currentFocus) {
      const idx = getChildNumber(this._currentFocus);
      if (this._currentFocus.nextSibling) {
        this.focusCell(this._currentFocus.nextSibling);
      } else {
        this._currentFocus = undefined;
      }
      this.removeCell(idx);
    }
  }

  addCell(index) {
    const cell = { cell_type: "code" };
    const obj = this.renderCell(cell);
    const cellObj = {
      obj: obj,
      cell: cell
    };
    this._cells.splice(index, 0, cellObj);
    const prev = this._currentCont.querySelector(`.notebook-cell:nth-child(${index + 1})`);
    if (prev) {
      prev.parentNode.insertBefore(obj.el, prev);
    } else {
      dom.ap(this._currentCont, obj.el);
    }
    this.focusCell(obj.el);
  }

  validateIndex(index) {
    if (index < 0 || index > this._cells.length - 1) {
      throw "invalid index";
    }
  }

  removeCell(index) {
    this.validateIndex(index);

    this._cells.splice(index, 1);

    if (this._renderOpen) {
      const el = this._currentCont.querySelector(`.notebook-cell:nth-child(${index + 1})`);
      if (!el) {
        throw "element not found";
      }
      el.parentNode.removeChild(el);
    }
  }

  focusCell(el) {
    const idx = getChildNumber(el);
    this.validateIndex(idx);

    // update cell type
    const selCellType = this._menu.querySelector(".cell-type");
    selCellType.value = (this._cells[idx].cell.cell_type || "code");
    
    if (this._currentFocus) {
      this._currentFocus.classList.remove("focus");
    }
    el.classList.add("focus");
    this._currentFocus = el;
  }

  clearRender() {
    super.clearRender();
    this._currentFocus = undefined;
    this.saveCells();
  }

  updateCellSource(obj) {
    if (obj.obj && obj.obj.editor) {
      const value = obj.obj.editor.getValue();
      obj.cell.source = stringToLines(value || "");
    }
  }

  saveCells() {
    this._cells.map((obj) => {
      this.updateCellSource(obj);
    })
  }

  renderCell(cell) {
    if (!this._renderOpen) {
      return;
    }

    const el = dom.ce("div");

    const editor = renderNotebookCell(el, cell, this._notebookLanguage, (event) => {
      const idx = getChildNumber(el);
      this.validateIndex(idx);
      const cell = this._cells[idx];
      
      if (event === "focus") {
        this.focusCell(el);
      } else if (event === "run cell") {
        // TODO:
      } else if (event === "new above") {
      } else if (event === "new below") {
        const idx = getChildNumber(el);
        this.addCell(idx + 1);
      } else {
        throw "unrecognised event";
      }
    });

    return {
      el: el,
      editor: editor
    };
  }

  render(n, el, data, last_value) {
    super.render(n, el, data, last_value)
    const incomers = n.incomers().filter(n => n.isNode())

    const kernel = incomers.filter(o => o.data()["kind"] === "kernel");

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
    
    var cont = dom.ce("div");
    var contWrap = dom.ce("div");
    var menu = dom.ce("div");
    contWrap.classList.add("basic-box");
    contWrap.classList.add("node-notebook");
    contWrap.style['margin-top'] = '10px';
    menu.classList.add("menu-bar");
    menu.classList.add("general-form");

    cont.style['background'] = 'white';
    cont.style['height'] = '400px';
    cont.style['width'] = '600px';
    cont.style['overflow-y'] = 'scroll';

    dom.ap(el, contWrap);
    dom.ap(contWrap, cont);
    dom.ap(contWrap, menu);

    this._menu = menu;

    menu.innerHTML = `
   <div class="run-cell cell-action">
     <span>Run&nbsp;</span><img src="/static/images/bootstrap-icons/play-fill.svg">
   </div>
   <div class="cell-action" title="run all">
     <img src="/static/images/bootstrap-icons/skip-forward-fill.svg">
   </div>
   <div class="cell-action">
     <img src="/static/images/bootstrap-icons/stop-fill.svg">
   </div>
   <div class="cell-action">
     <img src="/static/images/bootstrap-icons/arrow-clockwise.svg">
   </div>
   <div class="add-cell cell-action">
     <img src="/static/images/bootstrap-icons/plus.svg">
   </div>
   <div class="remove-cell cell-action" title="remove cell">
     <img src="/static/images/bootstrap-icons/dash.svg">
   </div>
   <div class="cell-action" title="convert to code">
     <img src="/static/images/bootstrap-icons/file-earmark-arrow-down.svg">
   </div>
   <div style="display:inline-block">
   <select class="cell-type" style="float:right;width:100px;height:28px;margin-bottom:-3px;">
     <option value="">-</option>
     <option value="code">Code</option>
     <option value="markdown">Markdown</option>
   </select>
   </div>
`;

    dom.on(menu.querySelector(".add-cell"), "click", () => {
      if (this._currentFocus) {
        const idx = getChildNumber(this._currentFocus);
        this.addCell(idx + 1);
      } else {
        this.addCell(this._cells.length);
      }
    });    

    dom.on(menu.querySelector(".remove-cell"), "click", () => {
      this.removeFocusCell()
    });

    dom.on(menu.querySelector(".cell-type"), "change", (e) => {
      if (!this._currentFocus) {
        return;
      }

      const value = e.target.value || "code";
      const idx = getChildNumber(this._currentFocus);
      this.validateIndex(idx);
      const cell = this._cells[idx];
      this.updateCellSource(cell);
      cell.cell["cell_type"] = value;
      const newCell = this.renderCell(cell.cell);
      cell.obj.el.parentNode.replaceChild(newCell.el, cell.obj.el);
      cell.obj = newCell;
      this.focusCell(newCell.el);      
    });    

    this._notebookLanguage = notebookLanguage;
    this._currentCont = cont;

    if (this._cells) {
      // async draw, probably improves performance slightly
      setTimeout(() => {
        this._cells.forEach((cell) => {
          const obj = this.renderCell(cell.cell);
          cell.obj = obj;
          dom.ap(this._currentCont, obj.el);
        });
      }, 0);
    }

  }
  
}

export class TextNode extends Node {

  invoke(node, data, incomers, evalId, isForced) {
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

  invoke(node, data, incomers, evalId, isForced) {

    const kernels = incomers
          .filter(o => o.data()["kind"] === "kernel");

    if (kernels.length !== 1) {
      throw "expected one kernel";
    }

    const kernelNode = kernels[0].scratch('node');
    const kernelHelper = kernelNode.node._currentKernel;

    if (kernelHelper) {
      // TODO: invoke cell
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
          `json.dumps(${this._sym}[${from}:${to}].to_dict('records'))`)
          .then(obj => obj.result)
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
      const len = +res[0].result;
      const cols = JSON.parse(res[1].result.replace(/\'/ig, '"'))
      if (cols) {
        this._rowCount = len;
        this._columns = cols;
      }
    });
  }

  invoke(node, data, incomers, evalId, isForced) {

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
      return kernelHelper.execCodeSimple(code.replace(/\$sym/ig, this._sym))
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

  invoke(node, data, incomers, evalId, isForced) {
    this.updateConnection(node);
    super.invoke(node, data, incomers, evalId, isForced);
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
