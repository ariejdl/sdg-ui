
import os
import json
from shutil import copyfile
from functools import lru_cache

from .utils import (camel_to_snake, register_node,
                    create_node, create_edge, NetworkBuildException,
                    get_neighbours)
from .edges import MappingEdge
import types

class WEB_TEMPLATES(object):
    ui_header = open(os.path.join(os.path.dirname(__file__), 'js/ui_header.js')).read()
    ui_node = open(os.path.join(os.path.dirname(__file__), 'js/ui_node.js')).read()

    @classmethod
    @lru_cache(maxsize=1)
    def ui_d3(cls):
        return open(os.path.join(os.path.dirname(__file__), 'js/d3.v5.min.js')).read()

    @classmethod
    @lru_cache(maxsize=1)
    def ui_reset_css(cls):
        return open(os.path.join(os.path.dirname(__file__), 'css/reset.css')).read()
    
def test_neighbours(neighbours, tests):
    out = {}
    for nid, n, e in neighbours:
        for key, test in tests.items():
            if test(n,e) == True:
                out.setdefault(key, [])
                out[key].append(n)
    return out

def get_args(upstream):
    args, errors = [], []
    
    for nid, n, e in upstream:
        arg_name = e.model['meta'].get('name')
        if arg_name is not None:
            if not arg_name.startswith('$'):
                errors.append(NetworkBuildException("edge name should begin with $", node_id))
                continue
            args.append(arg_name)
        
    return args, errors

def get_upstream_downstream(node_id, neighbours):
    upstream, downstream = [], []

    for nid, n, e in neighbours:
        if e.model is not None:
            t_id = e.model.get('meta', {}).get('target_id')
            if t_id is not None:
                if t_id == node_id:
                    upstream.append((nid, n, e))
                elif t_id == nid:
                    downstream.append((nid, n, e))
                else:
                    raise Exception('passed node/edge is not a neighbour')

    return upstream, downstream



class MIME_TYPES(object):
    HTML = 'text/html'
    JS = 'text/javascript'

class Code():
    language = None # required
    file_name = None # anon
    content = None
    node_id = None
    emitted = None
    
    def __init__(self, **kwargs):
        self.language = kwargs.get('language')
        self.file_name = kwargs.get('file_name')
        self.content = kwargs.get('content')
        self.emitted = kwargs.get('emitted') == True
        self.node_id = kwargs['node_id']

    def __repr__(self):
        obj = {}
        for k in ['language', 'file_name', 'node_id', 'emitted']:
            obj[k] = getattr(self, k)
        return json.dumps(obj)

# TODO: probably much simpler to set errors on node itself, rather than pass arguments
# ... clear with init() and finish() on object to collect at end
    
class Node(object):
    """
    note that nodes will have different characteristics when "static" versus when "running", i.e. after
    code has been emitted and has started execution, rather than before code has even been emitted
    """

    # TODO: need to use this for validations otherwise it is unused code
    expected_model = {}
    default_model = {}
    model = {}
    language = None

    # indicates scale from variable -> module/program
    size = 0

    # other nodes which are created by this one if not in a part of its network
    required_nodes = []

    # other nodes which cannot be part of its compilation/code-emission without some kind of separation
    node_mutual_exclusions = []

    # language libraries
    library_dependencies = []

    def __init__(self, model):
        self.deserialize(model)

    def __repr__(self):
        rep = self.serialize(None)
        del rep['id']
        return json.dumps(rep)

    @classmethod
    def node_name(cls):
        return camel_to_snake(cls.__name__)

    def serialize(self, id_):
        return {
            'id': id_,
            'type': self.node_name(),
            'model': dict(self.model.items())
        }

    def deserialize(self, model):
        if type(model) is dict:
            final_model = {}
            for k, v in model.items():
                final_model[k] = v
                if k not in self.expected_model:
                    # warning
                    pass
            for k, v in self.default_model.items():
                if final_model.get(k) is None:
                    final_model[k] = v
                    
            self.model = final_model
        else:
            self.model = None
    
    def get_implicit_nodes_and_edges(self, node_id, neighbours):
        return [], []

    def prepare_network(self, node_id, network):
        return [], []

    def emit_code(self, node_id, network):
        return [], []
    

