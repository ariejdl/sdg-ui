
import re

_nodes = {}
_edges = {}

def register_node(cls):
    nn = cls.node_name()
    if nn in _nodes:
        raise Exception('class name already seen: {}'.format(nn))
    _nodes[nn] = cls
    return cls

def create_node(model, type=None):
    """
    factory for nodes, this is how deserialization is done
    """
    C = _nodes.get(type)
    if C is None:
        raise Exception('invalid "type" specified: {}'.format(type))
    return C(model)

def register_edge(cls):
    _edges[cls.edge_name()] = cls    
    return cls

def create_edge(model, type=None):
    C = _edges.get(type)
    if type is not None and C is None:
        raise Exception('invalid edge type given: {}'.format(type))
    if C is None:
        C = _edges['default_edge']
    return C(model)

# https://stackoverflow.com/questions/1175208
def camel_to_snake(name):
  name = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
  return re.sub('([a-z0-9])([A-Z])', r'\1_\2', name).lower().replace('__', '_')

class NetworkBuildException(Exception):
  node_id = None
  
  def __init__(self, msg, node_id=None):
    super().__init__(msg)
    self.node_id = node_id

edge_key = lambda id1, id2: tuple(sorted([id1, id2]))

def get_neighbours(nid, network):
    neighbours = []
            
    for node_id in network.G.neighbors(nid):
        key = edge_key(nid, node_id)
        neighbours.append((node_id, network.nodes[node_id], network.edges[key]))

    return neighbours
    
