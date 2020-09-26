
// ...what about async,throttling etc.?
// ...interactive UI creation could be accomplished with passing variables through network
//     ... also individual node resolution/creation from client -> server -> client, i.e. not whole network
// ... recipes are similar to this ...

const maxRecursion = 50;
let _networkInvocationId = 0;
let _nodeDepencies = {};
let _networkInvocations = {};
let _nodeRegistry = {}
let _domLoadCallbacks = [];

document.addEventListener("DOMContentLoaded", function() {
  for (let i = 0; i < _domLoadCallbacks.length; i++) {
    _domLoadCallbacks[i]();
  }
});

function invokeNode(nodeId, force) {
  // need args/deps and invocation id
  let name = `node_${nodeId}`;
  if (name in _nodeRegistry) {
    _nodeRegistry[name].invoke(++_networkInvocationId, force);
  } else {
    throw `node ${name} not found`;
  }
}

function updateAndCheckCalls(_networkInvocationId, callable) {
  // check excessive recursion
  let current = _networkInvocations[_networkInvocationId];
  if (current === undefined) {
    let obj = { _time: Date.now() };
    _networkInvocations[callable] = obj;
    obj[callable] = 1;
    return false;
  }

  if ((current._time + 1000) > Date.now()) {
    // reset after one second
    let obj = { _time: Date.now() };
    _networkInvocations[callable] = obj;
    obj[callable] = 1;
    return false;
  } else {
    const count = current[callable];
    current['_time'] = Date.now();
    if (count === undefined) {
      // have not seen this node
      current[callable] = 1;
      return false;
    } else if (count > maxRecursion) {
      // too much recursion
      throw "Too much recursion";
      return true;
    } else {
      // increment call count
      current[callable] = count + 1;
    }
  }

  return false;
}

// https://github.com/getify/TNG-Hooks
// NOTE: both `guards1` and `guards2` are either
//    `undefined` or an array
function guardsChanged(guards1,guards2) {
  // either guards list not set?
  if (guards1 === undefined || guards2 === undefined) {
    // force assumption of change in guards
    return true;
  }

  // guards lists of different length?
  if (guards1.length !== guards2.length) {
    // guards changed
    return true;
  }

  // check guards lists for differences
  //    (only shallow value comparisons)
  for (let [idx,guard] of guards1.entries()) {
    if (!Object.is(guard,guards2[idx])) {
      // guards changed
      return true;
    }
  }

  // assume no change in guards
  return false;
}


function allowCallAndChanged(prev, current) {
  return guardsChanged(prev, current);
}


function arrayNoNulls(arr) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === null || arr[i] === undefined) {
      return false;
    }
  }
  return true;
}

class Node {

  constructor(nodeId,
              dependencies,
              dependents,
              dependentsAllowNulls,
              dependentArgs,
              initBody,
              invokeFn) {

    this.callableId = `node_${nodeId}`;
    this.dependencies = dependencies;
    this.invokeFn = invokeFn;

    this.dependents = dependents;
    this.dependentsAllowNulls = dependentsAllowNulls;
    this.dependentArgs = dependentArgs;
    
    initBody.call(this);

    _nodeRegistry[this.callableId] = this;
  }

  setData(data) {
    this.data = data;
  }

  invoke(networkInvocationId, force) {

    //console.log('start invoke ' + this.callableId);

    if (updateAndCheckCalls(networkInvocationId, this.callableId)) {
      // in case there is too much recursion
      return;
    }

    const updatedDependencies = this.dependencies().slice()
    if (force === true || allowCallAndChanged(_nodeDepencies[this.callableId], updatedDependencies)) {
      _nodeDepencies[this.callableId] = updatedDependencies;

      console.log('invoke body ' + this.callableId);
      //debugger;

      // update
      this.invokeFn(...updatedDependencies);

      // update downstream nodes
      const dependents = this.dependents();
      const dependentArgs = this.dependentArgs()
      
      for (let i = 0; i < dependents.length; i++) {
        if (this.dependentsAllowNulls[i] || arrayNoNulls(dependentArgs[i])) {
          const res = dependents[i].invoke(networkInvocationId);
          // if (isPromise) {{ res.then( fn ); }}
        }
      }
    }
  }
}