class PyNode(Node):
    language = 'python3'

class JSNode(Node):
    language = 'javascript'

    expected_model = {
        'allow_null_activation': bool
    }

    def make_init_body(self, node_id):
        # noop
        return ''

    def make_body(self, node_id):
        # noop
        return ''

    def emit_code(self, node_id, network):
        out, errors = super().emit_code(node_id, network)
        
        neighbours = get_neighbours(node_id, network)
        upstream, downstream = get_upstream_downstream(node_id, neighbours)

        for nid, n, e in neighbours:
            language = n.language
            if language != self.language:

                if isinstance(n, RESTNode):
                    # TODO: implement API call
                    pass

                if isinstance(n, FileNode):
                    if n.model.get('path') is None:
                        continue

                    server = network.nodes[n.model['meta']['root_id']]

                    if not isinstance(server, WebServerNode):
                        errors.append(NetworkBuildError(
                            "expected webserver node to request asset, found: {}"
                            .format(type(server)), node_id))
                        continue

                    fpath = n.emit_path if n.emit_path is not None else n.model['path']
                    path, errs = server.get_static_route(node_id, fpath)
                    errors += errs

                    if path.endswith('.csv'):
                        content = """
                        d3.csv("{uri}")
                        .then({callback})
                        .catch({exception})
                        """
                    else:
                        content = """
                        fetch("{uri}")
                        .then(d => d.json())
                        .then({callback})
                        .catch({exception})
                        """

                    callback = """
                    (data) => {{
                       node_{sym}.data = data;
                       invokeNode({sym});
                    }}
                    """.format(sym=node_id)

                    exception = """
                    (e) => {{ throw e }}
                    """
                    
                    out.append(Code(
                        node_id=nid,
                        language=self.language,
                        file_name=None,
                        content=content.format(
                            uri=path,
                            callback=callback,
                            exception=exception
                        )
                    ))


        template_args = {
            'sym': node_id, # the unique node id
            'initBody': self.make_init_body(node_id), # optional initialisation of content, defaults to null
            'namedArgs': [], # named arguments passed through edge model's 'names'
            'body': self.make_body(node_id), # the body of this node

            'dependencies': [], # upstream symbols of node
            'dependents': [], # downstream symbols of node
            'dependentAllowNulls': [], # downstream symbols that can be activated with null values
            'dependentArgs': [] # the arguments supplied to a dependent
        }
        
        args, errs = get_args(upstream)
        errors += errs

        upstream_args = sorted(zip(upstream, args), key=lambda v: v[1])

        for (nid, n, e), arg in upstream_args:
            template_args['dependencies'].append('node_{sym}.data'.format(sym=nid))

        for nid, n, e in downstream:
            template_args['dependents'].append('node_{sym}'.format(sym=nid))
            template_args['dependentAllowNulls'].append(
                'true' if n.model.get('allow_null_activation') == True else 'false')

            upstream_, _ = get_upstream_downstream(nid, get_neighbours(nid, network))
            dep_args, errs = get_args(upstream_)
            if len(errs) == 0:
                # sort by name, then get node ids
                sorted_args = sorted(zip(dep_args, upstream_), key=lambda v: v[0])
                fn_args = ['node_{sym}.data'.format(sym=v[1][0]) for v in sorted_args]
                dep_args_str = '[{}]'.format(', '.join(fn_args))
                template_args['dependentArgs'].append(dep_args_str)
            else:
                errors.append(NetworkBuildError("dependent has invalid arguments", node_id))

        template_args['namedArgs'] = ', '.join([arg for u, arg in upstream_args])

        # convert list to string
        for k,v in template_args.items():
            if type(v) is list:
                template_args[k] = ', '.join(template_args[k])

        out.append(Code(
            node_id=node_id,
            language=self.language,
            file_name=None,
            content=WEB_TEMPLATES.ui_node.format(**template_args)
        ))
        
        return out, errors
    

class MappingNode(JSNode):
    """
    this is the D3'esque mapping/binding of data to a visual
    """
    size = 1

