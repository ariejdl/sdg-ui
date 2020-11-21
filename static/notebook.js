
import { dom } from "./utils.js";
import { escape, ansiSpan } from "./ansi.js";

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

  constructor(el, language, value, autoGrow) {
    this._fontSize = 14;
    this.makeStatic(el, language, value);
    this._autoGrow = !!autoGrow;
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

export function runCell(cell, kernelHelper) {

  if (!kernelHelper) {
    throw "no kernel to run cell on";
  }
  
  // - update UI e.g. In[*]
  // - return this._currentKernelHelper.execCodeSimple();
  // - update output, cell config
  // - watch for exceptions
  const code = (cell.cell.source || []).join("");
  return kernelHelper.execCodeSimple(code)
    .then((res) => {

      const responses = res.responses || [];
      let newOutputs = [];

      let anyErrors = false;
      let errorObj;
      let inExecCount = undefined;
      
      for (var i = 0; i < responses.length; i++) {
        const obj = responses[i];
        if (obj.msg_type === "error") {
          anyErrors = true;
        } else if (obj.msg_type === "execute_reply" &&
                   obj.content && obj.content.status === "error") {
          anyErrors = true;
          errorObj = obj.content;
        } else if (obj.msg_type === "execute_input" &&
                   obj.content) {
          inExecCount = obj.content.execution_count;
        }
      }

      if (anyErrors) {
        newOutputs = [{
          traceback: errorObj['traceback'],
          evalue: errorObj['evalue'],
          ename: errorObj['ename'],
          output_type: 'error'
        }];
      } else {
        newOutputs = responses
          .filter((res) => ["stream", "execute_result"].includes(res.msg_type))
          .map((obj) => {
            let out = {
              output_type: obj.msg_type,
              ...obj.content
            };
            if (typeof out['text'] === "string") {
              out['text'] = stringToLines(out['text']);
            }
            if ('data' in out &&
                'text/plain' in out['data'] &&
                typeof out['data']['text/plain'] === "string") {
              out['data']['text/plain'] = stringToLines(out['data']['text/plain']);
            }
            return out;
          });
      }

      cell.cell.execution_count = inExecCount;
      cell.cell.outputs = newOutputs;
      
      return;
    });
}

// TODO: make this able to be incrementally updated
export function renderNotebookCell(el, cell, lang, callback) {
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
  });

  _inCount.innerHTML = `
<div>
   <div class="run-cell cell-action">
     <img src="/static/images/bootstrap-icons/play-fill.svg">
   </div>
</div>
<div class="grey-text">In&nbsp;[${execCount || '&nbsp;'}]</div>
`;

  dom.ap(el, cont);
  
  dom.ap(cont, _in);
  dom.ap(_in, _inCountWrap);
  dom.ap(_inCountWrap, _inCount);
  dom.ap(_in, _inBody);

  _butBelow.classList.add("insert-btn")
  _butBelow.classList.add("cell-action")
  _butBelow.innerHTML = `<img src="/static/images/bootstrap-icons/plus.svg">`;
  _butBelow.classList.add("insert-below");

  dom.ap(cont, _butBelow);

  dom.on(_butBelow, "click", (e) => {
    callback('new below');
    e.preventDefault();
    e.stopPropagation();
    return false;
  });

  dom.on(_inCount.querySelector(".run-cell"), "click", () => {
    callback('run cell')
  });

  const value = (cell.source || []).join("");
  let editor;

  if (cell.cell_type === "code") {
    editor = new AutoBlurMonaco(_inBody, lang, value, true);
  } else if (cell.cell_type === "markdown") {
    _inBody.style['font-family'] = 'Open Sans';
    _inBody.classList.add("rendered_html")
    _inBody.innerHTML = downa.render(value);
  } else {
    throw `unrecognised cell type "${cell.cell_type}"`;
  }

  if (cell.outputs && cell.outputs.length) {

    dom.ap(cont, _out);
    dom.ap(_out, _outCountWrap);
    dom.ap(_outCountWrap, _outCount);
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
        let text;
        let haveOther = false;

        for (const k in obj['data']) {
          if (k === "text/plain") {
            text = obj['data']['text/plain'].join('');
          } else if (k === "application/javascript") {
            haveOther = true;
            const v = obj['data']['application/javascript'].join('');
            objEl.innerHTML = `<pre><code>${v}</code></pre>`;
          } else if (k === "application/json") {
            haveOther = true;
            const v = JSON.stringify(obj['data']['application/json']);

            monaco.editor.colorize(value, "json")
              .then((d) => {
                objEl.innerHTML = d;
              });
            
          } else if (k === "text/html") {
            haveOther = true;
            const v = obj['data']['text/html'].join('');
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
      
    });

    _outCount.innerHTML = `<div class="grey-text">Out&nbsp;[${outExecCount || '&nbsp;'}]</div>`;
  }

  
  return editor
}
