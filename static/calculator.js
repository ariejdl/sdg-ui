
/**
 * like excel, with a few differences

- ‘automatic’ or ‘manual’ node, automatic update every time, manual updated trigger a cascade when updated, similar to excel function vs. excel macro;
- allow cycle, max repeat of throttle; time evaluations, make manual if slow...assumption is that it behaves like excel

*/

const MAX_RECURSION = 10;

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
const invokeNode = (calculator, node, data, predecessors, evalId, isManual) => {

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

    const servers = predecessors
          .map(o => o.data())
          .filter(o => o["kind"] === "server");

    if (servers.length !== 1) {
      console.warn("need server to use kernel, terminal, or filesystem")
      return;
    }

    const host = (servers[0].data || {}).host;
    if (!host || !host.length) {
      console.warn("no host on server")
      return;
    }

    // probably need stateful connection based on this now
    // if different URL then can close and create a new one
    const scratch = node.scratch('_state') || {};
    
    console.log('*', host, scratch)

    if (data.kind === "kernel") {

    } else if (data.kind === "terminal") {
      
    } else if (data.kind === "filesystem") {
      
    }
    
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
    const scratch = n.scratch("_eval") || {};
    scratch['call_count'] = (scratch['call_count'] || 0) + 1;
    n.scratch("_eval", scratch)

    if (scratch['call_count'] > MAX_RECURSION) {
      console.warn(`maximum recursion reached for ${id}, stopping`)
      return;
    }
    
    console.log('eval', id)

    // 1) get outward

    const predecessors = n.predecessors().filter(o => o.isNode());

    // may want to time evaluation, and use a promise here after finishes
    const start = Date.now();

    const ret = invokeNode(this, n, data, predecessors, evalId, isManual);

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
