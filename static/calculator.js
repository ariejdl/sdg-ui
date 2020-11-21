
/**
 * like excel, with a few differences

- ‘automatic’ or ‘manual’ node, automatic update every time, manual updated trigger a cascade when updated, similar to excel function vs. excel macro;
- allow cycle, max repeat of throttle; time evaluations, make manual if slow...assumption is that it behaves like excel

*/

const MAX_RECURSION = 10;

export class Calculator {

  constructor(cy) {
    this._cy = cy;
    this._currentEvalIncrement = 1;
    this._stopped = false;
  }

  evalNode(id, isForced, isManual) {
    this._stopped = false;
    this._evalNode(id, ++this._currentEvalIncrement, isForced, isManual);
  }

  stop() {
    this._stopped = true;
  }

  guardCheck(evalId) {
    
    if (this._stopped) {
      return true;
    }

    if (evalId !== this._currentEvalIncrement) {
      // stop, no further computation, only one calculation at a time
      return true;
    }
    
    return false
  }

  _evalNode(id, evalId, _isForced, isManual) {

    const isForced = _isForced || isManual;

    if (this.guardCheck(evalId)) {
      return;
    }
    
    // throw exception if not found
    const n = this._cy.$(id);
    if (n.length !== 1) {
      throw `${id} not found`;
    }

    const data = n.data();
    const isAutoNode = (data['run_auto'] || 'auto') === 'auto';

    // check if auto/manual/undefined, and evaluation/invocation if manual    
    if (!isAutoNode && !isForced) {
      console.log('manual node not evaluated as evaluation is auto')
      return;
    }

    // don't check for cycles, but do track evaluation of nodes
    const scratchEval = n.scratch("eval") || {};
    const scratchNode = n.scratch("node") || {};
    
    scratchEval['call_count'] = (scratchEval['call_count'] || 0) + 1;
    n.scratch("eval", scratchEval)

    if (scratchEval['call_count'] > MAX_RECURSION) {
      console.warn(`maximum recursion reached for ${id}, stopping`)
      return;
    }
    
    console.log('eval', id)

    // 1) get outward

    const incomers = n.incomers().filter(o => o.isNode());

    // may want to time evaluation, and use a promise here after finishes
    const start = Date.now();
    let ret;
    let success = false;

    try {
      ret = scratchNode.node.invoke(n, data, incomers, evalId, isForced);
      success = true;
    } catch (e) {
      console.error("error during node invocation: " + e);
      throw e;
    }

    if (!success) {
      return;
    }

    (ret || Promise.resolve()).then((res) => {

      console.log('ret:', res);

      const end = Date.now();
      const duration = end - start;

      const n = this._cy.$(id);

      const scratchEval = n.scratch("eval") || {};
      scratchEval['last_return_value'] = res;
      n.scratch("eval", scratchEval);
      
      const outgoers = n.outgoers().filter(o => o.isNode());

      outgoers.forEach((obj) => {
        const id = obj.data()["id"];
        this._evalNode("#" + id, evalId, isForced);
      });
      
    }).catch((e) => {
      console.error("error during node invocation: " + e);
      throw e
    });
    
  }
  
}
