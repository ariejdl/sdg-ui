
import { dom } from "./utils.js";
import { escape, ansiSpan } from "./ansi.js";

export class NotebookCell {

  constructor(cell, parent) {
    this._el = dom.ce("div");
    this._cell = cell;
    this._parent = parent;
  }

  getCell() {
    return this._cell;
  }

  setCell(cell) {
    return this._cell = cell;
  }

  setLanguage(lang) {
    this._notebookLanguage = lang;
  }

  updateCellCount() {
    const _inCount = this._el.querySelector(".in-count");
    if (!_inCount) {
      return;
    }
    updateInCount(this._cell.execution_count, _inCount);
  }

  clearCellOutput() {
    const _outBody = this._el.querySelector(".out-body");
    const _outCount = this._el.querySelector(".out-count");
    if (!_outBody || !_outCount) {
      return;
    }
    _outCount.innerHTML = "";
    _outBody.innerHTML = "";
  }

  appendCellOutput(obj) {
    const _outBody = this._el.querySelector(".out-body");
    const _outCount = this._el.querySelector(".out-count");
    if (!_outBody || !_outCount) {
      return;
    }
    renderCellOutput(obj, _outBody, _outCount);
  }

  render() {
    this._editor = renderNotebookCell(this._el, this._cell, this._notebookLanguage, (event) => {
      if (event === "focus") {
        this._parent.focusCell(this);
      } else if (event === "run cell") {
        this._parent.runCell(this);
      } else if (event === "new below") {
        const idx = this._parent.getChildNumber(this);
        this._parent.validateIndex(idx);        
        this._parent.addCell(idx + 1);
      } else {
        throw "unrecognised event";
      }
    }, this._parent._isSingleCell);

  }

  updateCellSource() {
    const code = this.getCode() || [];
    this._cell.source = code;
  }

  getEl() {
    return this._el;
  }

  focus() {
    this._el.classList.add("focus");
  }

  blur() {
    this._el.classList.remove("focus");
  }

  dispose() {
    this._cell = undefined;
    // el.parentNode.removeChild(el)
  }

  getCode() {
    if (this._editor) {
      return stringToLines(this._editor.getValue() || "");
    } else {
      return this._cell.source
    }
  }
  
}

const greyBG = '#F7F7F7';
monaco.editor.defineTheme('grey-bg', {
  base: 'vs',
  inherit: true,
  rules: [{ background: greyBG.slice(1) }],
  colors: {
    'editor.background': greyBG
  }
});

export class AutoBlurMonaco {

  constructor(el, language, value, autoGrow, callback) {
    this._fontSize = 14;
    this.makeStatic(el, language, value);
    this._autoGrow = !!autoGrow;
    this._callback = callback;
  }

  getValue() {
    if (this._value !== undefined) {
      return this._value;
    } else {
      return this._editor.getModel().getValue()
    }
  }

  makeDynamic(el, language, value) {

    this._value = undefined;

    let editor = monaco.editor.create(el, {
      value: value || "",
      language: language,
      fontFamily: "Roboto Mono",
      fontSize: this._fontSize,
      lineHeight: this._fontSize * 1.5,
      theme: "grey-bg",

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

    var KM = monaco.KeyMod;
    var KC = monaco.KeyCode;
    editor.addCommand(KM.chord(KM.Shift | KC.Enter), (e) => {
      if (this._callback) {
        this._callback('run cell');
      }
    });    

    editor.onDidBlurEditorWidget(()=>{
      this.makeStatic(el, language, editor.getModel().getValue());
      editor.dispose();
    });

    if (this._autoGrow) {
      // https://github.com/microsoft/monaco-editor/issues/794
      const updateHeight = () => {
        const rect = el.getBoundingClientRect();
        const contentHeight = Math.min(2000, editor.getContentHeight());
        el.style.width = `${rect.width}px`;
        el.style.height = `${contentHeight}px`;
        editor.layout({
          width: rect.width,
          height: contentHeight
        });
      };
      editor.onDidContentSizeChange(updateHeight);
    }

    this._editor = editor;
    
  }

  makeStatic(el, language, value) {

    // width, height?

    // N.B. need this font loaded before this - otherwise seems to cache wrong value
    this._value = value || "";
    this._editor = undefined;

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
        el2['style']['background'] = greyBG;        
        el2['style']['font-family'] = "Roboto Mono";
        el2['style']['font-size'] = `${this._fontSize}px`;
        el2['style']['line-height'] = `${this._fontSize * 1.5}px`;
        el2['style']['overflow-x'] = 'hidden';
        el2['style']['white-space'] = 'nowrap';

        if (!this._autoGrow) {
          el2['style']['height'] = '100%';
        }
        
        el.appendChild(el2);
      });
    
  }

