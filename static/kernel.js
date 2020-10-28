
import { uuid } from "./utils.js";

export class KernelHelper {

  constructor(url, name) {
    this._url = url;
    this._name = name;
    this._id = undefined;
    this._outstandingRequests = {};
  }

  create() {

    if (this._id) {
      throw "please shutdown before creating a new kernel";
    }

    return fetch('http://' + this._url + '/api/kernels', {
      method: 'POST',
      body: JSON.stringify({ 'name': this._name })
    }).then(r => r.json())
      .then((r) => {
        if (r && r.id) {
          this._id = r.id;
          return r.id;
        } else {
          throw "no id found"
        }
      })
    
  }

  connect() {

    if (!this._url || !this._id) {
      throw "must have url and kernel id";
    }

    return new Promise((resolve, reject) => {

      this._ws = new WebSocket("ws://" + this._url + "/api/kernels/" + this._id + "/channels");
      this._ws.onopen = () => {
        this.requestReply("kernel_info_request", "kernel_info_reply", null)
          .then((responses) => {
            const res = responses[responses.length - 1];
            if (res.content && res.content.status === "ok") {
              resolve();
            } else {
              reject();
            }
          })
          .catch(reject)
      }
      this._ws.onmessage = this._onMessage.bind(this);
      
    });
    
  }

  _onMessage(evt) {
    if (evt.data && evt.data.length > 1e5)
      throw "too long";
    var res = (JSON.parse(evt.data));
    if (res.parent_header &&
        res.parent_header.msg_id &&
        res.parent_header.msg_id in this._outstandingRequests) {
      const msg_id = res.parent_header.msg_id;
      const callback = this._outstandingRequests[msg_id];
      callback(res);
    }
  }

  shutdown() {
  }

  execCodeSimple(code) {
    return new Promise((resolve, reject) => {
      return this.requestReply(
        "execute_request",
        "execute_result",
        {
          "code": code,
          "silent":false,
          "store_history":true,
          "user_expressions":{},
          "allow_stdin":true,
          "stop_on_error":true
        }
      ).then((responses) => {
        const res = responses[responses.length - 1];
        let found = false;
        if (res.content && res.content.data) {
          const data = res.content.data
          for (const k in data) {
            resolve(data[k])
            found = true;
            break;
          }
        }
        if (!found) {
          reject();
        }
      });

    });
  }

  requestReply(msg_type, return_msg_type, content) {

    return new Promise((resolve, reject) => {

      const msgId = uuid();
      let responses = [];
      this._outstandingRequests[msgId] = (content) => {
        responses.push(content);
        if (content.msg_type === return_msg_type) {
          delete this._outstandingRequests[msgId];
          resolve(responses);
        }
      };
      
      this._ws.send(JSON.stringify({
        "header": {
          "msg_id": msgId,
          "username":null,
          "session":null,
          "msg_type":msg_type,
          "version":"5.2"
        },
        "metadata":{},
        "content":content || {},
        "buffers":[],
        "parent_header":{},
        "channel":"shell"
      }));

    });
    
  }
  
}
