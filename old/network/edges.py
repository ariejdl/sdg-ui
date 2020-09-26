
import json
from .utils import camel_to_snake, register_edge, create_edge

VALID_META_EDGE_KEYS = ['target_id', 'name']

class Edge(object):

    model = None

    def __init__(self, model):
        self.deserialize(model)

    @classmethod
    def edge_name(cls):
        return camel_to_snake(cls.__name__)

    def __repr__(self):
        return json.dumps({ "type": self.edge_name(), "model": self.model })
    
    def serialize(self, id1_, id2_):
        return {
            'id1': id1_,
            'id2': id2_,
            'type': self.edge_name(),
            'model': dict(self.model.items())
        }

    def deserialize(self, model):

        if model is not None:
            # validate 'meta'
            if model.get('meta') is not None:
                if type(model['meta']) != dict:
                    raise ValueError("meta must be a dictionary")
                for k in model['meta'].keys():
                    if k not in VALID_META_EDGE_KEYS:
                        raise ValueError("meta must have keys among: {}".format(
                            ', '.join(VALID_META_EDGE_KEYS)))
            

        self.model = model
    
    def emit_code(self):
        raise NotImplementedError()

    def library_dependencies(self):
        return []
    

@register_edge
class DefaultEdge(Edge):
    pass

@register_edge
class RESTEdge(Edge):
    pass

@register_edge
class MappingEdge(Edge):
    """
    this is the D3'esque mapping/binding of data to a visual
    """
    pass