@register_node
class MappingScalarNode(MappingNode):
    pass

@register_node
class MappingCoordinateSystemNode(MappingNode):
    pass

@register_node
class MappingNetworkNode(MappingNode):
    pass

@register_node
class MappingTableNode(MappingNode):

    def emit_code(self, node_id, network):
        out, errors = super().emit_code(node_id, network)

        # TODO: make a table
        
        return out, errors

@register_node
class MappingLookupNode(MappingNode):

    expected_model = {
        'lookup': dict,
        'is_static': bool
    }

    def make_body(self, node_id):
        if self.model.get('is_static') != True:
            return self._make_body(node_id)
        else:
            return super().make_body(node_id)

    def make_init_body(self, node_id):
        if self.model.get('is_static') == True:
            return self._make_body(node_id)
        else:
            return super().make_init_body(node_id)
        
    def _make_body(self, node_id):
        parts = []

        for k, v in self.model.get('lookup', {}).items():
            if type(v) not in (str, int, float):
                error.append(NetworkBuildException(
                    'invalid type for lookup item: {}'.format(type(v)), node_id))
                continue
            parts.append('{}: {}'.format(k, v))

        return """this.data = {{
              {}
            }}""".format(',\n'.join(parts))



@register_node
class MappingTreeNode(MappingNode):
    pass

@register_node
class MappingListNode(MappingNode):
    pass

@register_node
class GeneralServerNode(Node):
    size = 4

class WebServerNode(Node):
    size = 3

    # note this may come from config file node
    expected_model = {
        'launch_directory': str,
        'static_directory': str,
        'static_path': str,
        'port': int
    }

    default_model = {
        'static_directory': 'static',
        'static_path': 'static'
    }

    def get_static_route(self, node_id, asset):
        raise NotImplementedError()

@register_node
class NginxServerNode(WebServerNode):
    expected_model = {
        'port': int,
        'config': str
    }

@register_node
class StaticServerNode(WebServerNode):
    def emit_code(self, node_id, network):
        return super().emit_code(node_id, network)

@register_node
class PyStaticServerNode(PyNode, StaticServerNode):

    default_model = {
        'static_directory': '',
        'static_path': ''
    }

    def _get_launch_dir(self, node_id):
        launch_dir = self.model.get('launch_directory')
        if launch_dir is None:
            return None, [NetworkBuildException('no launch directory specified', node_id)]
        if not os.path.isabs(launch_dir):
            return None, [NetworkBuildException('launch directory must be an absolute path', node_id)]
        return launch_dir, []

    def asset_in_server(self, asset):
        launch_dir, _ = self._get_launch_dir(None)
        if launch_dir is None:
            return None
        if not os.path.abspath(asset):
            return None
        rel_path = os.path.relpath(os.path.dirname(asset), launch_dir)
        return not rel_path.startswith('..')

    def get_static_path(self, node_id, asset):
        is_relative = not os.path.isabs(asset)
        launch_dir, errors = self._get_launch_dir(node_id)

        if is_relative:
            return os.path.join(launch_dir,
                                self.model['static_directory'],
                                asset.replace(os.sep, '/')), []

        abs_asset = os.path.abspath(os.path.join(self.model['static_directory'], asset))
        rel_path = os.path.relpath(os.path.dirname(abs_asset), launch_dir)
        if rel_path.startswith('..'):
            return None, [NetworkBuildException(
                'asset outside of static server launch directory', node_id)]

        return abs_asset, []

    def get_static_route(self, node_id, asset):
        if asset is None:
            return None, [NetworkBuildException('no asset specified', node_id=node_id)]

        launch_dir, errors = self._get_launch_dir(node_id)
        if launch_dir is None:
            return None, errors

        if os.path.isabs(asset):
            rel_path = os.path.relpath(os.path.dirname(asset), launch_dir)
            if rel_path.startswith('..'):
                return None, [NetworkBuildException(
                    'asset outside of static server launch directory', node_id)]
            else:
                _, file_name = os.path.split(asset)
                asset = os.path.join(rel_path.replace(os.sep, '/'), file_name)

        # this is a relative path
        return '{}'.format(
            os.path.join(self.model['static_path'],
                         asset).replace(os.sep, '/')).lstrip('./'), []

