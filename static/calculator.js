
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

  evalNode(id, isManual) {
    this._stopped = false;
    this._evalNode(id, ++this._currentEvalIncrement, isManual);
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

  _evalNode(id, evalId, isManual) {

    if (this.guardCheck(evalId)) {
      return;
    }
    
    // throw exception if not found
    const n = this._cy.$(id)
    if (n.length !== 1) {
      throw `${id} not found`;
    }

    const data = n.data();
    const isAutoNode = (data['run_auto'] || 'auto') === 'auto';

    // check if auto/manual/undefined, and evaluation/invocation if manual    
    if (!isAutoNode && !isManual) {
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

    const predecessors = n.predecessors().filter(o => o.isNode());

    // may want to time evaluation, and use a promise here after finishes
    const start = Date.now();

    const ret = scratchNode.node.invoke(n, data, predecessors, evalId, isManual);

    if (ret === undefined) {
      return;
    }

    ret.then((res) => {

      const end = Date.now();
      const duration = end - start;

      const n = this._cy.$(id)
      const outgoers = n.outgoers().filter(o => o.isNode());

      outgoers.forEach((obj) => {
        const id = obj.data()["id"];
        this._evalNode("#" + id, evalId, isManual);
      });
      
    }).catch((err) => {
      throw err
    });
    
  }
  
}
