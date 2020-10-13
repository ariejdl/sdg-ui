
var BASE_URL = "localhost:8001";
var HOST_URL = "http://localhost:8001";
var ws = new WebSocket("ws://" + BASE_URL + "/echo");
ws.onopen = function() {
  ws.send("Hello, world " + new Date().getSeconds())
};
ws.onmessage = function (evt) {
  console.log(evt.data);
};

export function simpleTerm(parent) {
  // TODO: calculate pixel size given font size
  var term = document.createElement("div");
  term.className = "xterm";
  //term.style.position = "absolute";
  term.style.width = "811px";
  term.style.height = "171px";
  parent.appendChild(term);
  make_terminal(
    term,
    { cols: 90, rows: 10 },
    "ws://" + BASE_URL + "/terminals/websocket/1"
  );
}

// file tests
fetch(HOST_URL + "/api/contents/")
  .then(r => r.json())
  .then(function(r) {

    if (!r.content || !r.content.length)
      throw "expected a list of directory content";

    var newFile = 'a.txt';
    var newFileRename = 'b.txt';
    
    fetch(HOST_URL + '/api/contents/' + newFile, {
      method: 'PUT',
      body: JSON.stringify({
        'format': 'text',
        'type': 'file',
        'content': 'bla'
      })
    }).then(r => r.json())
      .then(() => {

        fetch(HOST_URL + "/api/contents/" + newFile)
          .then(r => r.json())
          .then(r => {
            if (!r.size)
              throw "expected greater than 0 file size";
          });


        fetch(HOST_URL + '/api/contents/' + newFile, {
          method: 'PATCH',
          body: JSON.stringify({ 'path': newFileRename })
        }).then(r => r.json())
          .then((d) => {
            fetch(HOST_URL + '/api/contents/' + newFileRename, {
              method: 'DELETE'
            }).then(r => {
              if (r.status !== 204)
                throw "Unexpected response";
            });
            
          });
        
      });
  });

/*
document.addEventListener('DOMContentLoaded', function() {
  simpleTerm()
});
*/

/* treat this as a kind of unit test for back-end to begin with */

var uuid = function () {
  /**
   * http://www.ietf.org/rfc/rfc4122.txt
   */
  var s = [];
  var hexDigits = "0123456789abcdef";
  for (var i = 0; i < 32; i++) {
    s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
  }
  s[12] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
   // bits 6-7 of the clock_seq_hi_and_reserved to 01
  s[16] = hexDigits.substr((s[16] & 0x3) | 0x8, 1); 

  var uuid = s.join("");
  return uuid;
};

function wsKernel(kernelID) {
  var ws = new WebSocket("ws://" + BASE_URL + "/api/kernels/" + kernelID + "/channels");
  ws.onopen = function() {

    // note parent_header.msg_id seems to enable doing request/reply

    // https://jupyter-client.readthedocs.io/en/stable/messaging.html
    // "username" and "session" keys seem to be optional but must be null for julia

    ws.send(JSON.stringify({
      "header":{"msg_id":uuid(),"username":null,"session":null,"msg_type":"kernel_info_request","version":"5.2"},
      "metadata":{},
      "content":{},
      "buffers":[],
      "parent_header":{},
      "channel":"shell"}))

    ws.send(JSON.stringify({
      "header":{"msg_id":uuid(),"username":null,"session":null,"msg_type":"comm_info_request","version":"5.2"},
      "metadata":{},
      "content":{
        "target_name":"jupyter.widget"},
      "buffers":[],
      "parent_header":{},
      "channel":"shell"}));

    var id_x = uuid();
    console.log('-', id_x);
    ws.send(JSON.stringify({
      "header":{"msg_id":id_x,"username":null,"session":null,"msg_type":"execute_request","version":"5.2"},
      "metadata":{},
      "content":{
        "code":"a = 2",
        "silent":false,
        "store_history":true,"user_expressions":{},"allow_stdin":true,"stop_on_error":true},
      "buffers":[],
      "parent_header":{},
      "channel":"shell"}));

    var id_y = uuid();
    console.log('-', id_y);
    ws.send(JSON.stringify({
      "header":{"msg_id":id_y,"username":null,"session":null,"msg_type":"execute_request","version":"5.2"},
      "metadata":{},
      "content":{
        "code":"print(a);print('hello from python')",
        "silent":false,
        "store_history":true,"user_expressions":{},"allow_stdin":true,"stop_on_error":true},
      "buffers":[],
      "parent_header":{},
      "channel":"shell"}));

  };
  ws.onmessage = function (evt) {
    if (evt.data && evt.data.length > 1e5)
      throw "too long";
    var res = (JSON.parse(evt.data));
    console.log('*', res)
    if (res.content && res.content.text) {
      console.log('kernel response:', res.content.text)
    }
  };
}

fetch(HOST_URL + '/api/kernels')
  .then(r => r.json())
  .then((r) => {

    if (!r['available'].length)
      throw "expected at least one item";

    r['running'].map((k) => {
      fetch(HOST_URL + '/api/kernels/' + k.id, {
        method: 'DELETE'
      });
    });

    fetch(HOST_URL + '/api/kernels', {
      method: 'POST',
      body: JSON.stringify({ 'name': r['available'][r['available'].length - 1] })
      //body: JSON.stringify({ 'name': r['available'][0] })
    }).then(r => r.json())
      .then((r) => {

        wsKernel(r.id);

        fetch(HOST_URL + '/api/kernels/' + r.id)
          .then(r => r.json())
          .then((r) => {

          });

        return;
        fetch('/api/kernels/' + r.id + '/restart', { method: 'POST' })
          .then(r => r.json())
          .then((r) => {

          });

        fetch('/api/kernels/' + r.id + '/interrupt', { method: 'POST' })
        
      });
  });