@register_node
class GeneralClientNode(Node):
    size = 4

@register_node
class JSClientNode(GeneralClientNode):
    size = 3

    default_html_path = 'index.html'
    default_js_path = 'main.js'

    expected_model = {
        'html_uri': str,
        'js_uris': list
    }

    def test_neighbours(self, neighbours):
        return test_neighbours(neighbours,
                       { 'server': lambda n, e: isinstance(n, WebServerNode),
                         'html': lambda n,e: isinstance(n, HTML_Page_Node),
                         'js': lambda n,e: (isinstance(n, FileNode) and
                                            n.model.get('mime_type') == MIME_TYPES.JS) })
        
    def _get_server(self, ns, node_id):
        errors = []
        server_count = len(ns.get('server', []))
        server = None

        if server_count == 1:
            server = ns['server'][0]
        elif server_count > 1:
            errors.append(NetworkBuildException(
                'found ambiguous Server count, want 1 not {}'.format(js_count), node_id))

        return server, errors
    
    
    def get_implicit_nodes_and_edges(self, node_id, neighbours):
        """
        provide default HTML and JS nodes if not provided
        """
        out, errors = super().get_implicit_nodes_and_edges(node_id, neighbours)
        
        ns = self.test_neighbours(neighbours)

        server, errs = self._get_server(ns, node_id)

        html_count = len(ns.get('html', []))
        js_count = len(ns.get('js', []))

        if server is None:
            errors.append(NetworkBuildException(
                "Need a server for a {}".format(self.node_name()), node_id))

            return out, errors

        root_id = self.model['meta']['root_id']

        # TODO: if css_count == 0 add reset css

        if html_count == 0:

            html_path, errs = server.get_static_path(node_id, self.default_html_path)
            errors += errs

            n = create_node({ 'mime_type': MIME_TYPES.HTML, 'path': html_path,
                              'meta': { 'root_id': root_id } },
                            type='html_page_node')
            e = create_edge({ })

            out.append((n, e))
            ns2,es2 = n.get_implicit_nodes_and_edges(node_id, [(self, e)])

            out += ns2
            errors += es2
            
        elif html_count > 1:
            errors.append(NetworkBuildException(
                'found ambiguous HTML node, want 1 not {}'.format(html_count), node_id=node_id))
        
        if js_count == 0:

            js_path, errs = server.get_static_path(node_id, self.default_js_path)
            errors += errs

            n = create_node({ 'mime_type': MIME_TYPES.JS, 'path': js_path,
                              'meta': { 'root_id': root_id } },
                            type='file_node')
            e = create_edge({ })

            out.append((n, e))
            ns2,es2 = n.get_implicit_nodes_and_edges(node_id, [(self, e)])

            out += ns2
            errors += es2
            
        elif js_count > 1:
            errors.append(NetworkBuildException(
                'found ambiguous JavaScript node, want 1 not {}'.format(js_count), node_id=node_id))

        return out, errors

    def prepare_network(self, node_id, network):
        """
        set this client's default HTML URIs for JavaScript
        """
        out, errors = super().prepare_network(node_id, network)
        
        neighbours = get_neighbours(node_id, network)
        ns = self.test_neighbours(neighbours)

        html_node = ns['html'][0]
        js_nodes = ns['js']

        server, errs = self._get_server(ns, node_id)
        errors += errs

        # default HTML URI
        if self.model.get('html_uri') is None:
            if server is None:
                errors.append(NetworkBuildException(
                    'JS Client has no server specified, cannot get HTML path', node_id))
            else:
                uri, errs = server.get_static_route(node_id, html_node.model['path'])
                if uri is not None:
                    self.model['html_uri'] = uri
                errors += errs

        # default JS URIS
        if len(self.model.get('js_uris', [])) == 0:
            if server is None:
                errors.append(NetworkBuildException(
                    'JS Client has no server specified, cannot get JavaScript path', node_id=node_id))
            else:
                self.model.setdefault('js_uris', [])
                for n in js_nodes:
                    uri, errs = server.get_static_route(node_id, n.model['path'])                    
                    if uri is not None:
                        self.model['js_uris'].append(uri)
                    errors += errs

        html_node.model.setdefault('javascripts', [])
        html_node.model['javascripts'] += self.model.get('js_uris', [])
        
        return out, errors