  dispose() {
  }
  
}

export function stringToLines(str) {
  const lines = (str || "").split("\n")
  return lines.map((v, i) => v + (i < lines.length - 1 ? "\n" : ""));
}

function _convertResponse(obj) {
  let out = {
    output_type: obj.msg_type,
    ...obj.content
  };
  if (typeof out['text'] === "string") {
    out['text'] = stringToLines(out['text']);
  }
  if ('data' in out) {
    ['text/plain', 'application/javascript', 'text/html'].forEach(k => {
      if (k in out['data'] &&
          typeof out['data'][k] === "string") {
        out['data'][k] = stringToLines(out['data'][k]);
      }
    });
  }
  return out;
}

class IncrementalCellRenderer {

  constructor(cell) {
    this._cell = cell;
    this._anyErrors = false;
    this._responses = [];
    this.init();
  }

  init() {
    const c = this._cell.getCell();
    c.outputs = [];
    c.execution_count = '*';
    this._cell.setCell(c);
    this._cell.clearCellOutput();
    this._cell.updateCellCount();
  }

  callback(obj) {
    let anyError = false;
    let errorObj;
    let execCount;

    if (obj.msg_type === "error") {
      anyError = true;
    }

    if (obj.msg_type === "execute_reply" && obj.content) {
      execCount = obj.content.execution_count;
    }

    if (obj.msg_type === "execute_reply" &&
        obj.content && obj.content.status === "error") {
      anyError = true;
      errorObj = obj.content;
    }

    if (anyError) {
      this._anyErrors = true;
    }

    if (errorObj) {
      const cellOutput = {
        traceback: errorObj['traceback'],
        evalue: errorObj['evalue'],
        ename: errorObj['ename'],
        output_type: 'error'
      };
      this._cell.clearCellOutput()
      this._cell.outputs = [cellOutput];
      this._cell.appendCellOutput(cellOutput);
    }

    if (execCount) {
      const c = this._cell.getCell();
      c.execution_count = execCount;
      this._cell.setCell(c);      
      this._cell.updateCellCount();
    }    

    if (this._anyErrors) {
      return;
    }

    if (!anyError) {
      if (["stream", "execute_result", "display_data"].includes(obj.msg_type)) {
        let newObj = _convertResponse(obj);
        const c = this._cell.getCell();
        c.outputs.push(newObj);
        this._cell.setCell(c);
        this._cell.appendCellOutput(newObj);
      }
    }

   
  }

}

export function runCell(cell, kernelHelper) {

  if (!kernelHelper) {
    throw "no kernel to run cell on";
  }

  // save source first
  cell.updateCellSource();
  const code = cell.getCode() || [];
  
  const incRender = new IncrementalCellRenderer(cell);
  
  return kernelHelper.execCodeSimple(code.join(""), incRender.callback.bind(incRender))
    .then((obj) => obj.result)
}

