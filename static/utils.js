
// https://codepen.io/jh3y/pen/opNYWy
export const throttle = (func, limit) => {
  let lastFunc
  let lastRan
  return function() {
    const context = this
    const args = arguments
    if (!lastRan) {
      func.apply(context, args)
      lastRan = Date.now()
    } else {
      clearTimeout(lastFunc)
      lastFunc = setTimeout(function() {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(context, args)
          lastRan = Date.now()
        }
      }, limit - (Date.now() - lastRan))
    }
  }
}

export function uuid() {
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

export function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export const dom = {
  gid: function(s) { return document.getElementById(s); },
  ce: function(n) { return document.createElement(n); },
  ap: function(a,b) { a.appendChild(b); },
  on: function(e, n, fn) { e.addEventListener(n, fn); }
};
