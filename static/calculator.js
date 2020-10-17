
/**
 * like excel, with a few differences

- ‘automatic’ or ‘manual’ node, automatic update every time, manual updated trigger a cascade when updated, similar to excel function vs. excel macro;
- allow cycle, max repeat of throttle; time executions, make manual if slow...assumption is that it behaves like excel

*/

const invokeNode = (data, successors) => {

  return new Promise((resolve, reject) => {
    console.log(data.kind)
    resolve();
  });

  if (data.kind === "grid") {
  } else if (data.kind === "tree") {
    
  }
  
}

export class Calculator {

  constructor(cy) {
    this._cy = cy;
    this._evalIncrement = 1;
  }

  evalNode(id) {
    // - throw exception if not found
    const n = this._cy.$(id)
    if (n.length !== 1) {
      throw `${id} not found`;
    }

    const data = n.data();

    // TODO: check recursion in scratch
    const scratch = n.scratch("_exec") || {};
    scratch.recursion = scratch.recursion || 0;
    
    console.log('eval', id)
    console.log('scratch', scratch)

    // - don't check for cycles, but do track execution of nodes...
    
    // - create a variable 'evaluation-id', to track spread of evaluation

    // - use node scratch as an object for eval count if allows recursion

    // - TODO: make this work cell by cell for a notebook, which is like a sequence of nodes
    // .... e.g. emit custom events/invocations per cell,
    // thus decompose a notebook into a chain of promises with sideffects
    // -> ? getInvokationFunction() ...
    // ... remember this may be interrupted too
    // ... remember it's probably best to stop notebooks creating invocation loops of themselves

    // 1) get outward

    const successors = n.successors().filter(o => o.isNode());

    // may want to time execution, and use a promise here after finishes
    const start = Date.now();
    //n.trigger('update')

    const ret = invokeNode(data, successors);

    if (ret === undefined) {
      return;
    }

    ret.then((res) => {

      const end = Date.now();
      const duration = end - start;

      const n = this._cy.$(id)
      const outgoers = n.outgoers().filter(o => o.isNode());

      outgoers.forEach((obj) => {
        console.log(obj)
        const id = obj.data()["id"];
        //this.evalNode("#" + id);
      });

      
    }).catch((err) => {
      throw err
    });

    
  }
  
}
