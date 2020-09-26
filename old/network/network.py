
import shutil
import networkx as nx

from .build_network import build_network
from .utils import edge_key, create_node, create_edge
from .nodes import Node
from .edges import Edge

class Network(object):
    """
    a graph/network of node types, does not need to be a connected network
    """

    build_dir = None

    def __init__(self, model=None):
        if model is not None:
            self.deserialize(model)
        else:
            # not a directed graph
            self.G = nx.Graph()
            self.nodes = {}
            self.edges = {}

    def dispose(self):
        if self.build_dir is not None:
            shutil.rmtree(self.build_dir)

    def genid(self):
        if len(self.G.nodes):
            return max(self.G.nodes) + 1
        else:
            return 1

    def nodes_for_root_id(self, root_id):
        for n in self.nodes.values():
            if n.model['meta']['root_id'] == root_id:
                yield n

    def add_node(self, id=None, node=None, model=None, type=None):
        if id is None:
            id = self.genid()

        if id in self.nodes or id in self.G.nodes:
            raise Exception('node already in network')
        self.G.add_node(id)

        if node is not None:
            if not isinstance(node, Node):
                raise ValueError('invalid type of node: {}'.format(node))
            self.nodes[id] = node
        else:
            self.nodes[id] = create_node(model=model, type=type)
        
        return id

    def add_edge(self, id1=None, id2=None, edge=None, model=None, type=None):
        if id1 is None:
            id1 = self.genid()
        if id2 is None:
            id2 = self.genid()

        if id1 not in self.G.nodes or id2 not in self.G.nodes:
            raise Exception('edge\'s nodes not found in network')
        
        key = edge_key(id1, id2)

        if key in self.edges or key in self.G.edges:
            raise Exception('edge already in network')
        self.G.add_edge(*key)

        if edge is not None:
            if not isinstance(edge, Edge):
                raise ValueError('invalid type of edge: {}'.format(node))
            self.edges[key] = edge
        else:
            self.edges[key] = create_edge(
                model=model, type=type)

        return key
            

    def remove_node(self, id):
        if id not in self.nodes or id not in self.G.nodes:
            raise Exception('node not found')
        for e in list(self.G.edges(id)):
            self.remove_edge(*e)
        del self.nodes[id]
        self.G.remove_node(id)

    def remove_edge(self, id1, id2):
        key = edge_key(id1, id2)
        if key not in self.edges or key not in self.G.edges:
            raise Exception('edge not found')
        self.G.remove_edge(*key)
        del self.edges[key]

    def update_node(self, id, model):
        current = self.nodes[id]
        current.deserialize(model)

    def update_edge(self, id1, id2, model):
        if id1 not in self.G.nodes or id2 not in self.G.nodes:
            raise Exception('edge\'s nodes not found in network')
        
        key = edge_key(id1, id2)
        current = self.edges[key]
        current.deserialize(model)
        
    def deserialize(self, model):
        self.G = nx.Graph()
        self.nodes = {}
        self.edges = {}

        for node in model['nodes']:
            self.add_node(**node)

        for edge in model['edges']:
            self.add_edge(**edge)
            
        self.nodes = dict([(node['id'], create_node(
            node['model'], type=node['type'])) for node in model['nodes']])
        self.edges = dict([(edge_key(edge['id1'], edge['id2']),
                            create_edge(edge['model'], type=edge['type']))
                           for edge in model['edges']])

    def serialize(self):
        return {
            'nodes': [node.serialize(id) for (id, node) in self.nodes.items()],
            'edges': [edge.serialize(*key) for (key, edge) in self.edges.items()]
        }

    def validate(self):
        """
        validate the entire network,
        including if all edges can be implemented given node types, they may be incompatible
        """
        raise NotImplementedError()

class NetworkManager(object):
    """
    currently open "network" files
    """

    def __init__(self, networks=[]):
        self.networks = dict([
            (n['path'], Network(n['network'])) for n in networks])

    def get(self, path):
        return self.networks[path]

    def create(self, path):
        if path in self.networks:
            raise Exception('path already in use')
        n = Network()
        self.networks[path] = n
        return n

    def delete(self, path):
        n = self.networks[path]
        n.dispose()
        del self.networks[path]