@register_node
class ConfigFileNode(Node):
    size = 1

@register_node
class URI_Node(Node):
    size = 1
    
@register_node
class FileNode(Node):
    """
    could be any type of file, e.g. csv/json
    """
    size = 2

    emit_path = None

    expected_model = {
        'path': None, # optional
        'content': None, # optional
        'mime_type': None # optional
    }

    def prepare_network(self, node_id, network):
        """
        if necessary make a copy of this file for it to servable by a web server
        """
        self.emit_path = None
        out, errors = super().prepare_network(node_id, network)

        path = self.model.get('path')
        server = network.nodes[self.model['meta']['root_id']]

        if path is not None and \
           os.path.exists(path) and \
           isinstance(server, WebServerNode) and \
           not server.asset_in_server(path):

            dir_, file_ = os.path.split(path)
            asset_path, errs = server.get_static_path(node_id, file_)
            if asset_path is not None and len(errs) == 0:
                copyfile(path, asset_path)
                self.emit_path = asset_path
            else:
                errors += errs
            
        return out, errors

    def emit_code(self, node_id, network):
        """
        emit code
        """
        out, errors = super().emit_code(node_id, network)

        mime_type = self.model.get('mime_type')
        language = None
        if mime_type == MIME_TYPES.JS:
            language = 'javascript'
        elif mime_type == MIME_TYPES.HTML:
            language = 'html'

        emitted = False
        path = self.model.get('path')
        server = network.nodes[self.model['meta']['root_id']]

        if path is not None and \
           os.path.exists(path) and \
           isinstance(server, WebServerNode):
            emitted = True

        out.append(Code(
            emitted=emitted,
            node_id=node_id,
            language=language,
            file_name=path,
            content=None if emitted else self.model.get('content'))
        )
        
        return out, errors

@register_node
class PythonScript(FileNode):
    language = 'python'

def selector_matches(node, selector_node):
    if node.get('node_id') is not None and node['node_id'] == selector_node.get('node_id'):
        return True
    elif node['tag'] == selector_node.get('selector'):
        return True

def node_to_id_selector(node_id):
    return "_node_{}".format(node_id)

def make_tag(node):
    parts = []
    parts.append('<')
    parts.append(node['tag'])

    if 'node_id' in node:
        parts.append(' id="{}"'.format(node_to_id_selector(node['node_id'])))
    if 'classes' in node:
        parts.append(' class=""'.format(' '.join(node['classes'])))
    
    parts.append('>')
    return ''.join(parts)


def find_tree_node(node, selector):
    # depth first search

    # TODO: add better selectors, it will otherwise lead to too many matches
    if selector_matches(node, selector):
        return node    
    
    for c in node['children']:
        res = find_tree_node(c, selector)
        if res is not None:
            return res
    return None

def make_html_tree(tree):
    tags = []
    for n in tree['children']:
        tags.append(make_tag(n))
        tags.append(make_html_tree(n))
        tags.append('</{}>'.format(n['tag']))
    
    return '\n'.join(tags)

