
/**
 * like excel, with a few differences

- ‘automatic’ or ‘manual’ node, automatic update every time, manual updated trigger a cascade when updated, similar to excel function vs. excel macro;
- allow cycle, max repeat of throttle; time evaluations, make manual if slow...assumption is that it behaves like excel

*/

const MAX_RECURSION = 10;

const invokeNode = (data, successors) => {


  if (data.kind === "notebook") {
    // execute each cell
  } else if (data.kind === "grid") {
  } else if (data.kind === "tree") {
    
  }

  return new Promise((resolve, reject) => {
    console.log('invoke: ' + data.kind)
    resolve();
  });  
  
}

export class Calculator {

  constructor(cy) {
    this._cy = cy;
    this._currentEvalIncrement = 1;
  }

  evalNode(id, isManual) {
    this._evalNode(id, ++this._currentEvalIncrement, isManual);
  }

  _evalNode(id, evalId, isManual) {

    if (evalId !== this._currentEvalIncrement) {
      // stop, no further computation, only one calculation at a time
      console.warn(`only one computation allowed at a time, stopping: ${this._currentEvalIncrement}`)
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
    const scratch = n.scratch("_eval") || {};
    scratch['call_count'] = (scratch['call_count'] || 0) + 1;
    n.scratch("_eval", scratch)

    if (scratch['call_count'] > MAX_RECURSION) {
      console.warn(`maximum recursion reached for ${id}, stopping`)
      return;
    }
    
    console.log('eval', id)
    
    // - create a variable 'evaluation-id', to track spread of evaluation

    // - use node scratch as an object for eval count if allows recursion

    // - TODO: make this work cell by cell for a notebook, which is like a sequence of nodes
    // .... e.g. emit custom events/invocations per cell,
    // thus decompose a notebook into a chain of promises with sideffects
    // -> ? getInvokationFunction() ...
    // ... remember: this may be interrupted too
    // ... remember: it's probably best to stop notebooks creating invocation loops of themselves

    // 1) get outward

    const successors = n.successors().filter(o => o.isNode());

    // may want to time evaluation, and use a promise here after finishes
    const start = Date.now();

    const ret = invokeNode(data, successors, evalId);

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
