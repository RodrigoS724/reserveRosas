import { g as Ct } from "./main-CZ7FPOp9.js";
import K from "events";
import X from "url";
import ft from "util";
import Le from "fs";
import jt from "http";
import It from "https";
import Mt from "zlib";
import O from "stream";
import J from "net";
import xt from "dns";
import gt from "os";
import vt from "path";
import Q from "crypto";
import wt from "tls";
import Lt from "child_process";
function Nt(y, E) {
  for (var S = 0; S < E.length; S++) {
    const x = E[S];
    if (typeof x != "string" && !Array.isArray(x)) {
      for (const r in x)
        if (r !== "default" && !(r in y)) {
          const o = Object.getOwnPropertyDescriptor(x, r);
          o && Object.defineProperty(y, r, o.get ? o : {
            enumerable: !0,
            get: () => x[r]
          });
        }
    }
  }
  return Object.freeze(Object.defineProperty(y, Symbol.toStringTag, { value: "Module" }));
}
var V = {}, ie = { exports: {} }, Z = { exports: {} }, se, ze;
function qt() {
  if (ze) return se;
  ze = 1;
  const y = X, E = 1800;
  class S {
    constructor(r) {
      this.options = r || {}, this.cookies = [];
    }
    /**
     * Stores a cookie string to the cookie storage
     *
     * @param {String} cookieStr Value from the 'Set-Cookie:' header
     * @param {String} url Current URL
     */
    set(r, o) {
      let a = y.parse(o || ""), p = this.parse(r), s;
      return p.domain ? (s = p.domain.replace(/^\./, ""), // can't be valid if the requested domain is shorter than current hostname
      (a.hostname.length < s.length || // prefix domains with dot to be sure that partial matches are not used
      ("." + a.hostname).substr(-s.length + 1) !== "." + s) && (p.domain = a.hostname)) : p.domain = a.hostname, p.path || (p.path = this.getPath(a.pathname)), p.expires || (p.expires = new Date(Date.now() + (Number(this.options.sessionTimeout || E) || E) * 1e3)), this.add(p);
    }
    /**
     * Returns cookie string for the 'Cookie:' header.
     *
     * @param {String} url URL to check for
     * @returns {String} Cookie header or empty string if no matches were found
     */
    get(r) {
      return this.list(r).map((o) => o.name + "=" + o.value).join("; ");
    }
    /**
     * Lists all valied cookie objects for the specified URL
     *
     * @param {String} url URL to check for
     * @returns {Array} An array of cookie objects
     */
    list(r) {
      let o = [], a, p;
      for (a = this.cookies.length - 1; a >= 0; a--) {
        if (p = this.cookies[a], this.isExpired(p)) {
          this.cookies.splice(a, a);
          continue;
        }
        this.match(p, r) && o.unshift(p);
      }
      return o;
    }
    /**
     * Parses cookie string from the 'Set-Cookie:' header
     *
     * @param {String} cookieStr String from the 'Set-Cookie:' header
     * @returns {Object} Cookie object
     */
    parse(r) {
      let o = {};
      return (r || "").toString().split(";").forEach((a) => {
        let p = a.split("="), s = p.shift().trim().toLowerCase(), i = p.join("=").trim(), l;
        if (s)
          switch (s) {
            case "expires":
              i = new Date(i), i.toString() !== "Invalid Date" && (o.expires = i);
              break;
            case "path":
              o.path = i;
              break;
            case "domain":
              l = i.toLowerCase(), l.length && l.charAt(0) !== "." && (l = "." + l), o.domain = l;
              break;
            case "max-age":
              o.expires = new Date(Date.now() + (Number(i) || 0) * 1e3);
              break;
            case "secure":
              o.secure = !0;
              break;
            case "httponly":
              o.httponly = !0;
              break;
            default:
              o.name || (o.name = s, o.value = i);
          }
      }), o;
    }
    /**
     * Checks if a cookie object is valid for a specified URL
     *
     * @param {Object} cookie Cookie object
     * @param {String} url URL to check for
     * @returns {Boolean} true if cookie is valid for specifiec URL
     */
    match(r, o) {
      let a = y.parse(o || "");
      return !(a.hostname !== r.domain && (r.domain.charAt(0) !== "." || ("." + a.hostname).substr(-r.domain.length) !== r.domain) || this.getPath(a.pathname).substr(0, r.path.length) !== r.path || r.secure && a.protocol !== "https:");
    }
    /**
     * Adds (or updates/removes if needed) a cookie object to the cookie storage
     *
     * @param {Object} cookie Cookie value to be stored
     */
    add(r) {
      let o, a;
      if (!r || !r.name)
        return !1;
      for (o = 0, a = this.cookies.length; o < a; o++)
        if (this.compare(this.cookies[o], r))
          return this.isExpired(r) ? (this.cookies.splice(o, 1), !1) : (this.cookies[o] = r, !0);
      return this.isExpired(r) || this.cookies.push(r), !0;
    }
    /**
     * Checks if two cookie objects are the same
     *
     * @param {Object} a Cookie to check against
     * @param {Object} b Cookie to check against
     * @returns {Boolean} True, if the cookies are the same
     */
    compare(r, o) {
      return r.name === o.name && r.path === o.path && r.domain === o.domain && r.secure === o.secure && r.httponly === r.httponly;
    }
    /**
     * Checks if a cookie is expired
     *
     * @param {Object} cookie Cookie object to check against
     * @returns {Boolean} True, if the cookie is expired
     */
    isExpired(r) {
      return r.expires && r.expires < /* @__PURE__ */ new Date() || !r.value;
    }
    /**
     * Returns normalized cookie path for an URL path argument
     *
     * @param {String} pathname
     * @returns {String} Normalized path
     */
    getPath(r) {
      let o = (r || "/").split("/");
      return o.pop(), o = o.join("/").trim(), o.charAt(0) !== "/" && (o = "/" + o), o.substr(-1) !== "/" && (o += "/"), o;
    }
  }
  return se = S, se;
}
const Ht = "nodemailer", zt = "7.0.13", Ot = "https://nodemailer.com/", U = {
  name: Ht,
  version: zt,
  homepage: Ot
};
var Oe;
function ee() {
  if (Oe) return Z.exports;
  Oe = 1;
  const y = jt, E = It, S = X, x = Mt, r = O.PassThrough, o = qt(), a = U, p = J, s = 5;
  Z.exports = function(l, n) {
    return i(l, n);
  }, Z.exports.Cookies = o;
  function i(l, n) {
    n = n || {}, n.fetchRes = n.fetchRes || new r(), n.cookies = n.cookies || new o(), n.redirects = n.redirects || 0, n.maxRedirects = isNaN(n.maxRedirects) ? s : n.maxRedirects, n.cookie && ([].concat(n.cookie || []).forEach((w) => {
      n.cookies.set(w, l);
    }), n.cookie = !1);
    let d = n.fetchRes, f = S.parse(l), g = (n.method || "").toString().trim().toUpperCase() || "GET", e = !1, t, m, h = f.protocol === "https:" ? E : y, c = {
      "accept-encoding": "gzip,deflate",
      "user-agent": "nodemailer/" + a.version
    };
    if (Object.keys(n.headers || {}).forEach((w) => {
      c[w.toLowerCase().trim()] = n.headers[w];
    }), n.userAgent && (c["user-agent"] = n.userAgent), f.auth && (c.Authorization = "Basic " + Buffer.from(f.auth).toString("base64")), (t = n.cookies.get(l)) && (c.cookie = t), n.body) {
      if (n.contentType !== !1 && (c["Content-Type"] = n.contentType || "application/x-www-form-urlencoded"), typeof n.body.pipe == "function")
        c["Transfer-Encoding"] = "chunked", m = n.body, m.on("error", (w) => {
          e || (e = !0, w.type = "FETCH", w.sourceUrl = l, d.emit("error", w));
        });
      else {
        if (n.body instanceof Buffer)
          m = n.body;
        else if (typeof n.body == "object")
          try {
            m = Buffer.from(
              Object.keys(n.body).map((w) => {
                let b = n.body[w].toString().trim();
                return encodeURIComponent(w) + "=" + encodeURIComponent(b);
              }).join("&")
            );
          } catch (w) {
            if (e)
              return;
            e = !0, w.type = "FETCH", w.sourceUrl = l, d.emit("error", w);
            return;
          }
        else
          m = Buffer.from(n.body.toString().trim());
        c["Content-Type"] = n.contentType || "application/x-www-form-urlencoded", c["Content-Length"] = m.length;
      }
      g = (n.method || "").toString().trim().toUpperCase() || "POST";
    }
    let u, v = {
      method: g,
      host: f.hostname,
      path: f.path,
      port: f.port ? f.port : f.protocol === "https:" ? 443 : 80,
      headers: c,
      rejectUnauthorized: !1,
      agent: !1
    };
    n.tls && Object.keys(n.tls).forEach((w) => {
      v[w] = n.tls[w];
    }), f.protocol === "https:" && f.hostname && f.hostname !== v.host && !p.isIP(f.hostname) && !v.servername && (v.servername = f.hostname);
    try {
      u = h.request(v);
    } catch (w) {
      return e = !0, setImmediate(() => {
        w.type = "FETCH", w.sourceUrl = l, d.emit("error", w);
      }), d;
    }
    return n.timeout && u.setTimeout(n.timeout, () => {
      if (e)
        return;
      e = !0, u.abort();
      let w = new Error("Request Timeout");
      w.type = "FETCH", w.sourceUrl = l, d.emit("error", w);
    }), u.on("error", (w) => {
      e || (e = !0, w.type = "FETCH", w.sourceUrl = l, d.emit("error", w));
    }), u.on("response", (w) => {
      let b;
      if (!e) {
        switch (w.headers["content-encoding"]) {
          case "gzip":
          case "deflate":
            b = x.createUnzip();
            break;
        }
        if (w.headers["set-cookie"] && [].concat(w.headers["set-cookie"] || []).forEach((_) => {
          n.cookies.set(_, l);
        }), [301, 302, 303, 307, 308].includes(w.statusCode) && w.headers.location) {
          if (n.redirects++, n.redirects > n.maxRedirects) {
            e = !0;
            let _ = new Error("Maximum redirect count exceeded");
            _.type = "FETCH", _.sourceUrl = l, d.emit("error", _), u.abort();
            return;
          }
          return n.method = "GET", n.body = !1, i(S.resolve(l, w.headers.location), n);
        }
        if (d.statusCode = w.statusCode, d.headers = w.headers, w.statusCode >= 300 && !n.allowErrorResponse) {
          e = !0;
          let _ = new Error("Invalid status code " + w.statusCode);
          _.type = "FETCH", _.sourceUrl = l, d.emit("error", _), u.abort();
          return;
        }
        w.on("error", (_) => {
          e || (e = !0, _.type = "FETCH", _.sourceUrl = l, d.emit("error", _), u.abort());
        }), b ? (w.pipe(b).pipe(d), b.on("error", (_) => {
          e || (e = !0, _.type = "FETCH", _.sourceUrl = l, d.emit("error", _), u.abort());
        })) : w.pipe(d);
      }
    }), setImmediate(() => {
      if (m)
        try {
          if (typeof m.pipe == "function")
            return m.pipe(u);
          u.write(m);
        } catch (w) {
          e = !0, w.type = "FETCH", w.sourceUrl = l, d.emit("error", w);
          return;
        }
      u.end();
    }), d;
  }
  return Z.exports;
}
var Pe;
function H() {
  return Pe || (Pe = 1, (function(y) {
    const E = X, S = ft, x = Le, r = ee(), o = xt, a = J, p = gt, s = 300 * 1e3, i = 30 * 1e3, l = 1e3;
    let n = 0;
    y.exports._lastCacheCleanup = () => n, y.exports._resetCacheCleanup = () => {
      n = 0;
    };
    let d;
    try {
      d = p.networkInterfaces();
    } catch {
    }
    y.exports.networkInterfaces = d;
    const f = (c, u) => {
      let v = y.exports.networkInterfaces;
      return v ? (
        // crux that replaces Object.values(networkInterfaces) as Object.values is not supported in nodejs v6
        Object.keys(v).map((b) => v[b]).reduce((b, _) => b.concat(_), []).filter((b) => !b.internal || u).filter((b) => b.family === "IPv" + c || b.family === c).length > 0
      ) : !0;
    }, g = (c, u, v, w) => {
      if (v = v || {}, !f(c, v.allowInternalNetworkInterfaces))
        return w(null, []);
      (o.Resolver ? new o.Resolver(v) : o)["resolve" + c](u, (A, T) => {
        if (A) {
          switch (A.code) {
            case o.NODATA:
            case o.NOTFOUND:
            case o.NOTIMP:
            case o.SERVFAIL:
            case o.CONNREFUSED:
            case o.REFUSED:
            case "EAI_AGAIN":
              return w(null, []);
          }
          return w(A);
        }
        return w(null, Array.isArray(T) ? T : [].concat(T || []));
      });
    }, e = y.exports.dnsCache = /* @__PURE__ */ new Map(), t = (c, u) => c ? Object.assign(
      {
        servername: c.servername,
        host: !c.addresses || !c.addresses.length ? null : c.addresses.length === 1 ? c.addresses[0] : c.addresses[Math.floor(Math.random() * c.addresses.length)]
      },
      u || {}
    ) : Object.assign({}, u || {});
    y.exports.resolveHostname = (c, u) => {
      if (c = c || {}, !c.host && c.servername && (c.host = c.servername), !c.host || a.isIP(c.host)) {
        let w = {
          addresses: [c.host],
          servername: c.servername || !1
        };
        return u(
          null,
          t(w, {
            cached: !1
          })
        );
      }
      let v;
      if (e.has(c.host)) {
        v = e.get(c.host);
        const w = Date.now();
        if (w - n > i) {
          n = w;
          for (const [b, _] of e.entries())
            _.expires && _.expires < w && e.delete(b);
          if (e.size > l) {
            const b = Math.floor(l * 0.1);
            Array.from(e.keys()).slice(0, b).forEach((A) => e.delete(A));
          }
        }
        if (!v.expires || v.expires >= w)
          return u(
            null,
            t(v.value, {
              cached: !0
            })
          );
      }
      g(4, c.host, c, (w, b) => {
        if (w)
          return v ? (e.set(c.host, {
            value: v.value,
            expires: Date.now() + (c.dnsTtl || s)
          }), u(
            null,
            t(v.value, {
              cached: !0,
              error: w
            })
          )) : u(w);
        if (b && b.length) {
          let _ = {
            addresses: b,
            servername: c.servername || c.host
          };
          return e.set(c.host, {
            value: _,
            expires: Date.now() + (c.dnsTtl || s)
          }), u(
            null,
            t(_, {
              cached: !1
            })
          );
        }
        g(6, c.host, c, (_, A) => {
          if (_)
            return v ? (e.set(c.host, {
              value: v.value,
              expires: Date.now() + (c.dnsTtl || s)
            }), u(
              null,
              t(v.value, {
                cached: !0,
                error: _
              })
            )) : u(_);
          if (A && A.length) {
            let T = {
              addresses: A,
              servername: c.servername || c.host
            };
            return e.set(c.host, {
              value: T,
              expires: Date.now() + (c.dnsTtl || s)
            }), u(
              null,
              t(T, {
                cached: !1
              })
            );
          }
          try {
            o.lookup(c.host, { all: !0 }, (T, j) => {
              if (T)
                return v ? (e.set(c.host, {
                  value: v.value,
                  expires: Date.now() + (c.dnsTtl || s)
                }), u(
                  null,
                  t(v.value, {
                    cached: !0,
                    error: T
                  })
                )) : u(T);
              let I = j ? j.filter((C) => f(C.family)).map((C) => C.address).shift() : !1;
              if (j && j.length && !I && console.warn(`Failed to resolve IPv${j[0].family} addresses with current network`), !I && v)
                return u(
                  null,
                  t(v.value, {
                    cached: !0
                  })
                );
              let k = {
                addresses: I ? [I] : [c.host],
                servername: c.servername || c.host
              };
              return e.set(c.host, {
                value: k,
                expires: Date.now() + (c.dnsTtl || s)
              }), u(
                null,
                t(k, {
                  cached: !1
                })
              );
            });
          } catch {
            return v ? (e.set(c.host, {
              value: v.value,
              expires: Date.now() + (c.dnsTtl || s)
            }), u(
              null,
              t(v.value, {
                cached: !0,
                error: _
              })
            )) : u(_);
          }
        });
      });
    }, y.exports.parseConnectionUrl = (c) => {
      c = c || "";
      let u = {};
      return [E.parse(c, !0)].forEach((v) => {
        let w;
        switch (v.protocol) {
          case "smtp:":
            u.secure = !1;
            break;
          case "smtps:":
            u.secure = !0;
            break;
          case "direct:":
            u.direct = !0;
            break;
        }
        !isNaN(v.port) && Number(v.port) && (u.port = Number(v.port)), v.hostname && (u.host = v.hostname), v.auth && (w = v.auth.split(":"), u.auth || (u.auth = {}), u.auth.user = w.shift(), u.auth.pass = w.join(":")), Object.keys(v.query || {}).forEach((b) => {
          let _ = u, A = b, T = v.query[b];
          switch (isNaN(T) || (T = Number(T)), T) {
            case "true":
              T = !0;
              break;
            case "false":
              T = !1;
              break;
          }
          if (b.indexOf("tls.") === 0)
            A = b.substr(4), u.tls || (u.tls = {}), _ = u.tls;
          else if (b.indexOf(".") >= 0)
            return;
          A in _ || (_[A] = T);
        });
      }), u;
    }, y.exports._logFunc = (c, u, v, w, b, ..._) => {
      let A = {};
      Object.keys(v || {}).forEach((T) => {
        T !== "level" && (A[T] = v[T]);
      }), Object.keys(w || {}).forEach((T) => {
        T !== "level" && (A[T] = w[T]);
      }), c[u](A, b, ..._);
    }, y.exports.getLogger = (c, u) => {
      c = c || {};
      let v = {}, w = ["trace", "debug", "info", "warn", "error", "fatal"];
      if (!c.logger)
        return w.forEach((_) => {
          v[_] = () => !1;
        }), v;
      let b = c.logger;
      return c.logger === !0 && (b = h(w)), w.forEach((_) => {
        v[_] = (A, T, ...j) => {
          y.exports._logFunc(b, _, u, A, T, ...j);
        };
      }), v;
    }, y.exports.callbackPromise = (c, u) => function() {
      let v = Array.from(arguments), w = v.shift();
      w ? u(w) : c(...v);
    }, y.exports.parseDataURI = (c) => {
      if (typeof c != "string" || !c.startsWith("data:"))
        return null;
      const u = c.indexOf(",");
      if (u === -1)
        return null;
      const v = c.substring(u + 1), w = c.substring(5, u);
      let b;
      const _ = w.split(";");
      if (_.length > 0) {
        const I = _[_.length - 1].toLowerCase().trim();
        ["base64", "utf8", "utf-8"].includes(I) && I.indexOf("=") === -1 && (b = I, _.pop());
      }
      const A = _.length > 0 ? _.shift() : "application/octet-stream", T = {};
      for (let I = 0; I < _.length; I++) {
        const k = _[I], C = k.indexOf("=");
        if (C > 0) {
          const L = k.substring(0, C).trim(), M = k.substring(C + 1).trim();
          L && (T[L] = M);
        }
      }
      let j;
      try {
        if (b === "base64")
          j = Buffer.from(v, "base64");
        else
          try {
            j = Buffer.from(decodeURIComponent(v));
          } catch {
            j = Buffer.from(v);
          }
      } catch {
        j = Buffer.alloc(0);
      }
      return {
        data: j,
        encoding: b || null,
        contentType: A || "application/octet-stream",
        params: T
      };
    }, y.exports.resolveContent = (c, u, v) => {
      let w;
      v || (w = new Promise((T, j) => {
        v = y.exports.callbackPromise(T, j);
      }));
      let b = c && c[u] && c[u].content || c[u], _, A = (typeof c[u] == "object" && c[u].encoding || "utf8").toString().toLowerCase().replace(/[-_\s]/g, "");
      if (!b)
        return v(null, b);
      if (typeof b == "object") {
        if (typeof b.pipe == "function")
          return m(b, (T, j) => {
            if (T)
              return v(T);
            c[u].content ? c[u].content = j : c[u] = j, v(null, j);
          });
        if (/^https?:\/\//i.test(b.path || b.href))
          return _ = r(b.path || b.href), m(_, v);
        if (/^data:/i.test(b.path || b.href)) {
          let T = y.exports.parseDataURI(b.path || b.href);
          return !T || !T.data ? v(null, Buffer.from(0)) : v(null, T.data);
        } else if (b.path)
          return m(x.createReadStream(b.path), v);
      }
      return typeof c[u].content == "string" && !["utf8", "usascii", "ascii"].includes(A) && (b = Buffer.from(c[u].content, A)), setImmediate(() => v(null, b)), w;
    }, y.exports.assign = function() {
      let c = Array.from(arguments), u = c.shift() || {};
      return c.forEach((v) => {
        Object.keys(v || {}).forEach((w) => {
          ["tls", "auth"].includes(w) && v[w] && typeof v[w] == "object" ? (u[w] || (u[w] = {}), Object.keys(v[w]).forEach((b) => {
            u[w][b] = v[w][b];
          })) : u[w] = v[w];
        });
      }), u;
    }, y.exports.encodeXText = (c) => {
      if (!/[^\x21-\x2A\x2C-\x3C\x3E-\x7E]/.test(c))
        return c;
      let u = Buffer.from(c), v = "";
      for (let w = 0, b = u.length; w < b; w++) {
        let _ = u[w];
        _ < 33 || _ > 126 || _ === 43 || _ === 61 ? v += "+" + (_ < 16 ? "0" : "") + _.toString(16).toUpperCase() : v += String.fromCharCode(_);
      }
      return v;
    };
    function m(c, u) {
      let v = !1, w = [], b = 0;
      c.on("error", (_) => {
        v || (v = !0, u(_));
      }), c.on("readable", () => {
        let _;
        for (; (_ = c.read()) !== null; )
          w.push(_), b += _.length;
      }), c.on("end", () => {
        if (v)
          return;
        v = !0;
        let _;
        try {
          _ = Buffer.concat(w, b);
        } catch (A) {
          return u(A);
        }
        u(null, _);
      });
    }
    function h(c) {
      let u = 0, v = /* @__PURE__ */ new Map();
      c.forEach((_) => {
        _.length > u && (u = _.length);
      }), c.forEach((_) => {
        let A = _.toUpperCase();
        A.length < u && (A += " ".repeat(u - A.length)), v.set(_, A);
      });
      let w = (_, A, T, ...j) => {
        let I = "";
        A && (A.tnx === "server" ? I = "S: " : A.tnx === "client" && (I = "C: "), A.sid && (I = "[" + A.sid + "] " + I), A.cid && (I = "[#" + A.cid + "] " + I)), T = S.format(T, ...j), T.split(/\r?\n/).forEach((k) => {
          console.log("[%s] %s %s", (/* @__PURE__ */ new Date()).toISOString().substr(0, 19).replace(/T/, " "), v.get(_), I + k);
        });
      }, b = {};
      return c.forEach((_) => {
        b[_] = w.bind(null, _);
      }), b;
    }
  })(ie)), ie.exports;
}
var ae, Re;
function _t() {
  if (Re) return ae;
  Re = 1;
  const y = vt, E = "application/octet-stream", S = "bin", x = /* @__PURE__ */ new Map([
    ["application/acad", "dwg"],
    ["application/applixware", "aw"],
    ["application/arj", "arj"],
    ["application/atom+xml", "xml"],
    ["application/atomcat+xml", "atomcat"],
    ["application/atomsvc+xml", "atomsvc"],
    ["application/base64", ["mm", "mme"]],
    ["application/binhex", "hqx"],
    ["application/binhex4", "hqx"],
    ["application/book", ["book", "boo"]],
    ["application/ccxml+xml,", "ccxml"],
    ["application/cdf", "cdf"],
    ["application/cdmi-capability", "cdmia"],
    ["application/cdmi-container", "cdmic"],
    ["application/cdmi-domain", "cdmid"],
    ["application/cdmi-object", "cdmio"],
    ["application/cdmi-queue", "cdmiq"],
    ["application/clariscad", "ccad"],
    ["application/commonground", "dp"],
    ["application/cu-seeme", "cu"],
    ["application/davmount+xml", "davmount"],
    ["application/drafting", "drw"],
    ["application/dsptype", "tsp"],
    ["application/dssc+der", "dssc"],
    ["application/dssc+xml", "xdssc"],
    ["application/dxf", "dxf"],
    ["application/ecmascript", ["js", "es"]],
    ["application/emma+xml", "emma"],
    ["application/envoy", "evy"],
    ["application/epub+zip", "epub"],
    ["application/excel", ["xls", "xl", "xla", "xlb", "xlc", "xld", "xlk", "xll", "xlm", "xlt", "xlv", "xlw"]],
    ["application/exi", "exi"],
    ["application/font-tdpfr", "pfr"],
    ["application/fractals", "fif"],
    ["application/freeloader", "frl"],
    ["application/futuresplash", "spl"],
    ["application/geo+json", "geojson"],
    ["application/gnutar", "tgz"],
    ["application/groupwise", "vew"],
    ["application/hlp", "hlp"],
    ["application/hta", "hta"],
    ["application/hyperstudio", "stk"],
    ["application/i-deas", "unv"],
    ["application/iges", ["iges", "igs"]],
    ["application/inf", "inf"],
    ["application/internet-property-stream", "acx"],
    ["application/ipfix", "ipfix"],
    ["application/java", "class"],
    ["application/java-archive", "jar"],
    ["application/java-byte-code", "class"],
    ["application/java-serialized-object", "ser"],
    ["application/java-vm", "class"],
    ["application/javascript", "js"],
    ["application/json", "json"],
    ["application/lha", "lha"],
    ["application/lzx", "lzx"],
    ["application/mac-binary", "bin"],
    ["application/mac-binhex", "hqx"],
    ["application/mac-binhex40", "hqx"],
    ["application/mac-compactpro", "cpt"],
    ["application/macbinary", "bin"],
    ["application/mads+xml", "mads"],
    ["application/marc", "mrc"],
    ["application/marcxml+xml", "mrcx"],
    ["application/mathematica", "ma"],
    ["application/mathml+xml", "mathml"],
    ["application/mbedlet", "mbd"],
    ["application/mbox", "mbox"],
    ["application/mcad", "mcd"],
    ["application/mediaservercontrol+xml", "mscml"],
    ["application/metalink4+xml", "meta4"],
    ["application/mets+xml", "mets"],
    ["application/mime", "aps"],
    ["application/mods+xml", "mods"],
    ["application/mp21", "m21"],
    ["application/mp4", "mp4"],
    ["application/mspowerpoint", ["ppt", "pot", "pps", "ppz"]],
    ["application/msword", ["doc", "dot", "w6w", "wiz", "word"]],
    ["application/mswrite", "wri"],
    ["application/mxf", "mxf"],
    ["application/netmc", "mcp"],
    ["application/octet-stream", ["*"]],
    ["application/oda", "oda"],
    ["application/oebps-package+xml", "opf"],
    ["application/ogg", "ogx"],
    ["application/olescript", "axs"],
    ["application/onenote", "onetoc"],
    ["application/patch-ops-error+xml", "xer"],
    ["application/pdf", "pdf"],
    ["application/pgp-encrypted", "asc"],
    ["application/pgp-signature", "pgp"],
    ["application/pics-rules", "prf"],
    ["application/pkcs-12", "p12"],
    ["application/pkcs-crl", "crl"],
    ["application/pkcs10", "p10"],
    ["application/pkcs7-mime", ["p7c", "p7m"]],
    ["application/pkcs7-signature", "p7s"],
    ["application/pkcs8", "p8"],
    ["application/pkix-attr-cert", "ac"],
    ["application/pkix-cert", ["cer", "crt"]],
    ["application/pkix-crl", "crl"],
    ["application/pkix-pkipath", "pkipath"],
    ["application/pkixcmp", "pki"],
    ["application/plain", "text"],
    ["application/pls+xml", "pls"],
    ["application/postscript", ["ps", "ai", "eps"]],
    ["application/powerpoint", "ppt"],
    ["application/pro_eng", ["part", "prt"]],
    ["application/prs.cww", "cww"],
    ["application/pskc+xml", "pskcxml"],
    ["application/rdf+xml", "rdf"],
    ["application/reginfo+xml", "rif"],
    ["application/relax-ng-compact-syntax", "rnc"],
    ["application/resource-lists+xml", "rl"],
    ["application/resource-lists-diff+xml", "rld"],
    ["application/ringing-tones", "rng"],
    ["application/rls-services+xml", "rs"],
    ["application/rsd+xml", "rsd"],
    ["application/rss+xml", "xml"],
    ["application/rtf", ["rtf", "rtx"]],
    ["application/sbml+xml", "sbml"],
    ["application/scvp-cv-request", "scq"],
    ["application/scvp-cv-response", "scs"],
    ["application/scvp-vp-request", "spq"],
    ["application/scvp-vp-response", "spp"],
    ["application/sdp", "sdp"],
    ["application/sea", "sea"],
    ["application/set", "set"],
    ["application/set-payment-initiation", "setpay"],
    ["application/set-registration-initiation", "setreg"],
    ["application/shf+xml", "shf"],
    ["application/sla", "stl"],
    ["application/smil", ["smi", "smil"]],
    ["application/smil+xml", "smi"],
    ["application/solids", "sol"],
    ["application/sounder", "sdr"],
    ["application/sparql-query", "rq"],
    ["application/sparql-results+xml", "srx"],
    ["application/srgs", "gram"],
    ["application/srgs+xml", "grxml"],
    ["application/sru+xml", "sru"],
    ["application/ssml+xml", "ssml"],
    ["application/step", ["step", "stp"]],
    ["application/streamingmedia", "ssm"],
    ["application/tei+xml", "tei"],
    ["application/thraud+xml", "tfi"],
    ["application/timestamped-data", "tsd"],
    ["application/toolbook", "tbk"],
    ["application/vda", "vda"],
    ["application/vnd.3gpp.pic-bw-large", "plb"],
    ["application/vnd.3gpp.pic-bw-small", "psb"],
    ["application/vnd.3gpp.pic-bw-var", "pvb"],
    ["application/vnd.3gpp2.tcap", "tcap"],
    ["application/vnd.3m.post-it-notes", "pwn"],
    ["application/vnd.accpac.simply.aso", "aso"],
    ["application/vnd.accpac.simply.imp", "imp"],
    ["application/vnd.acucobol", "acu"],
    ["application/vnd.acucorp", "atc"],
    ["application/vnd.adobe.air-application-installer-package+zip", "air"],
    ["application/vnd.adobe.fxp", "fxp"],
    ["application/vnd.adobe.xdp+xml", "xdp"],
    ["application/vnd.adobe.xfdf", "xfdf"],
    ["application/vnd.ahead.space", "ahead"],
    ["application/vnd.airzip.filesecure.azf", "azf"],
    ["application/vnd.airzip.filesecure.azs", "azs"],
    ["application/vnd.amazon.ebook", "azw"],
    ["application/vnd.americandynamics.acc", "acc"],
    ["application/vnd.amiga.ami", "ami"],
    ["application/vnd.android.package-archive", "apk"],
    ["application/vnd.anser-web-certificate-issue-initiation", "cii"],
    ["application/vnd.anser-web-funds-transfer-initiation", "fti"],
    ["application/vnd.antix.game-component", "atx"],
    ["application/vnd.apple.installer+xml", "mpkg"],
    ["application/vnd.apple.mpegurl", "m3u8"],
    ["application/vnd.aristanetworks.swi", "swi"],
    ["application/vnd.audiograph", "aep"],
    ["application/vnd.blueice.multipass", "mpm"],
    ["application/vnd.bmi", "bmi"],
    ["application/vnd.businessobjects", "rep"],
    ["application/vnd.chemdraw+xml", "cdxml"],
    ["application/vnd.chipnuts.karaoke-mmd", "mmd"],
    ["application/vnd.cinderella", "cdy"],
    ["application/vnd.claymore", "cla"],
    ["application/vnd.cloanto.rp9", "rp9"],
    ["application/vnd.clonk.c4group", "c4g"],
    ["application/vnd.cluetrust.cartomobile-config", "c11amc"],
    ["application/vnd.cluetrust.cartomobile-config-pkg", "c11amz"],
    ["application/vnd.commonspace", "csp"],
    ["application/vnd.contact.cmsg", "cdbcmsg"],
    ["application/vnd.cosmocaller", "cmc"],
    ["application/vnd.crick.clicker", "clkx"],
    ["application/vnd.crick.clicker.keyboard", "clkk"],
    ["application/vnd.crick.clicker.palette", "clkp"],
    ["application/vnd.crick.clicker.template", "clkt"],
    ["application/vnd.crick.clicker.wordbank", "clkw"],
    ["application/vnd.criticaltools.wbs+xml", "wbs"],
    ["application/vnd.ctc-posml", "pml"],
    ["application/vnd.cups-ppd", "ppd"],
    ["application/vnd.curl.car", "car"],
    ["application/vnd.curl.pcurl", "pcurl"],
    ["application/vnd.data-vision.rdz", "rdz"],
    ["application/vnd.denovo.fcselayout-link", "fe_launch"],
    ["application/vnd.dna", "dna"],
    ["application/vnd.dolby.mlp", "mlp"],
    ["application/vnd.dpgraph", "dpg"],
    ["application/vnd.dreamfactory", "dfac"],
    ["application/vnd.dvb.ait", "ait"],
    ["application/vnd.dvb.service", "svc"],
    ["application/vnd.dynageo", "geo"],
    ["application/vnd.ecowin.chart", "mag"],
    ["application/vnd.enliven", "nml"],
    ["application/vnd.epson.esf", "esf"],
    ["application/vnd.epson.msf", "msf"],
    ["application/vnd.epson.quickanime", "qam"],
    ["application/vnd.epson.salt", "slt"],
    ["application/vnd.epson.ssf", "ssf"],
    ["application/vnd.eszigno3+xml", "es3"],
    ["application/vnd.ezpix-album", "ez2"],
    ["application/vnd.ezpix-package", "ez3"],
    ["application/vnd.fdf", "fdf"],
    ["application/vnd.fdsn.seed", "seed"],
    ["application/vnd.flographit", "gph"],
    ["application/vnd.fluxtime.clip", "ftc"],
    ["application/vnd.framemaker", "fm"],
    ["application/vnd.frogans.fnc", "fnc"],
    ["application/vnd.frogans.ltf", "ltf"],
    ["application/vnd.fsc.weblaunch", "fsc"],
    ["application/vnd.fujitsu.oasys", "oas"],
    ["application/vnd.fujitsu.oasys2", "oa2"],
    ["application/vnd.fujitsu.oasys3", "oa3"],
    ["application/vnd.fujitsu.oasysgp", "fg5"],
    ["application/vnd.fujitsu.oasysprs", "bh2"],
    ["application/vnd.fujixerox.ddd", "ddd"],
    ["application/vnd.fujixerox.docuworks", "xdw"],
    ["application/vnd.fujixerox.docuworks.binder", "xbd"],
    ["application/vnd.fuzzysheet", "fzs"],
    ["application/vnd.genomatix.tuxedo", "txd"],
    ["application/vnd.geogebra.file", "ggb"],
    ["application/vnd.geogebra.tool", "ggt"],
    ["application/vnd.geometry-explorer", "gex"],
    ["application/vnd.geonext", "gxt"],
    ["application/vnd.geoplan", "g2w"],
    ["application/vnd.geospace", "g3w"],
    ["application/vnd.gmx", "gmx"],
    ["application/vnd.google-earth.kml+xml", "kml"],
    ["application/vnd.google-earth.kmz", "kmz"],
    ["application/vnd.grafeq", "gqf"],
    ["application/vnd.groove-account", "gac"],
    ["application/vnd.groove-help", "ghf"],
    ["application/vnd.groove-identity-message", "gim"],
    ["application/vnd.groove-injector", "grv"],
    ["application/vnd.groove-tool-message", "gtm"],
    ["application/vnd.groove-tool-template", "tpl"],
    ["application/vnd.groove-vcard", "vcg"],
    ["application/vnd.hal+xml", "hal"],
    ["application/vnd.handheld-entertainment+xml", "zmm"],
    ["application/vnd.hbci", "hbci"],
    ["application/vnd.hhe.lesson-player", "les"],
    ["application/vnd.hp-hpgl", ["hgl", "hpg", "hpgl"]],
    ["application/vnd.hp-hpid", "hpid"],
    ["application/vnd.hp-hps", "hps"],
    ["application/vnd.hp-jlyt", "jlt"],
    ["application/vnd.hp-pcl", "pcl"],
    ["application/vnd.hp-pclxl", "pclxl"],
    ["application/vnd.hydrostatix.sof-data", "sfd-hdstx"],
    ["application/vnd.hzn-3d-crossword", "x3d"],
    ["application/vnd.ibm.minipay", "mpy"],
    ["application/vnd.ibm.modcap", "afp"],
    ["application/vnd.ibm.rights-management", "irm"],
    ["application/vnd.ibm.secure-container", "sc"],
    ["application/vnd.iccprofile", "icc"],
    ["application/vnd.igloader", "igl"],
    ["application/vnd.immervision-ivp", "ivp"],
    ["application/vnd.immervision-ivu", "ivu"],
    ["application/vnd.insors.igm", "igm"],
    ["application/vnd.intercon.formnet", "xpw"],
    ["application/vnd.intergeo", "i2g"],
    ["application/vnd.intu.qbo", "qbo"],
    ["application/vnd.intu.qfx", "qfx"],
    ["application/vnd.ipunplugged.rcprofile", "rcprofile"],
    ["application/vnd.irepository.package+xml", "irp"],
    ["application/vnd.is-xpr", "xpr"],
    ["application/vnd.isac.fcs", "fcs"],
    ["application/vnd.jam", "jam"],
    ["application/vnd.jcp.javame.midlet-rms", "rms"],
    ["application/vnd.jisp", "jisp"],
    ["application/vnd.joost.joda-archive", "joda"],
    ["application/vnd.kahootz", "ktz"],
    ["application/vnd.kde.karbon", "karbon"],
    ["application/vnd.kde.kchart", "chrt"],
    ["application/vnd.kde.kformula", "kfo"],
    ["application/vnd.kde.kivio", "flw"],
    ["application/vnd.kde.kontour", "kon"],
    ["application/vnd.kde.kpresenter", "kpr"],
    ["application/vnd.kde.kspread", "ksp"],
    ["application/vnd.kde.kword", "kwd"],
    ["application/vnd.kenameaapp", "htke"],
    ["application/vnd.kidspiration", "kia"],
    ["application/vnd.kinar", "kne"],
    ["application/vnd.koan", "skp"],
    ["application/vnd.kodak-descriptor", "sse"],
    ["application/vnd.las.las+xml", "lasxml"],
    ["application/vnd.llamagraphics.life-balance.desktop", "lbd"],
    ["application/vnd.llamagraphics.life-balance.exchange+xml", "lbe"],
    ["application/vnd.lotus-1-2-3", "123"],
    ["application/vnd.lotus-approach", "apr"],
    ["application/vnd.lotus-freelance", "pre"],
    ["application/vnd.lotus-notes", "nsf"],
    ["application/vnd.lotus-organizer", "org"],
    ["application/vnd.lotus-screencam", "scm"],
    ["application/vnd.lotus-wordpro", "lwp"],
    ["application/vnd.macports.portpkg", "portpkg"],
    ["application/vnd.mcd", "mcd"],
    ["application/vnd.medcalcdata", "mc1"],
    ["application/vnd.mediastation.cdkey", "cdkey"],
    ["application/vnd.mfer", "mwf"],
    ["application/vnd.mfmp", "mfm"],
    ["application/vnd.micrografx.flo", "flo"],
    ["application/vnd.micrografx.igx", "igx"],
    ["application/vnd.mif", "mif"],
    ["application/vnd.mobius.daf", "daf"],
    ["application/vnd.mobius.dis", "dis"],
    ["application/vnd.mobius.mbk", "mbk"],
    ["application/vnd.mobius.mqy", "mqy"],
    ["application/vnd.mobius.msl", "msl"],
    ["application/vnd.mobius.plc", "plc"],
    ["application/vnd.mobius.txf", "txf"],
    ["application/vnd.mophun.application", "mpn"],
    ["application/vnd.mophun.certificate", "mpc"],
    ["application/vnd.mozilla.xul+xml", "xul"],
    ["application/vnd.ms-artgalry", "cil"],
    ["application/vnd.ms-cab-compressed", "cab"],
    ["application/vnd.ms-excel", ["xls", "xla", "xlc", "xlm", "xlt", "xlw", "xlb", "xll"]],
    ["application/vnd.ms-excel.addin.macroenabled.12", "xlam"],
    ["application/vnd.ms-excel.sheet.binary.macroenabled.12", "xlsb"],
    ["application/vnd.ms-excel.sheet.macroenabled.12", "xlsm"],
    ["application/vnd.ms-excel.template.macroenabled.12", "xltm"],
    ["application/vnd.ms-fontobject", "eot"],
    ["application/vnd.ms-htmlhelp", "chm"],
    ["application/vnd.ms-ims", "ims"],
    ["application/vnd.ms-lrm", "lrm"],
    ["application/vnd.ms-officetheme", "thmx"],
    ["application/vnd.ms-outlook", "msg"],
    ["application/vnd.ms-pki.certstore", "sst"],
    ["application/vnd.ms-pki.pko", "pko"],
    ["application/vnd.ms-pki.seccat", "cat"],
    ["application/vnd.ms-pki.stl", "stl"],
    ["application/vnd.ms-pkicertstore", "sst"],
    ["application/vnd.ms-pkiseccat", "cat"],
    ["application/vnd.ms-pkistl", "stl"],
    ["application/vnd.ms-powerpoint", ["ppt", "pot", "pps", "ppa", "pwz"]],
    ["application/vnd.ms-powerpoint.addin.macroenabled.12", "ppam"],
    ["application/vnd.ms-powerpoint.presentation.macroenabled.12", "pptm"],
    ["application/vnd.ms-powerpoint.slide.macroenabled.12", "sldm"],
    ["application/vnd.ms-powerpoint.slideshow.macroenabled.12", "ppsm"],
    ["application/vnd.ms-powerpoint.template.macroenabled.12", "potm"],
    ["application/vnd.ms-project", "mpp"],
    ["application/vnd.ms-word.document.macroenabled.12", "docm"],
    ["application/vnd.ms-word.template.macroenabled.12", "dotm"],
    ["application/vnd.ms-works", ["wks", "wcm", "wdb", "wps"]],
    ["application/vnd.ms-wpl", "wpl"],
    ["application/vnd.ms-xpsdocument", "xps"],
    ["application/vnd.mseq", "mseq"],
    ["application/vnd.musician", "mus"],
    ["application/vnd.muvee.style", "msty"],
    ["application/vnd.neurolanguage.nlu", "nlu"],
    ["application/vnd.noblenet-directory", "nnd"],
    ["application/vnd.noblenet-sealer", "nns"],
    ["application/vnd.noblenet-web", "nnw"],
    ["application/vnd.nokia.configuration-message", "ncm"],
    ["application/vnd.nokia.n-gage.data", "ngdat"],
    ["application/vnd.nokia.n-gage.symbian.install", "n-gage"],
    ["application/vnd.nokia.radio-preset", "rpst"],
    ["application/vnd.nokia.radio-presets", "rpss"],
    ["application/vnd.nokia.ringing-tone", "rng"],
    ["application/vnd.novadigm.edm", "edm"],
    ["application/vnd.novadigm.edx", "edx"],
    ["application/vnd.novadigm.ext", "ext"],
    ["application/vnd.oasis.opendocument.chart", "odc"],
    ["application/vnd.oasis.opendocument.chart-template", "otc"],
    ["application/vnd.oasis.opendocument.database", "odb"],
    ["application/vnd.oasis.opendocument.formula", "odf"],
    ["application/vnd.oasis.opendocument.formula-template", "odft"],
    ["application/vnd.oasis.opendocument.graphics", "odg"],
    ["application/vnd.oasis.opendocument.graphics-template", "otg"],
    ["application/vnd.oasis.opendocument.image", "odi"],
    ["application/vnd.oasis.opendocument.image-template", "oti"],
    ["application/vnd.oasis.opendocument.presentation", "odp"],
    ["application/vnd.oasis.opendocument.presentation-template", "otp"],
    ["application/vnd.oasis.opendocument.spreadsheet", "ods"],
    ["application/vnd.oasis.opendocument.spreadsheet-template", "ots"],
    ["application/vnd.oasis.opendocument.text", "odt"],
    ["application/vnd.oasis.opendocument.text-master", "odm"],
    ["application/vnd.oasis.opendocument.text-template", "ott"],
    ["application/vnd.oasis.opendocument.text-web", "oth"],
    ["application/vnd.olpc-sugar", "xo"],
    ["application/vnd.oma.dd2+xml", "dd2"],
    ["application/vnd.openofficeorg.extension", "oxt"],
    ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx"],
    ["application/vnd.openxmlformats-officedocument.presentationml.slide", "sldx"],
    ["application/vnd.openxmlformats-officedocument.presentationml.slideshow", "ppsx"],
    ["application/vnd.openxmlformats-officedocument.presentationml.template", "potx"],
    ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
    ["application/vnd.openxmlformats-officedocument.spreadsheetml.template", "xltx"],
    ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
    ["application/vnd.openxmlformats-officedocument.wordprocessingml.template", "dotx"],
    ["application/vnd.osgeo.mapguide.package", "mgp"],
    ["application/vnd.osgi.dp", "dp"],
    ["application/vnd.palm", "pdb"],
    ["application/vnd.pawaafile", "paw"],
    ["application/vnd.pg.format", "str"],
    ["application/vnd.pg.osasli", "ei6"],
    ["application/vnd.picsel", "efif"],
    ["application/vnd.pmi.widget", "wg"],
    ["application/vnd.pocketlearn", "plf"],
    ["application/vnd.powerbuilder6", "pbd"],
    ["application/vnd.previewsystems.box", "box"],
    ["application/vnd.proteus.magazine", "mgz"],
    ["application/vnd.publishare-delta-tree", "qps"],
    ["application/vnd.pvi.ptid1", "ptid"],
    ["application/vnd.quark.quarkxpress", "qxd"],
    ["application/vnd.realvnc.bed", "bed"],
    ["application/vnd.recordare.musicxml", "mxl"],
    ["application/vnd.recordare.musicxml+xml", "musicxml"],
    ["application/vnd.rig.cryptonote", "cryptonote"],
    ["application/vnd.rim.cod", "cod"],
    ["application/vnd.rn-realmedia", "rm"],
    ["application/vnd.rn-realplayer", "rnx"],
    ["application/vnd.route66.link66+xml", "link66"],
    ["application/vnd.sailingtracker.track", "st"],
    ["application/vnd.seemail", "see"],
    ["application/vnd.sema", "sema"],
    ["application/vnd.semd", "semd"],
    ["application/vnd.semf", "semf"],
    ["application/vnd.shana.informed.formdata", "ifm"],
    ["application/vnd.shana.informed.formtemplate", "itp"],
    ["application/vnd.shana.informed.interchange", "iif"],
    ["application/vnd.shana.informed.package", "ipk"],
    ["application/vnd.simtech-mindmapper", "twd"],
    ["application/vnd.smaf", "mmf"],
    ["application/vnd.smart.teacher", "teacher"],
    ["application/vnd.solent.sdkm+xml", "sdkm"],
    ["application/vnd.spotfire.dxp", "dxp"],
    ["application/vnd.spotfire.sfs", "sfs"],
    ["application/vnd.stardivision.calc", "sdc"],
    ["application/vnd.stardivision.draw", "sda"],
    ["application/vnd.stardivision.impress", "sdd"],
    ["application/vnd.stardivision.math", "smf"],
    ["application/vnd.stardivision.writer", "sdw"],
    ["application/vnd.stardivision.writer-global", "sgl"],
    ["application/vnd.stepmania.stepchart", "sm"],
    ["application/vnd.sun.xml.calc", "sxc"],
    ["application/vnd.sun.xml.calc.template", "stc"],
    ["application/vnd.sun.xml.draw", "sxd"],
    ["application/vnd.sun.xml.draw.template", "std"],
    ["application/vnd.sun.xml.impress", "sxi"],
    ["application/vnd.sun.xml.impress.template", "sti"],
    ["application/vnd.sun.xml.math", "sxm"],
    ["application/vnd.sun.xml.writer", "sxw"],
    ["application/vnd.sun.xml.writer.global", "sxg"],
    ["application/vnd.sun.xml.writer.template", "stw"],
    ["application/vnd.sus-calendar", "sus"],
    ["application/vnd.svd", "svd"],
    ["application/vnd.symbian.install", "sis"],
    ["application/vnd.syncml+xml", "xsm"],
    ["application/vnd.syncml.dm+wbxml", "bdm"],
    ["application/vnd.syncml.dm+xml", "xdm"],
    ["application/vnd.tao.intent-module-archive", "tao"],
    ["application/vnd.tmobile-livetv", "tmo"],
    ["application/vnd.trid.tpt", "tpt"],
    ["application/vnd.triscape.mxs", "mxs"],
    ["application/vnd.trueapp", "tra"],
    ["application/vnd.ufdl", "ufd"],
    ["application/vnd.uiq.theme", "utz"],
    ["application/vnd.umajin", "umj"],
    ["application/vnd.unity", "unityweb"],
    ["application/vnd.uoml+xml", "uoml"],
    ["application/vnd.vcx", "vcx"],
    ["application/vnd.visio", "vsd"],
    ["application/vnd.visionary", "vis"],
    ["application/vnd.vsf", "vsf"],
    ["application/vnd.wap.wbxml", "wbxml"],
    ["application/vnd.wap.wmlc", "wmlc"],
    ["application/vnd.wap.wmlscriptc", "wmlsc"],
    ["application/vnd.webturbo", "wtb"],
    ["application/vnd.wolfram.player", "nbp"],
    ["application/vnd.wordperfect", "wpd"],
    ["application/vnd.wqd", "wqd"],
    ["application/vnd.wt.stf", "stf"],
    ["application/vnd.xara", ["web", "xar"]],
    ["application/vnd.xfdl", "xfdl"],
    ["application/vnd.yamaha.hv-dic", "hvd"],
    ["application/vnd.yamaha.hv-script", "hvs"],
    ["application/vnd.yamaha.hv-voice", "hvp"],
    ["application/vnd.yamaha.openscoreformat", "osf"],
    ["application/vnd.yamaha.openscoreformat.osfpvg+xml", "osfpvg"],
    ["application/vnd.yamaha.smaf-audio", "saf"],
    ["application/vnd.yamaha.smaf-phrase", "spf"],
    ["application/vnd.yellowriver-custom-menu", "cmp"],
    ["application/vnd.zul", "zir"],
    ["application/vnd.zzazz.deck+xml", "zaz"],
    ["application/vocaltec-media-desc", "vmd"],
    ["application/vocaltec-media-file", "vmf"],
    ["application/voicexml+xml", "vxml"],
    ["application/widget", "wgt"],
    ["application/winhlp", "hlp"],
    ["application/wordperfect", ["wp", "wp5", "wp6", "wpd"]],
    ["application/wordperfect6.0", ["w60", "wp5"]],
    ["application/wordperfect6.1", "w61"],
    ["application/wsdl+xml", "wsdl"],
    ["application/wspolicy+xml", "wspolicy"],
    ["application/x-123", "wk1"],
    ["application/x-7z-compressed", "7z"],
    ["application/x-abiword", "abw"],
    ["application/x-ace-compressed", "ace"],
    ["application/x-aim", "aim"],
    ["application/x-authorware-bin", "aab"],
    ["application/x-authorware-map", "aam"],
    ["application/x-authorware-seg", "aas"],
    ["application/x-bcpio", "bcpio"],
    ["application/x-binary", "bin"],
    ["application/x-binhex40", "hqx"],
    ["application/x-bittorrent", "torrent"],
    ["application/x-bsh", ["bsh", "sh", "shar"]],
    ["application/x-bytecode.elisp", "elc"],
    ["application/x-bytecode.python", "pyc"],
    ["application/x-bzip", "bz"],
    ["application/x-bzip2", ["boz", "bz2"]],
    ["application/x-cdf", "cdf"],
    ["application/x-cdlink", "vcd"],
    ["application/x-chat", ["cha", "chat"]],
    ["application/x-chess-pgn", "pgn"],
    ["application/x-cmu-raster", "ras"],
    ["application/x-cocoa", "cco"],
    ["application/x-compactpro", "cpt"],
    ["application/x-compress", "z"],
    ["application/x-compressed", ["tgz", "gz", "z", "zip"]],
    ["application/x-conference", "nsc"],
    ["application/x-cpio", "cpio"],
    ["application/x-cpt", "cpt"],
    ["application/x-csh", "csh"],
    ["application/x-debian-package", "deb"],
    ["application/x-deepv", "deepv"],
    ["application/x-director", ["dir", "dcr", "dxr"]],
    ["application/x-doom", "wad"],
    ["application/x-dtbncx+xml", "ncx"],
    ["application/x-dtbook+xml", "dtb"],
    ["application/x-dtbresource+xml", "res"],
    ["application/x-dvi", "dvi"],
    ["application/x-elc", "elc"],
    ["application/x-envoy", ["env", "evy"]],
    ["application/x-esrehber", "es"],
    ["application/x-excel", ["xls", "xla", "xlb", "xlc", "xld", "xlk", "xll", "xlm", "xlt", "xlv", "xlw"]],
    ["application/x-font-bdf", "bdf"],
    ["application/x-font-ghostscript", "gsf"],
    ["application/x-font-linux-psf", "psf"],
    ["application/x-font-otf", "otf"],
    ["application/x-font-pcf", "pcf"],
    ["application/x-font-snf", "snf"],
    ["application/x-font-ttf", "ttf"],
    ["application/x-font-type1", "pfa"],
    ["application/x-font-woff", "woff"],
    ["application/x-frame", "mif"],
    ["application/x-freelance", "pre"],
    ["application/x-futuresplash", "spl"],
    ["application/x-gnumeric", "gnumeric"],
    ["application/x-gsp", "gsp"],
    ["application/x-gss", "gss"],
    ["application/x-gtar", "gtar"],
    ["application/x-gzip", ["gz", "gzip"]],
    ["application/x-hdf", "hdf"],
    ["application/x-helpfile", ["help", "hlp"]],
    ["application/x-httpd-imap", "imap"],
    ["application/x-ima", "ima"],
    ["application/x-internet-signup", ["ins", "isp"]],
    ["application/x-internett-signup", "ins"],
    ["application/x-inventor", "iv"],
    ["application/x-ip2", "ip"],
    ["application/x-iphone", "iii"],
    ["application/x-java-class", "class"],
    ["application/x-java-commerce", "jcm"],
    ["application/x-java-jnlp-file", "jnlp"],
    ["application/x-javascript", "js"],
    ["application/x-koan", ["skd", "skm", "skp", "skt"]],
    ["application/x-ksh", "ksh"],
    ["application/x-latex", ["latex", "ltx"]],
    ["application/x-lha", "lha"],
    ["application/x-lisp", "lsp"],
    ["application/x-livescreen", "ivy"],
    ["application/x-lotus", "wq1"],
    ["application/x-lotusscreencam", "scm"],
    ["application/x-lzh", "lzh"],
    ["application/x-lzx", "lzx"],
    ["application/x-mac-binhex40", "hqx"],
    ["application/x-macbinary", "bin"],
    ["application/x-magic-cap-package-1.0", "mc$"],
    ["application/x-mathcad", "mcd"],
    ["application/x-meme", "mm"],
    ["application/x-midi", ["mid", "midi"]],
    ["application/x-mif", "mif"],
    ["application/x-mix-transfer", "nix"],
    ["application/x-mobipocket-ebook", "prc"],
    ["application/x-mplayer2", "asx"],
    ["application/x-ms-application", "application"],
    ["application/x-ms-wmd", "wmd"],
    ["application/x-ms-wmz", "wmz"],
    ["application/x-ms-xbap", "xbap"],
    ["application/x-msaccess", "mdb"],
    ["application/x-msbinder", "obd"],
    ["application/x-mscardfile", "crd"],
    ["application/x-msclip", "clp"],
    ["application/x-msdownload", ["exe", "dll"]],
    ["application/x-msexcel", ["xls", "xla", "xlw"]],
    ["application/x-msmediaview", ["mvb", "m13", "m14"]],
    ["application/x-msmetafile", "wmf"],
    ["application/x-msmoney", "mny"],
    ["application/x-mspowerpoint", "ppt"],
    ["application/x-mspublisher", "pub"],
    ["application/x-msschedule", "scd"],
    ["application/x-msterminal", "trm"],
    ["application/x-mswrite", "wri"],
    ["application/x-navi-animation", "ani"],
    ["application/x-navidoc", "nvd"],
    ["application/x-navimap", "map"],
    ["application/x-navistyle", "stl"],
    ["application/x-netcdf", ["cdf", "nc"]],
    ["application/x-newton-compatible-pkg", "pkg"],
    ["application/x-nokia-9000-communicator-add-on-software", "aos"],
    ["application/x-omc", "omc"],
    ["application/x-omcdatamaker", "omcd"],
    ["application/x-omcregerator", "omcr"],
    ["application/x-pagemaker", ["pm4", "pm5"]],
    ["application/x-pcl", "pcl"],
    ["application/x-perfmon", ["pma", "pmc", "pml", "pmr", "pmw"]],
    ["application/x-pixclscript", "plx"],
    ["application/x-pkcs10", "p10"],
    ["application/x-pkcs12", ["p12", "pfx"]],
    ["application/x-pkcs7-certificates", ["p7b", "spc"]],
    ["application/x-pkcs7-certreqresp", "p7r"],
    ["application/x-pkcs7-mime", ["p7m", "p7c"]],
    ["application/x-pkcs7-signature", ["p7s", "p7a"]],
    ["application/x-pointplus", "css"],
    ["application/x-portable-anymap", "pnm"],
    ["application/x-project", ["mpc", "mpt", "mpv", "mpx"]],
    ["application/x-qpro", "wb1"],
    ["application/x-rar-compressed", "rar"],
    ["application/x-rtf", "rtf"],
    ["application/x-sdp", "sdp"],
    ["application/x-sea", "sea"],
    ["application/x-seelogo", "sl"],
    ["application/x-sh", "sh"],
    ["application/x-shar", ["shar", "sh"]],
    ["application/x-shockwave-flash", "swf"],
    ["application/x-silverlight-app", "xap"],
    ["application/x-sit", "sit"],
    ["application/x-sprite", ["spr", "sprite"]],
    ["application/x-stuffit", "sit"],
    ["application/x-stuffitx", "sitx"],
    ["application/x-sv4cpio", "sv4cpio"],
    ["application/x-sv4crc", "sv4crc"],
    ["application/x-tar", "tar"],
    ["application/x-tbook", ["sbk", "tbk"]],
    ["application/x-tcl", "tcl"],
    ["application/x-tex", "tex"],
    ["application/x-tex-tfm", "tfm"],
    ["application/x-texinfo", ["texi", "texinfo"]],
    ["application/x-troff", ["roff", "t", "tr"]],
    ["application/x-troff-man", "man"],
    ["application/x-troff-me", "me"],
    ["application/x-troff-ms", "ms"],
    ["application/x-troff-msvideo", "avi"],
    ["application/x-ustar", "ustar"],
    ["application/x-visio", ["vsd", "vst", "vsw"]],
    ["application/x-vnd.audioexplosion.mzz", "mzz"],
    ["application/x-vnd.ls-xpix", "xpix"],
    ["application/x-vrml", "vrml"],
    ["application/x-wais-source", ["src", "wsrc"]],
    ["application/x-winhelp", "hlp"],
    ["application/x-wintalk", "wtk"],
    ["application/x-world", ["wrl", "svr"]],
    ["application/x-wpwin", "wpd"],
    ["application/x-wri", "wri"],
    ["application/x-x509-ca-cert", ["cer", "crt", "der"]],
    ["application/x-x509-user-cert", "crt"],
    ["application/x-xfig", "fig"],
    ["application/x-xpinstall", "xpi"],
    ["application/x-zip-compressed", "zip"],
    ["application/xcap-diff+xml", "xdf"],
    ["application/xenc+xml", "xenc"],
    ["application/xhtml+xml", "xhtml"],
    ["application/xml", "xml"],
    ["application/xml-dtd", "dtd"],
    ["application/xop+xml", "xop"],
    ["application/xslt+xml", "xslt"],
    ["application/xspf+xml", "xspf"],
    ["application/xv+xml", "mxml"],
    ["application/yang", "yang"],
    ["application/yin+xml", "yin"],
    ["application/ynd.ms-pkipko", "pko"],
    ["application/zip", "zip"],
    ["audio/adpcm", "adp"],
    ["audio/aiff", ["aiff", "aif", "aifc"]],
    ["audio/basic", ["snd", "au"]],
    ["audio/it", "it"],
    ["audio/make", ["funk", "my", "pfunk"]],
    ["audio/make.my.funk", "pfunk"],
    ["audio/mid", ["mid", "rmi"]],
    ["audio/midi", ["midi", "kar", "mid"]],
    ["audio/mod", "mod"],
    ["audio/mp4", "mp4a"],
    ["audio/mpeg", ["mpga", "mp3", "m2a", "mp2", "mpa", "mpg"]],
    ["audio/mpeg3", "mp3"],
    ["audio/nspaudio", ["la", "lma"]],
    ["audio/ogg", "oga"],
    ["audio/s3m", "s3m"],
    ["audio/tsp-audio", "tsi"],
    ["audio/tsplayer", "tsp"],
    ["audio/vnd.dece.audio", "uva"],
    ["audio/vnd.digital-winds", "eol"],
    ["audio/vnd.dra", "dra"],
    ["audio/vnd.dts", "dts"],
    ["audio/vnd.dts.hd", "dtshd"],
    ["audio/vnd.lucent.voice", "lvp"],
    ["audio/vnd.ms-playready.media.pya", "pya"],
    ["audio/vnd.nuera.ecelp4800", "ecelp4800"],
    ["audio/vnd.nuera.ecelp7470", "ecelp7470"],
    ["audio/vnd.nuera.ecelp9600", "ecelp9600"],
    ["audio/vnd.qcelp", "qcp"],
    ["audio/vnd.rip", "rip"],
    ["audio/voc", "voc"],
    ["audio/voxware", "vox"],
    ["audio/wav", "wav"],
    ["audio/webm", "weba"],
    ["audio/x-aac", "aac"],
    ["audio/x-adpcm", "snd"],
    ["audio/x-aiff", ["aiff", "aif", "aifc"]],
    ["audio/x-au", "au"],
    ["audio/x-gsm", ["gsd", "gsm"]],
    ["audio/x-jam", "jam"],
    ["audio/x-liveaudio", "lam"],
    ["audio/x-mid", ["mid", "midi"]],
    ["audio/x-midi", ["midi", "mid"]],
    ["audio/x-mod", "mod"],
    ["audio/x-mpeg", "mp2"],
    ["audio/x-mpeg-3", "mp3"],
    ["audio/x-mpegurl", "m3u"],
    ["audio/x-mpequrl", "m3u"],
    ["audio/x-ms-wax", "wax"],
    ["audio/x-ms-wma", "wma"],
    ["audio/x-nspaudio", ["la", "lma"]],
    ["audio/x-pn-realaudio", ["ra", "ram", "rm", "rmm", "rmp"]],
    ["audio/x-pn-realaudio-plugin", ["ra", "rmp", "rpm"]],
    ["audio/x-psid", "sid"],
    ["audio/x-realaudio", "ra"],
    ["audio/x-twinvq", "vqf"],
    ["audio/x-twinvq-plugin", ["vqe", "vql"]],
    ["audio/x-vnd.audioexplosion.mjuicemediafile", "mjf"],
    ["audio/x-voc", "voc"],
    ["audio/x-wav", "wav"],
    ["audio/xm", "xm"],
    ["chemical/x-cdx", "cdx"],
    ["chemical/x-cif", "cif"],
    ["chemical/x-cmdf", "cmdf"],
    ["chemical/x-cml", "cml"],
    ["chemical/x-csml", "csml"],
    ["chemical/x-pdb", ["pdb", "xyz"]],
    ["chemical/x-xyz", "xyz"],
    ["drawing/x-dwf", "dwf"],
    ["i-world/i-vrml", "ivr"],
    ["image/bmp", ["bmp", "bm"]],
    ["image/cgm", "cgm"],
    ["image/cis-cod", "cod"],
    ["image/cmu-raster", ["ras", "rast"]],
    ["image/fif", "fif"],
    ["image/florian", ["flo", "turbot"]],
    ["image/g3fax", "g3"],
    ["image/gif", "gif"],
    ["image/ief", ["ief", "iefs"]],
    ["image/jpeg", ["jpeg", "jpe", "jpg", "jfif", "jfif-tbnl"]],
    ["image/jutvision", "jut"],
    ["image/ktx", "ktx"],
    ["image/naplps", ["nap", "naplps"]],
    ["image/pict", ["pic", "pict"]],
    ["image/pipeg", "jfif"],
    ["image/pjpeg", ["jfif", "jpe", "jpeg", "jpg"]],
    ["image/png", ["png", "x-png"]],
    ["image/prs.btif", "btif"],
    ["image/svg+xml", "svg"],
    ["image/tiff", ["tif", "tiff"]],
    ["image/vasa", "mcf"],
    ["image/vnd.adobe.photoshop", "psd"],
    ["image/vnd.dece.graphic", "uvi"],
    ["image/vnd.djvu", "djvu"],
    ["image/vnd.dvb.subtitle", "sub"],
    ["image/vnd.dwg", ["dwg", "dxf", "svf"]],
    ["image/vnd.dxf", "dxf"],
    ["image/vnd.fastbidsheet", "fbs"],
    ["image/vnd.fpx", "fpx"],
    ["image/vnd.fst", "fst"],
    ["image/vnd.fujixerox.edmics-mmr", "mmr"],
    ["image/vnd.fujixerox.edmics-rlc", "rlc"],
    ["image/vnd.ms-modi", "mdi"],
    ["image/vnd.net-fpx", ["fpx", "npx"]],
    ["image/vnd.rn-realflash", "rf"],
    ["image/vnd.rn-realpix", "rp"],
    ["image/vnd.wap.wbmp", "wbmp"],
    ["image/vnd.xiff", "xif"],
    ["image/webp", "webp"],
    ["image/x-cmu-raster", "ras"],
    ["image/x-cmx", "cmx"],
    ["image/x-dwg", ["dwg", "dxf", "svf"]],
    ["image/x-freehand", "fh"],
    ["image/x-icon", "ico"],
    ["image/x-jg", "art"],
    ["image/x-jps", "jps"],
    ["image/x-niff", ["niff", "nif"]],
    ["image/x-pcx", "pcx"],
    ["image/x-pict", ["pct", "pic"]],
    ["image/x-portable-anymap", "pnm"],
    ["image/x-portable-bitmap", "pbm"],
    ["image/x-portable-graymap", "pgm"],
    ["image/x-portable-greymap", "pgm"],
    ["image/x-portable-pixmap", "ppm"],
    ["image/x-quicktime", ["qif", "qti", "qtif"]],
    ["image/x-rgb", "rgb"],
    ["image/x-tiff", ["tif", "tiff"]],
    ["image/x-windows-bmp", "bmp"],
    ["image/x-xbitmap", "xbm"],
    ["image/x-xbm", "xbm"],
    ["image/x-xpixmap", ["xpm", "pm"]],
    ["image/x-xwd", "xwd"],
    ["image/x-xwindowdump", "xwd"],
    ["image/xbm", "xbm"],
    ["image/xpm", "xpm"],
    ["message/rfc822", ["eml", "mht", "mhtml", "nws", "mime"]],
    ["model/iges", ["iges", "igs"]],
    ["model/mesh", "msh"],
    ["model/vnd.collada+xml", "dae"],
    ["model/vnd.dwf", "dwf"],
    ["model/vnd.gdl", "gdl"],
    ["model/vnd.gtw", "gtw"],
    ["model/vnd.mts", "mts"],
    ["model/vnd.vtu", "vtu"],
    ["model/vrml", ["vrml", "wrl", "wrz"]],
    ["model/x-pov", "pov"],
    ["multipart/x-gzip", "gzip"],
    ["multipart/x-ustar", "ustar"],
    ["multipart/x-zip", "zip"],
    ["music/crescendo", ["mid", "midi"]],
    ["music/x-karaoke", "kar"],
    ["paleovu/x-pv", "pvu"],
    ["text/asp", "asp"],
    ["text/calendar", "ics"],
    ["text/css", "css"],
    ["text/csv", "csv"],
    ["text/ecmascript", "js"],
    ["text/h323", "323"],
    ["text/html", ["html", "htm", "stm", "acgi", "htmls", "htx", "shtml"]],
    ["text/iuls", "uls"],
    ["text/javascript", "js"],
    ["text/mcf", "mcf"],
    ["text/n3", "n3"],
    ["text/pascal", "pas"],
    [
      "text/plain",
      [
        "txt",
        "bas",
        "c",
        "h",
        "c++",
        "cc",
        "com",
        "conf",
        "cxx",
        "def",
        "f",
        "f90",
        "for",
        "g",
        "hh",
        "idc",
        "jav",
        "java",
        "list",
        "log",
        "lst",
        "m",
        "mar",
        "pl",
        "sdml",
        "text"
      ]
    ],
    ["text/plain-bas", "par"],
    ["text/prs.lines.tag", "dsc"],
    ["text/richtext", ["rtx", "rt", "rtf"]],
    ["text/scriplet", "wsc"],
    ["text/scriptlet", "sct"],
    ["text/sgml", ["sgm", "sgml"]],
    ["text/tab-separated-values", "tsv"],
    ["text/troff", "t"],
    ["text/turtle", "ttl"],
    ["text/uri-list", ["uni", "unis", "uri", "uris"]],
    ["text/vnd.abc", "abc"],
    ["text/vnd.curl", "curl"],
    ["text/vnd.curl.dcurl", "dcurl"],
    ["text/vnd.curl.mcurl", "mcurl"],
    ["text/vnd.curl.scurl", "scurl"],
    ["text/vnd.fly", "fly"],
    ["text/vnd.fmi.flexstor", "flx"],
    ["text/vnd.graphviz", "gv"],
    ["text/vnd.in3d.3dml", "3dml"],
    ["text/vnd.in3d.spot", "spot"],
    ["text/vnd.rn-realtext", "rt"],
    ["text/vnd.sun.j2me.app-descriptor", "jad"],
    ["text/vnd.wap.wml", "wml"],
    ["text/vnd.wap.wmlscript", "wmls"],
    ["text/webviewhtml", "htt"],
    ["text/x-asm", ["asm", "s"]],
    ["text/x-audiosoft-intra", "aip"],
    ["text/x-c", ["c", "cc", "cpp"]],
    ["text/x-component", "htc"],
    ["text/x-fortran", ["for", "f", "f77", "f90"]],
    ["text/x-h", ["h", "hh"]],
    ["text/x-java-source", ["java", "jav"]],
    ["text/x-java-source,java", "java"],
    ["text/x-la-asf", "lsx"],
    ["text/x-m", "m"],
    ["text/x-pascal", "p"],
    ["text/x-script", "hlb"],
    ["text/x-script.csh", "csh"],
    ["text/x-script.elisp", "el"],
    ["text/x-script.guile", "scm"],
    ["text/x-script.ksh", "ksh"],
    ["text/x-script.lisp", "lsp"],
    ["text/x-script.perl", "pl"],
    ["text/x-script.perl-module", "pm"],
    ["text/x-script.phyton", "py"],
    ["text/x-script.rexx", "rexx"],
    ["text/x-script.scheme", "scm"],
    ["text/x-script.sh", "sh"],
    ["text/x-script.tcl", "tcl"],
    ["text/x-script.tcsh", "tcsh"],
    ["text/x-script.zsh", "zsh"],
    ["text/x-server-parsed-html", ["shtml", "ssi"]],
    ["text/x-setext", "etx"],
    ["text/x-sgml", ["sgm", "sgml"]],
    ["text/x-speech", ["spc", "talk"]],
    ["text/x-uil", "uil"],
    ["text/x-uuencode", ["uu", "uue"]],
    ["text/x-vcalendar", "vcs"],
    ["text/x-vcard", "vcf"],
    ["text/xml", "xml"],
    ["video/3gpp", "3gp"],
    ["video/3gpp2", "3g2"],
    ["video/animaflex", "afl"],
    ["video/avi", "avi"],
    ["video/avs-video", "avs"],
    ["video/dl", "dl"],
    ["video/fli", "fli"],
    ["video/gl", "gl"],
    ["video/h261", "h261"],
    ["video/h263", "h263"],
    ["video/h264", "h264"],
    ["video/jpeg", "jpgv"],
    ["video/jpm", "jpm"],
    ["video/mj2", "mj2"],
    ["video/mp4", "mp4"],
    ["video/mpeg", ["mpeg", "mp2", "mpa", "mpe", "mpg", "mpv2", "m1v", "m2v", "mp3"]],
    ["video/msvideo", "avi"],
    ["video/ogg", "ogv"],
    ["video/quicktime", ["mov", "qt", "moov"]],
    ["video/vdo", "vdo"],
    ["video/vivo", ["viv", "vivo"]],
    ["video/vnd.dece.hd", "uvh"],
    ["video/vnd.dece.mobile", "uvm"],
    ["video/vnd.dece.pd", "uvp"],
    ["video/vnd.dece.sd", "uvs"],
    ["video/vnd.dece.video", "uvv"],
    ["video/vnd.fvt", "fvt"],
    ["video/vnd.mpegurl", "mxu"],
    ["video/vnd.ms-playready.media.pyv", "pyv"],
    ["video/vnd.rn-realvideo", "rv"],
    ["video/vnd.uvvu.mp4", "uvu"],
    ["video/vnd.vivo", ["viv", "vivo"]],
    ["video/vosaic", "vos"],
    ["video/webm", "webm"],
    ["video/x-amt-demorun", "xdr"],
    ["video/x-amt-showrun", "xsr"],
    ["video/x-atomic3d-feature", "fmf"],
    ["video/x-dl", "dl"],
    ["video/x-dv", ["dif", "dv"]],
    ["video/x-f4v", "f4v"],
    ["video/x-fli", "fli"],
    ["video/x-flv", "flv"],
    ["video/x-gl", "gl"],
    ["video/x-isvideo", "isu"],
    ["video/x-la-asf", ["lsf", "lsx"]],
    ["video/x-m4v", "m4v"],
    ["video/x-motion-jpeg", "mjpg"],
    ["video/x-mpeg", ["mp3", "mp2"]],
    ["video/x-mpeq2a", "mp2"],
    ["video/x-ms-asf", ["asf", "asr", "asx"]],
    ["video/x-ms-asf-plugin", "asx"],
    ["video/x-ms-wm", "wm"],
    ["video/x-ms-wmv", "wmv"],
    ["video/x-ms-wmx", "wmx"],
    ["video/x-ms-wvx", "wvx"],
    ["video/x-msvideo", "avi"],
    ["video/x-qtc", "qtc"],
    ["video/x-scm", "scm"],
    ["video/x-sgi-movie", ["movie", "mv"]],
    ["windows/metafile", "wmf"],
    ["www/mime", "mime"],
    ["x-conference/x-cooltalk", "ice"],
    ["x-music/x-midi", ["mid", "midi"]],
    ["x-world/x-3dmf", ["3dm", "3dmf", "qd3", "qd3d"]],
    ["x-world/x-svr", "svr"],
    ["x-world/x-vrml", ["flr", "vrml", "wrl", "wrz", "xaf", "xof"]],
    ["x-world/x-vrt", "vrt"],
    ["xgl/drawing", "xgz"],
    ["xgl/movie", "xmz"]
  ]), r = /* @__PURE__ */ new Map([
    ["123", "application/vnd.lotus-1-2-3"],
    ["323", "text/h323"],
    ["*", "application/octet-stream"],
    ["3dm", "x-world/x-3dmf"],
    ["3dmf", "x-world/x-3dmf"],
    ["3dml", "text/vnd.in3d.3dml"],
    ["3g2", "video/3gpp2"],
    ["3gp", "video/3gpp"],
    ["7z", "application/x-7z-compressed"],
    ["a", "application/octet-stream"],
    ["aab", "application/x-authorware-bin"],
    ["aac", "audio/x-aac"],
    ["aam", "application/x-authorware-map"],
    ["aas", "application/x-authorware-seg"],
    ["abc", "text/vnd.abc"],
    ["abw", "application/x-abiword"],
    ["ac", "application/pkix-attr-cert"],
    ["acc", "application/vnd.americandynamics.acc"],
    ["ace", "application/x-ace-compressed"],
    ["acgi", "text/html"],
    ["acu", "application/vnd.acucobol"],
    ["acx", "application/internet-property-stream"],
    ["adp", "audio/adpcm"],
    ["aep", "application/vnd.audiograph"],
    ["afl", "video/animaflex"],
    ["afp", "application/vnd.ibm.modcap"],
    ["ahead", "application/vnd.ahead.space"],
    ["ai", "application/postscript"],
    ["aif", ["audio/aiff", "audio/x-aiff"]],
    ["aifc", ["audio/aiff", "audio/x-aiff"]],
    ["aiff", ["audio/aiff", "audio/x-aiff"]],
    ["aim", "application/x-aim"],
    ["aip", "text/x-audiosoft-intra"],
    ["air", "application/vnd.adobe.air-application-installer-package+zip"],
    ["ait", "application/vnd.dvb.ait"],
    ["ami", "application/vnd.amiga.ami"],
    ["ani", "application/x-navi-animation"],
    ["aos", "application/x-nokia-9000-communicator-add-on-software"],
    ["apk", "application/vnd.android.package-archive"],
    ["application", "application/x-ms-application"],
    ["apr", "application/vnd.lotus-approach"],
    ["aps", "application/mime"],
    ["arc", "application/octet-stream"],
    ["arj", ["application/arj", "application/octet-stream"]],
    ["art", "image/x-jg"],
    ["asf", "video/x-ms-asf"],
    ["asm", "text/x-asm"],
    ["aso", "application/vnd.accpac.simply.aso"],
    ["asp", "text/asp"],
    ["asr", "video/x-ms-asf"],
    ["asx", ["video/x-ms-asf", "application/x-mplayer2", "video/x-ms-asf-plugin"]],
    ["atc", "application/vnd.acucorp"],
    ["atomcat", "application/atomcat+xml"],
    ["atomsvc", "application/atomsvc+xml"],
    ["atx", "application/vnd.antix.game-component"],
    ["au", ["audio/basic", "audio/x-au"]],
    ["avi", ["video/avi", "video/msvideo", "application/x-troff-msvideo", "video/x-msvideo"]],
    ["avs", "video/avs-video"],
    ["aw", "application/applixware"],
    ["axs", "application/olescript"],
    ["azf", "application/vnd.airzip.filesecure.azf"],
    ["azs", "application/vnd.airzip.filesecure.azs"],
    ["azw", "application/vnd.amazon.ebook"],
    ["bas", "text/plain"],
    ["bcpio", "application/x-bcpio"],
    ["bdf", "application/x-font-bdf"],
    ["bdm", "application/vnd.syncml.dm+wbxml"],
    ["bed", "application/vnd.realvnc.bed"],
    ["bh2", "application/vnd.fujitsu.oasysprs"],
    [
      "bin",
      ["application/octet-stream", "application/mac-binary", "application/macbinary", "application/x-macbinary", "application/x-binary"]
    ],
    ["bm", "image/bmp"],
    ["bmi", "application/vnd.bmi"],
    ["bmp", ["image/bmp", "image/x-windows-bmp"]],
    ["boo", "application/book"],
    ["book", "application/book"],
    ["box", "application/vnd.previewsystems.box"],
    ["boz", "application/x-bzip2"],
    ["bsh", "application/x-bsh"],
    ["btif", "image/prs.btif"],
    ["bz", "application/x-bzip"],
    ["bz2", "application/x-bzip2"],
    ["c", ["text/plain", "text/x-c"]],
    ["c++", "text/plain"],
    ["c11amc", "application/vnd.cluetrust.cartomobile-config"],
    ["c11amz", "application/vnd.cluetrust.cartomobile-config-pkg"],
    ["c4g", "application/vnd.clonk.c4group"],
    ["cab", "application/vnd.ms-cab-compressed"],
    ["car", "application/vnd.curl.car"],
    ["cat", ["application/vnd.ms-pkiseccat", "application/vnd.ms-pki.seccat"]],
    ["cc", ["text/plain", "text/x-c"]],
    ["ccad", "application/clariscad"],
    ["cco", "application/x-cocoa"],
    ["ccxml", "application/ccxml+xml,"],
    ["cdbcmsg", "application/vnd.contact.cmsg"],
    ["cdf", ["application/cdf", "application/x-cdf", "application/x-netcdf"]],
    ["cdkey", "application/vnd.mediastation.cdkey"],
    ["cdmia", "application/cdmi-capability"],
    ["cdmic", "application/cdmi-container"],
    ["cdmid", "application/cdmi-domain"],
    ["cdmio", "application/cdmi-object"],
    ["cdmiq", "application/cdmi-queue"],
    ["cdx", "chemical/x-cdx"],
    ["cdxml", "application/vnd.chemdraw+xml"],
    ["cdy", "application/vnd.cinderella"],
    ["cer", ["application/pkix-cert", "application/x-x509-ca-cert"]],
    ["cgm", "image/cgm"],
    ["cha", "application/x-chat"],
    ["chat", "application/x-chat"],
    ["chm", "application/vnd.ms-htmlhelp"],
    ["chrt", "application/vnd.kde.kchart"],
    ["cif", "chemical/x-cif"],
    ["cii", "application/vnd.anser-web-certificate-issue-initiation"],
    ["cil", "application/vnd.ms-artgalry"],
    ["cla", "application/vnd.claymore"],
    [
      "class",
      ["application/octet-stream", "application/java", "application/java-byte-code", "application/java-vm", "application/x-java-class"]
    ],
    ["clkk", "application/vnd.crick.clicker.keyboard"],
    ["clkp", "application/vnd.crick.clicker.palette"],
    ["clkt", "application/vnd.crick.clicker.template"],
    ["clkw", "application/vnd.crick.clicker.wordbank"],
    ["clkx", "application/vnd.crick.clicker"],
    ["clp", "application/x-msclip"],
    ["cmc", "application/vnd.cosmocaller"],
    ["cmdf", "chemical/x-cmdf"],
    ["cml", "chemical/x-cml"],
    ["cmp", "application/vnd.yellowriver-custom-menu"],
    ["cmx", "image/x-cmx"],
    ["cod", ["image/cis-cod", "application/vnd.rim.cod"]],
    ["com", ["application/octet-stream", "text/plain"]],
    ["conf", "text/plain"],
    ["cpio", "application/x-cpio"],
    ["cpp", "text/x-c"],
    ["cpt", ["application/mac-compactpro", "application/x-compactpro", "application/x-cpt"]],
    ["crd", "application/x-mscardfile"],
    ["crl", ["application/pkix-crl", "application/pkcs-crl"]],
    ["crt", ["application/pkix-cert", "application/x-x509-user-cert", "application/x-x509-ca-cert"]],
    ["cryptonote", "application/vnd.rig.cryptonote"],
    ["csh", ["text/x-script.csh", "application/x-csh"]],
    ["csml", "chemical/x-csml"],
    ["csp", "application/vnd.commonspace"],
    ["css", ["text/css", "application/x-pointplus"]],
    ["csv", "text/csv"],
    ["cu", "application/cu-seeme"],
    ["curl", "text/vnd.curl"],
    ["cww", "application/prs.cww"],
    ["cxx", "text/plain"],
    ["dae", "model/vnd.collada+xml"],
    ["daf", "application/vnd.mobius.daf"],
    ["davmount", "application/davmount+xml"],
    ["dcr", "application/x-director"],
    ["dcurl", "text/vnd.curl.dcurl"],
    ["dd2", "application/vnd.oma.dd2+xml"],
    ["ddd", "application/vnd.fujixerox.ddd"],
    ["deb", "application/x-debian-package"],
    ["deepv", "application/x-deepv"],
    ["def", "text/plain"],
    ["der", "application/x-x509-ca-cert"],
    ["dfac", "application/vnd.dreamfactory"],
    ["dif", "video/x-dv"],
    ["dir", "application/x-director"],
    ["dis", "application/vnd.mobius.dis"],
    ["djvu", "image/vnd.djvu"],
    ["dl", ["video/dl", "video/x-dl"]],
    ["dll", "application/x-msdownload"],
    ["dms", "application/octet-stream"],
    ["dna", "application/vnd.dna"],
    ["doc", "application/msword"],
    ["docm", "application/vnd.ms-word.document.macroenabled.12"],
    ["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    ["dot", "application/msword"],
    ["dotm", "application/vnd.ms-word.template.macroenabled.12"],
    ["dotx", "application/vnd.openxmlformats-officedocument.wordprocessingml.template"],
    ["dp", ["application/commonground", "application/vnd.osgi.dp"]],
    ["dpg", "application/vnd.dpgraph"],
    ["dra", "audio/vnd.dra"],
    ["drw", "application/drafting"],
    ["dsc", "text/prs.lines.tag"],
    ["dssc", "application/dssc+der"],
    ["dtb", "application/x-dtbook+xml"],
    ["dtd", "application/xml-dtd"],
    ["dts", "audio/vnd.dts"],
    ["dtshd", "audio/vnd.dts.hd"],
    ["dump", "application/octet-stream"],
    ["dv", "video/x-dv"],
    ["dvi", "application/x-dvi"],
    ["dwf", ["model/vnd.dwf", "drawing/x-dwf"]],
    ["dwg", ["application/acad", "image/vnd.dwg", "image/x-dwg"]],
    ["dxf", ["application/dxf", "image/vnd.dwg", "image/vnd.dxf", "image/x-dwg"]],
    ["dxp", "application/vnd.spotfire.dxp"],
    ["dxr", "application/x-director"],
    ["ecelp4800", "audio/vnd.nuera.ecelp4800"],
    ["ecelp7470", "audio/vnd.nuera.ecelp7470"],
    ["ecelp9600", "audio/vnd.nuera.ecelp9600"],
    ["edm", "application/vnd.novadigm.edm"],
    ["edx", "application/vnd.novadigm.edx"],
    ["efif", "application/vnd.picsel"],
    ["ei6", "application/vnd.pg.osasli"],
    ["el", "text/x-script.elisp"],
    ["elc", ["application/x-elc", "application/x-bytecode.elisp"]],
    ["eml", "message/rfc822"],
    ["emma", "application/emma+xml"],
    ["env", "application/x-envoy"],
    ["eol", "audio/vnd.digital-winds"],
    ["eot", "application/vnd.ms-fontobject"],
    ["eps", "application/postscript"],
    ["epub", "application/epub+zip"],
    ["es", ["application/ecmascript", "application/x-esrehber"]],
    ["es3", "application/vnd.eszigno3+xml"],
    ["esf", "application/vnd.epson.esf"],
    ["etx", "text/x-setext"],
    ["evy", ["application/envoy", "application/x-envoy"]],
    ["exe", ["application/octet-stream", "application/x-msdownload"]],
    ["exi", "application/exi"],
    ["ext", "application/vnd.novadigm.ext"],
    ["ez2", "application/vnd.ezpix-album"],
    ["ez3", "application/vnd.ezpix-package"],
    ["f", ["text/plain", "text/x-fortran"]],
    ["f4v", "video/x-f4v"],
    ["f77", "text/x-fortran"],
    ["f90", ["text/plain", "text/x-fortran"]],
    ["fbs", "image/vnd.fastbidsheet"],
    ["fcs", "application/vnd.isac.fcs"],
    ["fdf", "application/vnd.fdf"],
    ["fe_launch", "application/vnd.denovo.fcselayout-link"],
    ["fg5", "application/vnd.fujitsu.oasysgp"],
    ["fh", "image/x-freehand"],
    ["fif", ["application/fractals", "image/fif"]],
    ["fig", "application/x-xfig"],
    ["fli", ["video/fli", "video/x-fli"]],
    ["flo", ["image/florian", "application/vnd.micrografx.flo"]],
    ["flr", "x-world/x-vrml"],
    ["flv", "video/x-flv"],
    ["flw", "application/vnd.kde.kivio"],
    ["flx", "text/vnd.fmi.flexstor"],
    ["fly", "text/vnd.fly"],
    ["fm", "application/vnd.framemaker"],
    ["fmf", "video/x-atomic3d-feature"],
    ["fnc", "application/vnd.frogans.fnc"],
    ["for", ["text/plain", "text/x-fortran"]],
    ["fpx", ["image/vnd.fpx", "image/vnd.net-fpx"]],
    ["frl", "application/freeloader"],
    ["fsc", "application/vnd.fsc.weblaunch"],
    ["fst", "image/vnd.fst"],
    ["ftc", "application/vnd.fluxtime.clip"],
    ["fti", "application/vnd.anser-web-funds-transfer-initiation"],
    ["funk", "audio/make"],
    ["fvt", "video/vnd.fvt"],
    ["fxp", "application/vnd.adobe.fxp"],
    ["fzs", "application/vnd.fuzzysheet"],
    ["g", "text/plain"],
    ["g2w", "application/vnd.geoplan"],
    ["g3", "image/g3fax"],
    ["g3w", "application/vnd.geospace"],
    ["gac", "application/vnd.groove-account"],
    ["gdl", "model/vnd.gdl"],
    ["geo", "application/vnd.dynageo"],
    ["geojson", "application/geo+json"],
    ["gex", "application/vnd.geometry-explorer"],
    ["ggb", "application/vnd.geogebra.file"],
    ["ggt", "application/vnd.geogebra.tool"],
    ["ghf", "application/vnd.groove-help"],
    ["gif", "image/gif"],
    ["gim", "application/vnd.groove-identity-message"],
    ["gl", ["video/gl", "video/x-gl"]],
    ["gmx", "application/vnd.gmx"],
    ["gnumeric", "application/x-gnumeric"],
    ["gph", "application/vnd.flographit"],
    ["gqf", "application/vnd.grafeq"],
    ["gram", "application/srgs"],
    ["grv", "application/vnd.groove-injector"],
    ["grxml", "application/srgs+xml"],
    ["gsd", "audio/x-gsm"],
    ["gsf", "application/x-font-ghostscript"],
    ["gsm", "audio/x-gsm"],
    ["gsp", "application/x-gsp"],
    ["gss", "application/x-gss"],
    ["gtar", "application/x-gtar"],
    ["gtm", "application/vnd.groove-tool-message"],
    ["gtw", "model/vnd.gtw"],
    ["gv", "text/vnd.graphviz"],
    ["gxt", "application/vnd.geonext"],
    ["gz", ["application/x-gzip", "application/x-compressed"]],
    ["gzip", ["multipart/x-gzip", "application/x-gzip"]],
    ["h", ["text/plain", "text/x-h"]],
    ["h261", "video/h261"],
    ["h263", "video/h263"],
    ["h264", "video/h264"],
    ["hal", "application/vnd.hal+xml"],
    ["hbci", "application/vnd.hbci"],
    ["hdf", "application/x-hdf"],
    ["help", "application/x-helpfile"],
    ["hgl", "application/vnd.hp-hpgl"],
    ["hh", ["text/plain", "text/x-h"]],
    ["hlb", "text/x-script"],
    ["hlp", ["application/winhlp", "application/hlp", "application/x-helpfile", "application/x-winhelp"]],
    ["hpg", "application/vnd.hp-hpgl"],
    ["hpgl", "application/vnd.hp-hpgl"],
    ["hpid", "application/vnd.hp-hpid"],
    ["hps", "application/vnd.hp-hps"],
    [
      "hqx",
      [
        "application/mac-binhex40",
        "application/binhex",
        "application/binhex4",
        "application/mac-binhex",
        "application/x-binhex40",
        "application/x-mac-binhex40"
      ]
    ],
    ["hta", "application/hta"],
    ["htc", "text/x-component"],
    ["htke", "application/vnd.kenameaapp"],
    ["htm", "text/html"],
    ["html", "text/html"],
    ["htmls", "text/html"],
    ["htt", "text/webviewhtml"],
    ["htx", "text/html"],
    ["hvd", "application/vnd.yamaha.hv-dic"],
    ["hvp", "application/vnd.yamaha.hv-voice"],
    ["hvs", "application/vnd.yamaha.hv-script"],
    ["i2g", "application/vnd.intergeo"],
    ["icc", "application/vnd.iccprofile"],
    ["ice", "x-conference/x-cooltalk"],
    ["ico", "image/x-icon"],
    ["ics", "text/calendar"],
    ["idc", "text/plain"],
    ["ief", "image/ief"],
    ["iefs", "image/ief"],
    ["ifm", "application/vnd.shana.informed.formdata"],
    ["iges", ["application/iges", "model/iges"]],
    ["igl", "application/vnd.igloader"],
    ["igm", "application/vnd.insors.igm"],
    ["igs", ["application/iges", "model/iges"]],
    ["igx", "application/vnd.micrografx.igx"],
    ["iif", "application/vnd.shana.informed.interchange"],
    ["iii", "application/x-iphone"],
    ["ima", "application/x-ima"],
    ["imap", "application/x-httpd-imap"],
    ["imp", "application/vnd.accpac.simply.imp"],
    ["ims", "application/vnd.ms-ims"],
    ["inf", "application/inf"],
    ["ins", ["application/x-internet-signup", "application/x-internett-signup"]],
    ["ip", "application/x-ip2"],
    ["ipfix", "application/ipfix"],
    ["ipk", "application/vnd.shana.informed.package"],
    ["irm", "application/vnd.ibm.rights-management"],
    ["irp", "application/vnd.irepository.package+xml"],
    ["isp", "application/x-internet-signup"],
    ["isu", "video/x-isvideo"],
    ["it", "audio/it"],
    ["itp", "application/vnd.shana.informed.formtemplate"],
    ["iv", "application/x-inventor"],
    ["ivp", "application/vnd.immervision-ivp"],
    ["ivr", "i-world/i-vrml"],
    ["ivu", "application/vnd.immervision-ivu"],
    ["ivy", "application/x-livescreen"],
    ["jad", "text/vnd.sun.j2me.app-descriptor"],
    ["jam", ["application/vnd.jam", "audio/x-jam"]],
    ["jar", "application/java-archive"],
    ["jav", ["text/plain", "text/x-java-source"]],
    ["java", ["text/plain", "text/x-java-source,java", "text/x-java-source"]],
    ["jcm", "application/x-java-commerce"],
    ["jfif", ["image/pipeg", "image/jpeg", "image/pjpeg"]],
    ["jfif-tbnl", "image/jpeg"],
    ["jisp", "application/vnd.jisp"],
    ["jlt", "application/vnd.hp-jlyt"],
    ["jnlp", "application/x-java-jnlp-file"],
    ["joda", "application/vnd.joost.joda-archive"],
    ["jpe", ["image/jpeg", "image/pjpeg"]],
    ["jpeg", ["image/jpeg", "image/pjpeg"]],
    ["jpg", ["image/jpeg", "image/pjpeg"]],
    ["jpgv", "video/jpeg"],
    ["jpm", "video/jpm"],
    ["jps", "image/x-jps"],
    ["js", ["application/javascript", "application/ecmascript", "text/javascript", "text/ecmascript", "application/x-javascript"]],
    ["json", "application/json"],
    ["jut", "image/jutvision"],
    ["kar", ["audio/midi", "music/x-karaoke"]],
    ["karbon", "application/vnd.kde.karbon"],
    ["kfo", "application/vnd.kde.kformula"],
    ["kia", "application/vnd.kidspiration"],
    ["kml", "application/vnd.google-earth.kml+xml"],
    ["kmz", "application/vnd.google-earth.kmz"],
    ["kne", "application/vnd.kinar"],
    ["kon", "application/vnd.kde.kontour"],
    ["kpr", "application/vnd.kde.kpresenter"],
    ["ksh", ["application/x-ksh", "text/x-script.ksh"]],
    ["ksp", "application/vnd.kde.kspread"],
    ["ktx", "image/ktx"],
    ["ktz", "application/vnd.kahootz"],
    ["kwd", "application/vnd.kde.kword"],
    ["la", ["audio/nspaudio", "audio/x-nspaudio"]],
    ["lam", "audio/x-liveaudio"],
    ["lasxml", "application/vnd.las.las+xml"],
    ["latex", "application/x-latex"],
    ["lbd", "application/vnd.llamagraphics.life-balance.desktop"],
    ["lbe", "application/vnd.llamagraphics.life-balance.exchange+xml"],
    ["les", "application/vnd.hhe.lesson-player"],
    ["lha", ["application/octet-stream", "application/lha", "application/x-lha"]],
    ["lhx", "application/octet-stream"],
    ["link66", "application/vnd.route66.link66+xml"],
    ["list", "text/plain"],
    ["lma", ["audio/nspaudio", "audio/x-nspaudio"]],
    ["log", "text/plain"],
    ["lrm", "application/vnd.ms-lrm"],
    ["lsf", "video/x-la-asf"],
    ["lsp", ["application/x-lisp", "text/x-script.lisp"]],
    ["lst", "text/plain"],
    ["lsx", ["video/x-la-asf", "text/x-la-asf"]],
    ["ltf", "application/vnd.frogans.ltf"],
    ["ltx", "application/x-latex"],
    ["lvp", "audio/vnd.lucent.voice"],
    ["lwp", "application/vnd.lotus-wordpro"],
    ["lzh", ["application/octet-stream", "application/x-lzh"]],
    ["lzx", ["application/lzx", "application/octet-stream", "application/x-lzx"]],
    ["m", ["text/plain", "text/x-m"]],
    ["m13", "application/x-msmediaview"],
    ["m14", "application/x-msmediaview"],
    ["m1v", "video/mpeg"],
    ["m21", "application/mp21"],
    ["m2a", "audio/mpeg"],
    ["m2v", "video/mpeg"],
    ["m3u", ["audio/x-mpegurl", "audio/x-mpequrl"]],
    ["m3u8", "application/vnd.apple.mpegurl"],
    ["m4v", "video/x-m4v"],
    ["ma", "application/mathematica"],
    ["mads", "application/mads+xml"],
    ["mag", "application/vnd.ecowin.chart"],
    ["man", "application/x-troff-man"],
    ["map", "application/x-navimap"],
    ["mar", "text/plain"],
    ["mathml", "application/mathml+xml"],
    ["mbd", "application/mbedlet"],
    ["mbk", "application/vnd.mobius.mbk"],
    ["mbox", "application/mbox"],
    ["mc$", "application/x-magic-cap-package-1.0"],
    ["mc1", "application/vnd.medcalcdata"],
    ["mcd", ["application/mcad", "application/vnd.mcd", "application/x-mathcad"]],
    ["mcf", ["image/vasa", "text/mcf"]],
    ["mcp", "application/netmc"],
    ["mcurl", "text/vnd.curl.mcurl"],
    ["mdb", "application/x-msaccess"],
    ["mdi", "image/vnd.ms-modi"],
    ["me", "application/x-troff-me"],
    ["meta4", "application/metalink4+xml"],
    ["mets", "application/mets+xml"],
    ["mfm", "application/vnd.mfmp"],
    ["mgp", "application/vnd.osgeo.mapguide.package"],
    ["mgz", "application/vnd.proteus.magazine"],
    ["mht", "message/rfc822"],
    ["mhtml", "message/rfc822"],
    ["mid", ["audio/mid", "audio/midi", "music/crescendo", "x-music/x-midi", "audio/x-midi", "application/x-midi", "audio/x-mid"]],
    ["midi", ["audio/midi", "music/crescendo", "x-music/x-midi", "audio/x-midi", "application/x-midi", "audio/x-mid"]],
    ["mif", ["application/vnd.mif", "application/x-mif", "application/x-frame"]],
    ["mime", ["message/rfc822", "www/mime"]],
    ["mj2", "video/mj2"],
    ["mjf", "audio/x-vnd.audioexplosion.mjuicemediafile"],
    ["mjpg", "video/x-motion-jpeg"],
    ["mlp", "application/vnd.dolby.mlp"],
    ["mm", ["application/base64", "application/x-meme"]],
    ["mmd", "application/vnd.chipnuts.karaoke-mmd"],
    ["mme", "application/base64"],
    ["mmf", "application/vnd.smaf"],
    ["mmr", "image/vnd.fujixerox.edmics-mmr"],
    ["mny", "application/x-msmoney"],
    ["mod", ["audio/mod", "audio/x-mod"]],
    ["mods", "application/mods+xml"],
    ["moov", "video/quicktime"],
    ["mov", "video/quicktime"],
    ["movie", "video/x-sgi-movie"],
    ["mp2", ["video/mpeg", "audio/mpeg", "video/x-mpeg", "audio/x-mpeg", "video/x-mpeq2a"]],
    ["mp3", ["audio/mpeg", "audio/mpeg3", "video/mpeg", "audio/x-mpeg-3", "video/x-mpeg"]],
    ["mp4", ["video/mp4", "application/mp4"]],
    ["mp4a", "audio/mp4"],
    ["mpa", ["video/mpeg", "audio/mpeg"]],
    ["mpc", ["application/vnd.mophun.certificate", "application/x-project"]],
    ["mpe", "video/mpeg"],
    ["mpeg", "video/mpeg"],
    ["mpg", ["video/mpeg", "audio/mpeg"]],
    ["mpga", "audio/mpeg"],
    ["mpkg", "application/vnd.apple.installer+xml"],
    ["mpm", "application/vnd.blueice.multipass"],
    ["mpn", "application/vnd.mophun.application"],
    ["mpp", "application/vnd.ms-project"],
    ["mpt", "application/x-project"],
    ["mpv", "application/x-project"],
    ["mpv2", "video/mpeg"],
    ["mpx", "application/x-project"],
    ["mpy", "application/vnd.ibm.minipay"],
    ["mqy", "application/vnd.mobius.mqy"],
    ["mrc", "application/marc"],
    ["mrcx", "application/marcxml+xml"],
    ["ms", "application/x-troff-ms"],
    ["mscml", "application/mediaservercontrol+xml"],
    ["mseq", "application/vnd.mseq"],
    ["msf", "application/vnd.epson.msf"],
    ["msg", "application/vnd.ms-outlook"],
    ["msh", "model/mesh"],
    ["msl", "application/vnd.mobius.msl"],
    ["msty", "application/vnd.muvee.style"],
    ["mts", "model/vnd.mts"],
    ["mus", "application/vnd.musician"],
    ["musicxml", "application/vnd.recordare.musicxml+xml"],
    ["mv", "video/x-sgi-movie"],
    ["mvb", "application/x-msmediaview"],
    ["mwf", "application/vnd.mfer"],
    ["mxf", "application/mxf"],
    ["mxl", "application/vnd.recordare.musicxml"],
    ["mxml", "application/xv+xml"],
    ["mxs", "application/vnd.triscape.mxs"],
    ["mxu", "video/vnd.mpegurl"],
    ["my", "audio/make"],
    ["mzz", "application/x-vnd.audioexplosion.mzz"],
    ["n-gage", "application/vnd.nokia.n-gage.symbian.install"],
    ["n3", "text/n3"],
    ["nap", "image/naplps"],
    ["naplps", "image/naplps"],
    ["nbp", "application/vnd.wolfram.player"],
    ["nc", "application/x-netcdf"],
    ["ncm", "application/vnd.nokia.configuration-message"],
    ["ncx", "application/x-dtbncx+xml"],
    ["ngdat", "application/vnd.nokia.n-gage.data"],
    ["nif", "image/x-niff"],
    ["niff", "image/x-niff"],
    ["nix", "application/x-mix-transfer"],
    ["nlu", "application/vnd.neurolanguage.nlu"],
    ["nml", "application/vnd.enliven"],
    ["nnd", "application/vnd.noblenet-directory"],
    ["nns", "application/vnd.noblenet-sealer"],
    ["nnw", "application/vnd.noblenet-web"],
    ["npx", "image/vnd.net-fpx"],
    ["nsc", "application/x-conference"],
    ["nsf", "application/vnd.lotus-notes"],
    ["nvd", "application/x-navidoc"],
    ["nws", "message/rfc822"],
    ["o", "application/octet-stream"],
    ["oa2", "application/vnd.fujitsu.oasys2"],
    ["oa3", "application/vnd.fujitsu.oasys3"],
    ["oas", "application/vnd.fujitsu.oasys"],
    ["obd", "application/x-msbinder"],
    ["oda", "application/oda"],
    ["odb", "application/vnd.oasis.opendocument.database"],
    ["odc", "application/vnd.oasis.opendocument.chart"],
    ["odf", "application/vnd.oasis.opendocument.formula"],
    ["odft", "application/vnd.oasis.opendocument.formula-template"],
    ["odg", "application/vnd.oasis.opendocument.graphics"],
    ["odi", "application/vnd.oasis.opendocument.image"],
    ["odm", "application/vnd.oasis.opendocument.text-master"],
    ["odp", "application/vnd.oasis.opendocument.presentation"],
    ["ods", "application/vnd.oasis.opendocument.spreadsheet"],
    ["odt", "application/vnd.oasis.opendocument.text"],
    ["oga", "audio/ogg"],
    ["ogv", "video/ogg"],
    ["ogx", "application/ogg"],
    ["omc", "application/x-omc"],
    ["omcd", "application/x-omcdatamaker"],
    ["omcr", "application/x-omcregerator"],
    ["onetoc", "application/onenote"],
    ["opf", "application/oebps-package+xml"],
    ["org", "application/vnd.lotus-organizer"],
    ["osf", "application/vnd.yamaha.openscoreformat"],
    ["osfpvg", "application/vnd.yamaha.openscoreformat.osfpvg+xml"],
    ["otc", "application/vnd.oasis.opendocument.chart-template"],
    ["otf", "application/x-font-otf"],
    ["otg", "application/vnd.oasis.opendocument.graphics-template"],
    ["oth", "application/vnd.oasis.opendocument.text-web"],
    ["oti", "application/vnd.oasis.opendocument.image-template"],
    ["otp", "application/vnd.oasis.opendocument.presentation-template"],
    ["ots", "application/vnd.oasis.opendocument.spreadsheet-template"],
    ["ott", "application/vnd.oasis.opendocument.text-template"],
    ["oxt", "application/vnd.openofficeorg.extension"],
    ["p", "text/x-pascal"],
    ["p10", ["application/pkcs10", "application/x-pkcs10"]],
    ["p12", ["application/pkcs-12", "application/x-pkcs12"]],
    ["p7a", "application/x-pkcs7-signature"],
    ["p7b", "application/x-pkcs7-certificates"],
    ["p7c", ["application/pkcs7-mime", "application/x-pkcs7-mime"]],
    ["p7m", ["application/pkcs7-mime", "application/x-pkcs7-mime"]],
    ["p7r", "application/x-pkcs7-certreqresp"],
    ["p7s", ["application/pkcs7-signature", "application/x-pkcs7-signature"]],
    ["p8", "application/pkcs8"],
    ["par", "text/plain-bas"],
    ["part", "application/pro_eng"],
    ["pas", "text/pascal"],
    ["paw", "application/vnd.pawaafile"],
    ["pbd", "application/vnd.powerbuilder6"],
    ["pbm", "image/x-portable-bitmap"],
    ["pcf", "application/x-font-pcf"],
    ["pcl", ["application/vnd.hp-pcl", "application/x-pcl"]],
    ["pclxl", "application/vnd.hp-pclxl"],
    ["pct", "image/x-pict"],
    ["pcurl", "application/vnd.curl.pcurl"],
    ["pcx", "image/x-pcx"],
    ["pdb", ["application/vnd.palm", "chemical/x-pdb"]],
    ["pdf", "application/pdf"],
    ["pfa", "application/x-font-type1"],
    ["pfr", "application/font-tdpfr"],
    ["pfunk", ["audio/make", "audio/make.my.funk"]],
    ["pfx", "application/x-pkcs12"],
    ["pgm", ["image/x-portable-graymap", "image/x-portable-greymap"]],
    ["pgn", "application/x-chess-pgn"],
    ["pgp", "application/pgp-signature"],
    ["pic", ["image/pict", "image/x-pict"]],
    ["pict", "image/pict"],
    ["pkg", "application/x-newton-compatible-pkg"],
    ["pki", "application/pkixcmp"],
    ["pkipath", "application/pkix-pkipath"],
    ["pko", ["application/ynd.ms-pkipko", "application/vnd.ms-pki.pko"]],
    ["pl", ["text/plain", "text/x-script.perl"]],
    ["plb", "application/vnd.3gpp.pic-bw-large"],
    ["plc", "application/vnd.mobius.plc"],
    ["plf", "application/vnd.pocketlearn"],
    ["pls", "application/pls+xml"],
    ["plx", "application/x-pixclscript"],
    ["pm", ["text/x-script.perl-module", "image/x-xpixmap"]],
    ["pm4", "application/x-pagemaker"],
    ["pm5", "application/x-pagemaker"],
    ["pma", "application/x-perfmon"],
    ["pmc", "application/x-perfmon"],
    ["pml", ["application/vnd.ctc-posml", "application/x-perfmon"]],
    ["pmr", "application/x-perfmon"],
    ["pmw", "application/x-perfmon"],
    ["png", "image/png"],
    ["pnm", ["application/x-portable-anymap", "image/x-portable-anymap"]],
    ["portpkg", "application/vnd.macports.portpkg"],
    ["pot", ["application/vnd.ms-powerpoint", "application/mspowerpoint"]],
    ["potm", "application/vnd.ms-powerpoint.template.macroenabled.12"],
    ["potx", "application/vnd.openxmlformats-officedocument.presentationml.template"],
    ["pov", "model/x-pov"],
    ["ppa", "application/vnd.ms-powerpoint"],
    ["ppam", "application/vnd.ms-powerpoint.addin.macroenabled.12"],
    ["ppd", "application/vnd.cups-ppd"],
    ["ppm", "image/x-portable-pixmap"],
    ["pps", ["application/vnd.ms-powerpoint", "application/mspowerpoint"]],
    ["ppsm", "application/vnd.ms-powerpoint.slideshow.macroenabled.12"],
    ["ppsx", "application/vnd.openxmlformats-officedocument.presentationml.slideshow"],
    ["ppt", ["application/vnd.ms-powerpoint", "application/mspowerpoint", "application/powerpoint", "application/x-mspowerpoint"]],
    ["pptm", "application/vnd.ms-powerpoint.presentation.macroenabled.12"],
    ["pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    ["ppz", "application/mspowerpoint"],
    ["prc", "application/x-mobipocket-ebook"],
    ["pre", ["application/vnd.lotus-freelance", "application/x-freelance"]],
    ["prf", "application/pics-rules"],
    ["prt", "application/pro_eng"],
    ["ps", "application/postscript"],
    ["psb", "application/vnd.3gpp.pic-bw-small"],
    ["psd", ["application/octet-stream", "image/vnd.adobe.photoshop"]],
    ["psf", "application/x-font-linux-psf"],
    ["pskcxml", "application/pskc+xml"],
    ["ptid", "application/vnd.pvi.ptid1"],
    ["pub", "application/x-mspublisher"],
    ["pvb", "application/vnd.3gpp.pic-bw-var"],
    ["pvu", "paleovu/x-pv"],
    ["pwn", "application/vnd.3m.post-it-notes"],
    ["pwz", "application/vnd.ms-powerpoint"],
    ["py", "text/x-script.phyton"],
    ["pya", "audio/vnd.ms-playready.media.pya"],
    ["pyc", "application/x-bytecode.python"],
    ["pyv", "video/vnd.ms-playready.media.pyv"],
    ["qam", "application/vnd.epson.quickanime"],
    ["qbo", "application/vnd.intu.qbo"],
    ["qcp", "audio/vnd.qcelp"],
    ["qd3", "x-world/x-3dmf"],
    ["qd3d", "x-world/x-3dmf"],
    ["qfx", "application/vnd.intu.qfx"],
    ["qif", "image/x-quicktime"],
    ["qps", "application/vnd.publishare-delta-tree"],
    ["qt", "video/quicktime"],
    ["qtc", "video/x-qtc"],
    ["qti", "image/x-quicktime"],
    ["qtif", "image/x-quicktime"],
    ["qxd", "application/vnd.quark.quarkxpress"],
    ["ra", ["audio/x-realaudio", "audio/x-pn-realaudio", "audio/x-pn-realaudio-plugin"]],
    ["ram", "audio/x-pn-realaudio"],
    ["rar", "application/x-rar-compressed"],
    ["ras", ["image/cmu-raster", "application/x-cmu-raster", "image/x-cmu-raster"]],
    ["rast", "image/cmu-raster"],
    ["rcprofile", "application/vnd.ipunplugged.rcprofile"],
    ["rdf", "application/rdf+xml"],
    ["rdz", "application/vnd.data-vision.rdz"],
    ["rep", "application/vnd.businessobjects"],
    ["res", "application/x-dtbresource+xml"],
    ["rexx", "text/x-script.rexx"],
    ["rf", "image/vnd.rn-realflash"],
    ["rgb", "image/x-rgb"],
    ["rif", "application/reginfo+xml"],
    ["rip", "audio/vnd.rip"],
    ["rl", "application/resource-lists+xml"],
    ["rlc", "image/vnd.fujixerox.edmics-rlc"],
    ["rld", "application/resource-lists-diff+xml"],
    ["rm", ["application/vnd.rn-realmedia", "audio/x-pn-realaudio"]],
    ["rmi", "audio/mid"],
    ["rmm", "audio/x-pn-realaudio"],
    ["rmp", ["audio/x-pn-realaudio-plugin", "audio/x-pn-realaudio"]],
    ["rms", "application/vnd.jcp.javame.midlet-rms"],
    ["rnc", "application/relax-ng-compact-syntax"],
    ["rng", ["application/ringing-tones", "application/vnd.nokia.ringing-tone"]],
    ["rnx", "application/vnd.rn-realplayer"],
    ["roff", "application/x-troff"],
    ["rp", "image/vnd.rn-realpix"],
    ["rp9", "application/vnd.cloanto.rp9"],
    ["rpm", "audio/x-pn-realaudio-plugin"],
    ["rpss", "application/vnd.nokia.radio-presets"],
    ["rpst", "application/vnd.nokia.radio-preset"],
    ["rq", "application/sparql-query"],
    ["rs", "application/rls-services+xml"],
    ["rsd", "application/rsd+xml"],
    ["rt", ["text/richtext", "text/vnd.rn-realtext"]],
    ["rtf", ["application/rtf", "text/richtext", "application/x-rtf"]],
    ["rtx", ["text/richtext", "application/rtf"]],
    ["rv", "video/vnd.rn-realvideo"],
    ["s", "text/x-asm"],
    ["s3m", "audio/s3m"],
    ["saf", "application/vnd.yamaha.smaf-audio"],
    ["saveme", "application/octet-stream"],
    ["sbk", "application/x-tbook"],
    ["sbml", "application/sbml+xml"],
    ["sc", "application/vnd.ibm.secure-container"],
    ["scd", "application/x-msschedule"],
    [
      "scm",
      ["application/vnd.lotus-screencam", "video/x-scm", "text/x-script.guile", "application/x-lotusscreencam", "text/x-script.scheme"]
    ],
    ["scq", "application/scvp-cv-request"],
    ["scs", "application/scvp-cv-response"],
    ["sct", "text/scriptlet"],
    ["scurl", "text/vnd.curl.scurl"],
    ["sda", "application/vnd.stardivision.draw"],
    ["sdc", "application/vnd.stardivision.calc"],
    ["sdd", "application/vnd.stardivision.impress"],
    ["sdkm", "application/vnd.solent.sdkm+xml"],
    ["sdml", "text/plain"],
    ["sdp", ["application/sdp", "application/x-sdp"]],
    ["sdr", "application/sounder"],
    ["sdw", "application/vnd.stardivision.writer"],
    ["sea", ["application/sea", "application/x-sea"]],
    ["see", "application/vnd.seemail"],
    ["seed", "application/vnd.fdsn.seed"],
    ["sema", "application/vnd.sema"],
    ["semd", "application/vnd.semd"],
    ["semf", "application/vnd.semf"],
    ["ser", "application/java-serialized-object"],
    ["set", "application/set"],
    ["setpay", "application/set-payment-initiation"],
    ["setreg", "application/set-registration-initiation"],
    ["sfd-hdstx", "application/vnd.hydrostatix.sof-data"],
    ["sfs", "application/vnd.spotfire.sfs"],
    ["sgl", "application/vnd.stardivision.writer-global"],
    ["sgm", ["text/sgml", "text/x-sgml"]],
    ["sgml", ["text/sgml", "text/x-sgml"]],
    ["sh", ["application/x-shar", "application/x-bsh", "application/x-sh", "text/x-script.sh"]],
    ["shar", ["application/x-bsh", "application/x-shar"]],
    ["shf", "application/shf+xml"],
    ["shtml", ["text/html", "text/x-server-parsed-html"]],
    ["sid", "audio/x-psid"],
    ["sis", "application/vnd.symbian.install"],
    ["sit", ["application/x-stuffit", "application/x-sit"]],
    ["sitx", "application/x-stuffitx"],
    ["skd", "application/x-koan"],
    ["skm", "application/x-koan"],
    ["skp", ["application/vnd.koan", "application/x-koan"]],
    ["skt", "application/x-koan"],
    ["sl", "application/x-seelogo"],
    ["sldm", "application/vnd.ms-powerpoint.slide.macroenabled.12"],
    ["sldx", "application/vnd.openxmlformats-officedocument.presentationml.slide"],
    ["slt", "application/vnd.epson.salt"],
    ["sm", "application/vnd.stepmania.stepchart"],
    ["smf", "application/vnd.stardivision.math"],
    ["smi", ["application/smil", "application/smil+xml"]],
    ["smil", "application/smil"],
    ["snd", ["audio/basic", "audio/x-adpcm"]],
    ["snf", "application/x-font-snf"],
    ["sol", "application/solids"],
    ["spc", ["text/x-speech", "application/x-pkcs7-certificates"]],
    ["spf", "application/vnd.yamaha.smaf-phrase"],
    ["spl", ["application/futuresplash", "application/x-futuresplash"]],
    ["spot", "text/vnd.in3d.spot"],
    ["spp", "application/scvp-vp-response"],
    ["spq", "application/scvp-vp-request"],
    ["spr", "application/x-sprite"],
    ["sprite", "application/x-sprite"],
    ["src", "application/x-wais-source"],
    ["sru", "application/sru+xml"],
    ["srx", "application/sparql-results+xml"],
    ["sse", "application/vnd.kodak-descriptor"],
    ["ssf", "application/vnd.epson.ssf"],
    ["ssi", "text/x-server-parsed-html"],
    ["ssm", "application/streamingmedia"],
    ["ssml", "application/ssml+xml"],
    ["sst", ["application/vnd.ms-pkicertstore", "application/vnd.ms-pki.certstore"]],
    ["st", "application/vnd.sailingtracker.track"],
    ["stc", "application/vnd.sun.xml.calc.template"],
    ["std", "application/vnd.sun.xml.draw.template"],
    ["step", "application/step"],
    ["stf", "application/vnd.wt.stf"],
    ["sti", "application/vnd.sun.xml.impress.template"],
    ["stk", "application/hyperstudio"],
    ["stl", ["application/vnd.ms-pkistl", "application/sla", "application/vnd.ms-pki.stl", "application/x-navistyle"]],
    ["stm", "text/html"],
    ["stp", "application/step"],
    ["str", "application/vnd.pg.format"],
    ["stw", "application/vnd.sun.xml.writer.template"],
    ["sub", "image/vnd.dvb.subtitle"],
    ["sus", "application/vnd.sus-calendar"],
    ["sv4cpio", "application/x-sv4cpio"],
    ["sv4crc", "application/x-sv4crc"],
    ["svc", "application/vnd.dvb.service"],
    ["svd", "application/vnd.svd"],
    ["svf", ["image/vnd.dwg", "image/x-dwg"]],
    ["svg", "image/svg+xml"],
    ["svr", ["x-world/x-svr", "application/x-world"]],
    ["swf", "application/x-shockwave-flash"],
    ["swi", "application/vnd.aristanetworks.swi"],
    ["sxc", "application/vnd.sun.xml.calc"],
    ["sxd", "application/vnd.sun.xml.draw"],
    ["sxg", "application/vnd.sun.xml.writer.global"],
    ["sxi", "application/vnd.sun.xml.impress"],
    ["sxm", "application/vnd.sun.xml.math"],
    ["sxw", "application/vnd.sun.xml.writer"],
    ["t", ["text/troff", "application/x-troff"]],
    ["talk", "text/x-speech"],
    ["tao", "application/vnd.tao.intent-module-archive"],
    ["tar", "application/x-tar"],
    ["tbk", ["application/toolbook", "application/x-tbook"]],
    ["tcap", "application/vnd.3gpp2.tcap"],
    ["tcl", ["text/x-script.tcl", "application/x-tcl"]],
    ["tcsh", "text/x-script.tcsh"],
    ["teacher", "application/vnd.smart.teacher"],
    ["tei", "application/tei+xml"],
    ["tex", "application/x-tex"],
    ["texi", "application/x-texinfo"],
    ["texinfo", "application/x-texinfo"],
    ["text", ["application/plain", "text/plain"]],
    ["tfi", "application/thraud+xml"],
    ["tfm", "application/x-tex-tfm"],
    ["tgz", ["application/gnutar", "application/x-compressed"]],
    ["thmx", "application/vnd.ms-officetheme"],
    ["tif", ["image/tiff", "image/x-tiff"]],
    ["tiff", ["image/tiff", "image/x-tiff"]],
    ["tmo", "application/vnd.tmobile-livetv"],
    ["torrent", "application/x-bittorrent"],
    ["tpl", "application/vnd.groove-tool-template"],
    ["tpt", "application/vnd.trid.tpt"],
    ["tr", "application/x-troff"],
    ["tra", "application/vnd.trueapp"],
    ["trm", "application/x-msterminal"],
    ["tsd", "application/timestamped-data"],
    ["tsi", "audio/tsp-audio"],
    ["tsp", ["application/dsptype", "audio/tsplayer"]],
    ["tsv", "text/tab-separated-values"],
    ["ttf", "application/x-font-ttf"],
    ["ttl", "text/turtle"],
    ["turbot", "image/florian"],
    ["twd", "application/vnd.simtech-mindmapper"],
    ["txd", "application/vnd.genomatix.tuxedo"],
    ["txf", "application/vnd.mobius.txf"],
    ["txt", "text/plain"],
    ["ufd", "application/vnd.ufdl"],
    ["uil", "text/x-uil"],
    ["uls", "text/iuls"],
    ["umj", "application/vnd.umajin"],
    ["uni", "text/uri-list"],
    ["unis", "text/uri-list"],
    ["unityweb", "application/vnd.unity"],
    ["unv", "application/i-deas"],
    ["uoml", "application/vnd.uoml+xml"],
    ["uri", "text/uri-list"],
    ["uris", "text/uri-list"],
    ["ustar", ["application/x-ustar", "multipart/x-ustar"]],
    ["utz", "application/vnd.uiq.theme"],
    ["uu", ["application/octet-stream", "text/x-uuencode"]],
    ["uue", "text/x-uuencode"],
    ["uva", "audio/vnd.dece.audio"],
    ["uvh", "video/vnd.dece.hd"],
    ["uvi", "image/vnd.dece.graphic"],
    ["uvm", "video/vnd.dece.mobile"],
    ["uvp", "video/vnd.dece.pd"],
    ["uvs", "video/vnd.dece.sd"],
    ["uvu", "video/vnd.uvvu.mp4"],
    ["uvv", "video/vnd.dece.video"],
    ["vcd", "application/x-cdlink"],
    ["vcf", "text/x-vcard"],
    ["vcg", "application/vnd.groove-vcard"],
    ["vcs", "text/x-vcalendar"],
    ["vcx", "application/vnd.vcx"],
    ["vda", "application/vda"],
    ["vdo", "video/vdo"],
    ["vew", "application/groupwise"],
    ["vis", "application/vnd.visionary"],
    ["viv", ["video/vivo", "video/vnd.vivo"]],
    ["vivo", ["video/vivo", "video/vnd.vivo"]],
    ["vmd", "application/vocaltec-media-desc"],
    ["vmf", "application/vocaltec-media-file"],
    ["voc", ["audio/voc", "audio/x-voc"]],
    ["vos", "video/vosaic"],
    ["vox", "audio/voxware"],
    ["vqe", "audio/x-twinvq-plugin"],
    ["vqf", "audio/x-twinvq"],
    ["vql", "audio/x-twinvq-plugin"],
    ["vrml", ["model/vrml", "x-world/x-vrml", "application/x-vrml"]],
    ["vrt", "x-world/x-vrt"],
    ["vsd", ["application/vnd.visio", "application/x-visio"]],
    ["vsf", "application/vnd.vsf"],
    ["vst", "application/x-visio"],
    ["vsw", "application/x-visio"],
    ["vtu", "model/vnd.vtu"],
    ["vxml", "application/voicexml+xml"],
    ["w60", "application/wordperfect6.0"],
    ["w61", "application/wordperfect6.1"],
    ["w6w", "application/msword"],
    ["wad", "application/x-doom"],
    ["wav", ["audio/wav", "audio/x-wav"]],
    ["wax", "audio/x-ms-wax"],
    ["wb1", "application/x-qpro"],
    ["wbmp", "image/vnd.wap.wbmp"],
    ["wbs", "application/vnd.criticaltools.wbs+xml"],
    ["wbxml", "application/vnd.wap.wbxml"],
    ["wcm", "application/vnd.ms-works"],
    ["wdb", "application/vnd.ms-works"],
    ["web", "application/vnd.xara"],
    ["weba", "audio/webm"],
    ["webm", "video/webm"],
    ["webp", "image/webp"],
    ["wg", "application/vnd.pmi.widget"],
    ["wgt", "application/widget"],
    ["wiz", "application/msword"],
    ["wk1", "application/x-123"],
    ["wks", "application/vnd.ms-works"],
    ["wm", "video/x-ms-wm"],
    ["wma", "audio/x-ms-wma"],
    ["wmd", "application/x-ms-wmd"],
    ["wmf", ["windows/metafile", "application/x-msmetafile"]],
    ["wml", "text/vnd.wap.wml"],
    ["wmlc", "application/vnd.wap.wmlc"],
    ["wmls", "text/vnd.wap.wmlscript"],
    ["wmlsc", "application/vnd.wap.wmlscriptc"],
    ["wmv", "video/x-ms-wmv"],
    ["wmx", "video/x-ms-wmx"],
    ["wmz", "application/x-ms-wmz"],
    ["woff", "application/x-font-woff"],
    ["word", "application/msword"],
    ["wp", "application/wordperfect"],
    ["wp5", ["application/wordperfect", "application/wordperfect6.0"]],
    ["wp6", "application/wordperfect"],
    ["wpd", ["application/wordperfect", "application/vnd.wordperfect", "application/x-wpwin"]],
    ["wpl", "application/vnd.ms-wpl"],
    ["wps", "application/vnd.ms-works"],
    ["wq1", "application/x-lotus"],
    ["wqd", "application/vnd.wqd"],
    ["wri", ["application/mswrite", "application/x-wri", "application/x-mswrite"]],
    ["wrl", ["model/vrml", "x-world/x-vrml", "application/x-world"]],
    ["wrz", ["model/vrml", "x-world/x-vrml"]],
    ["wsc", "text/scriplet"],
    ["wsdl", "application/wsdl+xml"],
    ["wspolicy", "application/wspolicy+xml"],
    ["wsrc", "application/x-wais-source"],
    ["wtb", "application/vnd.webturbo"],
    ["wtk", "application/x-wintalk"],
    ["wvx", "video/x-ms-wvx"],
    ["x-png", "image/png"],
    ["x3d", "application/vnd.hzn-3d-crossword"],
    ["xaf", "x-world/x-vrml"],
    ["xap", "application/x-silverlight-app"],
    ["xar", "application/vnd.xara"],
    ["xbap", "application/x-ms-xbap"],
    ["xbd", "application/vnd.fujixerox.docuworks.binder"],
    ["xbm", ["image/xbm", "image/x-xbm", "image/x-xbitmap"]],
    ["xdf", "application/xcap-diff+xml"],
    ["xdm", "application/vnd.syncml.dm+xml"],
    ["xdp", "application/vnd.adobe.xdp+xml"],
    ["xdr", "video/x-amt-demorun"],
    ["xdssc", "application/dssc+xml"],
    ["xdw", "application/vnd.fujixerox.docuworks"],
    ["xenc", "application/xenc+xml"],
    ["xer", "application/patch-ops-error+xml"],
    ["xfdf", "application/vnd.adobe.xfdf"],
    ["xfdl", "application/vnd.xfdl"],
    ["xgz", "xgl/drawing"],
    ["xhtml", "application/xhtml+xml"],
    ["xif", "image/vnd.xiff"],
    ["xl", "application/excel"],
    ["xla", ["application/vnd.ms-excel", "application/excel", "application/x-msexcel", "application/x-excel"]],
    ["xlam", "application/vnd.ms-excel.addin.macroenabled.12"],
    ["xlb", ["application/excel", "application/vnd.ms-excel", "application/x-excel"]],
    ["xlc", ["application/vnd.ms-excel", "application/excel", "application/x-excel"]],
    ["xld", ["application/excel", "application/x-excel"]],
    ["xlk", ["application/excel", "application/x-excel"]],
    ["xll", ["application/excel", "application/vnd.ms-excel", "application/x-excel"]],
    ["xlm", ["application/vnd.ms-excel", "application/excel", "application/x-excel"]],
    ["xls", ["application/vnd.ms-excel", "application/excel", "application/x-msexcel", "application/x-excel"]],
    ["xlsb", "application/vnd.ms-excel.sheet.binary.macroenabled.12"],
    ["xlsm", "application/vnd.ms-excel.sheet.macroenabled.12"],
    ["xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ["xlt", ["application/vnd.ms-excel", "application/excel", "application/x-excel"]],
    ["xltm", "application/vnd.ms-excel.template.macroenabled.12"],
    ["xltx", "application/vnd.openxmlformats-officedocument.spreadsheetml.template"],
    ["xlv", ["application/excel", "application/x-excel"]],
    ["xlw", ["application/vnd.ms-excel", "application/excel", "application/x-msexcel", "application/x-excel"]],
    ["xm", "audio/xm"],
    ["xml", ["application/xml", "text/xml", "application/atom+xml", "application/rss+xml"]],
    ["xmz", "xgl/movie"],
    ["xo", "application/vnd.olpc-sugar"],
    ["xof", "x-world/x-vrml"],
    ["xop", "application/xop+xml"],
    ["xpi", "application/x-xpinstall"],
    ["xpix", "application/x-vnd.ls-xpix"],
    ["xpm", ["image/xpm", "image/x-xpixmap"]],
    ["xpr", "application/vnd.is-xpr"],
    ["xps", "application/vnd.ms-xpsdocument"],
    ["xpw", "application/vnd.intercon.formnet"],
    ["xslt", "application/xslt+xml"],
    ["xsm", "application/vnd.syncml+xml"],
    ["xspf", "application/xspf+xml"],
    ["xsr", "video/x-amt-showrun"],
    ["xul", "application/vnd.mozilla.xul+xml"],
    ["xwd", ["image/x-xwd", "image/x-xwindowdump"]],
    ["xyz", ["chemical/x-xyz", "chemical/x-pdb"]],
    ["yang", "application/yang"],
    ["yin", "application/yin+xml"],
    ["z", ["application/x-compressed", "application/x-compress"]],
    ["zaz", "application/vnd.zzazz.deck+xml"],
    ["zip", ["application/zip", "multipart/x-zip", "application/x-zip-compressed", "application/x-compressed"]],
    ["zir", "application/vnd.zul"],
    ["zmm", "application/vnd.handheld-entertainment+xml"],
    ["zoo", "application/octet-stream"],
    ["zsh", "text/x-script.zsh"]
  ]);
  return ae = {
    detectMimeType(o) {
      if (!o)
        return E;
      let a = y.parse(o), p = (a.ext.substr(1) || a.name || "").split("?").shift().trim().toLowerCase(), s = E;
      return r.has(p) && (s = r.get(p)), Array.isArray(s) ? s[0] : s;
    },
    detectExtension(o) {
      if (!o)
        return S;
      let a = (o || "").toLowerCase().trim().split("/"), p = a.shift().trim(), s = a.join("/").trim();
      if (x.has(p + "/" + s)) {
        let i = x.get(p + "/" + s);
        return Array.isArray(i) ? i[0] : i;
      }
      switch (p) {
        case "text":
          return "txt";
        default:
          return "bin";
      }
    }
  }, ae;
}
var ne, Ue;
function bt() {
  if (Ue) return ne;
  Ue = 1;
  const y = 2147483647, E = 36, S = 1, x = 26, r = 38, o = 700, a = 72, p = 128, s = "-", i = /^xn--/, l = /[^\0-\x7F]/, n = /[\x2E\u3002\uFF0E\uFF61]/g, d = {
    overflow: "Overflow: input needs wider integers to process",
    "not-basic": "Illegal input >= 0x80 (not a basic code point)",
    "invalid-input": "Invalid input"
  }, f = E - S, g = Math.floor, e = String.fromCharCode;
  function t(k) {
    throw new RangeError(d[k]);
  }
  function m(k, C) {
    const L = [];
    let M = k.length;
    for (; M--; )
      L[M] = C(k[M]);
    return L;
  }
  function h(k, C) {
    const L = k.split("@");
    let M = "";
    L.length > 1 && (M = L[0] + "@", k = L[1]), k = k.replace(n, ".");
    const N = k.split("."), q = m(N, C).join(".");
    return M + q;
  }
  function c(k) {
    const C = [];
    let L = 0;
    const M = k.length;
    for (; L < M; ) {
      const N = k.charCodeAt(L++);
      if (N >= 55296 && N <= 56319 && L < M) {
        const q = k.charCodeAt(L++);
        (q & 64512) == 56320 ? C.push(((N & 1023) << 10) + (q & 1023) + 65536) : (C.push(N), L--);
      } else
        C.push(N);
    }
    return C;
  }
  const u = (k) => String.fromCodePoint(...k), v = function(k) {
    return k >= 48 && k < 58 ? 26 + (k - 48) : k >= 65 && k < 91 ? k - 65 : k >= 97 && k < 123 ? k - 97 : E;
  }, w = function(k, C) {
    return k + 22 + 75 * (k < 26) - ((C != 0) << 5);
  }, b = function(k, C, L) {
    let M = 0;
    for (
      k = L ? g(k / o) : k >> 1, k += g(k / C);
      /* no initialization */
      k > f * x >> 1;
      M += E
    )
      k = g(k / f);
    return g(M + (f + 1) * k / (k + r));
  }, _ = function(k) {
    const C = [], L = k.length;
    let M = 0, N = p, q = a, B = k.lastIndexOf(s);
    B < 0 && (B = 0);
    for (let z = 0; z < B; ++z)
      k.charCodeAt(z) >= 128 && t("not-basic"), C.push(k.charCodeAt(z));
    for (let z = B > 0 ? B + 1 : 0; z < L; ) {
      const P = M;
      for (let R = 1, D = E; ; D += E) {
        z >= L && t("invalid-input");
        const F = v(k.charCodeAt(z++));
        F >= E && t("invalid-input"), F > g((y - M) / R) && t("overflow"), M += F * R;
        const G = D <= q ? S : D >= q + x ? x : D - q;
        if (F < G)
          break;
        const W = E - G;
        R > g(y / W) && t("overflow"), R *= W;
      }
      const $ = C.length + 1;
      q = b(M - P, $, P == 0), g(M / $) > y - N && t("overflow"), N += g(M / $), M %= $, C.splice(M++, 0, N);
    }
    return String.fromCodePoint(...C);
  }, A = function(k) {
    const C = [];
    k = c(k);
    const L = k.length;
    let M = p, N = 0, q = a;
    for (const P of k)
      P < 128 && C.push(e(P));
    const B = C.length;
    let z = B;
    for (B && C.push(s); z < L; ) {
      let P = y;
      for (const R of k)
        R >= M && R < P && (P = R);
      const $ = z + 1;
      P - M > g((y - N) / $) && t("overflow"), N += (P - M) * $, M = P;
      for (const R of k)
        if (R < M && ++N > y && t("overflow"), R === M) {
          let D = N;
          for (let F = E; ; F += E) {
            const G = F <= q ? S : F >= q + x ? x : F - q;
            if (D < G)
              break;
            const W = D - G, He = E - G;
            C.push(e(w(G + W % He, 0))), D = g(W / He);
          }
          C.push(e(w(D, 0))), q = b(N, $, z === B), N = 0, ++z;
        }
      ++N, ++M;
    }
    return C.join("");
  };
  return ne = {
    /**
     * A string representing the current Punycode.js version number.
     * @memberOf punycode
     * @type String
     */
    version: "2.3.1",
    /**
     * An object of methods to convert from JavaScript's internal character
     * representation (UCS-2) to Unicode code points, and back.
     * @see <https://mathiasbynens.be/notes/javascript-encoding>
     * @memberOf punycode
     * @type Object
     */
    ucs2: {
      decode: c,
      encode: u
    },
    decode: _,
    encode: A,
    toASCII: function(k) {
      return h(k, function(C) {
        return l.test(C) ? "xn--" + A(C) : C;
      });
    },
    toUnicode: function(k) {
      return h(k, function(C) {
        return i.test(C) ? _(C.slice(4).toLowerCase()) : C;
      });
    }
  }, ne;
}
var oe, Be;
function yt() {
  if (Be) return oe;
  Be = 1;
  const y = O.Transform;
  function E(r) {
    return typeof r == "string" && (r = Buffer.from(r, "utf-8")), r.toString("base64");
  }
  function S(r, o) {
    if (r = (r || "").toString(), o = o || 76, r.length <= o)
      return r;
    let a = [], p = 0, s = o * 1024;
    for (; p < r.length; ) {
      let i = r.substr(p, s).replace(new RegExp(".{" + o + "}", "g"), `$&\r
`);
      a.push(i), p += s;
    }
    return a.join("");
  }
  class x extends y {
    constructor(o) {
      super(), this.options = o || {}, this.options.lineLength !== !1 && (this.options.lineLength = this.options.lineLength || 76), this._curLine = "", this._remainingBytes = !1, this.inputBytes = 0, this.outputBytes = 0;
    }
    _transform(o, a, p) {
      if (a !== "buffer" && (o = Buffer.from(o, a)), !o || !o.length)
        return setImmediate(p);
      this.inputBytes += o.length, this._remainingBytes && this._remainingBytes.length && (o = Buffer.concat([this._remainingBytes, o], this._remainingBytes.length + o.length), this._remainingBytes = !1), o.length % 3 ? (this._remainingBytes = o.slice(o.length - o.length % 3), o = o.slice(0, o.length - o.length % 3)) : this._remainingBytes = !1;
      let s = this._curLine + E(o);
      if (this.options.lineLength) {
        s = S(s, this.options.lineLength);
        let i = s.lastIndexOf(`
`);
        i < 0 ? (this._curLine = s, s = "") : (this._curLine = s.substring(i + 1), s = s.substring(0, i + 1), s && !s.endsWith(`\r
`) && (s += `\r
`));
      } else
        this._curLine = "";
      s && (this.outputBytes += s.length, this.push(Buffer.from(s, "ascii"))), setImmediate(p);
    }
    _flush(o) {
      this._remainingBytes && this._remainingBytes.length && (this._curLine += E(this._remainingBytes)), this._curLine && (this.outputBytes += this._curLine.length, this.push(Buffer.from(this._curLine, "ascii")), this._curLine = ""), o();
    }
  }
  return oe = {
    encode: E,
    wrap: S,
    Encoder: x
  }, oe;
}
var re, De;
function Et() {
  if (De) return re;
  De = 1;
  const y = O.Transform;
  function E(o) {
    typeof o == "string" && (o = Buffer.from(o, "utf-8"));
    let a = [
      // https://tools.ietf.org/html/rfc2045#section-6.7
      [9],
      // <TAB>
      [10],
      // <LF>
      [13],
      // <CR>
      [32, 60],
      // <SP>!"#$%&'()*+,-./0123456789:;
      [62, 126]
      // >?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}
    ], p = "", s;
    for (let i = 0, l = o.length; i < l; i++) {
      if (s = o[i], x(s, a) && !((s === 32 || s === 9) && (i === l - 1 || o[i + 1] === 10 || o[i + 1] === 13))) {
        p += String.fromCharCode(s);
        continue;
      }
      p += "=" + (s < 16 ? "0" : "") + s.toString(16).toUpperCase();
    }
    return p;
  }
  function S(o, a) {
    if (o = (o || "").toString(), a = a || 76, o.length <= a)
      return o;
    let p = 0, s = o.length, i, l, n, d = Math.floor(a / 3), f = "";
    for (; p < s; ) {
      if (n = o.substr(p, a), i = n.match(/\r\n/)) {
        n = n.substr(0, i.index + i[0].length), f += n, p += n.length;
        continue;
      }
      if (n.substr(-1) === `
`) {
        f += n, p += n.length;
        continue;
      } else if (i = n.substr(-d).match(/\n.*?$/)) {
        n = n.substr(0, n.length - (i[0].length - 1)), f += n, p += n.length;
        continue;
      } else if (n.length > a - d && (i = n.substr(-d).match(/[ \t.,!?][^ \t.,!?]*$/)))
        n = n.substr(0, n.length - (i[0].length - 1));
      else if (n.match(/[=][\da-f]{0,2}$/i))
        for ((i = n.match(/[=][\da-f]{0,1}$/i)) && (n = n.substr(0, n.length - i[0].length)); n.length > 3 && n.length < s - p && !n.match(/^(?:=[\da-f]{2}){1,4}$/i) && (i = n.match(/[=][\da-f]{2}$/gi)) && (l = parseInt(i[0].substr(1, 2), 16), !(l < 128 || (n = n.substr(0, n.length - 3), l >= 192))); )
          ;
      p + n.length < s && n.substr(-1) !== `
` ? (n.length === a && n.match(/[=][\da-f]{2}$/i) ? n = n.substr(0, n.length - 3) : n.length === a && (n = n.substr(0, n.length - 1)), p += n.length, n += `=\r
`) : p += n.length, f += n;
    }
    return f;
  }
  function x(o, a) {
    for (let p = a.length - 1; p >= 0; p--)
      if (a[p].length && (a[p].length === 1 && o === a[p][0] || a[p].length === 2 && o >= a[p][0] && o <= a[p][1]))
        return !0;
    return !1;
  }
  class r extends y {
    constructor(a) {
      super(), this.options = a || {}, this.options.lineLength !== !1 && (this.options.lineLength = this.options.lineLength || 76), this._curLine = "", this.inputBytes = 0, this.outputBytes = 0;
    }
    _transform(a, p, s) {
      let i;
      if (p !== "buffer" && (a = Buffer.from(a, p)), !a || !a.length)
        return s();
      this.inputBytes += a.length, this.options.lineLength ? (i = this._curLine + E(a), i = S(i, this.options.lineLength), i = i.replace(/(^|\n)([^\n]*)$/, (l, n, d) => (this._curLine = d, n)), i && (this.outputBytes += i.length, this.push(i))) : (i = E(a), this.outputBytes += i.length, this.push(i, "ascii")), s();
    }
    _flush(a) {
      this._curLine && (this.outputBytes += this._curLine.length, this.push(this._curLine, "ascii")), a();
    }
  }
  return re = {
    encode: E,
    wrap: S,
    Encoder: r
  }, re;
}
var pe, Fe;
function te() {
  if (Fe) return pe;
  Fe = 1;
  const y = yt(), E = Et(), S = _t();
  return pe = {
    /**
     * Checks if a value is plaintext string (uses only printable 7bit chars)
     *
     * @param {String} value String to be tested
     * @returns {Boolean} true if it is a plaintext string
     */
    isPlainText(x, r) {
      return !(typeof x != "string" || (r ? /[\x00-\x08\x0b\x0c\x0e-\x1f"\u0080-\uFFFF]/ : /[\x00-\x08\x0b\x0c\x0e-\x1f\u0080-\uFFFF]/).test(x));
    },
    /**
     * Checks if a multi line string containes lines longer than the selected value.
     *
     * Useful when detecting if a mail message needs any processing at all –
     * if only plaintext characters are used and lines are short, then there is
     * no need to encode the values in any way. If the value is plaintext but has
     * longer lines then allowed, then use format=flowed
     *
     * @param {Number} lineLength Max line length to check for
     * @returns {Boolean} Returns true if there is at least one line longer than lineLength chars
     */
    hasLongerLines(x, r) {
      return x.length > 128 * 1024 ? !0 : new RegExp("^.{" + (r + 1) + ",}", "m").test(x);
    },
    /**
     * Encodes a string or an Buffer to an UTF-8 MIME Word (rfc2047)
     *
     * @param {String|Buffer} data String to be encoded
     * @param {String} mimeWordEncoding='Q' Encoding for the mime word, either Q or B
     * @param {Number} [maxLength=0] If set, split mime words into several chunks if needed
     * @return {String} Single or several mime words joined together
     */
    encodeWord(x, r, o) {
      r = (r || "Q").toString().toUpperCase().trim().charAt(0), o = o || 0;
      let a, p = "UTF-8";
      if (o && o > 7 + p.length && (o -= 7 + p.length), r === "Q" ? a = E.encode(x).replace(/[^a-z0-9!*+\-/=]/gi, (s) => {
        let i = s.charCodeAt(0).toString(16).toUpperCase();
        return s === " " ? "_" : "=" + (i.length === 1 ? "0" + i : i);
      }) : r === "B" && (a = typeof x == "string" ? x : y.encode(x), o = o ? Math.max(3, (o - o % 4) / 4 * 3) : 0), o && (r !== "B" ? a : y.encode(x)).length > o)
        if (r === "Q")
          a = this.splitMimeEncodedString(a, o).join("?= =?" + p + "?" + r + "?");
        else {
          let s = [], i = "";
          for (let l = 0, n = a.length; l < n; l++) {
            let d = a.charAt(l);
            /[\ud83c\ud83d\ud83e]/.test(d) && l < n - 1 && (d += a.charAt(++l)), Buffer.byteLength(i + d) <= o || l === 0 ? i += d : (s.push(y.encode(i)), i = d);
          }
          i && s.push(y.encode(i)), s.length > 1 ? a = s.join("?= =?" + p + "?" + r + "?") : a = s.join("");
        }
      else r === "B" && (a = y.encode(x));
      return "=?" + p + "?" + r + "?" + a + (a.substr(-2) === "?=" ? "" : "?=");
    },
    /**
     * Finds word sequences with non ascii text and converts these to mime words
     *
     * @param {String} value String to be encoded
     * @param {String} mimeWordEncoding='Q' Encoding for the mime word, either Q or B
     * @param {Number} [maxLength=0] If set, split mime words into several chunks if needed
     * @param {Boolean} [encodeAll=false] If true and the value needs encoding then encodes entire string, not just the smallest match
     * @return {String} String with possible mime words
     */
    encodeWords(x, r, o, a) {
      o = o || 0;
      let p, s = x.match(/(?:^|\s)([^\s]*["\u0080-\uFFFF])/);
      if (!s)
        return x;
      if (a)
        return this.encodeWord(x, r, o);
      let i = x.match(/(["\u0080-\uFFFF][^\s]*)[^"\u0080-\uFFFF]*$/);
      if (!i)
        return x;
      let l = s.index + (s[0].match(/[^\s]/) || {
        index: 0
      }).index, n = i.index + (i[1] || "").length;
      return p = (l ? x.substr(0, l) : "") + this.encodeWord(x.substring(l, n), r || "Q", o) + (n < x.length ? x.substr(n) : ""), p;
    },
    /**
     * Joins parsed header value together as 'value; param1=value1; param2=value2'
     * PS: We are following RFC 822 for the list of special characters that we need to keep in quotes.
     *      Refer: https://www.w3.org/Protocols/rfc1341/4_Content-Type.html
     * @param {Object} structured Parsed header value
     * @return {String} joined header value
     */
    buildHeaderValue(x) {
      let r = [];
      return Object.keys(x.params || {}).forEach((o) => {
        let a = x.params[o];
        !this.isPlainText(a, !0) || a.length >= 75 ? this.buildHeaderParam(o, a, 50).forEach((p) => {
          !/[\s"\\;:/=(),<>@[\]?]|^[-']|'$/.test(p.value) || p.key.substr(-1) === "*" ? r.push(p.key + "=" + p.value) : r.push(p.key + "=" + JSON.stringify(p.value));
        }) : /[\s'"\\;:/=(),<>@[\]?]|^-/.test(a) ? r.push(o + "=" + JSON.stringify(a)) : r.push(o + "=" + a);
      }), x.value + (r.length ? "; " + r.join("; ") : "");
    },
    /**
     * Encodes a string or an Buffer to an UTF-8 Parameter Value Continuation encoding (rfc2231)
     * Useful for splitting long parameter values.
     *
     * For example
     *      title="unicode string"
     * becomes
     *     title*0*=utf-8''unicode
     *     title*1*=%20string
     *
     * @param {String|Buffer} data String to be encoded
     * @param {Number} [maxLength=50] Max length for generated chunks
     * @param {String} [fromCharset='UTF-8'] Source sharacter set
     * @return {Array} A list of encoded keys and headers
     */
    buildHeaderParam(x, r, o) {
      let a = [], p = typeof r == "string" ? r : (r || "").toString(), s, i, l, n, d = 0, f, g;
      if (o = o || 50, this.isPlainText(r, !0)) {
        if (p.length <= o)
          return [
            {
              key: x,
              value: p
            }
          ];
        p = p.replace(new RegExp(".{" + o + "}", "g"), (e) => (a.push({
          line: e
        }), "")), p && a.push({
          line: p
        });
      } else {
        if (/[\uD800-\uDBFF]/.test(p)) {
          for (s = [], f = 0, g = p.length; f < g; f++)
            i = p.charAt(f), l = i.charCodeAt(0), l >= 55296 && l <= 56319 && f < g - 1 ? (i += p.charAt(f + 1), s.push(i), f++) : s.push(i);
          p = s;
        }
        n = "utf-8''";
        let e = !0;
        for (d = 0, f = 0, g = p.length; f < g; f++) {
          if (i = p[f], e)
            i = this.safeEncodeURIComponent(i);
          else if (i = i === " " ? i : this.safeEncodeURIComponent(i), i !== p[f])
            if ((this.safeEncodeURIComponent(n) + i).length >= o)
              a.push({
                line: n,
                encoded: e
              }), n = "", d = f - 1;
            else {
              e = !0, f = d, n = "";
              continue;
            }
          (n + i).length >= o ? (a.push({
            line: n,
            encoded: e
          }), n = i = p[f] === " " ? " " : this.safeEncodeURIComponent(p[f]), i === p[f] ? (e = !1, d = f - 1) : e = !0) : n += i;
        }
        n && a.push({
          line: n,
          encoded: e
        });
      }
      return a.map((e, t) => ({
        // encoded lines: {name}*{part}*
        // unencoded lines: {name}*{part}
        // if any line needs to be encoded then the first line (part==0) is always encoded
        key: x + "*" + t + (e.encoded ? "*" : ""),
        value: e.line
      }));
    },
    /**
     * Parses a header value with key=value arguments into a structured
     * object.
     *
     *   parseHeaderValue('content-type: text/plain; CHARSET='UTF-8'') ->
     *   {
     *     'value': 'text/plain',
     *     'params': {
     *       'charset': 'UTF-8'
     *     }
     *   }
     *
     * @param {String} str Header value
     * @return {Object} Header value as a parsed structure
     */
    parseHeaderValue(x) {
      let r = {
        value: !1,
        params: {}
      }, o = !1, a = "", p = "value", s = !1, i = !1, l;
      for (let n = 0, d = x.length; n < d; n++)
        if (l = x.charAt(n), p === "key") {
          if (l === "=") {
            o = a.trim().toLowerCase(), p = "value", a = "";
            continue;
          }
          a += l;
        } else {
          if (i)
            a += l;
          else if (l === "\\") {
            i = !0;
            continue;
          } else s && l === s ? s = !1 : !s && l === '"' ? s = l : !s && l === ";" ? (o === !1 ? r.value = a.trim() : r.params[o] = a.trim(), p = "key", a = "") : a += l;
          i = !1;
        }
      return p === "value" ? o === !1 ? r.value = a.trim() : r.params[o] = a.trim() : a.trim() && (r.params[a.trim().toLowerCase()] = ""), Object.keys(r.params).forEach((n) => {
        let d, f, g, e;
        (g = n.match(/(\*(\d+)|\*(\d+)\*|\*)$/)) && (d = n.substr(0, g.index), f = Number(g[2] || g[3]) || 0, (!r.params[d] || typeof r.params[d] != "object") && (r.params[d] = {
          charset: !1,
          values: []
        }), e = r.params[n], f === 0 && g[0].substr(-1) === "*" && (g = e.match(/^([^']*)'[^']*'(.*)$/)) && (r.params[d].charset = g[1] || "iso-8859-1", e = g[2]), r.params[d].values[f] = e, delete r.params[n]);
      }), Object.keys(r.params).forEach((n) => {
        let d;
        r.params[n] && Array.isArray(r.params[n].values) && (d = r.params[n].values.map((f) => f || "").join(""), r.params[n].charset ? r.params[n] = "=?" + r.params[n].charset + "?Q?" + d.replace(/[=?_\s]/g, (f) => {
          let g = f.charCodeAt(0).toString(16);
          return f === " " ? "_" : "%" + (g.length < 2 ? "0" : "") + g;
        }).replace(/%/g, "=") + "?=" : r.params[n] = d);
      }), r;
    },
    /**
     * Returns file extension for a content type string. If no suitable extensions
     * are found, 'bin' is used as the default extension
     *
     * @param {String} mimeType Content type to be checked for
     * @return {String} File extension
     */
    detectExtension: (x) => S.detectExtension(x),
    /**
     * Returns content type for a file extension. If no suitable content types
     * are found, 'application/octet-stream' is used as the default content type
     *
     * @param {String} extension Extension to be checked for
     * @return {String} File extension
     */
    detectMimeType: (x) => S.detectMimeType(x),
    /**
     * Folds long lines, useful for folding header lines (afterSpace=false) and
     * flowed text (afterSpace=true)
     *
     * @param {String} str String to be folded
     * @param {Number} [lineLength=76] Maximum length of a line
     * @param {Boolean} afterSpace If true, leave a space in th end of a line
     * @return {String} String with folded lines
     */
    foldLines(x, r, o) {
      x = (x || "").toString(), r = r || 76;
      let a = 0, p = x.length, s = "", i, l;
      for (; a < p; ) {
        if (i = x.substr(a, r), i.length < r) {
          s += i;
          break;
        }
        if (l = i.match(/^[^\n\r]*(\r?\n|\r)/)) {
          i = l[0], s += i, a += i.length;
          continue;
        } else (l = i.match(/(\s+)[^\s]*$/)) && l[0].length - (o ? (l[1] || "").length : 0) < i.length ? i = i.substr(0, i.length - (l[0].length - (o ? (l[1] || "").length : 0))) : (l = x.substr(a + i.length).match(/^[^\s]+(\s*)/)) && (i = i + l[0].substr(0, l[0].length - (o ? 0 : (l[1] || "").length)));
        s += i, a += i.length, a < p && (s += `\r
`);
      }
      return s;
    },
    /**
     * Splits a mime encoded string. Needed for dividing mime words into smaller chunks
     *
     * @param {String} str Mime encoded string to be split up
     * @param {Number} maxlen Maximum length of characters for one part (minimum 12)
     * @return {Array} Split string
     */
    splitMimeEncodedString: (x, r) => {
      let o, a, p, s, i = [];
      for (r = Math.max(r || 0, 12); x.length; ) {
        for (o = x.substr(0, r), (a = o.match(/[=][0-9A-F]?$/i)) && (o = o.substr(0, a.index)), s = !1; !s; )
          s = !0, (a = x.substr(o.length).match(/^[=]([0-9A-F]{2})/i)) && (p = parseInt(a[1], 16), p < 194 && p > 127 && (o = o.substr(0, o.length - 3), s = !1));
        o.length && i.push(o), x = x.substr(o.length);
      }
      return i;
    },
    encodeURICharComponent: (x) => {
      let r = "", o = x.charCodeAt(0).toString(16).toUpperCase();
      if (o.length % 2 && (o = "0" + o), o.length > 2)
        for (let a = 0, p = o.length / 2; a < p; a++)
          r += "%" + o.substr(a, 2);
      else
        r += "%" + o;
      return r;
    },
    safeEncodeURIComponent(x) {
      x = (x || "").toString();
      try {
        x = encodeURIComponent(x);
      } catch {
        return x.replace(/[^\x00-\x1F *'()<>@,;:\\"[\]?=\u007F-\uFFFF]+/g, "");
      }
      return x.replace(/[\x00-\x1F *'()<>@,;:\\"[\]?=\u007F-\uFFFF]/g, (r) => this.encodeURICharComponent(r));
    }
  }, pe;
}
var le, $e;
function Pt() {
  if ($e) return le;
  $e = 1;
  function y(r, o) {
    let a = !1, p = "text", s, i = [], l = {
      address: [],
      comment: [],
      group: [],
      text: [],
      textWasQuoted: []
      // Track which text tokens came from inside quotes
    }, n, d, f = !1;
    for (n = 0, d = r.length; n < d; n++) {
      let g = r[n], e = n ? r[n - 1] : null;
      if (g.type === "operator")
        switch (g.value) {
          case "<":
            p = "address", f = !1;
            break;
          case "(":
            p = "comment", f = !1;
            break;
          case ":":
            p = "group", a = !0, f = !1;
            break;
          case '"':
            f = !f, p = "text";
            break;
          default:
            p = "text", f = !1;
            break;
        }
      else g.value && (p === "address" && (g.value = g.value.replace(/^[^<]*<\s*/, "")), e && e.noBreak && l[p].length ? (l[p][l[p].length - 1] += g.value, p === "text" && f && (l.textWasQuoted[l.textWasQuoted.length - 1] = !0)) : (l[p].push(g.value), p === "text" && l.textWasQuoted.push(f)));
    }
    if (!l.text.length && l.comment.length && (l.text = l.comment, l.comment = []), a) {
      l.text = l.text.join(" ");
      let g = [];
      l.group.length && x(l.group.join(","), { _depth: o + 1 }).forEach((t) => {
        t.group ? g = g.concat(t.group) : g.push(t);
      }), i.push({
        name: l.text || s && s.name,
        group: g
      });
    } else {
      if (!l.address.length && l.text.length) {
        for (n = l.text.length - 1; n >= 0; n--)
          if (!l.textWasQuoted[n] && l.text[n].match(/^[^@\s]+@[^@\s]+$/)) {
            l.address = l.text.splice(n, 1), l.textWasQuoted.splice(n, 1);
            break;
          }
        let g = function(e) {
          return l.address.length ? e : (l.address = [e.trim()], " ");
        };
        if (!l.address.length)
          for (n = l.text.length - 1; n >= 0 && !(!l.textWasQuoted[n] && (l.text[n] = l.text[n].replace(/\s*\b[^@\s]+@[^\s]+\b\s*/, g).trim(), l.address.length)); n--)
            ;
      }
      if (!l.text.length && l.comment.length && (l.text = l.comment, l.comment = []), l.address.length > 1 && (l.text = l.text.concat(l.address.splice(1))), l.text = l.text.join(" "), l.address = l.address.join(" "), !l.address && a)
        return [];
      s = {
        address: l.address || l.text || "",
        name: l.text || l.address || ""
      }, s.address === s.name && ((s.address || "").match(/@/) ? s.name = "" : s.address = ""), i.push(s);
    }
    return i;
  }
  class E {
    constructor(o) {
      this.str = (o || "").toString(), this.operatorCurrent = "", this.operatorExpecting = "", this.node = null, this.escaped = !1, this.list = [], this.operators = {
        '"': '"',
        "(": ")",
        "<": ">",
        ",": "",
        ":": ";",
        // Semicolons are not a legal delimiter per the RFC2822 grammar other
        // than for terminating a group, but they are also not valid for any
        // other use in this context.  Given that some mail clients have
        // historically allowed the semicolon as a delimiter equivalent to the
        // comma in their UI, it makes sense to treat them the same as a comma
        // when used outside of a group.
        ";": ""
      };
    }
    /**
     * Tokenizes the original input string
     *
     * @return {Array} An array of operator|text tokens
     */
    tokenize() {
      let o = [];
      for (let a = 0, p = this.str.length; a < p; a++) {
        let s = this.str.charAt(a), i = a < p - 1 ? this.str.charAt(a + 1) : null;
        this.checkChar(s, i);
      }
      return this.list.forEach((a) => {
        a.value = (a.value || "").toString().trim(), a.value && o.push(a);
      }), o;
    }
    /**
     * Checks if a character is an operator or text and acts accordingly
     *
     * @param {String} chr Character from the address field
     */
    checkChar(o, a) {
      if (!this.escaped) {
        if (o === this.operatorExpecting) {
          this.node = {
            type: "operator",
            value: o
          }, a && ![" ", "	", "\r", `
`, ",", ";"].includes(a) && (this.node.noBreak = !0), this.list.push(this.node), this.node = null, this.operatorExpecting = "", this.escaped = !1;
          return;
        } else if (!this.operatorExpecting && o in this.operators) {
          this.node = {
            type: "operator",
            value: o
          }, this.list.push(this.node), this.node = null, this.operatorExpecting = this.operators[o], this.escaped = !1;
          return;
        } else if (['"', "'"].includes(this.operatorExpecting) && o === "\\") {
          this.escaped = !0;
          return;
        }
      }
      this.node || (this.node = {
        type: "text",
        value: ""
      }, this.list.push(this.node)), o === `
` && (o = " "), (o.charCodeAt(0) >= 33 || [" ", "	"].includes(o)) && (this.node.value += o), this.escaped = !1;
    }
  }
  const S = 50;
  function x(r, o) {
    o = o || {};
    let a = o._depth || 0;
    if (a > S)
      return [];
    let s = new E(r).tokenize(), i = [], l = [], n = [];
    if (s.forEach((d) => {
      d.type === "operator" && (d.value === "," || d.value === ";") ? (l.length && i.push(l), l = []) : l.push(d);
    }), l.length && i.push(l), i.forEach((d) => {
      d = y(d, a), d.length && (n = n.concat(d));
    }), o.flatten) {
      let d = [], f = (g) => {
        g.forEach((e) => {
          if (e.group)
            return f(e.group);
          d.push(e);
        });
      };
      return f(n), d;
    }
    return n;
  }
  return le = x, le;
}
var ce, Ge;
function Rt() {
  if (Ge) return ce;
  Ge = 1;
  const y = O.Transform;
  class E extends y {
    constructor() {
      super(), this.lastByte = !1;
    }
    _transform(x, r, o) {
      x.length && (this.lastByte = x[x.length - 1]), this.push(x), o();
    }
    _flush(x) {
      return this.lastByte === 10 ? x() : this.lastByte === 13 ? (this.push(Buffer.from(`
`)), x()) : (this.push(Buffer.from(`\r
`)), x());
    }
  }
  return ce = E, ce;
}
var de, Qe;
function St() {
  if (Qe) return de;
  Qe = 1;
  const E = O.Transform;
  class S extends E {
    constructor(r) {
      super(r), this.options = r || {}, this.lastByte = !1;
    }
    /**
     * Escapes dots
     */
    _transform(r, o, a) {
      let p, s = 0;
      for (let i = 0, l = r.length; i < l; i++)
        r[i] === 10 && (i && r[i - 1] !== 13 || !i && this.lastByte !== 13) && (i > s && (p = r.slice(s, i), this.push(p)), this.push(Buffer.from(`\r
`)), s = i + 1);
      s && s < r.length ? (p = r.slice(s), this.push(p)) : s || this.push(r), this.lastByte = r[r.length - 1], a();
    }
  }
  return de = S, de;
}
var me, Ke;
function Ut() {
  if (Ke) return me;
  Ke = 1;
  const E = O.Transform;
  class S extends E {
    constructor(r) {
      super(r), this.options = r || {};
    }
    /**
     * Escapes dots
     */
    _transform(r, o, a) {
      let p, s = 0;
      for (let i = 0, l = r.length; i < l; i++)
        r[i] === 13 && (p = r.slice(s, i), s = i + 1, this.push(p));
      s && s < r.length ? (p = r.slice(s), this.push(p)) : s || this.push(r), a();
    }
  }
  return me = S, me;
}
var he, We;
function Ne() {
  if (We) return he;
  We = 1;
  const y = Q, E = Le, S = bt(), x = O.PassThrough, r = H(), o = te(), a = Et(), p = yt(), s = Pt(), i = ee(), l = Rt(), n = St(), d = Ut();
  class f {
    constructor(e, t) {
      this.nodeCounter = 0, t = t || {}, this.baseBoundary = t.baseBoundary || y.randomBytes(8).toString("hex"), this.boundaryPrefix = t.boundaryPrefix || "--_NmP", this.disableFileAccess = !!t.disableFileAccess, this.disableUrlAccess = !!t.disableUrlAccess, this.normalizeHeaderKey = t.normalizeHeaderKey, this.date = /* @__PURE__ */ new Date(), this.rootNode = t.rootNode || this, this.keepBcc = !!t.keepBcc, t.filename && (this.filename = t.filename, e || (e = o.detectMimeType(this.filename.split(".").pop()))), this.textEncoding = (t.textEncoding || "").toString().trim().charAt(0).toUpperCase(), this.parentNode = t.parentNode, this.hostname = t.hostname, this.newline = t.newline, this.childNodes = [], this._nodeId = ++this.rootNode.nodeCounter, this._headers = [], this._isPlainText = !1, this._hasLongLines = !1, this._envelope = !1, this._raw = !1, this._transforms = [], this._processFuncs = [], e && this.setHeader("Content-Type", e);
    }
    /////// PUBLIC METHODS
    /**
     * Creates and appends a child node.Arguments provided are passed to MimeNode constructor
     *
     * @param {String} [contentType] Optional content type
     * @param {Object} [options] Optional options object
     * @return {Object} Created node object
     */
    createChild(e, t) {
      !t && typeof e == "object" && (t = e, e = void 0);
      let m = new f(e, t);
      return this.appendChild(m), m;
    }
    /**
     * Appends an existing node to the mime tree. Removes the node from an existing
     * tree if needed
     *
     * @param {Object} childNode node to be appended
     * @return {Object} Appended node object
     */
    appendChild(e) {
      return e.rootNode !== this.rootNode && (e.rootNode = this.rootNode, e._nodeId = ++this.rootNode.nodeCounter), e.parentNode = this, this.childNodes.push(e), e;
    }
    /**
     * Replaces current node with another node
     *
     * @param {Object} node Replacement node
     * @return {Object} Replacement node
     */
    replace(e) {
      return e === this ? this : (this.parentNode.childNodes.forEach((t, m) => {
        t === this && (e.rootNode = this.rootNode, e.parentNode = this.parentNode, e._nodeId = this._nodeId, this.rootNode = this, this.parentNode = void 0, e.parentNode.childNodes[m] = e);
      }), e);
    }
    /**
     * Removes current node from the mime tree
     *
     * @return {Object} removed node
     */
    remove() {
      if (!this.parentNode)
        return this;
      for (let e = this.parentNode.childNodes.length - 1; e >= 0; e--)
        if (this.parentNode.childNodes[e] === this)
          return this.parentNode.childNodes.splice(e, 1), this.parentNode = void 0, this.rootNode = this, this;
    }
    /**
     * Sets a header value. If the value for selected key exists, it is overwritten.
     * You can set multiple values as well by using [{key:'', value:''}] or
     * {key: 'value'} as the first argument.
     *
     * @param {String|Array|Object} key Header key or a list of key value pairs
     * @param {String} value Header value
     * @return {Object} current node
     */
    setHeader(e, t) {
      let m = !1, h;
      if (!t && e && typeof e == "object")
        return e.key && "value" in e ? this.setHeader(e.key, e.value) : Array.isArray(e) ? e.forEach((c) => {
          this.setHeader(c.key, c.value);
        }) : Object.keys(e).forEach((c) => {
          this.setHeader(c, e[c]);
        }), this;
      e = this._normalizeHeaderKey(e), h = {
        key: e,
        value: t
      };
      for (let c = 0, u = this._headers.length; c < u; c++)
        this._headers[c].key === e && (m ? (this._headers.splice(c, 1), c--, u--) : (this._headers[c] = h, m = !0));
      return m || this._headers.push(h), this;
    }
    /**
     * Adds a header value. If the value for selected key exists, the value is appended
     * as a new field and old one is not touched.
     * You can set multiple values as well by using [{key:'', value:''}] or
     * {key: 'value'} as the first argument.
     *
     * @param {String|Array|Object} key Header key or a list of key value pairs
     * @param {String} value Header value
     * @return {Object} current node
     */
    addHeader(e, t) {
      return !t && e && typeof e == "object" ? (e.key && e.value ? this.addHeader(e.key, e.value) : Array.isArray(e) ? e.forEach((m) => {
        this.addHeader(m.key, m.value);
      }) : Object.keys(e).forEach((m) => {
        this.addHeader(m, e[m]);
      }), this) : Array.isArray(t) ? (t.forEach((m) => {
        this.addHeader(e, m);
      }), this) : (this._headers.push({
        key: this._normalizeHeaderKey(e),
        value: t
      }), this);
    }
    /**
     * Retrieves the first mathcing value of a selected key
     *
     * @param {String} key Key to search for
     * @retun {String} Value for the key
     */
    getHeader(e) {
      e = this._normalizeHeaderKey(e);
      for (let t = 0, m = this._headers.length; t < m; t++)
        if (this._headers[t].key === e)
          return this._headers[t].value;
    }
    /**
     * Sets body content for current node. If the value is a string, charset is added automatically
     * to Content-Type (if it is text/*). If the value is a Buffer, you need to specify
     * the charset yourself
     *
     * @param (String|Buffer) content Body content
     * @return {Object} current node
     */
    setContent(e) {
      return this.content = e, typeof this.content.pipe == "function" ? (this._contentErrorHandler = (t) => {
        this.content.removeListener("error", this._contentErrorHandler), this.content = t;
      }, this.content.once("error", this._contentErrorHandler)) : typeof this.content == "string" && (this._isPlainText = o.isPlainText(this.content), this._isPlainText && o.hasLongerLines(this.content, 76) && (this._hasLongLines = !0)), this;
    }
    build(e) {
      let t;
      e || (t = new Promise((v, w) => {
        e = r.callbackPromise(v, w);
      }));
      let m = this.createReadStream(), h = [], c = 0, u = !1;
      return m.on("readable", () => {
        let v;
        for (; (v = m.read()) !== null; )
          h.push(v), c += v.length;
      }), m.once("error", (v) => {
        if (!u)
          return u = !0, e(v);
      }), m.once("end", (v) => {
        if (!u)
          return u = !0, v && v.length && (h.push(v), c += v.length), e(null, Buffer.concat(h, c));
      }), t;
    }
    getTransferEncoding() {
      let e = !1, t = (this.getHeader("Content-Type") || "").toString().toLowerCase().trim();
      return this.content && (e = (this.getHeader("Content-Transfer-Encoding") || "").toString().toLowerCase().trim(), (!e || !["base64", "quoted-printable"].includes(e)) && (/^text\//i.test(t) ? this._isPlainText && !this._hasLongLines ? e = "7bit" : typeof this.content == "string" || this.content instanceof Buffer ? e = this._getTextEncoding(this.content) === "Q" ? "quoted-printable" : "base64" : e = this.textEncoding === "B" ? "base64" : "quoted-printable" : /^(multipart|message)\//i.test(t) || (e = e || "base64"))), e;
    }
    /**
     * Builds the header block for the mime node. Append \r\n\r\n before writing the content
     *
     * @returns {String} Headers
     */
    buildHeaders() {
      let e = this.getTransferEncoding(), t = [];
      if (e && this.setHeader("Content-Transfer-Encoding", e), this.filename && !this.getHeader("Content-Disposition") && this.setHeader("Content-Disposition", "attachment"), this.rootNode === this) {
        this.getHeader("Date") || this.setHeader("Date", this.date.toUTCString().replace(/GMT/, "+0000")), this.messageId(), this.getHeader("MIME-Version") || this.setHeader("MIME-Version", "1.0");
        for (let m = this._headers.length - 2; m >= 0; m--) {
          let h = this._headers[m];
          h.key === "Content-Type" && (this._headers.splice(m, 1), this._headers.push(h));
        }
      }
      return this._headers.forEach((m) => {
        let h = m.key, c = m.value, u, v, w = {};
        if (!(c && typeof c == "object" && !["From", "Sender", "To", "Cc", "Bcc", "Reply-To", "Date", "References"].includes(h) && (Object.keys(c).forEach((_) => {
          _ !== "value" && (w[_] = c[_]);
        }), c = (c.value || "").toString(), !c.trim()))) {
          if (w.prepared) {
            w.foldLines ? t.push(o.foldLines(h + ": " + c)) : t.push(h + ": " + c);
            return;
          }
          switch (m.key) {
            case "Content-Disposition":
              u = o.parseHeaderValue(c), this.filename && (u.params.filename = this.filename), c = o.buildHeaderValue(u);
              break;
            case "Content-Type":
              u = o.parseHeaderValue(c), this._handleContentType(u), u.value.match(/^text\/plain\b/) && typeof this.content == "string" && /[\u0080-\uFFFF]/.test(this.content) && (u.params.charset = "utf-8"), c = o.buildHeaderValue(u), this.filename && (v = this._encodeWords(this.filename), (v !== this.filename || /[\s'"\\;:/=(),<>@[\]?]|^-/.test(v)) && (v = '"' + v + '"'), c += "; name=" + v);
              break;
            case "Bcc":
              if (!this.keepBcc)
                return;
              break;
          }
          if (c = this._encodeHeaderValue(h, c), !!(c || "").toString().trim()) {
            if (typeof this.normalizeHeaderKey == "function") {
              let _ = this.normalizeHeaderKey(h, c);
              _ && typeof _ == "string" && _.length && (h = _);
            }
            t.push(o.foldLines(h + ": " + c, 76));
          }
        }
      }), t.join(`\r
`);
    }
    /**
     * Streams the rfc2822 message from the current node. If this is a root node,
     * mandatory header fields are set if missing (Date, Message-Id, MIME-Version)
     *
     * @return {String} Compiled message
     */
    createReadStream(e) {
      e = e || {};
      let t = new x(e), m = t, h;
      this.stream(t, e, (c) => {
        if (c) {
          m.emit("error", c);
          return;
        }
        t.end();
      });
      for (let c = 0, u = this._transforms.length; c < u; c++)
        h = typeof this._transforms[c] == "function" ? this._transforms[c]() : this._transforms[c], m.once("error", (v) => {
          h.emit("error", v);
        }), m = m.pipe(h);
      h = new l(), m.once("error", (c) => {
        h.emit("error", c);
      }), m = m.pipe(h);
      for (let c = 0, u = this._processFuncs.length; c < u; c++)
        h = this._processFuncs[c], m = h(m);
      if (this.newline) {
        const u = ["win", "windows", "dos", `\r
`].includes(this.newline.toString().toLowerCase()) ? new n() : new d(), v = m.pipe(u);
        return m.on("error", (w) => v.emit("error", w)), v;
      }
      return m;
    }
    /**
     * Appends a transform stream object to the transforms list. Final output
     * is passed through this stream before exposing
     *
     * @param {Object} transform Read-Write stream
     */
    transform(e) {
      this._transforms.push(e);
    }
    /**
     * Appends a post process function. The functon is run after transforms and
     * uses the following syntax
     *
     *   processFunc(input) -> outputStream
     *
     * @param {Object} processFunc Read-Write stream
     */
    processFunc(e) {
      this._processFuncs.push(e);
    }
    stream(e, t, m) {
      let h = this.getTransferEncoding(), c, u, v = !1, w = (A) => {
        v || (v = !0, m(A));
      }, b = () => {
        let A = 0, T = () => {
          if (A >= this.childNodes.length)
            return e.write(`\r
--` + this.boundary + `--\r
`), w();
          let j = this.childNodes[A++];
          e.write((A > 1 ? `\r
` : "") + "--" + this.boundary + `\r
`), j.stream(e, t, (I) => {
            if (I)
              return w(I);
            setImmediate(T);
          });
        };
        if (this.multipart)
          setImmediate(T);
        else
          return w();
      }, _ = () => {
        if (this.content) {
          if (Object.prototype.toString.call(this.content) === "[object Error]")
            return w(this.content);
          typeof this.content.pipe == "function" && (this.content.removeListener("error", this._contentErrorHandler), this._contentErrorHandler = (T) => w(T), this.content.once("error", this._contentErrorHandler));
          let A = () => {
            ["quoted-printable", "base64"].includes(h) ? (c = new (h === "base64" ? p : a).Encoder(t), c.pipe(e, {
              end: !1
            }), c.once("end", b), c.once("error", (T) => w(T)), u = this._getStream(this.content), u.pipe(c)) : (u = this._getStream(this.content), u.pipe(e, {
              end: !1
            }), u.once("end", b)), u.once("error", (T) => w(T));
          };
          if (this.content._resolve) {
            let T = [], j = 0, I = !1, k = this._getStream(this.content);
            k.on("error", (C) => {
              I || (I = !0, w(C));
            }), k.on("readable", () => {
              let C;
              for (; (C = k.read()) !== null; )
                T.push(C), j += C.length;
            }), k.on("end", () => {
              I || (I = !0, this.content._resolve = !1, this.content._resolvedValue = Buffer.concat(T, j), setImmediate(A));
            });
          } else
            setImmediate(A);
          return;
        } else
          return setImmediate(b);
      };
      this._raw ? setImmediate(() => {
        if (Object.prototype.toString.call(this._raw) === "[object Error]")
          return w(this._raw);
        typeof this._raw.pipe == "function" && this._raw.removeListener("error", this._contentErrorHandler);
        let A = this._getStream(this._raw);
        A.pipe(e, {
          end: !1
        }), A.on("error", (T) => e.emit("error", T)), A.on("end", b);
      }) : (e.write(this.buildHeaders() + `\r
\r
`), setImmediate(_));
    }
    /**
     * Sets envelope to be used instead of the generated one
     *
     * @return {Object} SMTP envelope in the form of {from: 'from@example.com', to: ['to@example.com']}
     */
    setEnvelope(e) {
      let t;
      this._envelope = {
        from: !1,
        to: []
      }, e.from && (t = [], this._convertAddresses(this._parseAddresses(e.from), t), t = t.filter((h) => h && h.address), t.length && t[0] && (this._envelope.from = t[0].address)), ["to", "cc", "bcc"].forEach((h) => {
        e[h] && this._convertAddresses(this._parseAddresses(e[h]), this._envelope.to);
      }), this._envelope.to = this._envelope.to.map((h) => h.address).filter((h) => h);
      let m = ["to", "cc", "bcc", "from"];
      return Object.keys(e).forEach((h) => {
        m.includes(h) || (this._envelope[h] = e[h]);
      }), this;
    }
    /**
     * Generates and returns an object with parsed address fields
     *
     * @return {Object} Address object
     */
    getAddresses() {
      let e = {};
      return this._headers.forEach((t) => {
        let m = t.key.toLowerCase();
        ["from", "sender", "reply-to", "to", "cc", "bcc"].includes(m) && (Array.isArray(e[m]) || (e[m] = []), this._convertAddresses(this._parseAddresses(t.value), e[m]));
      }), e;
    }
    /**
     * Generates and returns SMTP envelope with the sender address and a list of recipients addresses
     *
     * @return {Object} SMTP envelope in the form of {from: 'from@example.com', to: ['to@example.com']}
     */
    getEnvelope() {
      if (this._envelope)
        return this._envelope;
      let e = {
        from: !1,
        to: []
      };
      return this._headers.forEach((t) => {
        let m = [];
        t.key === "From" || !e.from && ["Reply-To", "Sender"].includes(t.key) ? (this._convertAddresses(this._parseAddresses(t.value), m), m.length && m[0] && (e.from = m[0].address)) : ["To", "Cc", "Bcc"].includes(t.key) && this._convertAddresses(this._parseAddresses(t.value), e.to);
      }), e.to = e.to.map((t) => t.address), e;
    }
    /**
     * Returns Message-Id value. If it does not exist, then creates one
     *
     * @return {String} Message-Id value
     */
    messageId() {
      let e = this.getHeader("Message-ID");
      return e || (e = this._generateMessageId(), this.setHeader("Message-ID", e)), e;
    }
    /**
     * Sets pregenerated content that will be used as the output of this node
     *
     * @param {String|Buffer|Stream} Raw MIME contents
     */
    setRaw(e) {
      return this._raw = e, this._raw && typeof this._raw.pipe == "function" && (this._contentErrorHandler = (t) => {
        this._raw.removeListener("error", this._contentErrorHandler), this._raw = t;
      }, this._raw.once("error", this._contentErrorHandler)), this;
    }
    /////// PRIVATE METHODS
    /**
     * Detects and returns handle to a stream related with the content.
     *
     * @param {Mixed} content Node content
     * @returns {Object} Stream object
     */
    _getStream(e) {
      let t;
      return e._resolvedValue ? (t = new x(), setImmediate(() => {
        try {
          t.end(e._resolvedValue);
        } catch (m) {
          t.emit("error", m);
        }
      }), t) : typeof e.pipe == "function" ? e : e && typeof e.path == "string" && !e.href ? this.disableFileAccess ? (t = new x(), setImmediate(() => t.emit("error", new Error("File access rejected for " + e.path))), t) : E.createReadStream(e.path) : e && typeof e.href == "string" ? this.disableUrlAccess ? (t = new x(), setImmediate(() => t.emit("error", new Error("Url access rejected for " + e.href))), t) : i(e.href, { headers: e.httpHeaders }) : (t = new x(), setImmediate(() => {
        try {
          t.end(e || "");
        } catch (m) {
          t.emit("error", m);
        }
      }), t);
    }
    /**
     * Parses addresses. Takes in a single address or an array or an
     * array of address arrays (eg. To: [[first group], [second group],...])
     *
     * @param {Mixed} addresses Addresses to be parsed
     * @return {Array} An array of address objects
     */
    _parseAddresses(e) {
      return [].concat.apply(
        [],
        [].concat(e).map((t) => t && t.address ? (t.address = this._normalizeAddress(t.address), t.name = t.name || "", [t]) : s(t))
      );
    }
    /**
     * Normalizes a header key, uses Camel-Case form, except for uppercase MIME-
     *
     * @param {String} key Key to be normalized
     * @return {String} key in Camel-Case form
     */
    _normalizeHeaderKey(e) {
      return e = (e || "").toString().replace(/\r?\n|\r/g, " ").trim().toLowerCase().replace(/^X-SMTPAPI$|^(MIME|DKIM|ARC|BIMI)\b|^[a-z]|-(SPF|FBL|ID|MD5)$|-[a-z]/gi, (t) => t.toUpperCase()).replace(/^Content-Features$/i, "Content-features"), e;
    }
    /**
     * Checks if the content type is multipart and defines boundary if needed.
     * Doesn't return anything, modifies object argument instead.
     *
     * @param {Object} structured Parsed header value for 'Content-Type' key
     */
    _handleContentType(e) {
      this.contentType = e.value.trim().toLowerCase(), this.multipart = /^multipart\//i.test(this.contentType) ? this.contentType.substr(this.contentType.indexOf("/") + 1) : !1, this.multipart ? this.boundary = e.params.boundary = e.params.boundary || this.boundary || this._generateBoundary() : this.boundary = !1;
    }
    /**
     * Generates a multipart boundary value
     *
     * @return {String} boundary value
     */
    _generateBoundary() {
      return this.rootNode.boundaryPrefix + "-" + this.rootNode.baseBoundary + "-Part_" + this._nodeId;
    }
    /**
     * Encodes a header value for use in the generated rfc2822 email.
     *
     * @param {String} key Header key
     * @param {String} value Header value
     */
    _encodeHeaderValue(e, t) {
      switch (e = this._normalizeHeaderKey(e), e) {
        // Structured headers
        case "From":
        case "Sender":
        case "To":
        case "Cc":
        case "Bcc":
        case "Reply-To":
          return this._convertAddresses(this._parseAddresses(t));
        // values enclosed in <>
        case "Message-ID":
        case "In-Reply-To":
        case "Content-Id":
          return t = (t || "").toString().replace(/\r?\n|\r/g, " "), t.charAt(0) !== "<" && (t = "<" + t), t.charAt(t.length - 1) !== ">" && (t = t + ">"), t;
        // space separated list of values enclosed in <>
        case "References":
          return t = [].concat.apply(
            [],
            [].concat(t || "").map((m) => (m = (m || "").toString().replace(/\r?\n|\r/g, " ").trim(), m.replace(/<[^>]*>/g, (h) => h.replace(/\s/g, "")).split(/\s+/)))
          ).map((m) => (m.charAt(0) !== "<" && (m = "<" + m), m.charAt(m.length - 1) !== ">" && (m = m + ">"), m)), t.join(" ").trim();
        case "Date":
          return Object.prototype.toString.call(t) === "[object Date]" ? t.toUTCString().replace(/GMT/, "+0000") : (t = (t || "").toString().replace(/\r?\n|\r/g, " "), this._encodeWords(t));
        case "Content-Type":
        case "Content-Disposition":
          return (t || "").toString().replace(/\r?\n|\r/g, " ");
        default:
          return t = (t || "").toString().replace(/\r?\n|\r/g, " "), this._encodeWords(t);
      }
    }
    /**
     * Rebuilds address object using punycode and other adjustments
     *
     * @param {Array} addresses An array of address objects
     * @param {Array} [uniqueList] An array to be populated with addresses
     * @return {String} address string
     */
    _convertAddresses(e, t) {
      let m = [];
      return t = t || [], [].concat(e || []).forEach((h) => {
        if (h.address)
          h.address = this._normalizeAddress(h.address), h.name ? h.name && m.push(`${this._encodeAddressName(h.name)} <${h.address}>`) : m.push(h.address.indexOf(" ") >= 0 ? `<${h.address}>` : `${h.address}`), h.address && (t.filter((c) => c.address === h.address).length || t.push(h));
        else if (h.group) {
          let c = (h.group.length ? this._convertAddresses(h.group, t) : "").trim();
          m.push(`${this._encodeAddressName(h.name)}:${c};`);
        }
      }), m.join(", ");
    }
    /**
     * Normalizes an email address
     *
     * @param {Array} address An array of address objects
     * @return {String} address string
     */
    _normalizeAddress(e) {
      e = (e || "").toString().replace(/[\x00-\x1F<>]+/g, " ").trim();
      let t = e.lastIndexOf("@");
      if (t < 0)
        return e;
      let m = e.substr(0, t), h = e.substr(t + 1), c;
      try {
        c = S.toASCII(h.toLowerCase());
      } catch {
      }
      return m.indexOf(" ") >= 0 && (m.charAt(0) !== '"' && (m = '"' + m), m.substr(-1) !== '"' && (m = m + '"')), `${m}@${c}`;
    }
    /**
     * If needed, mime encodes the name part
     *
     * @param {String} name Name part of an address
     * @returns {String} Mime word encoded string if needed
     */
    _encodeAddressName(e) {
      return /^[\w ]*$/.test(e) ? e : /^[\x20-\x7e]*$/.test(e) ? '"' + e.replace(/([\\"])/g, "\\$1") + '"' : o.encodeWord(e, this._getTextEncoding(e), 52);
    }
    /**
     * If needed, mime encodes the name part
     *
     * @param {String} name Name part of an address
     * @returns {String} Mime word encoded string if needed
     */
    _encodeWords(e) {
      return o.encodeWords(e, this._getTextEncoding(e), 52, !0);
    }
    /**
     * Detects best mime encoding for a text value
     *
     * @param {String} value Value to check for
     * @return {String} either 'Q' or 'B'
     */
    _getTextEncoding(e) {
      e = (e || "").toString();
      let t = this.textEncoding, m, h;
      return t || (h = (e.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\u0080-\uFFFF]/g) || []).length, m = (e.match(/[a-z]/gi) || []).length, t = h < m ? "Q" : "B"), t;
    }
    /**
     * Generates a message id
     *
     * @return {String} Random Message-ID value
     */
    _generateMessageId() {
      return "<" + [2, 2, 2, 6].reduce(
        // crux to generate UUID-like random strings
        (e, t) => e + "-" + y.randomBytes(t).toString("hex"),
        y.randomBytes(4).toString("hex")
      ) + "@" + // try to use the domain of the FROM address or fallback to server hostname
      (this.getEnvelope().from || this.hostname || "localhost").split("@").pop() + ">";
    }
  }
  return he = f, he;
}
var ue, Ve;
function Bt() {
  if (Ve) return ue;
  Ve = 1;
  const y = Ne(), E = te(), S = H().parseDataURI;
  class x {
    constructor(o) {
      this.mail = o || {}, this.message = !1;
    }
    /**
     * Builds MimeNode instance
     */
    compile() {
      return this._alternatives = this.getAlternatives(), this._htmlNode = this._alternatives.filter((o) => /^text\/html\b/i.test(o.contentType)).pop(), this._attachments = this.getAttachments(!!this._htmlNode), this._useRelated = !!(this._htmlNode && this._attachments.related.length), this._useAlternative = this._alternatives.length > 1, this._useMixed = this._attachments.attached.length > 1 || this._alternatives.length && this._attachments.attached.length === 1, this.mail.raw ? this.message = new y("message/rfc822", { newline: this.mail.newline }).setRaw(this.mail.raw) : this._useMixed ? this.message = this._createMixed() : this._useAlternative ? this.message = this._createAlternative() : this._useRelated ? this.message = this._createRelated() : this.message = this._createContentNode(
        !1,
        [].concat(this._alternatives || []).concat(this._attachments.attached || []).shift() || {
          contentType: "text/plain",
          content: ""
        }
      ), this.mail.headers && this.message.addHeader(this.mail.headers), ["from", "sender", "to", "cc", "bcc", "reply-to", "in-reply-to", "references", "subject", "message-id", "date"].forEach((o) => {
        let a = o.replace(/-(\w)/g, (p, s) => s.toUpperCase());
        this.mail[a] && this.message.setHeader(o, this.mail[a]);
      }), this.mail.envelope && this.message.setEnvelope(this.mail.envelope), this.message.messageId(), this.message;
    }
    /**
     * List all attachments. Resulting attachment objects can be used as input for MimeNode nodes
     *
     * @param {Boolean} findRelated If true separate related attachments from attached ones
     * @returns {Object} An object of arrays (`related` and `attached`)
     */
    getAttachments(o) {
      let a, p, s = [].concat(this.mail.attachments || []).map((i, l) => {
        let n;
        /^data:/i.test(i.path || i.href) && (i = this._processDataUrl(i));
        let d = i.contentType || E.detectMimeType(i.filename || i.path || i.href || "bin"), f = /^image\//i.test(d), g = /^message\//i.test(d), e = i.contentDisposition || (g || f && i.cid ? "inline" : "attachment"), t;
        return "contentTransferEncoding" in i ? t = i.contentTransferEncoding : g ? t = "8bit" : t = "base64", n = {
          contentType: d,
          contentDisposition: e,
          contentTransferEncoding: t
        }, i.filename ? n.filename = i.filename : !g && i.filename !== !1 && (n.filename = (i.path || i.href || "").split("/").pop().split("?").shift() || "attachment-" + (l + 1), n.filename.indexOf(".") < 0 && (n.filename += "." + E.detectExtension(n.contentType))), /^https?:\/\//i.test(i.path) && (i.href = i.path, i.path = void 0), i.cid && (n.cid = i.cid), i.raw ? n.raw = i.raw : i.path ? n.content = {
          path: i.path
        } : i.href ? n.content = {
          href: i.href,
          httpHeaders: i.httpHeaders
        } : n.content = i.content || "", i.encoding && (n.encoding = i.encoding), i.headers && (n.headers = i.headers), n;
      });
      return this.mail.icalEvent && (typeof this.mail.icalEvent == "object" && (this.mail.icalEvent.content || this.mail.icalEvent.path || this.mail.icalEvent.href || this.mail.icalEvent.raw) ? a = this.mail.icalEvent : a = {
        content: this.mail.icalEvent
      }, p = {}, Object.keys(a).forEach((i) => {
        p[i] = a[i];
      }), p.contentType = "application/ics", p.headers || (p.headers = {}), p.filename = p.filename || "invite.ics", p.headers["Content-Disposition"] = "attachment", p.headers["Content-Transfer-Encoding"] = "base64"), o ? {
        attached: s.filter((i) => !i.cid).concat(p || []),
        related: s.filter((i) => !!i.cid)
      } : {
        attached: s.concat(p || []),
        related: []
      };
    }
    /**
     * List alternatives. Resulting objects can be used as input for MimeNode nodes
     *
     * @returns {Array} An array of alternative elements. Includes the `text` and `html` values as well
     */
    getAlternatives() {
      let o = [], a, p, s, i, l, n;
      return this.mail.text && (typeof this.mail.text == "object" && (this.mail.text.content || this.mail.text.path || this.mail.text.href || this.mail.text.raw) ? a = this.mail.text : a = {
        content: this.mail.text
      }, a.contentType = "text/plain; charset=utf-8"), this.mail.watchHtml && (typeof this.mail.watchHtml == "object" && (this.mail.watchHtml.content || this.mail.watchHtml.path || this.mail.watchHtml.href || this.mail.watchHtml.raw) ? s = this.mail.watchHtml : s = {
        content: this.mail.watchHtml
      }, s.contentType = "text/watch-html; charset=utf-8"), this.mail.amp && (typeof this.mail.amp == "object" && (this.mail.amp.content || this.mail.amp.path || this.mail.amp.href || this.mail.amp.raw) ? i = this.mail.amp : i = {
        content: this.mail.amp
      }, i.contentType = "text/x-amp-html; charset=utf-8"), this.mail.icalEvent && (typeof this.mail.icalEvent == "object" && (this.mail.icalEvent.content || this.mail.icalEvent.path || this.mail.icalEvent.href || this.mail.icalEvent.raw) ? l = this.mail.icalEvent : l = {
        content: this.mail.icalEvent
      }, n = {}, Object.keys(l).forEach((d) => {
        n[d] = l[d];
      }), n.content && typeof n.content == "object" && (n.content._resolve = !0), n.filename = !1, n.contentType = "text/calendar; charset=utf-8; method=" + (n.method || "PUBLISH").toString().trim().toUpperCase(), n.headers || (n.headers = {})), this.mail.html && (typeof this.mail.html == "object" && (this.mail.html.content || this.mail.html.path || this.mail.html.href || this.mail.html.raw) ? p = this.mail.html : p = {
        content: this.mail.html
      }, p.contentType = "text/html; charset=utf-8"), [].concat(a || []).concat(s || []).concat(i || []).concat(p || []).concat(n || []).concat(this.mail.alternatives || []).forEach((d) => {
        let f;
        /^data:/i.test(d.path || d.href) && (d = this._processDataUrl(d)), f = {
          contentType: d.contentType || E.detectMimeType(d.filename || d.path || d.href || "txt"),
          contentTransferEncoding: d.contentTransferEncoding
        }, d.filename && (f.filename = d.filename), /^https?:\/\//i.test(d.path) && (d.href = d.path, d.path = void 0), d.raw ? f.raw = d.raw : d.path ? f.content = {
          path: d.path
        } : d.href ? f.content = {
          href: d.href
        } : f.content = d.content || "", d.encoding && (f.encoding = d.encoding), d.headers && (f.headers = d.headers), o.push(f);
      }), o;
    }
    /**
     * Builds multipart/mixed node. It should always contain different type of elements on the same level
     * eg. text + attachments
     *
     * @param {Object} parentNode Parent for this note. If it does not exist, a root node is created
     * @returns {Object} MimeNode node element
     */
    _createMixed(o) {
      let a;
      return o ? a = o.createChild("multipart/mixed", {
        disableUrlAccess: this.mail.disableUrlAccess,
        disableFileAccess: this.mail.disableFileAccess,
        normalizeHeaderKey: this.mail.normalizeHeaderKey,
        newline: this.mail.newline
      }) : a = new y("multipart/mixed", {
        baseBoundary: this.mail.baseBoundary,
        textEncoding: this.mail.textEncoding,
        boundaryPrefix: this.mail.boundaryPrefix,
        disableUrlAccess: this.mail.disableUrlAccess,
        disableFileAccess: this.mail.disableFileAccess,
        normalizeHeaderKey: this.mail.normalizeHeaderKey,
        newline: this.mail.newline
      }), this._useAlternative ? this._createAlternative(a) : this._useRelated && this._createRelated(a), [].concat(!this._useAlternative && this._alternatives || []).concat(this._attachments.attached || []).forEach((p) => {
        (!this._useRelated || p !== this._htmlNode) && this._createContentNode(a, p);
      }), a;
    }
    /**
     * Builds multipart/alternative node. It should always contain same type of elements on the same level
     * eg. text + html view of the same data
     *
     * @param {Object} parentNode Parent for this note. If it does not exist, a root node is created
     * @returns {Object} MimeNode node element
     */
    _createAlternative(o) {
      let a;
      return o ? a = o.createChild("multipart/alternative", {
        disableUrlAccess: this.mail.disableUrlAccess,
        disableFileAccess: this.mail.disableFileAccess,
        normalizeHeaderKey: this.mail.normalizeHeaderKey,
        newline: this.mail.newline
      }) : a = new y("multipart/alternative", {
        baseBoundary: this.mail.baseBoundary,
        textEncoding: this.mail.textEncoding,
        boundaryPrefix: this.mail.boundaryPrefix,
        disableUrlAccess: this.mail.disableUrlAccess,
        disableFileAccess: this.mail.disableFileAccess,
        normalizeHeaderKey: this.mail.normalizeHeaderKey,
        newline: this.mail.newline
      }), this._alternatives.forEach((p) => {
        this._useRelated && this._htmlNode === p ? this._createRelated(a) : this._createContentNode(a, p);
      }), a;
    }
    /**
     * Builds multipart/related node. It should always contain html node with related attachments
     *
     * @param {Object} parentNode Parent for this note. If it does not exist, a root node is created
     * @returns {Object} MimeNode node element
     */
    _createRelated(o) {
      let a;
      return o ? a = o.createChild('multipart/related; type="text/html"', {
        disableUrlAccess: this.mail.disableUrlAccess,
        disableFileAccess: this.mail.disableFileAccess,
        normalizeHeaderKey: this.mail.normalizeHeaderKey,
        newline: this.mail.newline
      }) : a = new y('multipart/related; type="text/html"', {
        baseBoundary: this.mail.baseBoundary,
        textEncoding: this.mail.textEncoding,
        boundaryPrefix: this.mail.boundaryPrefix,
        disableUrlAccess: this.mail.disableUrlAccess,
        disableFileAccess: this.mail.disableFileAccess,
        normalizeHeaderKey: this.mail.normalizeHeaderKey,
        newline: this.mail.newline
      }), this._createContentNode(a, this._htmlNode), this._attachments.related.forEach((p) => this._createContentNode(a, p)), a;
    }
    /**
     * Creates a regular node with contents
     *
     * @param {Object} parentNode Parent for this note. If it does not exist, a root node is created
     * @param {Object} element Node data
     * @returns {Object} MimeNode node element
     */
    _createContentNode(o, a) {
      a = a || {}, a.content = a.content || "";
      let p, s = (a.encoding || "utf8").toString().toLowerCase().replace(/[-_\s]/g, "");
      return o ? p = o.createChild(a.contentType, {
        filename: a.filename,
        textEncoding: this.mail.textEncoding,
        disableUrlAccess: this.mail.disableUrlAccess,
        disableFileAccess: this.mail.disableFileAccess,
        normalizeHeaderKey: this.mail.normalizeHeaderKey,
        newline: this.mail.newline
      }) : p = new y(a.contentType, {
        filename: a.filename,
        baseBoundary: this.mail.baseBoundary,
        textEncoding: this.mail.textEncoding,
        boundaryPrefix: this.mail.boundaryPrefix,
        disableUrlAccess: this.mail.disableUrlAccess,
        disableFileAccess: this.mail.disableFileAccess,
        normalizeHeaderKey: this.mail.normalizeHeaderKey,
        newline: this.mail.newline
      }), a.headers && p.addHeader(a.headers), a.cid && p.setHeader("Content-Id", "<" + a.cid.replace(/[<>]/g, "") + ">"), a.contentTransferEncoding ? p.setHeader("Content-Transfer-Encoding", a.contentTransferEncoding) : this.mail.encoding && /^text\//i.test(a.contentType) && p.setHeader("Content-Transfer-Encoding", this.mail.encoding), (!/^text\//i.test(a.contentType) || a.contentDisposition) && p.setHeader(
        "Content-Disposition",
        a.contentDisposition || (a.cid && /^image\//i.test(a.contentType) ? "inline" : "attachment")
      ), typeof a.content == "string" && !["utf8", "usascii", "ascii"].includes(s) && (a.content = Buffer.from(a.content, s)), a.raw ? p.setRaw(a.raw) : p.setContent(a.content), p;
    }
    /**
     * Parses data uri and converts it to a Buffer
     *
     * @param {Object} element Content element
     * @return {Object} Parsed element
     */
    _processDataUrl(o) {
      const a = o.path || o.href;
      if (!a || typeof a != "string" || !a.startsWith("data:"))
        return o;
      if (a.length > 52428800) {
        let s = "application/octet-stream";
        const i = a.indexOf(",");
        if (i > 0 && i < 200) {
          const n = a.substring(5, i).split(";");
          n[0] && n[0].includes("/") && (s = n[0].trim());
        }
        return Object.assign({}, o, {
          path: !1,
          href: !1,
          content: Buffer.alloc(0),
          contentType: o.contentType || s
        });
      }
      let p;
      try {
        p = S(a);
      } catch {
        return o;
      }
      return p && (o.content = p.data, o.contentType = o.contentType || p.contentType, "path" in o && (o.path = !1), "href" in o && (o.href = !1)), o;
    }
  }
  return ue = x, ue;
}
var fe, Xe;
function Dt() {
  if (Xe) return fe;
  Xe = 1;
  const y = O.Transform;
  class E extends y {
    constructor(x) {
      super(x), this.lastBytes = Buffer.alloc(4), this.headersParsed = !1, this.headerBytes = 0, this.headerChunks = [], this.rawHeaders = !1, this.bodySize = 0;
    }
    /**
     * Keeps count of the last 4 bytes in order to detect line breaks on chunk boundaries
     *
     * @param {Buffer} data Next data chunk from the stream
     */
    updateLastBytes(x) {
      let r = this.lastBytes.length, o = Math.min(x.length, r);
      for (let a = 0, p = r - o; a < p; a++)
        this.lastBytes[a] = this.lastBytes[a + o];
      for (let a = 1; a <= o; a++)
        this.lastBytes[r - a] = x[x.length - a];
    }
    /**
     * Finds and removes message headers from the remaining body. We want to keep
     * headers separated until final delivery to be able to modify these
     *
     * @param {Buffer} data Next chunk of data
     * @return {Boolean} Returns true if headers are already found or false otherwise
     */
    checkHeaders(x) {
      if (this.headersParsed)
        return !0;
      let r = this.lastBytes.length, o = 0;
      this.curLinePos = 0;
      for (let a = 0, p = this.lastBytes.length + x.length; a < p; a++) {
        let s;
        if (a < r ? s = this.lastBytes[a] : s = x[a - r], s === 10 && a) {
          let i = a - 1 < r ? this.lastBytes[a - 1] : x[a - 1 - r], l = a > 1 ? a - 2 < r ? this.lastBytes[a - 2] : x[a - 2 - r] : !1;
          if (i === 10) {
            this.headersParsed = !0, o = a - r + 1, this.headerBytes += o;
            break;
          } else if (i === 13 && l === 10) {
            this.headersParsed = !0, o = a - r + 1, this.headerBytes += o;
            break;
          }
        }
      }
      if (this.headersParsed) {
        if (this.headerChunks.push(x.slice(0, o)), this.rawHeaders = Buffer.concat(this.headerChunks, this.headerBytes), this.headerChunks = null, this.emit("headers", this.parseHeaders()), x.length - 1 > o) {
          let a = x.slice(o);
          this.bodySize += a.length, setImmediate(() => this.push(a));
        }
        return !1;
      } else
        this.headerBytes += x.length, this.headerChunks.push(x);
      return this.updateLastBytes(x), !1;
    }
    _transform(x, r, o) {
      if (!x || !x.length)
        return o();
      typeof x == "string" && (x = Buffer.from(x, r));
      let a;
      try {
        a = this.checkHeaders(x);
      } catch (p) {
        return o(p);
      }
      a && (this.bodySize += x.length, this.push(x)), setImmediate(o);
    }
    _flush(x) {
      if (this.headerChunks) {
        let r = Buffer.concat(this.headerChunks, this.headerBytes);
        this.bodySize += r.length, this.push(r), this.headerChunks = null;
      }
      x();
    }
    parseHeaders() {
      let x = (this.rawHeaders || "").toString().split(/\r?\n/);
      for (let r = x.length - 1; r > 0; r--)
        /^\s/.test(x[r]) && (x[r - 1] += `
` + x[r], x.splice(r, 1));
      return x.filter((r) => r.trim()).map((r) => ({
        key: r.substr(0, r.indexOf(":")).trim().toLowerCase(),
        line: r
      }));
    }
  }
  return fe = E, fe;
}
var xe, Je;
function Ft() {
  if (Je) return xe;
  Je = 1;
  const y = O.Transform, E = Q;
  class S extends y {
    constructor(r) {
      super(), r = r || {}, this.chunkBuffer = [], this.chunkBufferLen = 0, this.bodyHash = E.createHash(r.hashAlgo || "sha1"), this.remainder = "", this.byteLength = 0, this.debug = r.debug, this._debugBody = r.debug ? [] : !1;
    }
    updateHash(r) {
      let o, a = "", p = "file";
      for (let i = r.length - 1; i >= 0; i--) {
        let l = r[i];
        if (!(p === "file" && (l === 10 || l === 13))) {
          if (p === "file" && (l === 9 || l === 32))
            p = "line";
          else if (!(p === "line" && (l === 9 || l === 32))) {
            if ((p === "file" || p === "line") && (p = "body", i === r.length - 1))
              break;
          }
        }
        if (i === 0) {
          if (p === "file" && (!this.remainder || /[\r\n]$/.test(this.remainder)) || p === "line" && (!this.remainder || /[ \t]$/.test(this.remainder))) {
            this.remainder += r.toString("binary");
            return;
          } else if (p === "line" || p === "file") {
            a = r.toString("binary"), r = !1;
            break;
          }
        }
        if (p === "body") {
          a = r.slice(i + 1).toString("binary"), r = r.slice(0, i + 1);
          break;
        }
      }
      let s = !!this.remainder;
      if (r && !s) {
        for (let i = 0, l = r.length; i < l; i++)
          if (i && r[i] === 10 && r[i - 1] !== 13) {
            s = !0;
            break;
          } else if (i && r[i] === 13 && r[i - 1] === 32) {
            s = !0;
            break;
          } else if (i && r[i] === 32 && r[i - 1] === 32) {
            s = !0;
            break;
          } else if (r[i] === 9) {
            s = !0;
            break;
          }
      }
      s ? (o = this.remainder + (r ? r.toString("binary") : ""), this.remainder = a, o = o.replace(/\r?\n/g, `
`).replace(/[ \t]*$/gm, "").replace(/[ \t]+/gm, " ").replace(/\n/g, `\r
`), r = Buffer.from(o, "binary")) : a && (this.remainder = a), this.debug && this._debugBody.push(r), this.bodyHash.update(r);
    }
    _transform(r, o, a) {
      if (!r || !r.length)
        return a();
      typeof r == "string" && (r = Buffer.from(r, o)), this.updateHash(r), this.byteLength += r.length, this.push(r), a();
    }
    _flush(r) {
      /[\r\n]$/.test(this.remainder) && this.byteLength > 2 && this.bodyHash.update(Buffer.from(`\r
`)), this.byteLength || this.push(Buffer.from(`\r
`)), this.emit("hash", this.bodyHash.digest("base64"), this.debug ? Buffer.concat(this._debugBody) : !1), r();
    }
  }
  return xe = S, xe;
}
var Y = { exports: {} }, Ze;
function $t() {
  if (Ze) return Y.exports;
  Ze = 1;
  const y = bt(), E = te(), S = Q;
  Y.exports = (a, p, s, i) => {
    i = i || {};
    let n = i.headerFieldNames || "From:Sender:Reply-To:Subject:Date:Message-ID:To:Cc:MIME-Version:Content-Type:Content-Transfer-Encoding:Content-ID:Content-Description:Resent-Date:Resent-From:Resent-Sender:Resent-To:Resent-Cc:Resent-Message-ID:In-Reply-To:References:List-Id:List-Help:List-Unsubscribe:List-Subscribe:List-Post:List-Owner:List-Archive", d = r(a, n, i.skipFields), f = x(i.domainName, i.keySelector, d.fieldNames, p, s), g, e;
    d.headers += "dkim-signature:" + o(f), g = S.createSign(("rsa-" + p).toUpperCase()), g.update(d.headers);
    try {
      e = g.sign(i.privateKey, "base64");
    } catch {
      return !1;
    }
    return f + e.replace(/(^.{73}|.{75}(?!\r?\n|\r))/g, `$&\r
 `).trim();
  }, Y.exports.relaxedHeaders = r;
  function x(a, p, s, i, l) {
    let n = [
      "v=1",
      "a=rsa-" + i,
      "c=relaxed/relaxed",
      "d=" + y.toASCII(a),
      "q=dns/txt",
      "s=" + p,
      "bh=" + l,
      "h=" + s
    ].join("; ");
    return E.foldLines("DKIM-Signature: " + n, 76) + `;\r
 b=`;
  }
  function r(a, p, s) {
    let i = /* @__PURE__ */ new Set(), l = /* @__PURE__ */ new Set(), n = /* @__PURE__ */ new Map();
    (s || "").toLowerCase().split(":").forEach((g) => {
      l.add(g.trim());
    }), (p || "").toLowerCase().split(":").filter((g) => !l.has(g.trim())).forEach((g) => {
      i.add(g.trim());
    });
    for (let g = a.length - 1; g >= 0; g--) {
      let e = a[g];
      i.has(e.key) && !n.has(e.key) && n.set(e.key, o(e.line));
    }
    let d = [], f = [];
    return i.forEach((g) => {
      n.has(g) && (f.push(g), d.push(g + ":" + n.get(g)));
    }), {
      headers: d.join(`\r
`) + `\r
`,
      fieldNames: f.join(":")
    };
  }
  function o(a) {
    return a.substr(a.indexOf(":") + 1).replace(/\r?\n/g, "").replace(/\s+/g, " ").trim();
  }
  return Y.exports;
}
var ge, Ye;
function Gt() {
  if (Ye) return ge;
  Ye = 1;
  const y = Dt(), E = Ft(), S = $t(), x = O.PassThrough, r = Le, o = vt, a = Q, p = "sha256", s = 2 * 1024 * 1024;
  class i {
    constructor(d, f, g, e) {
      this.options = d || {}, this.keys = f, this.cacheTreshold = Number(this.options.cacheTreshold) || s, this.hashAlgo = this.options.hashAlgo || p, this.cacheDir = this.options.cacheDir || !1, this.chunks = [], this.chunklen = 0, this.readPos = 0, this.cachePath = this.cacheDir ? o.join(this.cacheDir, "message." + Date.now() + "-" + a.randomBytes(14).toString("hex")) : !1, this.cache = !1, this.headers = !1, this.bodyHash = !1, this.parser = !1, this.relaxedBody = !1, this.input = g, this.output = e, this.output.usingCache = !1, this.hasErrored = !1, this.input.on("error", (t) => {
        this.hasErrored = !0, this.cleanup(), e.emit("error", t);
      });
    }
    cleanup() {
      !this.cache || !this.cachePath || r.unlink(this.cachePath, () => !1);
    }
    createReadCache() {
      this.cache = r.createReadStream(this.cachePath), this.cache.once("error", (d) => {
        this.cleanup(), this.output.emit("error", d);
      }), this.cache.once("close", () => {
        this.cleanup();
      }), this.cache.pipe(this.output);
    }
    sendNextChunk() {
      if (this.hasErrored)
        return;
      if (this.readPos >= this.chunks.length)
        return this.cache ? this.createReadCache() : this.output.end();
      let d = this.chunks[this.readPos++];
      if (this.output.write(d) === !1)
        return this.output.once("drain", () => {
          this.sendNextChunk();
        });
      setImmediate(() => this.sendNextChunk());
    }
    sendSignedOutput() {
      let d = 0, f = () => {
        if (d >= this.keys.length)
          return this.output.write(this.parser.rawHeaders), setImmediate(() => this.sendNextChunk());
        let g = this.keys[d++], e = S(this.headers, this.hashAlgo, this.bodyHash, {
          domainName: g.domainName,
          keySelector: g.keySelector,
          privateKey: g.privateKey,
          headerFieldNames: this.options.headerFieldNames,
          skipFields: this.options.skipFields
        });
        return e && this.output.write(Buffer.from(e + `\r
`)), setImmediate(f);
      };
      if (this.bodyHash && this.headers)
        return f();
      this.output.write(this.parser.rawHeaders), this.sendNextChunk();
    }
    createWriteCache() {
      this.output.usingCache = !0, this.cache = r.createWriteStream(this.cachePath), this.cache.once("error", (d) => {
        this.cleanup(), this.relaxedBody.unpipe(this.cache), this.relaxedBody.on("readable", () => {
          for (; this.relaxedBody.read() !== null; )
            ;
        }), this.hasErrored = !0, this.output.emit("error", d);
      }), this.cache.once("close", () => {
        this.sendSignedOutput();
      }), this.relaxedBody.removeAllListeners("readable"), this.relaxedBody.pipe(this.cache);
    }
    signStream() {
      this.parser = new y(), this.relaxedBody = new E({
        hashAlgo: this.hashAlgo
      }), this.parser.on("headers", (d) => {
        this.headers = d;
      }), this.relaxedBody.on("hash", (d) => {
        this.bodyHash = d;
      }), this.relaxedBody.on("readable", () => {
        let d;
        if (!this.cache) {
          for (; (d = this.relaxedBody.read()) !== null; )
            if (this.chunks.push(d), this.chunklen += d.length, this.chunklen >= this.cacheTreshold && this.cachePath)
              return this.createWriteCache();
        }
      }), this.relaxedBody.on("end", () => {
        this.cache || this.sendSignedOutput();
      }), this.parser.pipe(this.relaxedBody), setImmediate(() => this.input.pipe(this.parser));
    }
  }
  class l {
    constructor(d) {
      this.options = d || {}, this.keys = [].concat(
        this.options.keys || {
          domainName: d.domainName,
          keySelector: d.keySelector,
          privateKey: d.privateKey
        }
      );
    }
    sign(d, f) {
      let g = new x(), e = d, t = !1;
      Buffer.isBuffer(d) ? (t = d, e = new x()) : typeof d == "string" && (t = Buffer.from(d), e = new x());
      let m = this.options;
      f && Object.keys(f).length && (m = {}, Object.keys(this.options || {}).forEach((c) => {
        m[c] = this.options[c];
      }), Object.keys(f || {}).forEach((c) => {
        c in m || (m[c] = f[c]);
      }));
      let h = new i(m, this.keys, e, g);
      return setImmediate(() => {
        h.signStream(), t && setImmediate(() => {
          e.end(t);
        });
      }), g;
    }
  }
  return ge = l, ge;
}
var ve, et;
function Qt() {
  if (et) return ve;
  et = 1;
  const y = J, E = wt, S = X;
  function x(r, o, a, p) {
    let s = S.parse(r), i, l, n;
    i = {
      host: s.hostname,
      port: Number(s.port) ? Number(s.port) : s.protocol === "https:" ? 443 : 80
    }, s.protocol === "https:" ? (i.rejectUnauthorized = !1, l = E.connect.bind(E)) : l = y.connect.bind(y);
    let d = !1, f = (e) => {
      if (!d) {
        d = !0;
        try {
          n.destroy();
        } catch {
        }
        p(e);
      }
    }, g = () => {
      let e = new Error("Proxy socket timed out");
      e.code = "ETIMEDOUT", f(e);
    };
    n = l(i, () => {
      if (d)
        return;
      let e = {
        Host: a + ":" + o,
        Connection: "close"
      };
      s.auth && (e["Proxy-Authorization"] = "Basic " + Buffer.from(s.auth).toString("base64")), n.write(
        // HTTP method
        "CONNECT " + a + ":" + o + ` HTTP/1.1\r
` + // HTTP request headers
        Object.keys(e).map((h) => h + ": " + e[h]).join(`\r
`) + // End request
        `\r
\r
`
      );
      let t = "", m = (h) => {
        let c, u;
        if (!d && (t += h.toString("binary"), c = t.match(/\r\n\r\n/))) {
          if (n.removeListener("data", m), u = t.substr(c.index + c[0].length), t = t.substr(0, c.index), u && n.unshift(Buffer.from(u, "binary")), d = !0, c = t.match(/^HTTP\/\d+\.\d+ (\d+)/i), !c || (c[1] || "").charAt(0) !== "2") {
            try {
              n.destroy();
            } catch {
            }
            return p(new Error("Invalid response from proxy" + (c && ": " + c[1] || "")));
          }
          return n.removeListener("error", f), n.removeListener("timeout", g), n.setTimeout(0), p(null, n);
        }
      };
      n.on("data", m);
    }), n.setTimeout(x.timeout || 30 * 1e3), n.on("timeout", g), n.once("error", f);
  }
  return ve = x, ve;
}
var we, tt;
function Kt() {
  if (tt) return we;
  tt = 1;
  const y = H(), E = Ne(), S = te();
  class x {
    constructor(o, a) {
      this.mailer = o, this.data = {}, this.message = null, a = a || {};
      let p = o.options || {}, s = o._defaults || {};
      Object.keys(a).forEach((i) => {
        this.data[i] = a[i];
      }), this.data.headers = this.data.headers || {}, Object.keys(s).forEach((i) => {
        i in this.data ? i === "headers" && Object.keys(s.headers).forEach((l) => {
          l in this.data.headers || (this.data.headers[l] = s.headers[l]);
        }) : this.data[i] = s[i];
      }), ["disableFileAccess", "disableUrlAccess", "normalizeHeaderKey"].forEach((i) => {
        i in p && (this.data[i] = p[i]);
      });
    }
    resolveContent(...o) {
      return y.resolveContent(...o);
    }
    resolveAll(o) {
      let a = [
        [this.data, "html"],
        [this.data, "text"],
        [this.data, "watchHtml"],
        [this.data, "amp"],
        [this.data, "icalEvent"]
      ];
      this.data.alternatives && this.data.alternatives.length && this.data.alternatives.forEach((d, f) => {
        a.push([this.data.alternatives, f]);
      }), this.data.attachments && this.data.attachments.length && this.data.attachments.forEach((d, f) => {
        d.filename || (d.filename = (d.path || d.href || "").split("/").pop().split("?").shift() || "attachment-" + (f + 1), d.filename.indexOf(".") < 0 && (d.filename += "." + S.detectExtension(d.contentType))), d.contentType || (d.contentType = S.detectMimeType(d.filename || d.path || d.href || "bin")), a.push([this.data.attachments, f]);
      });
      let p = new E();
      ["from", "to", "cc", "bcc", "sender", "replyTo"].forEach((d) => {
        let f;
        this.message ? f = [].concat(p._parseAddresses(this.message.getHeader(d === "replyTo" ? "reply-to" : d)) || []) : this.data[d] && (f = [].concat(p._parseAddresses(this.data[d]) || [])), f && f.length ? this.data[d] = f : d in this.data && (this.data[d] = null);
      }), ["from", "sender"].forEach((d) => {
        this.data[d] && (this.data[d] = this.data[d].shift());
      });
      let l = 0, n = () => {
        if (l >= a.length)
          return o(null, this.data);
        let d = a[l++];
        if (!d[0] || !d[0][d[1]])
          return n();
        y.resolveContent(...d, (f, g) => {
          if (f)
            return o(f);
          let e = {
            content: g
          };
          d[0][d[1]] && typeof d[0][d[1]] == "object" && !Buffer.isBuffer(d[0][d[1]]) && Object.keys(d[0][d[1]]).forEach((t) => {
            !(t in e) && !["content", "path", "href", "raw"].includes(t) && (e[t] = d[0][d[1]][t]);
          }), d[0][d[1]] = e, n();
        });
      };
      setImmediate(() => n());
    }
    normalize(o) {
      let a = this.data.envelope || this.message.getEnvelope(), p = this.message.messageId();
      this.resolveAll((s, i) => s ? o(s) : (i.envelope = a, i.messageId = p, ["html", "text", "watchHtml", "amp"].forEach((l) => {
        i[l] && i[l].content && (typeof i[l].content == "string" ? i[l] = i[l].content : Buffer.isBuffer(i[l].content) && (i[l] = i[l].content.toString()));
      }), i.icalEvent && Buffer.isBuffer(i.icalEvent.content) && (i.icalEvent.content = i.icalEvent.content.toString("base64"), i.icalEvent.encoding = "base64"), i.alternatives && i.alternatives.length && i.alternatives.forEach((l) => {
        l && l.content && Buffer.isBuffer(l.content) && (l.content = l.content.toString("base64"), l.encoding = "base64");
      }), i.attachments && i.attachments.length && i.attachments.forEach((l) => {
        l && l.content && Buffer.isBuffer(l.content) && (l.content = l.content.toString("base64"), l.encoding = "base64");
      }), i.normalizedHeaders = {}, Object.keys(i.headers || {}).forEach((l) => {
        let n = [].concat(i.headers[l] || []).shift();
        n = n && n.value || n, n && (["references", "in-reply-to", "message-id", "content-id"].includes(l) && (n = this.message._encodeHeaderValue(l, n)), i.normalizedHeaders[l] = n);
      }), i.list && typeof i.list == "object" && this._getListHeaders(i.list).forEach((n) => {
        i.normalizedHeaders[n.key] = n.value.map((d) => d && d.value || d).join(", ");
      }), i.references && (i.normalizedHeaders.references = this.message._encodeHeaderValue("references", i.references)), i.inReplyTo && (i.normalizedHeaders["in-reply-to"] = this.message._encodeHeaderValue("in-reply-to", i.inReplyTo)), o(null, i)));
    }
    setMailerHeader() {
      !this.message || !this.data.xMailer || this.message.setHeader("X-Mailer", this.data.xMailer);
    }
    setPriorityHeaders() {
      if (!(!this.message || !this.data.priority))
        switch ((this.data.priority || "").toString().toLowerCase()) {
          case "high":
            this.message.setHeader("X-Priority", "1 (Highest)"), this.message.setHeader("X-MSMail-Priority", "High"), this.message.setHeader("Importance", "High");
            break;
          case "low":
            this.message.setHeader("X-Priority", "5 (Lowest)"), this.message.setHeader("X-MSMail-Priority", "Low"), this.message.setHeader("Importance", "Low");
            break;
        }
    }
    setListHeaders() {
      !this.message || !this.data.list || typeof this.data.list != "object" || this.data.list && typeof this.data.list == "object" && this._getListHeaders(this.data.list).forEach((o) => {
        o.value.forEach((a) => {
          this.message.addHeader(o.key, a);
        });
      });
    }
    _getListHeaders(o) {
      return Object.keys(o).map((a) => ({
        key: "list-" + a.toLowerCase().trim(),
        value: [].concat(o[a] || []).map((p) => ({
          prepared: !0,
          foldLines: !0,
          value: [].concat(p || []).map((s) => {
            if (typeof s == "string" && (s = {
              url: s
            }), s && s.url) {
              if (a.toLowerCase().trim() === "id") {
                let l = s.comment || "";
                return S.isPlainText(l) ? l = '"' + l + '"' : l = S.encodeWord(l), (s.comment ? l + " " : "") + this._formatListUrl(s.url).replace(/^<[^:]+\/{,2}/, "");
              }
              let i = s.comment || "";
              return S.isPlainText(i) || (i = S.encodeWord(i)), this._formatListUrl(s.url) + (s.comment ? " (" + i + ")" : "");
            }
            return "";
          }).filter((s) => s).join(", ")
        }))
      }));
    }
    _formatListUrl(o) {
      return o = o.replace(/[\s<]+|[\s>]+/g, ""), /^(https?|mailto|ftp):/.test(o) ? "<" + o + ">" : /^[^@]+@[^@]+$/.test(o) ? "<mailto:" + o + ">" : "<http://" + o + ">";
    }
  }
  return we = x, we;
}
var _e, it;
function Wt() {
  if (it) return _e;
  it = 1;
  const y = K, E = H(), S = _t(), x = Bt(), r = Gt(), o = Qt(), a = ft, p = X, s = U, i = Kt(), l = J, n = xt, d = Q;
  class f extends y {
    constructor(e, t, m) {
      super(), this.options = t || {}, this._defaults = m || {}, this._defaultPlugins = {
        compile: [(...h) => this._convertDataImages(...h)],
        stream: []
      }, this._userPlugins = {
        compile: [],
        stream: []
      }, this.meta = /* @__PURE__ */ new Map(), this.dkim = this.options.dkim ? new r(this.options.dkim) : !1, this.transporter = e, this.transporter.mailer = this, this.logger = E.getLogger(this.options, {
        component: this.options.component || "mail"
      }), this.logger.debug(
        {
          tnx: "create"
        },
        "Creating transport: %s",
        this.getVersionString()
      ), typeof this.transporter.on == "function" && (this.transporter.on("log", (h) => {
        this.logger.debug(
          {
            tnx: "transport"
          },
          "%s: %s",
          h.type,
          h.message
        );
      }), this.transporter.on("error", (h) => {
        this.logger.error(
          {
            err: h,
            tnx: "transport"
          },
          "Transport Error: %s",
          h.message
        ), this.emit("error", h);
      }), this.transporter.on("idle", (...h) => {
        this.emit("idle", ...h);
      }), this.transporter.on("clear", (...h) => {
        this.emit("clear", ...h);
      })), ["close", "isIdle", "verify"].forEach((h) => {
        this[h] = (...c) => typeof this.transporter[h] == "function" ? (h === "verify" && typeof this.getSocket == "function" && (this.transporter.getSocket = this.getSocket, this.getSocket = !1), this.transporter[h](...c)) : (this.logger.warn(
          {
            tnx: "transport",
            methodName: h
          },
          "Non existing method %s called for transport",
          h
        ), !1);
      }), this.options.proxy && typeof this.options.proxy == "string" && this.setupProxy(this.options.proxy);
    }
    use(e, t) {
      return e = (e || "").toString(), this._userPlugins.hasOwnProperty(e) ? this._userPlugins[e].push(t) : this._userPlugins[e] = [t], this;
    }
    /**
     * Sends an email using the preselected transport object
     *
     * @param {Object} data E-data description
     * @param {Function?} callback Callback to run once the sending succeeded or failed
     */
    sendMail(e, t = null) {
      let m;
      t || (m = new Promise((c, u) => {
        t = E.callbackPromise(c, u);
      })), typeof this.getSocket == "function" && (this.transporter.getSocket = this.getSocket, this.getSocket = !1);
      let h = new i(this, e);
      return this.logger.debug(
        {
          tnx: "transport",
          name: this.transporter.name,
          version: this.transporter.version,
          action: "send"
        },
        "Sending mail using %s/%s",
        this.transporter.name,
        this.transporter.version
      ), this._processPlugins("compile", h, (c) => {
        if (c)
          return this.logger.error(
            {
              err: c,
              tnx: "plugin",
              action: "compile"
            },
            "PluginCompile Error: %s",
            c.message
          ), t(c);
        h.message = new x(h.data).compile(), h.setMailerHeader(), h.setPriorityHeaders(), h.setListHeaders(), this._processPlugins("stream", h, (u) => {
          if (u)
            return this.logger.error(
              {
                err: u,
                tnx: "plugin",
                action: "stream"
              },
              "PluginStream Error: %s",
              u.message
            ), t(u);
          (h.data.dkim || this.dkim) && h.message.processFunc((v) => {
            let w = h.data.dkim ? new r(h.data.dkim) : this.dkim;
            return this.logger.debug(
              {
                tnx: "DKIM",
                messageId: h.message.messageId(),
                dkimDomains: w.keys.map((b) => b.keySelector + "." + b.domainName).join(", ")
              },
              "Signing outgoing message with %s keys",
              w.keys.length
            ), w.sign(v, h.data._dkim);
          }), this.transporter.send(h, (...v) => {
            v[0] && this.logger.error(
              {
                err: v[0],
                tnx: "transport",
                action: "send"
              },
              "Send Error: %s",
              v[0].message
            ), t(...v);
          });
        });
      }), m;
    }
    getVersionString() {
      return a.format(
        "%s (%s; +%s; %s/%s)",
        s.name,
        s.version,
        s.homepage,
        this.transporter.name,
        this.transporter.version
      );
    }
    _processPlugins(e, t, m) {
      if (e = (e || "").toString(), !this._userPlugins.hasOwnProperty(e))
        return m();
      let h = this._userPlugins[e] || [], c = this._defaultPlugins[e] || [];
      if (h.length && this.logger.debug(
        {
          tnx: "transaction",
          pluginCount: h.length,
          step: e
        },
        "Using %s plugins for %s",
        h.length,
        e
      ), h.length + c.length === 0)
        return m();
      let u = 0, v = "default", w = () => {
        let b = v === "default" ? c : h;
        if (u >= b.length)
          if (v === "default" && h.length)
            v = "user", u = 0, b = h;
          else
            return m();
        let _ = b[u++];
        _(t, (A) => {
          if (A)
            return m(A);
          w();
        });
      };
      w();
    }
    /**
     * Sets up proxy handler for a Nodemailer object
     *
     * @param {String} proxyUrl Proxy configuration url
     */
    setupProxy(e) {
      let t = p.parse(e);
      this.getSocket = (m, h) => {
        let c = t.protocol.replace(/:$/, "").toLowerCase();
        if (this.meta.has("proxy_handler_" + c))
          return this.meta.get("proxy_handler_" + c)(t, m, h);
        switch (c) {
          // Connect using a HTTP CONNECT method
          case "http":
          case "https":
            o(t.href, m.port, m.host, (u, v) => u ? h(u) : h(null, {
              connection: v
            }));
            return;
          case "socks":
          case "socks5":
          case "socks4":
          case "socks4a": {
            if (!this.meta.has("proxy_socks_module"))
              return h(new Error("Socks module not loaded"));
            let u = (v) => {
              let w = !!this.meta.get("proxy_socks_module").SocksClient, b = w ? this.meta.get("proxy_socks_module").SocksClient : this.meta.get("proxy_socks_module"), _ = Number(t.protocol.replace(/\D/g, "")) || 5, A = {
                proxy: {
                  ipaddress: v,
                  port: Number(t.port),
                  type: _
                },
                [w ? "destination" : "target"]: {
                  host: m.host,
                  port: m.port
                },
                command: "connect"
              };
              if (t.auth) {
                let T = decodeURIComponent(t.auth.split(":").shift()), j = decodeURIComponent(t.auth.split(":").pop());
                w ? (A.proxy.userId = T, A.proxy.password = j) : _ === 4 ? A.userid = T : A.authentication = {
                  username: T,
                  password: j
                };
              }
              b.createConnection(A, (T, j) => T ? h(T) : h(null, {
                connection: j.socket || j
              }));
            };
            return l.isIP(t.hostname) ? u(t.hostname) : n.resolve(t.hostname, (v, w) => {
              if (v)
                return h(v);
              u(Array.isArray(w) ? w[0] : w);
            });
          }
        }
        h(new Error("Unknown proxy configuration"));
      };
    }
    _convertDataImages(e, t) {
      if (!this.options.attachDataUrls && !e.data.attachDataUrls || !e.data.html)
        return t();
      e.resolveContent(e.data, "html", (m, h) => {
        if (m)
          return t(m);
        let c = 0;
        h = (h || "").toString().replace(/(<img\b[^<>]{0,1024} src\s{0,20}=[\s"']{0,20})(data:([^;]+);[^"'>\s]+)/gi, (u, v, w, b) => {
          let _ = d.randomBytes(10).toString("hex") + "@localhost";
          return e.data.attachments || (e.data.attachments = []), Array.isArray(e.data.attachments) || (e.data.attachments = [].concat(e.data.attachments || [])), e.data.attachments.push({
            path: w,
            cid: _,
            filename: "image-" + ++c + "." + S.detectExtension(b)
          }), v + "cid:" + _;
        }), e.data.html = h, t();
      });
    }
    set(e, t) {
      return this.meta.set(e, t);
    }
    get(e) {
      return this.meta.get(e);
    }
  }
  return _e = f, _e;
}
var be, st;
function Vt() {
  if (st) return be;
  st = 1;
  const E = O.Transform;
  class S extends E {
    constructor(r) {
      super(r), this.options = r || {}, this._curLine = "", this.inByteCount = 0, this.outByteCount = 0, this.lastByte = !1;
    }
    /**
     * Escapes dots
     */
    _transform(r, o, a) {
      let p = [], s = 0, i, l, n = 0, d;
      if (!r || !r.length)
        return a();
      for (typeof r == "string" && (r = Buffer.from(r)), this.inByteCount += r.length, i = 0, l = r.length; i < l; i++)
        r[i] === 46 ? (i && r[i - 1] === 10 || !i && (!this.lastByte || this.lastByte === 10)) && (d = r.slice(n, i + 1), p.push(d), p.push(Buffer.from(".")), s += d.length + 1, n = i + 1) : r[i] === 10 && (i && r[i - 1] !== 13 || !i && this.lastByte !== 13) && (i > n ? (d = r.slice(n, i), p.push(d), s += d.length + 2) : s += 2, p.push(Buffer.from(`\r
`)), n = i + 1);
      s ? (n < r.length && (d = r.slice(n), p.push(d), s += d.length), this.outByteCount += s, this.push(Buffer.concat(p, s))) : (this.outByteCount += r.length, this.push(r)), this.lastByte = r[r.length - 1], a();
    }
    /**
     * Finalizes the stream with a dot on a single line
     */
    _flush(r) {
      let o;
      this.lastByte === 10 ? o = Buffer.from(`.\r
`) : this.lastByte === 13 ? o = Buffer.from(`
.\r
`) : o = Buffer.from(`\r
.\r
`), this.outByteCount += o.length, this.push(o), r();
    }
  }
  return be = S, be;
}
var ye, at;
function qe() {
  if (at) return ye;
  at = 1;
  const y = U, E = K.EventEmitter, S = J, x = wt, r = gt, o = Q, a = Vt(), p = O.PassThrough, s = H(), i = 120 * 1e3, l = 600 * 1e3, n = 30 * 1e3, d = 30 * 1e3;
  class f extends E {
    constructor(e) {
      super(e), this.id = o.randomBytes(8).toString("base64").replace(/\W/g, ""), this.stage = "init", this.options = e || {}, this.secureConnection = !!this.options.secure, this.alreadySecured = !!this.options.secured, this.port = Number(this.options.port) || (this.secureConnection ? 465 : 587), this.host = this.options.host || "localhost", this.servername = this.options.servername ? this.options.servername : S.isIP(this.host) ? !1 : this.host, this.allowInternalNetworkInterfaces = this.options.allowInternalNetworkInterfaces || !1, typeof this.options.secure > "u" && this.port === 465 && (this.secureConnection = !0), this.name = this.options.name || this._getHostname(), this.logger = s.getLogger(this.options, {
        component: this.options.component || "smtp-connection",
        sid: this.id
      }), this.customAuth = /* @__PURE__ */ new Map(), Object.keys(this.options.customAuth || {}).forEach((t) => {
        let m = (t || "").toString().trim().toUpperCase();
        m && this.customAuth.set(m, this.options.customAuth[t]);
      }), this.version = y.version, this.authenticated = !1, this.destroyed = !1, this.secure = !!this.secureConnection, this._remainder = "", this._responseQueue = [], this.lastServerResponse = !1, this._socket = !1, this._supportedAuth = [], this.allowsAuth = !1, this._envelope = !1, this._supportedExtensions = [], this._maxAllowedSize = 0, this._responseActions = [], this._recipientQueue = [], this._greetingTimeout = !1, this._connectionTimeout = !1, this._destroyed = !1, this._closing = !1, this._onSocketData = (t) => this._onData(t), this._onSocketError = (t) => this._onError(t, "ESOCKET", !1, "CONN"), this._onSocketClose = () => this._onClose(), this._onSocketEnd = () => this._onEnd(), this._onSocketTimeout = () => this._onTimeout();
    }
    /**
     * Creates a connection to a SMTP server and sets up connection
     * listener
     */
    connect(e) {
      if (typeof e == "function") {
        this.once("connect", () => {
          this.logger.debug(
            {
              tnx: "smtp"
            },
            "SMTP handshake finished"
          ), e();
        });
        const h = this._isDestroyedMessage("connect");
        if (h)
          return e(this._formatError(h, "ECONNECTION", !1, "CONN"));
      }
      let t = {
        port: this.port,
        host: this.host,
        allowInternalNetworkInterfaces: this.allowInternalNetworkInterfaces,
        timeout: this.options.dnsTimeout || d
      };
      this.options.localAddress && (t.localAddress = this.options.localAddress);
      let m = () => {
        this._connectionTimeout = setTimeout(() => {
          this._onError("Connection timeout", "ETIMEDOUT", !1, "CONN");
        }, this.options.connectionTimeout || i), this._socket.on("error", this._onSocketError);
      };
      if (this.options.connection) {
        this._socket = this.options.connection, m(), this.secureConnection && !this.alreadySecured ? setImmediate(
          () => this._upgradeConnection((h) => {
            if (h) {
              this._onError(new Error("Error initiating TLS - " + (h.message || h)), "ETLS", !1, "CONN");
              return;
            }
            this._onConnect();
          })
        ) : setImmediate(() => this._onConnect());
        return;
      } else return this.options.socket ? (this._socket = this.options.socket, s.resolveHostname(t, (h, c) => {
        if (h)
          return setImmediate(() => this._onError(h, "EDNS", !1, "CONN"));
        this.logger.debug(
          {
            tnx: "dns",
            source: t.host,
            resolved: c.host,
            cached: !!c.cached
          },
          "Resolved %s as %s [cache %s]",
          t.host,
          c.host,
          c.cached ? "hit" : "miss"
        ), Object.keys(c).forEach((u) => {
          u.charAt(0) !== "_" && c[u] && (t[u] = c[u]);
        });
        try {
          this._socket.connect(this.port, this.host, () => {
            this._socket.setKeepAlive(!0), this._onConnect();
          }), m();
        } catch (u) {
          return setImmediate(() => this._onError(u, "ECONNECTION", !1, "CONN"));
        }
      })) : this.secureConnection ? (this.options.tls && Object.keys(this.options.tls).forEach((h) => {
        t[h] = this.options.tls[h];
      }), this.servername && !t.servername && (t.servername = this.servername), s.resolveHostname(t, (h, c) => {
        if (h)
          return setImmediate(() => this._onError(h, "EDNS", !1, "CONN"));
        this.logger.debug(
          {
            tnx: "dns",
            source: t.host,
            resolved: c.host,
            cached: !!c.cached
          },
          "Resolved %s as %s [cache %s]",
          t.host,
          c.host,
          c.cached ? "hit" : "miss"
        ), Object.keys(c).forEach((u) => {
          u.charAt(0) !== "_" && c[u] && (t[u] = c[u]);
        });
        try {
          this._socket = x.connect(t, () => {
            this._socket.setKeepAlive(!0), this._onConnect();
          }), m();
        } catch (u) {
          return setImmediate(() => this._onError(u, "ECONNECTION", !1, "CONN"));
        }
      })) : s.resolveHostname(t, (h, c) => {
        if (h)
          return setImmediate(() => this._onError(h, "EDNS", !1, "CONN"));
        this.logger.debug(
          {
            tnx: "dns",
            source: t.host,
            resolved: c.host,
            cached: !!c.cached
          },
          "Resolved %s as %s [cache %s]",
          t.host,
          c.host,
          c.cached ? "hit" : "miss"
        ), Object.keys(c).forEach((u) => {
          u.charAt(0) !== "_" && c[u] && (t[u] = c[u]);
        });
        try {
          this._socket = S.connect(t, () => {
            this._socket.setKeepAlive(!0), this._onConnect();
          }), m();
        } catch (u) {
          return setImmediate(() => this._onError(u, "ECONNECTION", !1, "CONN"));
        }
      });
    }
    /**
     * Sends QUIT
     */
    quit() {
      this._sendCommand("QUIT"), this._responseActions.push(this.close);
    }
    /**
     * Closes the connection to the server
     */
    close() {
      if (clearTimeout(this._connectionTimeout), clearTimeout(this._greetingTimeout), this._responseActions = [], this._closing)
        return;
      this._closing = !0;
      let e = "end";
      this.stage === "init" && (e = "destroy"), this.logger.debug(
        {
          tnx: "smtp"
        },
        'Closing connection to the server using "%s"',
        e
      );
      let t = this._socket && this._socket.socket || this._socket;
      if (t && !t.destroyed)
        try {
          t[e]();
        } catch {
        }
      this._destroy();
    }
    /**
     * Authenticate user
     */
    login(e, t) {
      const m = this._isDestroyedMessage("login");
      if (m)
        return t(this._formatError(m, "ECONNECTION", !1, "API"));
      if (this._auth = e || {}, this._authMethod = (this._auth.method || "").toString().trim().toUpperCase() || !1, !this._authMethod && this._auth.oauth2 && !this._auth.credentials ? this._authMethod = "XOAUTH2" : (!this._authMethod || this._authMethod === "XOAUTH2" && !this._auth.oauth2) && (this._authMethod = (this._supportedAuth[0] || "PLAIN").toUpperCase().trim()), this._authMethod !== "XOAUTH2" && (!this._auth.credentials || !this._auth.credentials.user || !this._auth.credentials.pass))
        if (this._auth.user && this._auth.pass || this.customAuth.has(this._authMethod))
          this._auth.credentials = {
            user: this._auth.user,
            pass: this._auth.pass,
            options: this._auth.options
          };
        else
          return t(this._formatError('Missing credentials for "' + this._authMethod + '"', "EAUTH", !1, "API"));
      if (this.customAuth.has(this._authMethod)) {
        let h = this.customAuth.get(this._authMethod), c, u = !1, v = () => {
          u || (u = !0, this.logger.info(
            {
              tnx: "smtp",
              username: this._auth.user,
              action: "authenticated",
              method: this._authMethod
            },
            "User %s authenticated",
            JSON.stringify(this._auth.user)
          ), this.authenticated = !0, t(null, !0));
        }, w = (_) => {
          u || (u = !0, t(this._formatError(_, "EAUTH", c, "AUTH " + this._authMethod)));
        }, b = h({
          auth: this._auth,
          method: this._authMethod,
          extensions: [].concat(this._supportedExtensions),
          authMethods: [].concat(this._supportedAuth),
          maxAllowedSize: this._maxAllowedSize || !1,
          sendCommand: (_, A) => {
            let T;
            return A || (T = new Promise((j, I) => {
              A = s.callbackPromise(j, I);
            })), this._responseActions.push((j) => {
              c = j;
              let I = j.match(/^(\d+)(?:\s(\d+\.\d+\.\d+))?\s/), k = {
                command: _,
                response: j
              };
              I ? (k.status = Number(I[1]) || 0, I[2] && (k.code = I[2]), k.text = j.substr(I[0].length)) : (k.text = j, k.status = 0), A(null, k);
            }), setImmediate(() => this._sendCommand(_)), T;
          },
          resolve: v,
          reject: w
        });
        b && typeof b.catch == "function" && b.then(v).catch(w);
        return;
      }
      switch (this._authMethod) {
        case "XOAUTH2":
          this._handleXOauth2Token(!1, t);
          return;
        case "LOGIN":
          this._responseActions.push((h) => {
            this._actionAUTH_LOGIN_USER(h, t);
          }), this._sendCommand("AUTH LOGIN");
          return;
        case "PLAIN":
          this._responseActions.push((h) => {
            this._actionAUTHComplete(h, t);
          }), this._sendCommand(
            "AUTH PLAIN " + Buffer.from(
              //this._auth.user+'\u0000'+
              "\0" + // skip authorization identity as it causes problems with some servers
              this._auth.credentials.user + "\0" + this._auth.credentials.pass,
              "utf-8"
            ).toString("base64"),
            // log entry without passwords
            "AUTH PLAIN " + Buffer.from(
              //this._auth.user+'\u0000'+
              "\0" + // skip authorization identity as it causes problems with some servers
              this._auth.credentials.user + "\0/* secret */",
              "utf-8"
            ).toString("base64")
          );
          return;
        case "CRAM-MD5":
          this._responseActions.push((h) => {
            this._actionAUTH_CRAM_MD5(h, t);
          }), this._sendCommand("AUTH CRAM-MD5");
          return;
      }
      return t(this._formatError('Unknown authentication method "' + this._authMethod + '"', "EAUTH", !1, "API"));
    }
    /**
     * Sends a message
     *
     * @param {Object} envelope Envelope object, {from: addr, to: [addr]}
     * @param {Object} message String, Buffer or a Stream
     * @param {Function} callback Callback to return once sending is completed
     */
    send(e, t, m) {
      if (!t)
        return m(this._formatError("Empty message", "EMESSAGE", !1, "API"));
      const h = this._isDestroyedMessage("send message");
      if (h)
        return m(this._formatError(h, "ECONNECTION", !1, "API"));
      if (this._maxAllowedSize && e.size > this._maxAllowedSize)
        return setImmediate(() => {
          m(this._formatError("Message size larger than allowed " + this._maxAllowedSize, "EMESSAGE", !1, "MAIL FROM"));
        });
      let c = !1, u = function() {
        c || (c = !0, m(...arguments));
      };
      typeof t.on == "function" && t.on("error", (w) => u(this._formatError(w, "ESTREAM", !1, "API")));
      let v = Date.now();
      this._setEnvelope(e, (w, b) => {
        if (w) {
          let T = new p();
          return typeof t.pipe == "function" ? t.pipe(T) : (T.write(t), T.end()), u(w);
        }
        let _ = Date.now(), A = this._createSendStream((T, j) => T ? u(T) : (b.envelopeTime = _ - v, b.messageTime = Date.now() - _, b.messageSize = A.outByteCount, b.response = j, u(null, b)));
        typeof t.pipe == "function" ? t.pipe(A) : (A.write(t), A.end());
      });
    }
    /**
     * Resets connection state
     *
     * @param {Function} callback Callback to return once connection is reset
     */
    reset(e) {
      this._sendCommand("RSET"), this._responseActions.push((t) => t.charAt(0) !== "2" ? e(this._formatError("Could not reset session state. response=" + t, "EPROTOCOL", t, "RSET")) : (this._envelope = !1, e(null, !0)));
    }
    /**
     * Connection listener that is run when the connection to
     * the server is opened
     *
     * @event
     */
    _onConnect() {
      if (clearTimeout(this._connectionTimeout), this.logger.info(
        {
          tnx: "network",
          localAddress: this._socket.localAddress,
          localPort: this._socket.localPort,
          remoteAddress: this._socket.remoteAddress,
          remotePort: this._socket.remotePort
        },
        "%s established to %s:%s",
        this.secure ? "Secure connection" : "Connection",
        this._socket.remoteAddress,
        this._socket.remotePort
      ), this._destroyed) {
        this.close();
        return;
      }
      this.stage = "connected", this._socket.removeListener("data", this._onSocketData), this._socket.removeListener("timeout", this._onSocketTimeout), this._socket.removeListener("close", this._onSocketClose), this._socket.removeListener("end", this._onSocketEnd), this._socket.on("data", this._onSocketData), this._socket.once("close", this._onSocketClose), this._socket.once("end", this._onSocketEnd), this._socket.setTimeout(this.options.socketTimeout || l), this._socket.on("timeout", this._onSocketTimeout), this._greetingTimeout = setTimeout(() => {
        this._socket && !this._destroyed && this._responseActions[0] === this._actionGreeting && this._onError("Greeting never received", "ETIMEDOUT", !1, "CONN");
      }, this.options.greetingTimeout || n), this._responseActions.push(this._actionGreeting), this._socket.resume();
    }
    /**
     * 'data' listener for data coming from the server
     *
     * @event
     * @param {Buffer} chunk Data chunk coming from the server
     */
    _onData(e) {
      if (this._destroyed || !e || !e.length)
        return;
      let t = (e || "").toString("binary"), m = (this._remainder + t).split(/\r?\n/), h;
      this._remainder = m.pop();
      for (let c = 0, u = m.length; c < u; c++) {
        if (this._responseQueue.length && (h = this._responseQueue[this._responseQueue.length - 1], /^\d+-/.test(h.split(`
`).pop()))) {
          this._responseQueue[this._responseQueue.length - 1] += `
` + m[c];
          continue;
        }
        this._responseQueue.push(m[c]);
      }
      this._responseQueue.length && (h = this._responseQueue[this._responseQueue.length - 1], /^\d+-/.test(h.split(`
`).pop())) || this._processResponse();
    }
    /**
     * 'error' listener for the socket
     *
     * @event
     * @param {Error} err Error object
     * @param {String} type Error name
     */
    _onError(e, t, m, h) {
      if (clearTimeout(this._connectionTimeout), clearTimeout(this._greetingTimeout), this._destroyed)
        return;
      e = this._formatError(e, t, m, h), ["ETIMEDOUT", "ESOCKET", "ECONNECTION"].includes(e.code) ? this.logger.warn(m, e.message) : this.logger.error(m, e.message), this.emit("error", e), this.close();
    }
    _formatError(e, t, m, h) {
      let c;
      /Error\]$/i.test(Object.prototype.toString.call(e)) ? c = e : c = new Error(e), t && t !== "Error" && (c.code = t), m && (c.response = m, c.message += ": " + m);
      let u = typeof m == "string" && Number((m.match(/^\d+/) || [])[0]) || !1;
      return u && (c.responseCode = u), h && (c.command = h), c;
    }
    /**
     * 'close' listener for the socket
     *
     * @event
     */
    _onClose() {
      let e = !1;
      if (this._remainder && this._remainder.trim() && ((this.options.debug || this.options.transactionLog) && this.logger.debug(
        {
          tnx: "server"
        },
        this._remainder.replace(/\r?\n$/, "")
      ), this.lastServerResponse = e = this._remainder.trim()), this.logger.info(
        {
          tnx: "network"
        },
        "Connection closed"
      ), this.upgrading && !this._destroyed)
        return this._onError(new Error("Connection closed unexpectedly"), "ETLS", e, "CONN");
      if (![this._actionGreeting, this.close].includes(this._responseActions[0]) && !this._destroyed)
        return this._onError(new Error("Connection closed unexpectedly"), "ECONNECTION", e, "CONN");
      if (/^[45]\d{2}\b/.test(e))
        return this._onError(new Error("Connection closed unexpectedly"), "ECONNECTION", e, "CONN");
      this._destroy();
    }
    /**
     * 'end' listener for the socket
     *
     * @event
     */
    _onEnd() {
      this._socket && !this._socket.destroyed && this._socket.destroy();
    }
    /**
     * 'timeout' listener for the socket
     *
     * @event
     */
    _onTimeout() {
      return this._onError(new Error("Timeout"), "ETIMEDOUT", !1, "CONN");
    }
    /**
     * Destroys the client, emits 'end'
     */
    _destroy() {
      this._destroyed || (this._destroyed = !0, this.emit("end"));
    }
    /**
     * Upgrades the connection to TLS
     *
     * @param {Function} callback Callback function to run when the connection
     *        has been secured
     */
    _upgradeConnection(e) {
      this._socket.removeListener("data", this._onSocketData), this._socket.removeListener("timeout", this._onSocketTimeout);
      let t = this._socket, m = {
        socket: this._socket,
        host: this.host
      };
      Object.keys(this.options.tls || {}).forEach((h) => {
        m[h] = this.options.tls[h];
      }), this.servername && !m.servername && (m.servername = this.servername), this.upgrading = !0;
      try {
        this._socket = x.connect(m, () => (this.secure = !0, this.upgrading = !1, this._socket.on("data", this._onSocketData), t.removeListener("close", this._onSocketClose), t.removeListener("end", this._onSocketEnd), e(null, !0)));
      } catch (h) {
        return e(h);
      }
      this._socket.on("error", this._onSocketError), this._socket.once("close", this._onSocketClose), this._socket.once("end", this._onSocketEnd), this._socket.setTimeout(this.options.socketTimeout || l), this._socket.on("timeout", this._onSocketTimeout), t.resume();
    }
    /**
     * Processes queued responses from the server
     *
     * @param {Boolean} force If true, ignores _processing flag
     */
    _processResponse() {
      if (!this._responseQueue.length)
        return !1;
      let e = this.lastServerResponse = (this._responseQueue.shift() || "").toString();
      if (/^\d+-/.test(e.split(`
`).pop()))
        return;
      (this.options.debug || this.options.transactionLog) && this.logger.debug(
        {
          tnx: "server"
        },
        e.replace(/\r?\n$/, "")
      ), e.trim() || setImmediate(() => this._processResponse());
      let t = this._responseActions.shift();
      if (typeof t == "function")
        t.call(this, e), setImmediate(() => this._processResponse());
      else
        return this._onError(new Error("Unexpected Response"), "EPROTOCOL", e, "CONN");
    }
    /**
     * Send a command to the server, append \r\n
     *
     * @param {String} str String to be sent to the server
     * @param {String} logStr Optional string to be used for logging instead of the actual string
     */
    _sendCommand(e, t) {
      if (!this._destroyed) {
        if (this._socket.destroyed)
          return this.close();
        (this.options.debug || this.options.transactionLog) && this.logger.debug(
          {
            tnx: "client"
          },
          (t || e || "").toString().replace(/\r?\n$/, "")
        ), this._socket.write(Buffer.from(e + `\r
`, "utf-8"));
      }
    }
    /**
     * Initiates a new message by submitting envelope data, starting with
     * MAIL FROM: command
     *
     * @param {Object} envelope Envelope object in the form of
     *        {from:'...', to:['...']}
     *        or
     *        {from:{address:'...',name:'...'}, to:[address:'...',name:'...']}
     */
    _setEnvelope(e, t) {
      let m = [], h = !1;
      if (this._envelope = e || {}, this._envelope.from = (this._envelope.from && this._envelope.from.address || this._envelope.from || "").toString().trim(), this._envelope.to = [].concat(this._envelope.to || []).map((c) => (c && c.address || c || "").toString().trim()), !this._envelope.to.length)
        return t(this._formatError("No recipients defined", "EENVELOPE", !1, "API"));
      if (this._envelope.from && /[\r\n<>]/.test(this._envelope.from))
        return t(this._formatError("Invalid sender " + JSON.stringify(this._envelope.from), "EENVELOPE", !1, "API"));
      /[\x80-\uFFFF]/.test(this._envelope.from) && (h = !0);
      for (let c = 0, u = this._envelope.to.length; c < u; c++) {
        if (!this._envelope.to[c] || /[\r\n<>]/.test(this._envelope.to[c]))
          return t(this._formatError("Invalid recipient " + JSON.stringify(this._envelope.to[c]), "EENVELOPE", !1, "API"));
        /[\x80-\uFFFF]/.test(this._envelope.to[c]) && (h = !0);
      }
      if (this._envelope.rcptQueue = JSON.parse(JSON.stringify(this._envelope.to || [])), this._envelope.rejected = [], this._envelope.rejectedErrors = [], this._envelope.accepted = [], this._envelope.dsn)
        try {
          this._envelope.dsn = this._setDsnEnvelope(this._envelope.dsn);
        } catch (c) {
          return t(this._formatError("Invalid DSN " + c.message, "EENVELOPE", !1, "API"));
        }
      if (this._responseActions.push((c) => {
        this._actionMAIL(c, t);
      }), h && this._supportedExtensions.includes("SMTPUTF8") && (m.push("SMTPUTF8"), this._usingSmtpUtf8 = !0), this._envelope.use8BitMime && this._supportedExtensions.includes("8BITMIME") && (m.push("BODY=8BITMIME"), this._using8BitMime = !0), this._envelope.size && this._supportedExtensions.includes("SIZE") && m.push("SIZE=" + this._envelope.size), this._envelope.dsn && this._supportedExtensions.includes("DSN") && (this._envelope.dsn.ret && m.push("RET=" + s.encodeXText(this._envelope.dsn.ret)), this._envelope.dsn.envid && m.push("ENVID=" + s.encodeXText(this._envelope.dsn.envid))), this._envelope.requireTLSExtensionEnabled) {
        if (!this.secure)
          return t(
            this._formatError("REQUIRETLS can only be used over TLS connections (RFC 8689)", "EREQUIRETLS", !1, "MAIL FROM")
          );
        if (!this._supportedExtensions.includes("REQUIRETLS"))
          return t(
            this._formatError("Server does not support REQUIRETLS extension (RFC 8689)", "EREQUIRETLS", !1, "MAIL FROM")
          );
        m.push("REQUIRETLS");
      }
      this._sendCommand("MAIL FROM:<" + this._envelope.from + ">" + (m.length ? " " + m.join(" ") : ""));
    }
    _setDsnEnvelope(e) {
      let t = (e.ret || e.return || "").toString().toUpperCase() || null;
      if (t)
        switch (t) {
          case "HDRS":
          case "HEADERS":
            t = "HDRS";
            break;
          case "FULL":
          case "BODY":
            t = "FULL";
            break;
        }
      if (t && !["FULL", "HDRS"].includes(t))
        throw new Error("ret: " + JSON.stringify(t));
      let m = (e.envid || e.id || "").toString() || null, h = e.notify || null;
      if (h) {
        typeof h == "string" && (h = h.split(",")), h = h.map((w) => w.trim().toUpperCase());
        let u = ["NEVER", "SUCCESS", "FAILURE", "DELAY"];
        if (h.filter((w) => !u.includes(w)).length || h.length > 1 && h.includes("NEVER"))
          throw new Error("notify: " + JSON.stringify(h.join(",")));
        h = h.join(",");
      }
      let c = (e.recipient || e.orcpt || "").toString() || null;
      return c && c.indexOf(";") < 0 && (c = "rfc822;" + c), {
        ret: t,
        envid: m,
        notify: h,
        orcpt: c
      };
    }
    _getDsnRcptToArgs() {
      let e = [];
      return this._envelope.dsn && this._supportedExtensions.includes("DSN") && (this._envelope.dsn.notify && e.push("NOTIFY=" + s.encodeXText(this._envelope.dsn.notify)), this._envelope.dsn.orcpt && e.push("ORCPT=" + s.encodeXText(this._envelope.dsn.orcpt))), e.length ? " " + e.join(" ") : "";
    }
    _createSendStream(e) {
      let t = new a(), m;
      return this.options.lmtp ? this._envelope.accepted.forEach((h, c) => {
        let u = c === this._envelope.accepted.length - 1;
        this._responseActions.push((v) => {
          this._actionLMTPStream(h, u, v, e);
        });
      }) : this._responseActions.push((h) => {
        this._actionSMTPStream(h, e);
      }), t.pipe(this._socket, {
        end: !1
      }), this.options.debug && (m = new p(), m.on("readable", () => {
        let h;
        for (; h = m.read(); )
          this.logger.debug(
            {
              tnx: "message"
            },
            h.toString("binary").replace(/\r?\n$/, "")
          );
      }), t.pipe(m)), t.once("end", () => {
        this.logger.info(
          {
            tnx: "message",
            inByteCount: t.inByteCount,
            outByteCount: t.outByteCount
          },
          "<%s bytes encoded mime message (source size %s bytes)>",
          t.outByteCount,
          t.inByteCount
        );
      }), t;
    }
    /** ACTIONS **/
    /**
     * Will be run after the connection is created and the server sends
     * a greeting. If the incoming message starts with 220 initiate
     * SMTP session by sending EHLO command
     *
     * @param {String} str Message from the server
     */
    _actionGreeting(e) {
      if (clearTimeout(this._greetingTimeout), e.substr(0, 3) !== "220") {
        this._onError(new Error("Invalid greeting. response=" + e), "EPROTOCOL", e, "CONN");
        return;
      }
      this.options.lmtp ? (this._responseActions.push(this._actionLHLO), this._sendCommand("LHLO " + this.name)) : (this._responseActions.push(this._actionEHLO), this._sendCommand("EHLO " + this.name));
    }
    /**
     * Handles server response for LHLO command. If it yielded in
     * error, emit 'error', otherwise treat this as an EHLO response
     *
     * @param {String} str Message from the server
     */
    _actionLHLO(e) {
      if (e.charAt(0) !== "2") {
        this._onError(new Error("Invalid LHLO. response=" + e), "EPROTOCOL", e, "LHLO");
        return;
      }
      this._actionEHLO(e);
    }
    /**
     * Handles server response for EHLO command. If it yielded in
     * error, try HELO instead, otherwise initiate TLS negotiation
     * if STARTTLS is supported by the server or move into the
     * authentication phase.
     *
     * @param {String} str Message from the server
     */
    _actionEHLO(e) {
      let t;
      if (e.substr(0, 3) === "421") {
        this._onError(new Error("Server terminates connection. response=" + e), "ECONNECTION", e, "EHLO");
        return;
      }
      if (e.charAt(0) !== "2") {
        if (this.options.requireTLS) {
          this._onError(
            new Error("EHLO failed but HELO does not support required STARTTLS. response=" + e),
            "ECONNECTION",
            e,
            "EHLO"
          );
          return;
        }
        this._responseActions.push(this._actionHELO), this._sendCommand("HELO " + this.name);
        return;
      }
      if (this._ehloLines = e.split(/\r?\n/).map((m) => m.replace(/^\d+[ -]/, "").trim()).filter((m) => m).slice(1), !this.secure && !this.options.ignoreTLS && (/[ -]STARTTLS\b/im.test(e) || this.options.requireTLS)) {
        this._sendCommand("STARTTLS"), this._responseActions.push(this._actionSTARTTLS);
        return;
      }
      /[ -]SMTPUTF8\b/im.test(e) && this._supportedExtensions.push("SMTPUTF8"), /[ -]DSN\b/im.test(e) && this._supportedExtensions.push("DSN"), /[ -]8BITMIME\b/im.test(e) && this._supportedExtensions.push("8BITMIME"), /[ -]REQUIRETLS\b/im.test(e) && this._supportedExtensions.push("REQUIRETLS"), /[ -]PIPELINING\b/im.test(e) && this._supportedExtensions.push("PIPELINING"), /[ -]AUTH\b/i.test(e) && (this.allowsAuth = !0), /[ -]AUTH(?:(\s+|=)[^\n]*\s+|\s+|=)PLAIN/i.test(e) && this._supportedAuth.push("PLAIN"), /[ -]AUTH(?:(\s+|=)[^\n]*\s+|\s+|=)LOGIN/i.test(e) && this._supportedAuth.push("LOGIN"), /[ -]AUTH(?:(\s+|=)[^\n]*\s+|\s+|=)CRAM-MD5/i.test(e) && this._supportedAuth.push("CRAM-MD5"), /[ -]AUTH(?:(\s+|=)[^\n]*\s+|\s+|=)XOAUTH2/i.test(e) && this._supportedAuth.push("XOAUTH2"), (t = e.match(/[ -]SIZE(?:[ \t]+(\d+))?/im)) && (this._supportedExtensions.push("SIZE"), this._maxAllowedSize = Number(t[1]) || 0), this.emit("connect");
    }
    /**
     * Handles server response for HELO command. If it yielded in
     * error, emit 'error', otherwise move into the authentication phase.
     *
     * @param {String} str Message from the server
     */
    _actionHELO(e) {
      if (e.charAt(0) !== "2") {
        this._onError(new Error("Invalid HELO. response=" + e), "EPROTOCOL", e, "HELO");
        return;
      }
      this.allowsAuth = !0, this.emit("connect");
    }
    /**
     * Handles server response for STARTTLS command. If there's an error
     * try HELO instead, otherwise initiate TLS upgrade. If the upgrade
     * succeedes restart the EHLO
     *
     * @param {String} str Message from the server
     */
    _actionSTARTTLS(e) {
      if (e.charAt(0) !== "2") {
        if (this.options.opportunisticTLS)
          return this.logger.info(
            {
              tnx: "smtp"
            },
            "Failed STARTTLS upgrade, continuing unencrypted"
          ), this.emit("connect");
        this._onError(new Error("Error upgrading connection with STARTTLS"), "ETLS", e, "STARTTLS");
        return;
      }
      this._upgradeConnection((t, m) => {
        if (t) {
          this._onError(new Error("Error initiating TLS - " + (t.message || t)), "ETLS", !1, "STARTTLS");
          return;
        }
        this.logger.info(
          {
            tnx: "smtp"
          },
          "Connection upgraded with STARTTLS"
        ), m ? this.options.lmtp ? (this._responseActions.push(this._actionLHLO), this._sendCommand("LHLO " + this.name)) : (this._responseActions.push(this._actionEHLO), this._sendCommand("EHLO " + this.name)) : this.emit("connect");
      });
    }
    /**
     * Handle the response for AUTH LOGIN command. We are expecting
     * '334 VXNlcm5hbWU6' (base64 for 'Username:'). Data to be sent as
     * response needs to be base64 encoded username. We do not need
     * exact match but settle with 334 response in general as some
     * hosts invalidly use a longer message than VXNlcm5hbWU6
     *
     * @param {String} str Message from the server
     */
    _actionAUTH_LOGIN_USER(e, t) {
      if (!/^334[ -]/.test(e)) {
        t(this._formatError('Invalid login sequence while waiting for "334 VXNlcm5hbWU6"', "EAUTH", e, "AUTH LOGIN"));
        return;
      }
      this._responseActions.push((m) => {
        this._actionAUTH_LOGIN_PASS(m, t);
      }), this._sendCommand(Buffer.from(this._auth.credentials.user + "", "utf-8").toString("base64"));
    }
    /**
     * Handle the response for AUTH CRAM-MD5 command. We are expecting
     * '334 <challenge string>'. Data to be sent as response needs to be
     * base64 decoded challenge string, MD5 hashed using the password as
     * a HMAC key, prefixed by the username and a space, and finally all
     * base64 encoded again.
     *
     * @param {String} str Message from the server
     */
    _actionAUTH_CRAM_MD5(e, t) {
      let m = e.match(/^334\s+(.+)$/), h = "";
      if (m)
        h = m[1];
      else
        return t(
          this._formatError("Invalid login sequence while waiting for server challenge string", "EAUTH", e, "AUTH CRAM-MD5")
        );
      let c = Buffer.from(h, "base64").toString("ascii"), u = o.createHmac("md5", this._auth.credentials.pass);
      u.update(c);
      let v = this._auth.credentials.user + " " + u.digest("hex");
      this._responseActions.push((w) => {
        this._actionAUTH_CRAM_MD5_PASS(w, t);
      }), this._sendCommand(
        Buffer.from(v).toString("base64"),
        // hidden hash for logs
        Buffer.from(this._auth.credentials.user + " /* secret */").toString("base64")
      );
    }
    /**
     * Handles the response to CRAM-MD5 authentication, if there's no error,
     * the user can be considered logged in. Start waiting for a message to send
     *
     * @param {String} str Message from the server
     */
    _actionAUTH_CRAM_MD5_PASS(e, t) {
      if (!e.match(/^235\s+/))
        return t(this._formatError('Invalid login sequence while waiting for "235"', "EAUTH", e, "AUTH CRAM-MD5"));
      this.logger.info(
        {
          tnx: "smtp",
          username: this._auth.user,
          action: "authenticated",
          method: this._authMethod
        },
        "User %s authenticated",
        JSON.stringify(this._auth.user)
      ), this.authenticated = !0, t(null, !0);
    }
    /**
     * Handle the response for AUTH LOGIN command. We are expecting
     * '334 UGFzc3dvcmQ6' (base64 for 'Password:'). Data to be sent as
     * response needs to be base64 encoded password.
     *
     * @param {String} str Message from the server
     */
    _actionAUTH_LOGIN_PASS(e, t) {
      if (!/^334[ -]/.test(e))
        return t(this._formatError('Invalid login sequence while waiting for "334 UGFzc3dvcmQ6"', "EAUTH", e, "AUTH LOGIN"));
      this._responseActions.push((m) => {
        this._actionAUTHComplete(m, t);
      }), this._sendCommand(
        Buffer.from((this._auth.credentials.pass || "").toString(), "utf-8").toString("base64"),
        // Hidden pass for logs
        Buffer.from("/* secret */", "utf-8").toString("base64")
      );
    }
    /**
     * Handles the response for authentication, if there's no error,
     * the user can be considered logged in. Start waiting for a message to send
     *
     * @param {String} str Message from the server
     */
    _actionAUTHComplete(e, t, m) {
      if (!m && typeof t == "function" && (m = t, t = !1), e.substr(0, 3) === "334") {
        this._responseActions.push((h) => {
          t || this._authMethod !== "XOAUTH2" ? this._actionAUTHComplete(h, !0, m) : setImmediate(() => this._handleXOauth2Token(!0, m));
        }), this._sendCommand("");
        return;
      }
      if (e.charAt(0) !== "2")
        return this.logger.info(
          {
            tnx: "smtp",
            username: this._auth.user,
            action: "authfail",
            method: this._authMethod
          },
          "User %s failed to authenticate",
          JSON.stringify(this._auth.user)
        ), m(this._formatError("Invalid login", "EAUTH", e, "AUTH " + this._authMethod));
      this.logger.info(
        {
          tnx: "smtp",
          username: this._auth.user,
          action: "authenticated",
          method: this._authMethod
        },
        "User %s authenticated",
        JSON.stringify(this._auth.user)
      ), this.authenticated = !0, m(null, !0);
    }
    /**
     * Handle response for a MAIL FROM: command
     *
     * @param {String} str Message from the server
     */
    _actionMAIL(e, t) {
      let m, h;
      if (Number(e.charAt(0)) !== 2)
        return this._usingSmtpUtf8 && /^550 /.test(e) && /[\x80-\uFFFF]/.test(this._envelope.from) ? m = "Internationalized mailbox name not allowed" : m = "Mail command failed", t(this._formatError(m, "EENVELOPE", e, "MAIL FROM"));
      if (this._envelope.rcptQueue.length)
        if (this._recipientQueue = [], this._supportedExtensions.includes("PIPELINING"))
          for (; this._envelope.rcptQueue.length; )
            h = this._envelope.rcptQueue.shift(), this._recipientQueue.push(h), this._responseActions.push((c) => {
              this._actionRCPT(c, t);
            }), this._sendCommand("RCPT TO:<" + h + ">" + this._getDsnRcptToArgs());
        else
          h = this._envelope.rcptQueue.shift(), this._recipientQueue.push(h), this._responseActions.push((c) => {
            this._actionRCPT(c, t);
          }), this._sendCommand("RCPT TO:<" + h + ">" + this._getDsnRcptToArgs());
      else
        return t(this._formatError("Can't send mail - no recipients defined", "EENVELOPE", !1, "API"));
    }
    /**
     * Handle response for a RCPT TO: command
     *
     * @param {String} str Message from the server
     */
    _actionRCPT(e, t) {
      let m, h, c = this._recipientQueue.shift();
      if (Number(e.charAt(0)) !== 2 ? (this._usingSmtpUtf8 && /^553 /.test(e) && /[\x80-\uFFFF]/.test(c) ? m = "Internationalized mailbox name not allowed" : m = "Recipient command failed", this._envelope.rejected.push(c), h = this._formatError(m, "EENVELOPE", e, "RCPT TO"), h.recipient = c, this._envelope.rejectedErrors.push(h)) : this._envelope.accepted.push(c), !this._envelope.rcptQueue.length && !this._recipientQueue.length)
        if (this._envelope.rejected.length < this._envelope.to.length)
          this._responseActions.push((u) => {
            this._actionDATA(u, t);
          }), this._sendCommand("DATA");
        else
          return h = this._formatError("Can't send mail - all recipients were rejected", "EENVELOPE", e, "RCPT TO"), h.rejected = this._envelope.rejected, h.rejectedErrors = this._envelope.rejectedErrors, t(h);
      else this._envelope.rcptQueue.length && (c = this._envelope.rcptQueue.shift(), this._recipientQueue.push(c), this._responseActions.push((u) => {
        this._actionRCPT(u, t);
      }), this._sendCommand("RCPT TO:<" + c + ">" + this._getDsnRcptToArgs()));
    }
    /**
     * Handle response for a DATA command
     *
     * @param {String} str Message from the server
     */
    _actionDATA(e, t) {
      if (!/^[23]/.test(e))
        return t(this._formatError("Data command failed", "EENVELOPE", e, "DATA"));
      let m = {
        accepted: this._envelope.accepted,
        rejected: this._envelope.rejected
      };
      this._ehloLines && this._ehloLines.length && (m.ehlo = this._ehloLines), this._envelope.rejectedErrors.length && (m.rejectedErrors = this._envelope.rejectedErrors), t(null, m);
    }
    /**
     * Handle response for a DATA stream when using SMTP
     * We expect a single response that defines if the sending succeeded or failed
     *
     * @param {String} str Message from the server
     */
    _actionSMTPStream(e, t) {
      return Number(e.charAt(0)) !== 2 ? t(this._formatError("Message failed", "EMESSAGE", e, "DATA")) : t(null, e);
    }
    /**
     * Handle response for a DATA stream
     * We expect a separate response for every recipient. All recipients can either
     * succeed or fail separately
     *
     * @param {String} recipient The recipient this response applies to
     * @param {Boolean} final Is this the final recipient?
     * @param {String} str Message from the server
     */
    _actionLMTPStream(e, t, m, h) {
      let c;
      if (Number(m.charAt(0)) !== 2) {
        c = this._formatError("Message failed for recipient " + e, "EMESSAGE", m, "DATA"), c.recipient = e, this._envelope.rejected.push(e), this._envelope.rejectedErrors.push(c);
        for (let u = 0, v = this._envelope.accepted.length; u < v; u++)
          this._envelope.accepted[u] === e && this._envelope.accepted.splice(u, 1);
      }
      if (t)
        return h(null, m);
    }
    _handleXOauth2Token(e, t) {
      this._auth.oauth2.getToken(e, (m, h) => {
        if (m)
          return this.logger.info(
            {
              tnx: "smtp",
              username: this._auth.user,
              action: "authfail",
              method: this._authMethod
            },
            "User %s failed to authenticate",
            JSON.stringify(this._auth.user)
          ), t(this._formatError(m, "EAUTH", !1, "AUTH XOAUTH2"));
        this._responseActions.push((c) => {
          this._actionAUTHComplete(c, e, t);
        }), this._sendCommand(
          "AUTH XOAUTH2 " + this._auth.oauth2.buildXOAuth2Token(h),
          //  Hidden for logs
          "AUTH XOAUTH2 " + this._auth.oauth2.buildXOAuth2Token("/* secret */")
        );
      });
    }
    /**
     *
     * @param {string} command
     * @private
     */
    _isDestroyedMessage(e) {
      if (this._destroyed)
        return "Cannot " + e + " - smtp connection is already destroyed.";
      if (this._socket) {
        if (this._socket.destroyed)
          return "Cannot " + e + " - smtp connection socket is already destroyed.";
        if (!this._socket.writable)
          return "Cannot " + e + " - smtp connection socket is already half-closed.";
      }
    }
    _getHostname() {
      let e;
      try {
        e = r.hostname() || "";
      } catch {
        e = "localhost";
      }
      return (!e || e.indexOf(".") < 0) && (e = "[127.0.0.1]"), e.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/) && (e = "[" + e + "]"), e;
    }
  }
  return ye = f, ye;
}
var Ee, nt;
function Tt() {
  if (nt) return Ee;
  nt = 1;
  const y = O.Stream, E = ee(), S = Q, x = H();
  class r extends y {
    constructor(a, p) {
      if (super(), this.options = a || {}, a && a.serviceClient) {
        if (!a.privateKey || !a.user) {
          setImmediate(() => this.emit("error", new Error('Options "privateKey" and "user" are required for service account!')));
          return;
        }
        let s = Math.min(Math.max(Number(this.options.serviceRequestTimeout) || 0, 0), 3600);
        this.options.serviceRequestTimeout = s || 300;
      }
      if (this.logger = x.getLogger(
        {
          logger: p
        },
        {
          component: this.options.component || "OAuth2"
        }
      ), this.provisionCallback = typeof this.options.provisionCallback == "function" ? this.options.provisionCallback : !1, this.options.accessUrl = this.options.accessUrl || "https://accounts.google.com/o/oauth2/token", this.options.customHeaders = this.options.customHeaders || {}, this.options.customParams = this.options.customParams || {}, this.accessToken = this.options.accessToken || !1, this.options.expires && Number(this.options.expires))
        this.expires = this.options.expires;
      else {
        let s = Math.max(Number(this.options.timeout) || 0, 0);
        this.expires = s && Date.now() + s * 1e3 || 0;
      }
      this.renewing = !1, this.renewalQueue = [];
    }
    /**
     * Returns or generates (if previous has expired) a XOAuth2 token
     *
     * @param {Boolean} renew If false then use cached access token (if available)
     * @param {Function} callback Callback function with error object and token string
     */
    getToken(a, p) {
      if (!a && this.accessToken && (!this.expires || this.expires > Date.now()))
        return this.logger.debug(
          {
            tnx: "OAUTH2",
            user: this.options.user,
            action: "reuse"
          },
          "Reusing existing access token for %s",
          this.options.user
        ), p(null, this.accessToken);
      if (!this.provisionCallback && !this.options.refreshToken && !this.options.serviceClient)
        return this.accessToken ? (this.logger.debug(
          {
            tnx: "OAUTH2",
            user: this.options.user,
            action: "reuse"
          },
          "Reusing existing access token (no refresh capability) for %s",
          this.options.user
        ), p(null, this.accessToken)) : (this.logger.error(
          {
            tnx: "OAUTH2",
            user: this.options.user,
            action: "renew"
          },
          "Cannot renew access token for %s: No refresh mechanism available",
          this.options.user
        ), p(new Error("Can't create new access token for user")));
      if (this.renewing)
        return this.renewalQueue.push({ renew: a, callback: p });
      this.renewing = !0;
      const s = (i, l) => {
        this.renewalQueue.forEach((n) => n.callback(i, l)), this.renewalQueue = [], this.renewing = !1, i ? this.logger.error(
          {
            err: i,
            tnx: "OAUTH2",
            user: this.options.user,
            action: "renew"
          },
          "Failed generating new Access Token for %s",
          this.options.user
        ) : this.logger.info(
          {
            tnx: "OAUTH2",
            user: this.options.user,
            action: "renew"
          },
          "Generated new Access Token for %s",
          this.options.user
        ), p(i, l);
      };
      this.provisionCallback ? this.provisionCallback(this.options.user, !!a, (i, l, n) => {
        !i && l && (this.accessToken = l, this.expires = n || 0), s(i, l);
      }) : this.generateToken(s);
    }
    /**
     * Updates token values
     *
     * @param {String} accessToken New access token
     * @param {Number} timeout Access token lifetime in seconds
     *
     * Emits 'token': { user: User email-address, accessToken: the new accessToken, timeout: TTL in seconds}
     */
    updateToken(a, p) {
      this.accessToken = a, p = Math.max(Number(p) || 0, 0), this.expires = p && Date.now() + p * 1e3 || 0, this.emit("token", {
        user: this.options.user,
        accessToken: a || "",
        expires: this.expires
      });
    }
    /**
     * Generates a new XOAuth2 token with the credentials provided at initialization
     *
     * @param {Function} callback Callback function with error object and token string
     */
    generateToken(a) {
      let p, s;
      if (this.options.serviceClient) {
        let i = Math.floor(Date.now() / 1e3), l = {
          iss: this.options.serviceClient,
          scope: this.options.scope || "https://mail.google.com/",
          sub: this.options.user,
          aud: this.options.accessUrl,
          iat: i,
          exp: i + this.options.serviceRequestTimeout
        }, n;
        try {
          n = this.jwtSignRS256(l);
        } catch {
          return a(new Error("Can't generate token. Check your auth options"));
        }
        p = {
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: n
        }, s = {
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: l
        };
      } else {
        if (!this.options.refreshToken)
          return a(new Error("Can't create new access token for user"));
        p = {
          client_id: this.options.clientId || "",
          client_secret: this.options.clientSecret || "",
          refresh_token: this.options.refreshToken,
          grant_type: "refresh_token"
        }, s = {
          client_id: this.options.clientId || "",
          client_secret: (this.options.clientSecret || "").substr(0, 6) + "...",
          refresh_token: (this.options.refreshToken || "").substr(0, 6) + "...",
          grant_type: "refresh_token"
        };
      }
      Object.keys(this.options.customParams).forEach((i) => {
        p[i] = this.options.customParams[i], s[i] = this.options.customParams[i];
      }), this.logger.debug(
        {
          tnx: "OAUTH2",
          user: this.options.user,
          action: "generate"
        },
        "Requesting token using: %s",
        JSON.stringify(s)
      ), this.postRequest(this.options.accessUrl, p, this.options, (i, l) => {
        let n;
        if (i)
          return a(i);
        try {
          n = JSON.parse(l.toString());
        } catch (f) {
          return a(f);
        }
        if (!n || typeof n != "object")
          return this.logger.debug(
            {
              tnx: "OAUTH2",
              user: this.options.user,
              action: "post"
            },
            "Response: %s",
            (l || "").toString()
          ), a(new Error("Invalid authentication response"));
        let d = {};
        if (Object.keys(n).forEach((f) => {
          f !== "access_token" ? d[f] = n[f] : d[f] = (n[f] || "").toString().substr(0, 6) + "...";
        }), this.logger.debug(
          {
            tnx: "OAUTH2",
            user: this.options.user,
            action: "post"
          },
          "Response: %s",
          JSON.stringify(d)
        ), n.error) {
          let f = n.error;
          return n.error_description && (f += ": " + n.error_description), n.error_uri && (f += " (" + n.error_uri + ")"), a(new Error(f));
        }
        return n.access_token ? (this.updateToken(n.access_token, n.expires_in), a(null, this.accessToken)) : a(new Error("No access token"));
      });
    }
    /**
     * Converts an access_token and user id into a base64 encoded XOAuth2 token
     *
     * @param {String} [accessToken] Access token string
     * @return {String} Base64 encoded token for IMAP or SMTP login
     */
    buildXOAuth2Token(a) {
      let p = ["user=" + (this.options.user || ""), "auth=Bearer " + (a || this.accessToken), "", ""];
      return Buffer.from(p.join(""), "utf-8").toString("base64");
    }
    /**
     * Custom POST request handler.
     * This is only needed to keep paths short in Windows – usually this module
     * is a dependency of a dependency and if it tries to require something
     * like the request module the paths get way too long to handle for Windows.
     * As we do only a simple POST request we do not actually require complicated
     * logic support (no redirects, no nothing) anyway.
     *
     * @param {String} url Url to POST to
     * @param {String|Buffer} payload Payload to POST
     * @param {Function} callback Callback function with (err, buff)
     */
    postRequest(a, p, s, i) {
      let l = !1, n = [], d = 0, f = E(a, {
        method: "post",
        headers: s.customHeaders,
        body: p,
        allowErrorResponse: !0
      });
      f.on("readable", () => {
        let g;
        for (; (g = f.read()) !== null; )
          n.push(g), d += g.length;
      }), f.once("error", (g) => {
        if (!l)
          return l = !0, i(g);
      }), f.once("end", () => {
        if (!l)
          return l = !0, i(null, Buffer.concat(n, d));
      });
    }
    /**
     * Encodes a buffer or a string into Base64url format
     *
     * @param {Buffer|String} data The data to convert
     * @return {String} The encoded string
     */
    toBase64URL(a) {
      return typeof a == "string" && (a = Buffer.from(a)), a.toString("base64").replace(/[=]+/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    }
    /**
     * Creates a JSON Web Token signed with RS256 (SHA256 + RSA)
     *
     * @param {Object} payload The payload to include in the generated token
     * @return {String} The generated and signed token
     */
    jwtSignRS256(a) {
      a = ['{"alg":"RS256","typ":"JWT"}', JSON.stringify(a)].map((s) => this.toBase64URL(s)).join(".");
      let p = S.createSign("RSA-SHA256").update(a).sign(this.options.privateKey);
      return a + "." + this.toBase64URL(p);
    }
  }
  return Ee = r, Ee;
}
var Se, ot;
function Xt() {
  if (ot) return Se;
  ot = 1;
  const y = qe(), E = H().assign, S = Tt(), x = K;
  class r extends x {
    constructor(a) {
      if (super(), this.pool = a, this.options = a.options, this.logger = this.pool.logger, this.options.auth)
        switch ((this.options.auth.type || "").toString().toUpperCase()) {
          case "OAUTH2": {
            let p = new S(this.options.auth, this.logger);
            p.provisionCallback = this.pool.mailer && this.pool.mailer.get("oauth2_provision_cb") || p.provisionCallback, this.auth = {
              type: "OAUTH2",
              user: this.options.auth.user,
              oauth2: p,
              method: "XOAUTH2"
            }, p.on("token", (s) => this.pool.mailer.emit("token", s)), p.on("error", (s) => this.emit("error", s));
            break;
          }
          default:
            if (!this.options.auth.user && !this.options.auth.pass)
              break;
            this.auth = {
              type: (this.options.auth.type || "").toString().toUpperCase() || "LOGIN",
              user: this.options.auth.user,
              credentials: {
                user: this.options.auth.user || "",
                pass: this.options.auth.pass,
                options: this.options.auth.options
              },
              method: (this.options.auth.method || "").trim().toUpperCase() || this.options.authMethod || !1
            };
        }
      this._connection = !1, this._connected = !1, this.messages = 0, this.available = !0;
    }
    /**
     * Initiates a connection to the SMTP server
     *
     * @param {Function} callback Callback function to run once the connection is established or failed
     */
    connect(a) {
      this.pool.getSocket(this.options, (p, s) => {
        if (p)
          return a(p);
        let i = !1, l = this.options;
        s && s.connection && (this.logger.info(
          {
            tnx: "proxy",
            remoteAddress: s.connection.remoteAddress,
            remotePort: s.connection.remotePort,
            destHost: l.host || "",
            destPort: l.port || "",
            action: "connected"
          },
          "Using proxied socket from %s:%s to %s:%s",
          s.connection.remoteAddress,
          s.connection.remotePort,
          l.host || "",
          l.port || ""
        ), l = E(!1, l), Object.keys(s).forEach((n) => {
          l[n] = s[n];
        })), this.connection = new y(l), this.connection.once("error", (n) => {
          if (this.emit("error", n), !i)
            return i = !0, a(n);
        }), this.connection.once("end", () => {
          if (this.close(), i)
            return;
          i = !0;
          let n = setTimeout(() => {
            if (i)
              return;
            let d = new Error("Unexpected socket close");
            this.connection && this.connection._socket && this.connection._socket.upgrading && (d.code = "ETLS"), a(d);
          }, 1e3);
          try {
            n.unref();
          } catch {
          }
        }), this.connection.connect(() => {
          if (!i)
            if (this.auth && (this.connection.allowsAuth || l.forceAuth))
              this.connection.login(this.auth, (n) => {
                if (!i) {
                  if (i = !0, n)
                    return this.connection.close(), this.emit("error", n), a(n);
                  this._connected = !0, a(null, !0);
                }
              });
            else
              return i = !0, this._connected = !0, a(null, !0);
        });
      });
    }
    /**
     * Sends an e-mail to be sent using the selected settings
     *
     * @param {Object} mail Mail object
     * @param {Function} callback Callback function
     */
    send(a, p) {
      if (!this._connected)
        return this.connect((n) => n ? p(n) : this.send(a, p));
      let s = a.message.getEnvelope(), i = a.message.messageId(), l = [].concat(s.to || []);
      l.length > 3 && l.push("...and " + l.splice(2).length + " more"), this.logger.info(
        {
          tnx: "send",
          messageId: i,
          cid: this.id
        },
        "Sending message %s using #%s to <%s>",
        i,
        this.id,
        l.join(", ")
      ), a.data.dsn && (s.dsn = a.data.dsn), a.data.requireTLSExtensionEnabled && (s.requireTLSExtensionEnabled = a.data.requireTLSExtensionEnabled), this.connection.send(s, a.message.createReadStream(), (n, d) => {
        if (this.messages++, n)
          return this.connection.close(), this.emit("error", n), p(n);
        d.envelope = {
          from: s.from,
          to: s.to
        }, d.messageId = i, setImmediate(() => {
          let f;
          this.messages >= this.options.maxMessages ? (f = new Error("Resource exhausted"), f.code = "EMAXLIMIT", this.connection.close(), this.emit("error", f)) : this.pool._checkRateLimit(() => {
            this.available = !0, this.emit("available");
          });
        }), p(null, d);
      });
    }
    /**
     * Closes the connection
     */
    close() {
      this._connected = !1, this.auth && this.auth.oauth2 && this.auth.oauth2.removeAllListeners(), this.connection && this.connection.close(), this.emit("close");
    }
  }
  return Se = r, Se;
}
const Jt = { description: "Alibaba Cloud Mail", domains: ["aliyun.com"], host: "smtp.aliyun.com", port: 465, secure: !0 }, Zt = { description: "Alibaba Cloud Enterprise Mail", host: "smtp.qiye.aliyun.com", port: 465, secure: !0 }, Yt = { description: "AOL Mail", domains: ["aol.com"], host: "smtp.aol.com", port: 587 }, ei = { description: "Aruba PEC (Italian email provider)", domains: ["aruba.it", "pec.aruba.it"], aliases: ["Aruba PEC"], host: "smtps.aruba.it", port: 465, secure: !0, authMethod: "LOGIN" }, ti = { description: "Bluewin (Swiss email provider)", host: "smtpauths.bluewin.ch", domains: ["bluewin.ch"], port: 465 }, ii = { description: "BOL Mail (Brazilian provider)", domains: ["bol.com.br"], host: "smtp.bol.com.br", port: 587, requireTLS: !0 }, si = { description: "DebugMail (email testing service)", host: "debugmail.io", port: 25 }, ai = { description: "Disroot (privacy-focused provider)", domains: ["disroot.org"], host: "disroot.org", port: 587, secure: !1, authMethod: "LOGIN" }, ni = { description: "Dyn Email Delivery", aliases: ["Dynect"], host: "smtp.dynect.net", port: 25 }, oi = { description: "Elastic Email", aliases: ["Elastic Email"], host: "smtp.elasticemail.com", port: 465, secure: !0 }, ri = { description: "Ethereal Email (email testing service)", aliases: ["ethereal.email"], host: "smtp.ethereal.email", port: 587 }, pi = { description: "FastMail", domains: ["fastmail.fm"], host: "smtp.fastmail.com", port: 465, secure: !0 }, li = { description: "Gandi Mail", aliases: ["Gandi", "Gandi Mail"], host: "mail.gandi.net", port: 587 }, ci = { description: "Gmail", aliases: ["Google Mail"], domains: ["gmail.com", "googlemail.com"], host: "smtp.gmail.com", port: 465, secure: !0 }, di = { description: "GMX Mail", domains: ["gmx.com", "gmx.net", "gmx.de"], host: "mail.gmx.com", port: 587 }, mi = { description: "GoDaddy Email (US)", host: "smtpout.secureserver.net", port: 25 }, hi = { description: "GoDaddy Email (Asia)", host: "smtp.asia.secureserver.net", port: 25 }, ui = { description: "GoDaddy Email (Europe)", host: "smtp.europe.secureserver.net", port: 25 }, fi = { description: "Outlook.com / Hotmail", aliases: ["Outlook", "Outlook.com", "Hotmail.com"], domains: ["hotmail.com", "outlook.com"], host: "smtp-mail.outlook.com", port: 587 }, xi = { description: "iCloud Mail", aliases: ["Me", "Mac"], domains: ["me.com", "mac.com"], host: "smtp.mail.me.com", port: 587 }, gi = { description: "Infomaniak Mail (Swiss hosting provider)", host: "mail.infomaniak.com", domains: ["ik.me", "ikmail.com", "etik.com"], port: 587 }, vi = { description: "KolabNow (secure email service)", domains: ["kolabnow.com"], aliases: ["Kolab"], host: "smtp.kolabnow.com", port: 465, secure: !0, authMethod: "LOGIN" }, wi = { description: "Loopia (Swedish hosting provider)", host: "mailcluster.loopia.se", port: 465 }, _i = { description: "Loops", host: "smtp.loops.so", port: 587 }, bi = { description: "MailDev (local email testing)", port: 1025, ignoreTLS: !0 }, yi = { description: "MailerSend", host: "smtp.mailersend.net", port: 587 }, Ei = { description: "Mailgun", host: "smtp.mailgun.org", port: 465, secure: !0 }, Si = { description: "Mailjet", host: "in.mailjet.com", port: 587 }, Ti = { description: "Mailosaur (email testing service)", host: "mailosaur.io", port: 25 }, ki = { description: "Mailtrap", host: "live.smtp.mailtrap.io", port: 587 }, Ai = { description: "Mandrill (by Mailchimp)", host: "smtp.mandrillapp.com", port: 587 }, Ci = { description: "Naver Mail (Korean email provider)", host: "smtp.naver.com", port: 587 }, ji = { description: "OhMySMTP (email delivery service)", host: "smtp.ohmysmtp.com", port: 587, secure: !1 }, Ii = { description: "One.com Email", host: "send.one.com", port: 465, secure: !0 }, Mi = { description: "OpenMailBox", aliases: ["OMB", "openmailbox.org"], host: "smtp.openmailbox.org", port: 465, secure: !0 }, Li = { description: "Microsoft 365 / Office 365", host: "smtp.office365.com", port: 587, secure: !1 }, Ni = { description: "Postmark", aliases: ["PostmarkApp"], host: "smtp.postmarkapp.com", port: 2525 }, qi = { description: "Proton Mail", aliases: ["ProtonMail", "Proton.me", "Protonmail.com", "Protonmail.ch"], domains: ["proton.me", "protonmail.com", "pm.me", "protonmail.ch"], host: "smtp.protonmail.ch", port: 587, requireTLS: !0 }, Hi = { description: "QQ Mail", domains: ["qq.com"], host: "smtp.qq.com", port: 465, secure: !0 }, zi = { description: "QQ Enterprise Mail", aliases: ["QQ Enterprise"], domains: ["exmail.qq.com"], host: "smtp.exmail.qq.com", port: 465, secure: !0 }, Oi = { description: "Resend", host: "smtp.resend.com", port: 465, secure: !0 }, Pi = { description: "Runbox (Norwegian email provider)", domains: ["runbox.com"], host: "smtp.runbox.com", port: 465, secure: !0 }, Ri = { description: "SendCloud (Chinese email delivery)", host: "smtp.sendcloud.net", port: 2525 }, Ui = { description: "SendGrid", host: "smtp.sendgrid.net", port: 587 }, Bi = { description: "Brevo (formerly Sendinblue)", aliases: ["Brevo"], host: "smtp-relay.brevo.com", port: 587 }, Di = { description: "SendPulse", host: "smtp-pulse.com", port: 465, secure: !0 }, Fi = { description: "AWS SES US East (N. Virginia)", host: "email-smtp.us-east-1.amazonaws.com", port: 465, secure: !0 }, $i = { description: "Seznam Email (Czech email provider)", aliases: ["Seznam Email"], domains: ["seznam.cz", "email.cz", "post.cz", "spoluzaci.cz"], host: "smtp.seznam.cz", port: 465, secure: !0 }, Gi = { description: "SMTP2GO", host: "mail.smtp2go.com", port: 2525 }, Qi = { description: "SparkPost", aliases: ["SparkPost", "SparkPost Mail"], domains: ["sparkpost.com"], host: "smtp.sparkpostmail.com", port: 587, secure: !1 }, Ki = { description: "Tipimail (email delivery service)", host: "smtp.tipimail.com", port: 587 }, Wi = { description: "Tutanota (Tuta Mail)", domains: ["tutanota.com", "tuta.com", "tutanota.de", "tuta.io"], host: "smtp.tutanota.com", port: 465, secure: !0 }, Vi = { description: "Yahoo Mail", domains: ["yahoo.com"], host: "smtp.mail.yahoo.com", port: 465, secure: !0 }, Xi = { description: "Yandex Mail", domains: ["yandex.ru"], host: "smtp.yandex.ru", port: 465, secure: !0 }, Ji = { description: "Zimbra Mail Server", aliases: ["Zimbra Collaboration"], host: "smtp.zimbra.com", port: 587, requireTLS: !0 }, Zi = { description: "Zoho Mail", host: "smtp.zoho.com", port: 465, secure: !0, authMethod: "LOGIN" }, Yi = {
  126: { description: "126 Mail (NetEase)", host: "smtp.126.com", port: 465, secure: !0 },
  163: { description: "163 Mail (NetEase)", host: "smtp.163.com", port: 465, secure: !0 },
  "1und1": { description: "1&1 Mail (German hosting provider)", host: "smtp.1und1.de", port: 465, secure: !0, authMethod: "LOGIN" },
  Aliyun: Jt,
  AliyunQiye: Zt,
  AOL: Yt,
  Aruba: ei,
  Bluewin: ti,
  BOL: ii,
  DebugMail: si,
  Disroot: ai,
  DynectEmail: ni,
  ElasticEmail: oi,
  Ethereal: ri,
  FastMail: pi,
  "Feishu Mail": { description: "Feishu Mail (Lark)", aliases: ["Feishu", "FeishuMail"], domains: ["www.feishu.cn"], host: "smtp.feishu.cn", port: 465, secure: !0 },
  "Forward Email": { description: "Forward Email (email forwarding service)", aliases: ["FE", "ForwardEmail"], domains: ["forwardemail.net"], host: "smtp.forwardemail.net", port: 465, secure: !0 },
  GandiMail: li,
  Gmail: ci,
  GMX: di,
  Godaddy: mi,
  GodaddyAsia: hi,
  GodaddyEurope: ui,
  "hot.ee": { description: "Hot.ee (Estonian email provider)", host: "mail.hot.ee" },
  Hotmail: fi,
  iCloud: xi,
  Infomaniak: gi,
  KolabNow: vi,
  Loopia: wi,
  Loops: _i,
  "mail.ee": { description: "Mail.ee (Estonian email provider)", host: "smtp.mail.ee" },
  "Mail.ru": { description: "Mail.ru", host: "smtp.mail.ru", port: 465, secure: !0 },
  "Mailcatch.app": { description: "Mailcatch (email testing service)", host: "sandbox-smtp.mailcatch.app", port: 2525 },
  Maildev: bi,
  MailerSend: yi,
  Mailgun: Ei,
  Mailjet: Si,
  Mailosaur: Ti,
  Mailtrap: ki,
  Mandrill: Ai,
  Naver: Ci,
  OhMySMTP: ji,
  One: Ii,
  OpenMailBox: Mi,
  Outlook365: Li,
  Postmark: Ni,
  Proton: qi,
  "qiye.aliyun": { description: "Alibaba Mail Enterprise Edition", host: "smtp.mxhichina.com", port: "465", secure: !0 },
  QQ: Hi,
  QQex: zi,
  Resend: Oi,
  Runbox: Pi,
  SendCloud: Ri,
  SendGrid: Ui,
  SendinBlue: Bi,
  SendPulse: Di,
  SES: Fi,
  "SES-AP-NORTHEAST-1": { description: "AWS SES Asia Pacific (Tokyo)", host: "email-smtp.ap-northeast-1.amazonaws.com", port: 465, secure: !0 },
  "SES-AP-NORTHEAST-2": { description: "AWS SES Asia Pacific (Seoul)", host: "email-smtp.ap-northeast-2.amazonaws.com", port: 465, secure: !0 },
  "SES-AP-NORTHEAST-3": { description: "AWS SES Asia Pacific (Osaka)", host: "email-smtp.ap-northeast-3.amazonaws.com", port: 465, secure: !0 },
  "SES-AP-SOUTH-1": { description: "AWS SES Asia Pacific (Mumbai)", host: "email-smtp.ap-south-1.amazonaws.com", port: 465, secure: !0 },
  "SES-AP-SOUTHEAST-1": { description: "AWS SES Asia Pacific (Singapore)", host: "email-smtp.ap-southeast-1.amazonaws.com", port: 465, secure: !0 },
  "SES-AP-SOUTHEAST-2": { description: "AWS SES Asia Pacific (Sydney)", host: "email-smtp.ap-southeast-2.amazonaws.com", port: 465, secure: !0 },
  "SES-CA-CENTRAL-1": { description: "AWS SES Canada (Central)", host: "email-smtp.ca-central-1.amazonaws.com", port: 465, secure: !0 },
  "SES-EU-CENTRAL-1": { description: "AWS SES Europe (Frankfurt)", host: "email-smtp.eu-central-1.amazonaws.com", port: 465, secure: !0 },
  "SES-EU-NORTH-1": { description: "AWS SES Europe (Stockholm)", host: "email-smtp.eu-north-1.amazonaws.com", port: 465, secure: !0 },
  "SES-EU-WEST-1": { description: "AWS SES Europe (Ireland)", host: "email-smtp.eu-west-1.amazonaws.com", port: 465, secure: !0 },
  "SES-EU-WEST-2": { description: "AWS SES Europe (London)", host: "email-smtp.eu-west-2.amazonaws.com", port: 465, secure: !0 },
  "SES-EU-WEST-3": { description: "AWS SES Europe (Paris)", host: "email-smtp.eu-west-3.amazonaws.com", port: 465, secure: !0 },
  "SES-SA-EAST-1": { description: "AWS SES South America (São Paulo)", host: "email-smtp.sa-east-1.amazonaws.com", port: 465, secure: !0 },
  "SES-US-EAST-1": { description: "AWS SES US East (N. Virginia)", host: "email-smtp.us-east-1.amazonaws.com", port: 465, secure: !0 },
  "SES-US-EAST-2": { description: "AWS SES US East (Ohio)", host: "email-smtp.us-east-2.amazonaws.com", port: 465, secure: !0 },
  "SES-US-GOV-EAST-1": { description: "AWS SES GovCloud (US-East)", host: "email-smtp.us-gov-east-1.amazonaws.com", port: 465, secure: !0 },
  "SES-US-GOV-WEST-1": { description: "AWS SES GovCloud (US-West)", host: "email-smtp.us-gov-west-1.amazonaws.com", port: 465, secure: !0 },
  "SES-US-WEST-1": { description: "AWS SES US West (N. California)", host: "email-smtp.us-west-1.amazonaws.com", port: 465, secure: !0 },
  "SES-US-WEST-2": { description: "AWS SES US West (Oregon)", host: "email-smtp.us-west-2.amazonaws.com", port: 465, secure: !0 },
  Seznam: $i,
  SMTP2GO: Gi,
  Sparkpost: Qi,
  Tipimail: Ki,
  Tutanota: Wi,
  Yahoo: Vi,
  Yandex: Xi,
  Zimbra: Ji,
  Zoho: Zi
};
var Te, rt;
function kt() {
  if (rt) return Te;
  rt = 1;
  const y = Yi, E = {};
  Object.keys(y).forEach((r) => {
    let o = y[r];
    E[S(r)] = x(o), [].concat(o.aliases || []).forEach((a) => {
      E[S(a)] = x(o);
    }), [].concat(o.domains || []).forEach((a) => {
      E[S(a)] = x(o);
    });
  });
  function S(r) {
    return r.replace(/[^a-zA-Z0-9.-]/g, "").toLowerCase();
  }
  function x(r) {
    let o = ["domains", "aliases"], a = {};
    return Object.keys(r).forEach((p) => {
      o.indexOf(p) < 0 && (a[p] = r[p]);
    }), a;
  }
  return Te = function(r) {
    return r = S(r.split("@").pop()), E[r] || !1;
  }, Te;
}
var ke, pt;
function es() {
  if (pt) return ke;
  pt = 1;
  const y = K, E = Xt(), S = qe(), x = kt(), r = H(), o = U;
  class a extends y {
    constructor(s) {
      super(), s = s || {}, typeof s == "string" && (s = {
        url: s
      });
      let i, l = s.service;
      typeof s.getSocket == "function" && (this.getSocket = s.getSocket), s.url && (i = r.parseConnectionUrl(s.url), l = l || i.service), this.options = r.assign(
        !1,
        // create new object
        s,
        // regular options
        i,
        // url options
        l && x(l)
        // wellknown options
      ), this.options.maxConnections = this.options.maxConnections || 5, this.options.maxMessages = this.options.maxMessages || 100, this.logger = r.getLogger(this.options, {
        component: this.options.component || "smtp-pool"
      });
      let n = new S(this.options);
      this.name = "SMTP (pool)", this.version = o.version + "[client:" + n.version + "]", this._rateLimit = {
        counter: 0,
        timeout: null,
        waiting: [],
        checkpoint: !1,
        delta: Number(this.options.rateDelta) || 1e3,
        limit: Number(this.options.rateLimit) || 0
      }, this._closed = !1, this._queue = [], this._connections = [], this._connectionCounter = 0, this.idling = !0, setImmediate(() => {
        this.idling && this.emit("idle");
      });
    }
    /**
     * Placeholder function for creating proxy sockets. This method immediatelly returns
     * without a socket
     *
     * @param {Object} options Connection options
     * @param {Function} callback Callback function to run with the socket keys
     */
    getSocket(s, i) {
      return setImmediate(() => i(null, !1));
    }
    /**
     * Queues an e-mail to be sent using the selected settings
     *
     * @param {Object} mail Mail object
     * @param {Function} callback Callback function
     */
    send(s, i) {
      return this._closed ? !1 : (this._queue.push({
        mail: s,
        requeueAttempts: 0,
        callback: i
      }), this.idling && this._queue.length >= this.options.maxConnections && (this.idling = !1), setImmediate(() => this._processMessages()), !0);
    }
    /**
     * Closes all connections in the pool. If there is a message being sent, the connection
     * is closed later
     */
    close() {
      let s, i = this._connections.length;
      if (this._closed = !0, clearTimeout(this._rateLimit.timeout), !i && !this._queue.length)
        return;
      for (let n = i - 1; n >= 0; n--)
        this._connections[n] && this._connections[n].available && (s = this._connections[n], s.close(), this.logger.info(
          {
            tnx: "connection",
            cid: s.id,
            action: "removed"
          },
          "Connection #%s removed",
          s.id
        ));
      if (i && !this._connections.length && this.logger.debug(
        {
          tnx: "connection"
        },
        "All connections removed"
      ), !this._queue.length)
        return;
      let l = () => {
        if (!this._queue.length) {
          this.logger.debug(
            {
              tnx: "connection"
            },
            "Pending queue entries cleared"
          );
          return;
        }
        let n = this._queue.shift();
        if (n && typeof n.callback == "function")
          try {
            n.callback(new Error("Connection pool was closed"));
          } catch (d) {
            this.logger.error(
              {
                err: d,
                tnx: "callback",
                cid: s.id
              },
              "Callback error for #%s: %s",
              s.id,
              d.message
            );
          }
        setImmediate(l);
      };
      setImmediate(l);
    }
    /**
     * Check the queue and available connections. If there is a message to be sent and there is
     * an available connection, then use this connection to send the mail
     */
    _processMessages() {
      let s, i, l;
      if (this._closed)
        return;
      if (!this._queue.length) {
        this.idling || (this.idling = !0, this.emit("idle"));
        return;
      }
      for (i = 0, l = this._connections.length; i < l; i++)
        if (this._connections[i].available) {
          s = this._connections[i];
          break;
        }
      if (!s && this._connections.length < this.options.maxConnections && (s = this._createConnection()), !s) {
        this.idling = !1;
        return;
      }
      !this.idling && this._queue.length < this.options.maxConnections && (this.idling = !0, this.emit("idle"));
      let n = s.queueEntry = this._queue.shift();
      n.messageId = (s.queueEntry.mail.message.getHeader("message-id") || "").replace(/[<>\s]/g, ""), s.available = !1, this.logger.debug(
        {
          tnx: "pool",
          cid: s.id,
          messageId: n.messageId,
          action: "assign"
        },
        "Assigned message <%s> to #%s (%s)",
        n.messageId,
        s.id,
        s.messages + 1
      ), this._rateLimit.limit && (this._rateLimit.counter++, this._rateLimit.checkpoint || (this._rateLimit.checkpoint = Date.now())), s.send(n.mail, (d, f) => {
        if (n === s.queueEntry) {
          try {
            n.callback(d, f);
          } catch (g) {
            this.logger.error(
              {
                err: g,
                tnx: "callback",
                cid: s.id
              },
              "Callback error for #%s: %s",
              s.id,
              g.message
            );
          }
          s.queueEntry = !1;
        }
      });
    }
    /**
     * Creates a new pool resource
     */
    _createConnection() {
      let s = new E(this);
      return s.id = ++this._connectionCounter, this.logger.info(
        {
          tnx: "pool",
          cid: s.id,
          action: "conection"
        },
        "Created new pool resource #%s",
        s.id
      ), s.on("available", () => {
        this.logger.debug(
          {
            tnx: "connection",
            cid: s.id,
            action: "available"
          },
          "Connection #%s became available",
          s.id
        ), this._closed ? this.close() : this._processMessages();
      }), s.once("error", (i) => {
        if (i.code !== "EMAXLIMIT" ? this.logger.warn(
          {
            err: i,
            tnx: "pool",
            cid: s.id
          },
          "Pool Error for #%s: %s",
          s.id,
          i.message
        ) : this.logger.debug(
          {
            tnx: "pool",
            cid: s.id,
            action: "maxlimit"
          },
          "Max messages limit exchausted for #%s",
          s.id
        ), s.queueEntry) {
          try {
            s.queueEntry.callback(i);
          } catch (l) {
            this.logger.error(
              {
                err: l,
                tnx: "callback",
                cid: s.id
              },
              "Callback error for #%s: %s",
              s.id,
              l.message
            );
          }
          s.queueEntry = !1;
        }
        this._removeConnection(s), this._continueProcessing();
      }), s.once("close", () => {
        this.logger.info(
          {
            tnx: "connection",
            cid: s.id,
            action: "closed"
          },
          "Connection #%s was closed",
          s.id
        ), this._removeConnection(s), s.queueEntry ? setTimeout(() => {
          s.queueEntry && (this._shouldRequeuOnConnectionClose(s.queueEntry) ? this._requeueEntryOnConnectionClose(s) : this._failDeliveryOnConnectionClose(s)), this._continueProcessing();
        }, 50) : (!this._closed && this.idling && !this._connections.length && this.emit("clear"), this._continueProcessing());
      }), this._connections.push(s), s;
    }
    _shouldRequeuOnConnectionClose(s) {
      return this.options.maxRequeues === void 0 || this.options.maxRequeues < 0 ? !0 : s.requeueAttempts < this.options.maxRequeues;
    }
    _failDeliveryOnConnectionClose(s) {
      if (s.queueEntry && s.queueEntry.callback) {
        try {
          s.queueEntry.callback(new Error("Reached maximum number of retries after connection was closed"));
        } catch (i) {
          this.logger.error(
            {
              err: i,
              tnx: "callback",
              messageId: s.queueEntry.messageId,
              cid: s.id
            },
            "Callback error for #%s: %s",
            s.id,
            i.message
          );
        }
        s.queueEntry = !1;
      }
    }
    _requeueEntryOnConnectionClose(s) {
      s.queueEntry.requeueAttempts = s.queueEntry.requeueAttempts + 1, this.logger.debug(
        {
          tnx: "pool",
          cid: s.id,
          messageId: s.queueEntry.messageId,
          action: "requeue"
        },
        "Re-queued message <%s> for #%s. Attempt: #%s",
        s.queueEntry.messageId,
        s.id,
        s.queueEntry.requeueAttempts
      ), this._queue.unshift(s.queueEntry), s.queueEntry = !1;
    }
    /**
     * Continue to process message if the pool hasn't closed
     */
    _continueProcessing() {
      this._closed ? this.close() : setTimeout(() => this._processMessages(), 100);
    }
    /**
     * Remove resource from pool
     *
     * @param {Object} connection The PoolResource to remove
     */
    _removeConnection(s) {
      let i = this._connections.indexOf(s);
      i !== -1 && this._connections.splice(i, 1);
    }
    /**
     * Checks if connections have hit current rate limit and if so, queues the availability callback
     *
     * @param {Function} callback Callback function to run once rate limiter has been cleared
     */
    _checkRateLimit(s) {
      if (!this._rateLimit.limit)
        return s();
      let i = Date.now();
      if (this._rateLimit.counter < this._rateLimit.limit)
        return s();
      if (this._rateLimit.waiting.push(s), this._rateLimit.checkpoint <= i - this._rateLimit.delta)
        return this._clearRateLimit();
      this._rateLimit.timeout || (this._rateLimit.timeout = setTimeout(() => this._clearRateLimit(), this._rateLimit.delta - (i - this._rateLimit.checkpoint)), this._rateLimit.checkpoint = i);
    }
    /**
     * Clears current rate limit limitation and runs paused callback
     */
    _clearRateLimit() {
      for (clearTimeout(this._rateLimit.timeout), this._rateLimit.timeout = null, this._rateLimit.counter = 0, this._rateLimit.checkpoint = !1; this._rateLimit.waiting.length; ) {
        let s = this._rateLimit.waiting.shift();
        setImmediate(s);
      }
    }
    /**
     * Returns true if there are free slots in the queue
     */
    isIdle() {
      return this.idling;
    }
    /**
     * Verifies SMTP configuration
     *
     * @param {Function} callback Callback function
     */
    verify(s) {
      let i;
      s || (i = new Promise((n, d) => {
        s = r.callbackPromise(n, d);
      }));
      let l = new E(this).auth;
      return this.getSocket(this.options, (n, d) => {
        if (n)
          return s(n);
        let f = this.options;
        d && d.connection && (this.logger.info(
          {
            tnx: "proxy",
            remoteAddress: d.connection.remoteAddress,
            remotePort: d.connection.remotePort,
            destHost: f.host || "",
            destPort: f.port || "",
            action: "connected"
          },
          "Using proxied socket from %s:%s to %s:%s",
          d.connection.remoteAddress,
          d.connection.remotePort,
          f.host || "",
          f.port || ""
        ), f = r.assign(!1, f), Object.keys(d).forEach((m) => {
          f[m] = d[m];
        }));
        let g = new S(f), e = !1;
        g.once("error", (m) => {
          if (!e)
            return e = !0, g.close(), s(m);
        }), g.once("end", () => {
          if (!e)
            return e = !0, s(new Error("Connection closed"));
        });
        let t = () => {
          if (!e)
            return e = !0, g.quit(), s(null, !0);
        };
        g.connect(() => {
          if (!e)
            if (l && (g.allowsAuth || f.forceAuth))
              g.login(l, (m) => {
                if (!e) {
                  if (m)
                    return e = !0, g.close(), s(m);
                  t();
                }
              });
            else if (!l && g.allowsAuth && f.forceAuth) {
              let m = new Error("Authentication info was not provided");
              return m.code = "NoAuth", e = !0, g.close(), s(m);
            } else
              t();
        });
      }), i;
    }
  }
  return ke = a, ke;
}
var Ae, lt;
function ts() {
  if (lt) return Ae;
  lt = 1;
  const y = K, E = qe(), S = kt(), x = H(), r = Tt(), o = U;
  class a extends y {
    constructor(s) {
      super(), s = s || {}, typeof s == "string" && (s = {
        url: s
      });
      let i, l = s.service;
      typeof s.getSocket == "function" && (this.getSocket = s.getSocket), s.url && (i = x.parseConnectionUrl(s.url), l = l || i.service), this.options = x.assign(
        !1,
        // create new object
        s,
        // regular options
        i,
        // url options
        l && S(l)
        // wellknown options
      ), this.logger = x.getLogger(this.options, {
        component: this.options.component || "smtp-transport"
      });
      let n = new E(this.options);
      this.name = "SMTP", this.version = o.version + "[client:" + n.version + "]", this.options.auth && (this.auth = this.getAuth({}));
    }
    /**
     * Placeholder function for creating proxy sockets. This method immediatelly returns
     * without a socket
     *
     * @param {Object} options Connection options
     * @param {Function} callback Callback function to run with the socket keys
     */
    getSocket(s, i) {
      return setImmediate(() => i(null, !1));
    }
    getAuth(s) {
      if (!s)
        return this.auth;
      let i = !1, l = {};
      if (this.options.auth && typeof this.options.auth == "object" && Object.keys(this.options.auth).forEach((n) => {
        i = !0, l[n] = this.options.auth[n];
      }), s && typeof s == "object" && Object.keys(s).forEach((n) => {
        i = !0, l[n] = s[n];
      }), !i)
        return !1;
      switch ((l.type || "").toString().toUpperCase()) {
        case "OAUTH2": {
          if (!l.service && !l.user)
            return !1;
          let n = new r(l, this.logger);
          return n.provisionCallback = this.mailer && this.mailer.get("oauth2_provision_cb") || n.provisionCallback, n.on("token", (d) => this.mailer.emit("token", d)), n.on("error", (d) => this.emit("error", d)), {
            type: "OAUTH2",
            user: l.user,
            oauth2: n,
            method: "XOAUTH2"
          };
        }
        default:
          return {
            type: (l.type || "").toString().toUpperCase() || "LOGIN",
            user: l.user,
            credentials: {
              user: l.user || "",
              pass: l.pass,
              options: l.options
            },
            method: (l.method || "").trim().toUpperCase() || this.options.authMethod || !1
          };
      }
    }
    /**
     * Sends an e-mail using the selected settings
     *
     * @param {Object} mail Mail object
     * @param {Function} callback Callback function
     */
    send(s, i) {
      this.getSocket(this.options, (l, n) => {
        if (l)
          return i(l);
        let d = !1, f = this.options;
        n && n.connection && (this.logger.info(
          {
            tnx: "proxy",
            remoteAddress: n.connection.remoteAddress,
            remotePort: n.connection.remotePort,
            destHost: f.host || "",
            destPort: f.port || "",
            action: "connected"
          },
          "Using proxied socket from %s:%s to %s:%s",
          n.connection.remoteAddress,
          n.connection.remotePort,
          f.host || "",
          f.port || ""
        ), f = x.assign(!1, f), Object.keys(n).forEach((t) => {
          f[t] = n[t];
        }));
        let g = new E(f);
        g.once("error", (t) => {
          if (!d)
            return d = !0, g.close(), i(t);
        }), g.once("end", () => {
          if (d)
            return;
          let t = setTimeout(() => {
            if (d)
              return;
            d = !0;
            let m = new Error("Unexpected socket close");
            g && g._socket && g._socket.upgrading && (m.code = "ETLS"), i(m);
          }, 1e3);
          try {
            t.unref();
          } catch {
          }
        });
        let e = () => {
          let t = s.message.getEnvelope(), m = s.message.messageId(), h = [].concat(t.to || []);
          h.length > 3 && h.push("...and " + h.splice(2).length + " more"), s.data.dsn && (t.dsn = s.data.dsn), s.data.requireTLSExtensionEnabled && (t.requireTLSExtensionEnabled = s.data.requireTLSExtensionEnabled), this.logger.info(
            {
              tnx: "send",
              messageId: m
            },
            "Sending message %s to <%s>",
            m,
            h.join(", ")
          ), g.send(t, s.message.createReadStream(), (c, u) => {
            if (d = !0, g.close(), c)
              return this.logger.error(
                {
                  err: c,
                  tnx: "send"
                },
                "Send error for %s: %s",
                m,
                c.message
              ), i(c);
            u.envelope = {
              from: t.from,
              to: t.to
            }, u.messageId = m;
            try {
              return i(null, u);
            } catch (v) {
              this.logger.error(
                {
                  err: v,
                  tnx: "callback"
                },
                "Callback error for %s: %s",
                m,
                v.message
              );
            }
          });
        };
        g.connect(() => {
          if (d)
            return;
          let t = this.getAuth(s.data.auth);
          t && (g.allowsAuth || f.forceAuth) ? g.login(t, (m) => {
            if (t && t !== this.auth && t.oauth2 && t.oauth2.removeAllListeners(), !d) {
              if (m)
                return d = !0, g.close(), i(m);
              e();
            }
          }) : e();
        });
      });
    }
    /**
     * Verifies SMTP configuration
     *
     * @param {Function} callback Callback function
     */
    verify(s) {
      let i;
      return s || (i = new Promise((l, n) => {
        s = x.callbackPromise(l, n);
      })), this.getSocket(this.options, (l, n) => {
        if (l)
          return s(l);
        let d = this.options;
        n && n.connection && (this.logger.info(
          {
            tnx: "proxy",
            remoteAddress: n.connection.remoteAddress,
            remotePort: n.connection.remotePort,
            destHost: d.host || "",
            destPort: d.port || "",
            action: "connected"
          },
          "Using proxied socket from %s:%s to %s:%s",
          n.connection.remoteAddress,
          n.connection.remotePort,
          d.host || "",
          d.port || ""
        ), d = x.assign(!1, d), Object.keys(n).forEach((t) => {
          d[t] = n[t];
        }));
        let f = new E(d), g = !1;
        f.once("error", (t) => {
          if (!g)
            return g = !0, f.close(), s(t);
        }), f.once("end", () => {
          if (!g)
            return g = !0, s(new Error("Connection closed"));
        });
        let e = () => {
          if (!g)
            return g = !0, f.quit(), s(null, !0);
        };
        f.connect(() => {
          if (g)
            return;
          let t = this.getAuth({});
          if (t && (f.allowsAuth || d.forceAuth))
            f.login(t, (m) => {
              if (!g) {
                if (m)
                  return g = !0, f.close(), s(m);
                e();
              }
            });
          else if (!t && f.allowsAuth && d.forceAuth) {
            let m = new Error("Authentication info was not provided");
            return m.code = "NoAuth", g = !0, f.close(), s(m);
          } else
            e();
        });
      }), i;
    }
    /**
     * Releases resources
     */
    close() {
      this.auth && this.auth.oauth2 && this.auth.oauth2.removeAllListeners(), this.emit("close");
    }
  }
  return Ae = a, Ae;
}
var Ce, ct;
function is() {
  if (ct) return Ce;
  ct = 1;
  const y = Lt.spawn, E = U, S = H();
  class x {
    constructor(o) {
      o = o || {}, this._spawn = y, this.options = o || {}, this.name = "Sendmail", this.version = E.version, this.path = "sendmail", this.args = !1, this.winbreak = !1, this.logger = S.getLogger(this.options, {
        component: this.options.component || "sendmail"
      }), o && (typeof o == "string" ? this.path = o : typeof o == "object" && (o.path && (this.path = o.path), Array.isArray(o.args) && (this.args = o.args), this.winbreak = ["win", "windows", "dos", `\r
`].includes((o.newline || "").toString().toLowerCase())));
    }
    /**
     * <p>Compiles a mailcomposer message and forwards it to handler that sends it.</p>
     *
     * @param {Object} emailMessage MailComposer object
     * @param {Function} callback Callback function to run when the sending is completed
     */
    send(o, a) {
      o.message.keepBcc = !0;
      let p = o.data.envelope || o.message.getEnvelope(), s = o.message.messageId(), i, l, n;
      if ([].concat(p.from || []).concat(p.to || []).some((g) => /^-/.test(g)))
        return a(new Error("Can not send mail. Invalid envelope addresses."));
      this.args ? i = ["-i"].concat(this.args).concat(p.to) : i = ["-i"].concat(p.from ? ["-f", p.from] : []).concat(p.to);
      let f = (g) => {
        if (!n && (n = !0, typeof a == "function"))
          return g ? a(g) : a(null, {
            envelope: o.data.envelope || o.message.getEnvelope(),
            messageId: s,
            response: "Messages queued for delivery"
          });
      };
      try {
        l = this._spawn(this.path, i);
      } catch (g) {
        return this.logger.error(
          {
            err: g,
            tnx: "spawn",
            messageId: s
          },
          "Error occurred while spawning sendmail. %s",
          g.message
        ), f(g);
      }
      if (l) {
        l.on("error", (t) => {
          this.logger.error(
            {
              err: t,
              tnx: "spawn",
              messageId: s
            },
            "Error occurred when sending message %s. %s",
            s,
            t.message
          ), f(t);
        }), l.once("exit", (t) => {
          if (!t)
            return f();
          let m;
          t === 127 ? m = new Error("Sendmail command not found, process exited with code " + t) : m = new Error("Sendmail exited with code " + t), this.logger.error(
            {
              err: m,
              tnx: "stdin",
              messageId: s
            },
            "Error sending message %s to sendmail. %s",
            s,
            m.message
          ), f(m);
        }), l.once("close", f), l.stdin.on("error", (t) => {
          this.logger.error(
            {
              err: t,
              tnx: "stdin",
              messageId: s
            },
            "Error occurred when piping message %s to sendmail. %s",
            s,
            t.message
          ), f(t);
        });
        let g = [].concat(p.to || []);
        g.length > 3 && g.push("...and " + g.splice(2).length + " more"), this.logger.info(
          {
            tnx: "send",
            messageId: s
          },
          "Sending message %s to <%s>",
          s,
          g.join(", ")
        );
        let e = o.message.createReadStream();
        e.once("error", (t) => {
          this.logger.error(
            {
              err: t,
              tnx: "stdin",
              messageId: s
            },
            "Error occurred when generating message %s. %s",
            s,
            t.message
          ), l.kill("SIGINT"), f(t);
        }), e.pipe(l.stdin);
      } else
        return f(new Error("sendmail was not found"));
    }
  }
  return Ce = x, Ce;
}
var je, dt;
function ss() {
  if (dt) return je;
  dt = 1;
  const y = U, E = H();
  class S {
    constructor(r) {
      r = r || {}, this.options = r || {}, this.name = "StreamTransport", this.version = y.version, this.logger = E.getLogger(this.options, {
        component: this.options.component || "stream-transport"
      }), this.winbreak = ["win", "windows", "dos", `\r
`].includes((r.newline || "").toString().toLowerCase());
    }
    /**
     * Compiles a mailcomposer message and forwards it to handler that sends it
     *
     * @param {Object} emailMessage MailComposer object
     * @param {Function} callback Callback function to run when the sending is completed
     */
    send(r, o) {
      r.message.keepBcc = !0;
      let a = r.data.envelope || r.message.getEnvelope(), p = r.message.messageId(), s = [].concat(a.to || []);
      s.length > 3 && s.push("...and " + s.splice(2).length + " more"), this.logger.info(
        {
          tnx: "send",
          messageId: p
        },
        "Sending message %s to <%s> using %s line breaks",
        p,
        s.join(", "),
        this.winbreak ? "<CR><LF>" : "<LF>"
      ), setImmediate(() => {
        let i;
        try {
          i = r.message.createReadStream();
        } catch (d) {
          return this.logger.error(
            {
              err: d,
              tnx: "send",
              messageId: p
            },
            "Creating send stream failed for %s. %s",
            p,
            d.message
          ), o(d);
        }
        if (!this.options.buffer)
          return i.once("error", (d) => {
            this.logger.error(
              {
                err: d,
                tnx: "send",
                messageId: p
              },
              "Failed creating message for %s. %s",
              p,
              d.message
            );
          }), o(null, {
            envelope: r.data.envelope || r.message.getEnvelope(),
            messageId: p,
            message: i
          });
        let l = [], n = 0;
        i.on("readable", () => {
          let d;
          for (; (d = i.read()) !== null; )
            l.push(d), n += d.length;
        }), i.once("error", (d) => (this.logger.error(
          {
            err: d,
            tnx: "send",
            messageId: p
          },
          "Failed creating message for %s. %s",
          p,
          d.message
        ), o(d))), i.on(
          "end",
          () => o(null, {
            envelope: r.data.envelope || r.message.getEnvelope(),
            messageId: p,
            message: Buffer.concat(l, n)
          })
        );
      });
    }
  }
  return je = S, je;
}
var Ie, mt;
function as() {
  if (mt) return Ie;
  mt = 1;
  const y = U, E = H();
  class S {
    constructor(r) {
      r = r || {}, this.options = r || {}, this.name = "JSONTransport", this.version = y.version, this.logger = E.getLogger(this.options, {
        component: this.options.component || "json-transport"
      });
    }
    /**
     * <p>Compiles a mailcomposer message and forwards it to handler that sends it.</p>
     *
     * @param {Object} emailMessage MailComposer object
     * @param {Function} callback Callback function to run when the sending is completed
     */
    send(r, o) {
      r.message.keepBcc = !0;
      let a = r.data.envelope || r.message.getEnvelope(), p = r.message.messageId(), s = [].concat(a.to || []);
      s.length > 3 && s.push("...and " + s.splice(2).length + " more"), this.logger.info(
        {
          tnx: "send",
          messageId: p
        },
        "Composing JSON structure of %s to <%s>",
        p,
        s.join(", ")
      ), setImmediate(() => {
        r.normalize((i, l) => i ? (this.logger.error(
          {
            err: i,
            tnx: "send",
            messageId: p
          },
          "Failed building JSON structure for %s. %s",
          p,
          i.message
        ), o(i)) : (delete l.envelope, delete l.normalizedHeaders, o(null, {
          envelope: a,
          messageId: p,
          message: this.options.skipEncoding ? l : JSON.stringify(l)
        })));
      });
    }
  }
  return Ie = S, Ie;
}
var Me, ht;
function ns() {
  if (ht) return Me;
  ht = 1;
  const y = K, E = U, S = H(), x = St(), r = Ne();
  class o extends y {
    constructor(p) {
      super(), p = p || {}, this.options = p || {}, this.ses = this.options.SES, this.name = "SESTransport", this.version = E.version, this.logger = S.getLogger(this.options, {
        component: this.options.component || "ses-transport"
      });
    }
    getRegion(p) {
      return this.ses.sesClient.config && typeof this.ses.sesClient.config.region == "function" ? this.ses.sesClient.config.region().then((s) => p(null, s)).catch((s) => p(s)) : p(null, !1);
    }
    /**
     * Compiles a mailcomposer message and forwards it to SES
     *
     * @param {Object} emailMessage MailComposer object
     * @param {Function} callback Callback function to run when the sending is completed
     */
    send(p, s) {
      let i = p.message._headers.find((g) => /^from$/i.test(g.key));
      if (i) {
        let g = new r("text/plain");
        i = g._convertAddresses(g._parseAddresses(i.value));
      }
      let l = p.data.envelope || p.message.getEnvelope(), n = p.message.messageId(), d = [].concat(l.to || []);
      d.length > 3 && d.push("...and " + d.splice(2).length + " more"), this.logger.info(
        {
          tnx: "send",
          messageId: n
        },
        "Sending message %s to <%s>",
        n,
        d.join(", ")
      );
      let f = (g) => {
        p.data._dkim || (p.data._dkim = {}), p.data._dkim.skipFields && typeof p.data._dkim.skipFields == "string" ? p.data._dkim.skipFields += ":date:message-id" : p.data._dkim.skipFields = "date:message-id";
        let e = p.message.createReadStream(), t = e.pipe(new x()), m = [], h = 0;
        t.on("readable", () => {
          let c;
          for (; (c = t.read()) !== null; )
            m.push(c), h += c.length;
        }), e.once("error", (c) => t.emit("error", c)), t.once("error", (c) => {
          g(c);
        }), t.once("end", () => g(null, Buffer.concat(m, h)));
      };
      setImmediate(
        () => f((g, e) => {
          if (g)
            return this.logger.error(
              {
                err: g,
                tnx: "send",
                messageId: n
              },
              "Failed creating message for %s. %s",
              n,
              g.message
            ), s(g);
          let t = {
            Content: {
              Raw: {
                // required
                Data: e
                // required
              }
            },
            FromEmailAddress: i || l.from,
            Destination: {
              ToAddresses: l.to
            }
          };
          Object.keys(p.data.ses || {}).forEach((m) => {
            t[m] = p.data.ses[m];
          }), this.getRegion((m, h) => {
            (m || !h) && (h = "us-east-1");
            const c = new this.ses.SendEmailCommand(t);
            this.ses.sesClient.send(c).then((v) => {
              h === "us-east-1" && (h = "email"), s(null, {
                envelope: {
                  from: l.from,
                  to: l.to
                },
                messageId: "<" + v.MessageId + (/@/.test(v.MessageId) ? "" : "@" + h + ".amazonses.com") + ">",
                response: v.MessageId,
                raw: e
              });
            }).catch((v) => {
              this.logger.error(
                {
                  err: v,
                  tnx: "send"
                },
                "Send error for %s: %s",
                n,
                v.message
              ), s(v);
            });
          });
        })
      );
    }
    /**
     * Verifies SES configuration
     *
     * @param {Function} callback Callback function
     */
    verify(p) {
      let s;
      p || (s = new Promise((n, d) => {
        p = S.callbackPromise(n, d);
      }));
      const i = (n) => n && !["InvalidParameterValue", "MessageRejected"].includes(n.code || n.Code || n.name) ? p(n) : p(null, !0), l = {
        Content: {
          Raw: {
            Data: Buffer.from(`From: <invalid@invalid>\r
To: <invalid@invalid>\r
 Subject: Invalid\r
\r
Invalid`)
          }
        },
        FromEmailAddress: "invalid@invalid",
        Destination: {
          ToAddresses: ["invalid@invalid"]
        }
      };
      return this.getRegion((n, d) => {
        const f = new this.ses.SendEmailCommand(l);
        this.ses.sesClient.send(f).then((e) => i(null)).catch((e) => i(e));
      }), s;
    }
  }
  return Me = o, Me;
}
var ut;
function os() {
  if (ut) return V;
  ut = 1;
  const y = Wt(), E = H(), S = es(), x = ts(), r = is(), o = ss(), a = as(), p = ns(), s = ee(), i = U, l = (process.env.ETHEREAL_API || "https://api.nodemailer.com").replace(/\/+$/, ""), n = (process.env.ETHEREAL_WEB || "https://ethereal.email").replace(/\/+$/, ""), d = (process.env.ETHEREAL_API_KEY || "").replace(/\s*/g, "") || null, f = ["true", "yes", "y", "1"].includes((process.env.ETHEREAL_CACHE || "yes").toString().trim().toLowerCase());
  let g = !1;
  return V.createTransport = function(e, t) {
    let m, h, c;
    if (
      // provided transporter is a configuration object, not transporter plugin
      typeof e == "object" && typeof e.send != "function" || // provided transporter looks like a connection url
      typeof e == "string" && /^(smtps?|direct):/i.test(e)
    )
      if ((m = typeof e == "string" ? e : e.url) ? h = E.parseConnectionUrl(m) : h = e, h.pool)
        e = new S(h);
      else if (h.sendmail)
        e = new r(h);
      else if (h.streamTransport)
        e = new o(h);
      else if (h.jsonTransport)
        e = new a(h);
      else if (h.SES) {
        if (h.SES.ses && h.SES.aws) {
          let u = new Error(
            "Using legacy SES configuration, expecting @aws-sdk/client-sesv2, see https://nodemailer.com/transports/ses/"
          );
          throw u.code = "LegacyConfig", u;
        }
        e = new p(h);
      } else
        e = new x(h);
    return c = new y(e, h, t), c;
  }, V.createTestAccount = function(e, t) {
    let m;
    if (!t && typeof e == "function" && (t = e, e = !1), t || (m = new Promise((b, _) => {
      t = E.callbackPromise(b, _);
    })), f && g)
      return setImmediate(() => t(null, g)), m;
    e = e || l;
    let h = [], c = 0, u = {}, v = {
      requestor: i.name,
      version: i.version
    };
    d && (u.Authorization = "Bearer " + d);
    let w = s(e + "/user", {
      contentType: "application/json",
      method: "POST",
      headers: u,
      body: Buffer.from(JSON.stringify(v))
    });
    return w.on("readable", () => {
      let b;
      for (; (b = w.read()) !== null; )
        h.push(b), c += b.length;
    }), w.once("error", (b) => t(b)), w.once("end", () => {
      let b = Buffer.concat(h, c), _, A;
      try {
        _ = JSON.parse(b.toString());
      } catch (T) {
        A = T;
      }
      if (A)
        return t(A);
      if (_.status !== "success" || _.error)
        return t(new Error(_.error || "Request failed"));
      delete _.status, g = _, t(null, g);
    }), m;
  }, V.getTestMessageUrl = function(e) {
    if (!e || !e.response)
      return !1;
    let t = /* @__PURE__ */ new Map();
    return e.response.replace(/\[([^\]]+)\]$/, (m, h) => {
      h.replace(/\b([A-Z0-9]+)=([^\s]+)/g, (c, u, v) => {
        t.set(u, v);
      });
    }), t.has("STATUS") && t.has("MSGID") ? (g.web || n) + "/message/" + t.get("MSGID") : !1;
  }, V;
}
var At = os();
const rs = /* @__PURE__ */ Ct(At), Ss = /* @__PURE__ */ Nt({
  __proto__: null,
  default: rs
}, [At]);
export {
  Ss as n
};