@register_node
class HTML_Page_Node(FileNode):

    queued_body_nodes = []
    
    expected_model = {
        'javascripts': list,
        'stylesheets': list,
        'body_nodes': list # tree of nodes to emit
    }

    def __init__(self, model):
        if model.get('mime_type') is None:
            model['mime_type'] = MIME_TYPES.HTML
        super().__init__(model)

    def get_implicit_nodes_and_edges(self, node_id, neighbours):
        self.queued_body_nodes = []
        return super().get_implicit_nodes_and_edges(node_id, neighbours)

    def enqueue_add_body_node(self, parent, node):
        self.queued_body_nodes.append((parent, node))

    def add_body_node(self, node_id, parent_selector, node):
        self.model.setdefault('body_nodes',
                              [{ 'node_id': node_id, 'tag': 'body', 'children': [] }])
        
        n = find_tree_node(self.model['body_nodes'][0], parent_selector)
        if n is not None:
            node.setdefault('children', [])
            n['children'].append(node)
            return True
        return False

    def make_body(self, node_id):

        errors = []

        # TODO: improve naive algorithm
        #
        # keep trying to add nodes until no more can be added
        added_nodes = 1
        remaining_nodes = self.queued_body_nodes
        while added_nodes:
            added_nodes = 0
            new_nodes = []
            for parent, node in remaining_nodes:
                ok = self.add_body_node(node_id, parent, node)
                if ok:
                    added_nodes += 1
                else:
                    new_nodes.append((parent, node))
            remaining_nodes = new_nodes

        for node in remaining_nodes:
            if node.get('node_id') is not None:
                errors.append(NetworkBuildException(
                    'Unable to attach HTML node to page', node['node_id']))
            
        nodes = self.model.get('body_nodes')
        if nodes is not None:
            if len(nodes) > 1:
                raise Exception('should only have one root body node')
            return make_html_tree(nodes[0]), errors
        
        return '', errors

    def emit_code(self, node_id, network):
        out, errors = [], []

        js = ['<script src="{}"></script>'.format(js) for js in
              self.model.get('javascripts', [])]
        css = ['<link rel="stylesheet" href="{}">'.format(css) for css in
               self.model.get('stylesheets', [])]

        body, errs = self.make_body(node_id)

        errors += errs

        out.append(Code(
            node_id=node_id,
            language='html',
            file_name=self.model['path'],
            content='''<!html>
              <html>
                <head>
                {head}
                </head>
                <body>
                {body}
                </body>
            </html>'''.format(
                head='\n'.join(js + css),
                body=body
            ))
        )
        
        return out, errors

@register_node
class LargeFileNode(Node):
    """
    could be any type of file, but noteworthy that it is large and can be treated differently
    """
    size = 2
    
@register_node
class PyFlaskServerNode(PyNode, WebServerNode):
    pass

@register_node
class PyTornadoServerNode(PyNode, WebServerNode):
    pass

@register_node
class RESTNode(Node):
    size = 2

    expected_model = {
        'route': str,
        'get': types.FunctionType,
        'post': types.FunctionType,
        'put': types.FunctionType,
        'patch': types.FunctionType,
        'delete': types.FunctionType,
    }

@register_node
class PyRESTNode(PyNode, RESTNode):
    pass

class JSVisualNode(JSNode):
    size = 1

@register_node
class JS_D3Node(JSVisualNode):
    size = 2

    expected_model = {
        'object': str,
        'initObject': str,
        'methods': dict
    }

    def make_body(self, node_id):
        s = 'this.data = d3.{}({})'.format(self.model['object'], self.model.get('initObject', ''))

        ms = self.model.get('methods')
        if ms is not None:
            for k,v in ms.items():
                if type(v) is not list:
                    raise ValueError("expected list for argument")
                s += '.{}([{}])\n'.format(k, ', '.join(map(str,v)))
        
        return s

    def emit_code(self, node_id, network):
        out, errors = super().emit_code(node_id, network)
        return out, errors
    
    
@register_node
class JS_CanvasNode(JSVisualNode):
    pass