export function renderCellOutput(obj, _outBody, _outCount) {

  let objEl = dom.ce("div");

  if (obj.execution_count) {
    _outCount.innerHTML = `<div class="grey-text">Out&nbsp;[${obj.execution_count || '&nbsp;'}]</div>`;
  }

  if (obj.output_type === "execute_result" || obj.output_type === "display_data") {
    if (!('data' in obj)) {
      throw "expected 'data' key in cell output";
    }
    let text;
    let haveOther = false;

    for (const k in obj['data']) {
      if (k === "text/plain") {
        text = obj['data']['text/plain'].join('');
      } else if (k === "application/javascript") {
        haveOther = true;
        const v = obj['data']['application/javascript'].join('');
        // https://github.com/jupyter/notebook/blob/2ba296039aa70afbfd90630fea14bb8461b40410/notebook/static/notebook/js/outputarea.js
        try {
          eval(v)
        } catch(err) {
          console.warn(err);
          objEl.innerHTML = `<pre><code>${v}</code></pre>`;
        }
      } else if (k === "application/json") {
        haveOther = true;
        const v = JSON.stringify(obj['data']['application/json'], null, 2);
        monaco.editor.colorize(v, "json")
          .then((d) => {
            objEl['style']['white-space'] = 'break-spaces';
            objEl.innerHTML = d;
          });
        
      } else if (k === "text/html") {
        haveOther = true;
        const v = obj['data']['text/html'].join('');
        // TODO: this should have <script> tags escaped, as shuld others
        objEl.innerHTML = v;
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
    if (obj.name === "stderr") {
      objEl['style']['background'] = '#f9dede';
    }
    if (!('text' in obj)) {
      throw "expected 'data' key in cell output";
    }
    objEl['style']['white-space'] = 'break-spaces';
    objEl.innerHTML = ansiSpan(escape(obj['text'].join('')));
  } else if (obj.output_type === "error") {
    objEl['style']['white-space'] = 'break-spaces';
    objEl.innerHTML = ansiSpan(escape(obj.traceback.join("")));
  } else {
    throw `unrecognised cell output type "${obj.output_type}"`;
  }
  dom.ap(_outBody, objEl);
  
}

function updateInCount(value, _inCount) {
  _inCount.querySelector(".grey-text").innerHTML = `In&nbsp;[${value || '&nbsp;'}]`;
}

// TODO: make this able to be incrementally updated
/*

not all these covered at this time

- https://jupyter-client.readthedocs.io/en/stable/messaging.html
- ‘stream’
- ‘display_data’
- ‘update_display_data’
- ‘execute_request’
- ‘execute_input’ - execution_count/in/out, message pairs
- ‘execute_reply’ - execution_count/in/out
- ‘execute_result’
- ‘error’
- ‘status’
- ‘clear_output’
- ‘debug_event’
- ‘input_request’
- ‘input_reply’
- ‘comm_msg’
- ‘comm_close’
- … kernel_info_request kernel_info_reply

 */
export function renderNotebookCell(el, cell, lang, callback, isSingleCell) {
  // TODO: conver the below to multi-line string
  el.innerHTML = "";

  const execCount = cell.execution_count;

  const cont = dom.ce("div");
  const _in = dom.ce("div");
  const _inCount = dom.ce("div");
  const _inCountWrap = dom.ce("div");
  
  const _inBody = dom.ce("div");
  const _out = dom.ce("div");
  const _outCount = dom.ce("div");
  const _outCountWrap = dom.ce("div");

  const _butBelow = dom.ce("div");
  
  const _outBody = dom.ce("div");
  const execCountWidth = 90;

  el['style']['width'] = '100%';
  el['style']['font-family'] = 'Roboto Mono';

  el.classList.add("notebook-cell");

  dom.on(el, "click", () => {
    callback("focus");
  });

  _inCount.classList.add("left-area");
  _outCount.classList.add("left-area");

  // TODO: use stylesheet/class

  [_in, _out].map((el) => {
    el['style']['display'] = 'flex';
    el['style']['flex-direction'] = 'row';
    el['style']['align-items'] = 'stretch';
  });
  [_inCount, _outCount].map((el) => {
    el.style['width'] = `${execCountWidth}px`;
    el.style['text-align'] = `right`;
  });
  [_inBody, _outBody].map((el) => {
    el.style['width'] = `calc(100% - ${execCountWidth}px)`;
    el.style['max-height'] = '300px';
    el.style['overflow-y'] = 'scroll';
  });

  _inCount.innerHTML = `
<div>
   <div class="run-cell cell-action">
     <img src="/static/images/bootstrap-icons/play-fill.svg">
   </div>
</div>
<div class="grey-text"></div>
`;

  updateInCount(execCount, _inCount);

  dom.ap(el, cont);
  
  dom.ap(cont, _in);
  dom.ap(_in, _inCountWrap);
  dom.ap(_inCountWrap, _inCount);
  dom.ap(_in, _inBody);

  _inCount.classList.add("in-count");

  _butBelow.classList.add("insert-btn")
  _butBelow.classList.add("cell-action")
  _butBelow.innerHTML = `<img src="/static/images/bootstrap-icons/plus.svg">`;
  _butBelow.classList.add("insert-below");

  if (isSingleCell === true) {
    _butBelow['style']['display'] = 'none';
  }

  dom.ap(cont, _butBelow);

  dom.on(_butBelow, "click", (e) => {
    callback('new below');
    e.preventDefault();
    e.stopPropagation();
    return false;
  });

  const _runCell = _inCount.querySelector(".run-cell");

  dom.on(_runCell, "click", () => {
    callback('run cell');
  });

  const value = (cell.source || []).join("");
  let editor;

  if (cell.cell_type === "code") {
    editor = new AutoBlurMonaco(_inBody, lang, value, true, callback);
  } else if (cell.cell_type === "markdown") {
    _inCount.style['visibility'] = 'hidden';
    _runCell.style['display'] = 'none';
    _inBody.style['font-family'] = 'Open Sans';
    _inBody.classList.add("rendered_html")
    _inBody.innerHTML = downa.render(value);
  } else {
    throw `unrecognised cell type "${cell.cell_type}"`;
  }

  dom.ap(cont, _out);
  dom.ap(_out, _outCountWrap);
  dom.ap(_outCountWrap, _outCount);
  dom.ap(_out, _outBody);

  _outBody.classList.add("out-body");
  _outCount.classList.add("out-count");  

  if (cell.outputs && cell.outputs.length) {

    cell.outputs.forEach((obj) => {
      renderCellOutput(obj, _outBody, _outCount);
    });

  }
  
  return editor
}