@register_node
class DOMNode(JSNode):

    expected_model = {
        'tag': str,
        'attrs': dict,
        'styles': dict,
        'parent_selector': str
    }

    mapping_node_edge = None
    is_inserted = False
    
    def prepare_network(self, node_id, network):
        out, errors = [], []

        self.mapping_node_edge = None
        self.is_inserted = False

        tag = self.model.get('tag')

        if tag is None:
            return out, errors
        
        par = self.model.get('parent_selector')

        neighbours = get_neighbours(node_id, network)
        upstream, _ = get_upstream_downstream(node_id, neighbours)
        upstream_dom = [(nid, n, e) for (nid, n, e) in upstream if type(n) is DOMNode]

        if par is None and len(upstream_dom) == 0:
            return out, errors

        html_nodes = []

        # 1) check neighours for HTML node
        for n in neighbours:
            if type(n) is HTML_Page_Node:
                html_nodes.append(n)

        if len(html_nodes) == 0:
            # 2) check whole network for one HTML node and one only with same root_id
            root_id = self.model['meta']['root_id']
            for n in network.nodes_for_root_id(root_id):
                if type(n) is HTML_Page_Node:
                    html_nodes.append(n)

        if len(html_nodes) == 1:
            if par is not None:
                # insert into HTML during compiliation time
                html_nodes[0].enqueue_add_body_node({ 'selector': par },
                                                    { 'tag': tag, 'node_id': node_id })
                self.is_inserted = True
            elif len(upstream_dom) == 1:
                # insert by parent if doesn't have any binding edges

                mapping_nodes_edges = []
                
                for nid, n, e in neighbours:
                    if type(e) is MappingEdge:
                        mapping_nodes_edges.append((n, e))

                if len(mapping_nodes_edges) == 1:
                    self.mapping_node_edge = (upstream_dom[0], mapping_nodes_edges[0])
                elif len(mapping_nodes_edges) == 0:
                    html_nodes[0].enqueue_add_body_node({ 'node_id': upstream_dom[0][0] },
                                                        { 'tag': tag, 'node_id': node_id })
                    self.is_inserted = True
                elif len(mapping_nodes_edges) > 1:
                    errors.append(NetworkBuildException(
                        'Ambiguous mapping edges count, should only have one', node_id))

            elif len(upstream_dom) > 1:
                errors.append(NetworkBuildException(
                    'Ambiguous HTML page to attach to, more than one parent found', node_id))
                
        elif len(html_nodes) > 1:
            errors.append(NetworkBuildException(
                'Ambiguous HTML page to attach to, more than one found', node_id))

                
        return out, errors

    def make_body(self, node_id):

        a_s = self.make_attrs_styles()

        if self.mapping_node_edge is not None:
            upstream_node_edge, mapping_node_edge = self.mapping_node_edge
            _1, _2, upstream_edge = upstream_node_edge
            name = upstream_edge.model.get('meta', {}).get('name')
            if name is None or not name.startswith('$'):
                raise Exception("Need a name of parent element")

            classes = self.model.get('classes', [])

            mapping_node, mapping_edge = mapping_node_edge
            
            id_attr = mapping_edge.model.get('id_attribute', '')
            if id_attr != '':
                id_attr = ', $row => $row ? $row["{}"] : $row'.format(id_attr)

            return """
            d3.select($svg)
              .selectAll("{tag}{classes_selector}")
              .data($data{id_attr})
              .join("{tag}")
              .attr("class", "{classes}")
              {a_s}
            """.format(
                a_s=a_s,
                tag=self.model['tag'],
                classes_selector=''.join(['.{}'.format(c) for c in classes]),
                classes=' '.join(classes),
                id_attr=id_attr
            )
        
        return '''
        d3.select(this.data)
        {}
        '''.format(a_s)
            
    def make_attrs_styles(self):

        raw_str = lambda v: type(v) is str and not (v.startswith('$') or v.startswith('('))
        
        attrs = self.model.get('attrs', {})
        styles = self.model.get('styles', {})
        s = []
        for k,v in attrs.items():
            s.append('.attr("{}", {})'.format(
                k, '"{}"'.format(v) if raw_str(v) else v))
        
        for k,v in styles.items():
            s.append('.style("{}", {})'.format(
                k, '"{}"'.format(v) if raw_str(v) else v))

        return '\n'.join(s)
            


    def emit_code(self, node_id, network):
        out, errors = [], []
        
        if self.is_inserted:
            selector = node_to_id_selector(node_id)
            content = """
            _domLoadCallbacks.push(() => {{
              const el = document.getElementById("{selector}")
              if (!el) {{
                throw "element not found for node: #{selector}"
              }}
              node_{sym}.data = el;
              invokeNode({sym});
            }});
            """.format(selector=selector, sym=node_id)

            out.append(Code(
                node_id=node_id,
                language=self.language,
                file_name=None,
                content=content
            ))


        out_, errors_ = super().emit_code(node_id, network)

        out += out_
        errors += errors_

        return out, errors
