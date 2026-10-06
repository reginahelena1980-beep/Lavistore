import { createRequire } from 'module'; const require = createRequire(import.meta.url);

// serverless-src/admin/_lib/adminAuth.ts
import crypto2 from "crypto";
import fs from "fs";
import path from "path";

// node_modules/nodemailer/dist/esm/shared/url.js
import net from "node:net";
import urllib from "node:url";

// node_modules/nodemailer/dist/esm/punycode/index.js
var maxInt = 2147483647;
var base = 36;
var tMin = 1;
var tMax = 26;
var skew = 38;
var damp = 700;
var initialBias = 72;
var initialN = 128;
var delimiter = "-";
var regexNonASCII = /[^\0-\x7F]/;
var regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g;
var errors = {
  overflow: "Overflow: input needs wider integers to process",
  "not-basic": "Illegal input >= 0x80 (not a basic code point)",
  "invalid-input": "Invalid input"
};
var baseMinusTMin = base - tMin;
var floor = Math.floor;
var stringFromCharCode = String.fromCharCode;
function error(type) {
  throw new RangeError(errors[type]);
}
function map(array, callback) {
  const result = [];
  let length = array.length;
  while (length--) {
    result[length] = callback(array[length]);
  }
  return result;
}
function mapDomain(domain, callback) {
  const parts = domain.split("@");
  let result = "";
  if (parts.length > 1) {
    result = parts[0] + "@";
    domain = parts[1];
  }
  domain = domain.replace(regexSeparators, ".");
  const labels = domain.split(".");
  const encoded = map(labels, callback).join(".");
  return result + encoded;
}
function ucs2decode(string) {
  const output = [];
  let counter = 0;
  const length = string.length;
  while (counter < length) {
    const value = string.charCodeAt(counter++);
    if (value >= 55296 && value <= 56319 && counter < length) {
      const extra = string.charCodeAt(counter++);
      if ((extra & 64512) == 56320) {
        output.push(((value & 1023) << 10) + (extra & 1023) + 65536);
      } else {
        output.push(value);
        counter--;
      }
    } else {
      output.push(value);
    }
  }
  return output;
}
var digitToBasic = function(digit, flag) {
  return digit + 22 + 75 * Number(digit < 26) - (Number(flag != 0) << 5);
};
var adapt = function(delta, numPoints, firstTime) {
  let k = 0;
  delta = firstTime ? floor(delta / damp) : delta >> 1;
  delta += floor(delta / numPoints);
  for (
    ;
    /* no initialization */
    delta > baseMinusTMin * tMax >> 1;
    k += base
  ) {
    delta = floor(delta / baseMinusTMin);
  }
  return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
};
var encode = function(input) {
  const output = [];
  const codePoints = ucs2decode(input);
  const inputLength = codePoints.length;
  let n = initialN;
  let delta = 0;
  let bias = initialBias;
  for (const currentValue of codePoints) {
    if (currentValue < 128) {
      output.push(stringFromCharCode(currentValue));
    }
  }
  const basicLength = output.length;
  let handledCPCount = basicLength;
  if (basicLength) {
    output.push(delimiter);
  }
  while (handledCPCount < inputLength) {
    let m = maxInt;
    for (const currentValue of codePoints) {
      if (currentValue >= n && currentValue < m) {
        m = currentValue;
      }
    }
    const handledCPCountPlusOne = handledCPCount + 1;
    if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
      error("overflow");
    }
    delta += (m - n) * handledCPCountPlusOne;
    n = m;
    for (const currentValue of codePoints) {
      if (currentValue < n && ++delta > maxInt) {
        error("overflow");
      }
      if (currentValue === n) {
        let q = delta;
        for (let k = base; ; k += base) {
          const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
          if (q < t) {
            break;
          }
          const qMinusT = q - t;
          const baseMinusT = base - t;
          output.push(stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0)));
          q = floor(qMinusT / baseMinusT);
        }
        output.push(stringFromCharCode(digitToBasic(q, 0)));
        bias = adapt(delta, handledCPCountPlusOne, handledCPCount === basicLength);
        delta = 0;
        ++handledCPCount;
      }
    }
    ++delta;
    ++n;
  }
  return output.join("");
};
var toASCII = function(input) {
  return mapDomain(input, function(string) {
    return regexNonASCII.test(string) ? "xn--" + encode(string) : string;
  });
};

// node_modules/nodemailer/dist/esm/shared/url.js
var SLASHLESS_AUTHORITY = /^([a-zA-Z][a-zA-Z0-9+.-]*:)(?!\/\/)([\s\S]+)$/;
var SURROUNDING_WHITESPACE = /^[\x00-\x20]+|[\x00-\x20]+$/g;
var LEGACY_TRIM = /^[\x00-\x20\u00a0\ufeff]+/;
var AUTHORITY = /^([a-zA-Z0-9+.-]+:)?[\\/]{2}([^\\/?#]*)/;
var FORBIDDEN_HOST_CHARS = /[\x00-\x20#/:<>?@[\\\]^|\x7f]/;
var CONTROL_CHARS = /[\x00-\x1f\x7f]/;
function invalidUrl(input) {
  const err = new TypeError("Invalid URL");
  err.code = "ERR_INVALID_URL";
  err.input = input;
  return err;
}
function legacyParse(input, parseQueryString, whatwgError, slashesDenoteHost) {
  const parsed = urllib.parse(input, parseQueryString, slashesDenoteHost);
  const authority = AUTHORITY.exec(input.replace(LEGACY_TRIM, ""));
  if (authority && (authority[1] || parsed.hostname !== null)) {
    const written = authority[2].slice(authority[2].lastIndexOf("@") + 1);
    if (!written || CONTROL_CHARS.test(written) || (parsed.host || "").toLowerCase() !== toASCII(written.toLowerCase())) {
      throw whatwgError;
    }
    if (written.charAt(0) === "[" && !net.isIPv6(written.slice(1, written.indexOf("]")))) {
      throw whatwgError;
    }
  } else if (parsed.hostname !== null) {
    throw whatwgError;
  }
  const legacyAuth = parsed.auth === null || parsed.auth === void 0 ? null : parsed.auth.split(":");
  const result = parsed;
  result.username = legacyAuth ? legacyAuth.shift() : null;
  result.password = legacyAuth && legacyAuth.length ? legacyAuth.join(":") : null;
  return result;
}
function safeDecode(str) {
  try {
    return decodeURIComponent(str);
  } catch (_err) {
    return str;
  }
}
function normalizeHostname(raw, href) {
  const hostname = raw || "";
  if (!hostname) {
    return "";
  }
  if (hostname.charAt(0) === "[" && hostname.charAt(hostname.length - 1) === "]") {
    return hostname.slice(1, -1);
  }
  const decoded = safeDecode(hostname);
  const mapped = FORBIDDEN_HOST_CHARS.test(decoded) ? "" : urllib.domainToASCII(decoded);
  if (!mapped) {
    throw invalidUrl(href);
  }
  return mapped;
}
var parse = (input, parseQueryString) => {
  input = (input || "").replace(SURROUNDING_WHITESPACE, "");
  const slashless = SLASHLESS_AUTHORITY.exec(input);
  const normalized2 = slashless ? slashless[1] + "//" + slashless[2] : input;
  let u;
  try {
    u = new URL(normalized2);
  } catch (err) {
    return legacyParse(normalized2, parseQueryString, err);
  }
  const hostname = normalizeHostname(u.hostname, u.href);
  const port = u.port || null;
  const pathname = u.pathname || null;
  const search = u.search || null;
  let auth = null;
  let username = null;
  let password = null;
  if (u.username || u.password) {
    username = safeDecode(u.username);
    password = u.password ? safeDecode(u.password) : null;
    auth = username + (password !== null ? ":" + password : "");
  }
  let query;
  if (parseQueryString) {
    const parsed = /* @__PURE__ */ Object.create(null);
    u.searchParams.forEach((value, key) => {
      if (Object.prototype.hasOwnProperty.call(parsed, key)) {
        const existing = parsed[key];
        if (Array.isArray(existing)) {
          existing.push(value);
        } else {
          parsed[key] = [existing, value];
        }
      } else {
        parsed[key] = value;
      }
    });
    query = parsed;
  } else {
    query = search ? search.slice(1) : null;
  }
  return {
    protocol: u.protocol || null,
    host: u.host || null,
    hostname,
    port,
    pathname,
    search,
    path: (pathname || "") + (search || "") || null,
    href: u.href,
    auth,
    username,
    password,
    query
  };
};
var resolve = (from, to) => {
  try {
    return new URL(to, from).href;
  } catch (err) {
    legacyParse(from, false, err, true);
    legacyParse(to, false, err, true);
    return urllib.resolve(from, to);
  }
};

// node_modules/nodemailer/dist/esm/fetch/index.js
import http from "node:http";
import https from "node:https";
import zlib from "node:zlib";
import { PassThrough } from "node:stream";

// node_modules/nodemailer/dist/esm/fetch/cookies.js
import net2 from "node:net";
var SESSION_TIMEOUT = 1800;
var Cookies = class {
  constructor(options) {
    this.options = options || {};
    this.cookies = [];
  }
  /**
   * Stores a cookie string to the cookie storage
   *
   * @param cookieStr Value from the 'Set-Cookie:' header
   * @param url Current URL
   */
  set(cookieStr, url) {
    const urlparts = parse(url || "");
    const cookie = this.parse(cookieStr);
    let domain;
    if (cookie.domain) {
      domain = cookie.domain.replace(/^\./, "");
      if (
        // can't be valid if the requested domain is shorter than current hostname
        urlparts.hostname.length < domain.length || // a top level domain is not a valid scope, 'Domain=com' would otherwise be
        // sent to every .com host. A trailing dot does not make 'com.' any better
        domain.indexOf(".") < 0 || domain.endsWith(".") || // an IP address has no subdomains, so cookies set on it stay host-only
        net2.isIP(urlparts.hostname) || // prefix domains with dot to be sure that partial matches are not used
        !("." + urlparts.hostname).endsWith("." + domain)
      ) {
        cookie.domain = urlparts.hostname;
      }
    } else {
      cookie.domain = urlparts.hostname;
    }
    if (!cookie.path) {
      cookie.path = this.getPath(urlparts.pathname);
    }
    if (!cookie.expires) {
      cookie.expires = new Date(Date.now() + (Number(this.options.sessionTimeout || SESSION_TIMEOUT) || SESSION_TIMEOUT) * 1e3);
    }
    return this.add(cookie);
  }
  /**
   * Returns cookie string for the 'Cookie:' header.
   *
   * @param url URL to check for
   * @returns Cookie header or empty string if no matches were found
   */
  get(url) {
    return this.list(url).map((cookie) => cookie.name + "=" + cookie.value).join("; ");
  }
  /**
   * Lists all valied cookie objects for the specified URL
   *
   * @param url URL to check for
   * @returns An array of cookie objects
   */
  list(url) {
    const result = [];
    for (let i = this.cookies.length - 1; i >= 0; i--) {
      const cookie = this.cookies[i];
      if (this.isExpired(cookie)) {
        this.cookies.splice(i, 1);
        continue;
      }
      if (this.match(cookie, url)) {
        result.unshift(cookie);
      }
    }
    return result;
  }
  /**
   * Parses cookie string from the 'Set-Cookie:' header
   *
   * @param cookieStr String from the 'Set-Cookie:' header
   * @returns Cookie object
   */
  parse(cookieStr) {
    const cookie = {};
    (cookieStr || "").toString().split(";").forEach((cookiePart) => {
      const valueParts = cookiePart.split("=");
      const key = valueParts.shift().trim().toLowerCase();
      let value = valueParts.join("=").trim();
      let domain;
      if (!key) {
        return;
      }
      switch (key) {
        case "expires": {
          const expires = new Date(value);
          if (expires.toString() !== "Invalid Date") {
            cookie.expires = expires;
          }
          break;
        }
        case "path":
          cookie.path = value;
          break;
        case "domain":
          domain = value.toLowerCase();
          if (domain.length && domain.charAt(0) !== ".") {
            domain = "." + domain;
          }
          cookie.domain = domain;
          break;
        case "max-age":
          cookie.expires = new Date(Date.now() + (Number(value) || 0) * 1e3);
          break;
        case "secure":
          cookie.secure = true;
          break;
        case "httponly":
          cookie.httponly = true;
          break;
        default:
          if (!cookie.name) {
            cookie.name = key;
            cookie.value = value;
          }
      }
    });
    return cookie;
  }
  /**
   * Checks if a cookie object is valid for a specified URL
   *
   * @param cookie Cookie object
   * @param url URL to check for
   * @returns true if cookie is valid for specifiec URL
   */
  match(cookie, url) {
    const urlparts = parse(url || "");
    if (urlparts.hostname !== cookie.domain && (cookie.domain.charAt(0) !== "." || ("." + urlparts.hostname).substr(-cookie.domain.length) !== cookie.domain)) {
      return false;
    }
    const pathname = urlparts.pathname || "/";
    const cookiePath = cookie.path;
    const pathMatches = pathname === cookiePath || pathname.startsWith(cookiePath) && (cookiePath.endsWith("/") || pathname.charAt(cookiePath.length) === "/");
    if (!pathMatches) {
      return false;
    }
    if (cookie.secure && urlparts.protocol !== "https:") {
      return false;
    }
    return true;
  }
  /**
   * Adds (or updates/removes if needed) a cookie object to the cookie storage
   *
   * @param cookie Cookie value to be stored
   */
  add(cookie) {
    if (!cookie || !cookie.name) {
      return false;
    }
    for (let i = 0, len = this.cookies.length; i < len; i++) {
      if (this.compare(this.cookies[i], cookie)) {
        if (this.isExpired(cookie)) {
          this.cookies.splice(i, 1);
          return false;
        }
        this.cookies[i] = cookie;
        return true;
      }
    }
    if (!this.isExpired(cookie)) {
      this.cookies.push(cookie);
    }
    return true;
  }
  /**
   * Checks if two cookie objects are the same
   *
   * @param a Cookie to check against
   * @param b Cookie to check against
   * @returns True, if the cookies are the same
   */
  compare(a, b) {
    return a.name === b.name && a.path === b.path && a.domain === b.domain && a.secure === b.secure && a.httponly === b.httponly;
  }
  /**
   * Checks if a cookie is expired
   *
   * @param cookie Cookie object to check against
   * @returns True, if the cookie is expired
   */
  isExpired(cookie) {
    return cookie.expires && cookie.expires < /* @__PURE__ */ new Date() || !cookie.value;
  }
  /**
   * Returns the default path for an URL path argument, the default-path of
   * RFC 6265 section 5.1.4. A cookie that carries no Path attribute is scoped
   * to the directory of the URL it was set from
   *
   * @param pathname
   * @returns Default path
   */
  getPath(pathname) {
    const pathParts = (pathname || "/").split("/");
    pathParts.pop();
    const path2 = pathParts.join("/").trim();
    if (path2.charAt(0) !== "/") {
      return "/";
    }
    return path2;
  }
};
var cookies_default = Cookies;

// node_modules/nodemailer/dist/esm/package-info.js
var version = "10.0.15";

// node_modules/nodemailer/dist/esm/fetch/index.js
import net3 from "node:net";

// node_modules/nodemailer/dist/esm/errors.js
var ECONFIG = "ECONFIG";
var EFETCH = "EFETCH";

// node_modules/nodemailer/dist/esm/shared/objects.js
var isProtoKey = (key) => key === "__proto__";

// node_modules/nodemailer/dist/esm/fetch/index.js
var MAX_REDIRECTS = 5;
var DEFAULT_TIMEOUT = 60 * 1e3;
var DEFAULT_MAX_BYTES = 64 * 1024 * 1024;
var TLS_OPTION_KEYS = [
  "ALPNProtocols",
  "ca",
  "cert",
  "checkServerIdentity",
  "ciphers",
  "crl",
  "dhparam",
  "ecdhCurve",
  "honorCipherOrder",
  "key",
  "maxVersion",
  "minVersion",
  "passphrase",
  "pfx",
  "rejectUnauthorized",
  "secureContext",
  "secureOptions",
  "secureProtocol",
  "servername",
  "sessionIdContext",
  "sigalgs"
];
function parseFetchUrl(url) {
  let parsed;
  try {
    parsed = parse(url);
  } catch (_err) {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }
  return parsed;
}
function nmfetch(url, options) {
  options = options || {};
  options.fetchRes = options.fetchRes || new PassThrough();
  options.cookies = options.cookies || new cookies_default();
  options.redirects = options.redirects || 0;
  options.maxRedirects = isNaN(options.maxRedirects) ? MAX_REDIRECTS : options.maxRedirects;
  const fetchRes = options.fetchRes;
  const parsed = parseFetchUrl(url);
  if (!parsed) {
    if (options.body && typeof options.body.destroy === "function") {
      options.body.on("error", () => false);
      options.body.destroy();
    }
    setImmediate(() => {
      const err = new Error("Unsupported protocol for URL " + url);
      err.code = EFETCH;
      err.sourceUrl = url;
      fetchRes.emit("error", err);
    });
    return fetchRes;
  }
  if (options.cookie) {
    [].concat(options.cookie || []).forEach((cookie) => {
      options.cookies.set(cookie, url);
    });
    options.cookie = false;
  }
  let method = (options.method || "").toString().trim().toUpperCase() || "GET";
  let finished = false;
  let cookies;
  let body;
  const handler2 = parsed.protocol === "https:" ? https : http;
  const headers = {
    "accept-encoding": "gzip,deflate",
    "user-agent": "nodemailer/" + version
  };
  Object.keys(options.headers || {}).forEach((key) => {
    if (isProtoKey(key.toLowerCase().trim())) {
      return;
    }
    headers[key.toLowerCase().trim()] = options.headers[key];
  });
  if (options.userAgent) {
    headers["user-agent"] = options.userAgent;
  }
  if (parsed.auth) {
    headers.Authorization = "Basic " + Buffer.from(parsed.auth).toString("base64");
  }
  if (cookies = options.cookies.get(url)) {
    headers.cookie = cookies;
  }
  if (options.body) {
    if (options.contentType !== false) {
      headers["Content-Type"] = options.contentType || "application/x-www-form-urlencoded";
    }
    if (typeof options.body.pipe === "function") {
      headers["Transfer-Encoding"] = "chunked";
      body = options.body;
      body.on("error", (err) => {
        if (finished) {
          return;
        }
        finished = true;
        err.code = EFETCH;
        err.sourceUrl = url;
        fetchRes.emit("error", err);
      });
    } else {
      if (options.body instanceof Buffer) {
        body = options.body;
      } else if (typeof options.body === "object") {
        try {
          body = Buffer.from(Object.keys(options.body).map((key) => {
            const value = options.body[key].toString().trim();
            return encodeURIComponent(key) + "=" + encodeURIComponent(value);
          }).join("&"));
        } catch (E) {
          finished = true;
          E.code = EFETCH;
          E.sourceUrl = url;
          setImmediate(() => fetchRes.emit("error", E));
          return fetchRes;
        }
      } else {
        body = Buffer.from(options.body.toString().trim());
      }
      headers["Content-Type"] = options.contentType || "application/x-www-form-urlencoded";
      headers["Content-Length"] = body.length;
    }
    method = (options.method || "").toString().trim().toUpperCase() || "POST";
  }
  let req;
  const reqOptions = {
    method,
    host: parsed.hostname,
    path: parsed.path,
    port: parsed.port ? parsed.port : parsed.protocol === "https:" ? 443 : 80,
    headers,
    // Validate TLS certificates by default. Callers that genuinely need to
    // reach a self-signed/internal host opt out explicitly with
    // options.tls = { rejectUnauthorized: false }.
    rejectUnauthorized: true,
    agent: false
  };
  if (options.tls) {
    Object.keys(options.tls).forEach((key) => {
      if (TLS_OPTION_KEYS.includes(key)) {
        reqOptions[key] = options.tls[key];
      }
    });
  }
  if (parsed.protocol === "https:" && parsed.hostname && parsed.hostname !== reqOptions.host && !net3.isIP(parsed.hostname) && !reqOptions.servername) {
    reqOptions.servername = parsed.hostname;
  }
  try {
    req = handler2.request(reqOptions);
  } catch (E) {
    finished = true;
    setImmediate(() => {
      E.code = EFETCH;
      E.sourceUrl = url;
      fetchRes.emit("error", E);
    });
    return fetchRes;
  }
  const fail = (err, sourceUrl = url) => {
    if (finished) {
      return;
    }
    finished = true;
    err.code = EFETCH;
    err.sourceUrl = sourceUrl;
    fetchRes.emit("error", err);
    req.abort();
  };
  const timeout = typeof options.timeout === "number" && options.timeout >= 0 ? options.timeout : DEFAULT_TIMEOUT;
  if (timeout) {
    req.setTimeout(timeout, () => fail(new Error("Request Timeout")));
  }
  req.on("error", (err) => fail(err));
  req.on("response", (res) => {
    let inflate;
    if (finished) {
      return;
    }
    switch (res.headers["content-encoding"]) {
      case "gzip":
      case "deflate":
        inflate = zlib.createUnzip();
        break;
    }
    if (res.headers["set-cookie"]) {
      [].concat(res.headers["set-cookie"] || []).forEach((cookie) => {
        options.cookies.set(cookie, url);
      });
    }
    if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
      options.redirects++;
      if (options.redirects > options.maxRedirects) {
        return fail(new Error("Maximum redirect count exceeded"));
      }
      options.method = "GET";
      options.body = false;
      let redirectUrl;
      try {
        redirectUrl = resolve(url, res.headers.location);
      } catch (_err) {
        redirectUrl = res.headers.location;
      }
      const redirectParsed = parseFetchUrl(redirectUrl);
      if (!redirectParsed) {
        return fail(new Error("Unsupported protocol for URL " + redirectUrl), redirectUrl);
      }
      const crossHost = redirectParsed.hostname !== parsed.hostname;
      const downgrade = parsed.protocol === "https:" && redirectParsed.protocol === "http:";
      if (options.headers && (crossHost || downgrade)) {
        const sensitive = ["authorization", "cookie", "proxy-authorization"];
        Object.keys(options.headers).forEach((key) => {
          if (sensitive.includes(key.toLowerCase())) {
            delete options.headers[key];
          }
        });
      }
      finished = true;
      res.resume();
      req.abort();
      return nmfetch(redirectUrl, options);
    }
    fetchRes.statusCode = res.statusCode;
    fetchRes.headers = res.headers;
    if (res.statusCode >= 300 && !options.allowErrorResponse) {
      return fail(new Error("Invalid status code " + res.statusCode));
    }
    res.on("error", (err) => fail(err));
    const maxBytes = typeof options.maxBytes === "number" && options.maxBytes > 0 ? options.maxBytes : DEFAULT_MAX_BYTES;
    const source = inflate || res;
    let received = 0;
    source.on("data", (chunk) => {
      received += chunk.length;
      if (received <= maxBytes || finished) {
        return;
      }
      source.unpipe(fetchRes);
      fail(new Error("Response size exceeds the allowed " + maxBytes + " bytes"));
    });
    if (inflate) {
      res.pipe(inflate).pipe(fetchRes);
      inflate.on("error", (err) => fail(err));
    } else {
      res.pipe(fetchRes);
    }
  });
  setImmediate(() => {
    if (body) {
      try {
        if (typeof body.pipe === "function") {
          return body.pipe(req);
        }
        req.write(body);
      } catch (err) {
        return fail(err);
      }
    }
    req.end();
  });
  return fetchRes;
}
nmfetch.Cookies = cookies_default;
nmfetch.DEFAULT_TIMEOUT = DEFAULT_TIMEOUT;

// node_modules/nodemailer/dist/esm/shared/index.js
import os from "node:os";
var DNS_TTL = 5 * 60 * 1e3;
var CACHE_CLEANUP_INTERVAL = 30 * 1e3;
var networkInterfaces;
try {
  networkInterfaces = os.networkInterfaces();
} catch (_err) {
}

// node_modules/nodemailer/dist/esm/mime-funcs/index.js
function foldLines(str, lineLength, afterSpace) {
  str = (str || "").toString();
  lineLength = lineLength || 76;
  let pos = 0;
  const len = str.length;
  let result = "";
  let line, match;
  while (pos < len) {
    line = str.substr(pos, lineLength);
    if (line.length < lineLength) {
      result += line;
      break;
    }
    if (match = line.match(/^[^\n\r]*(\r?\n|\r)/)) {
      line = match[0];
      result += line;
      pos += line.length;
      continue;
    } else if ((match = line.match(/(\s+)[^\s]*$/)) && match[0].length - (afterSpace ? (match[1] || "").length : 0) < line.length) {
      line = line.substr(0, line.length - (match[0].length - (afterSpace ? (match[1] || "").length : 0)));
    } else if (match = str.substr(pos + line.length).match(/^[^\s]+(\s*)/)) {
      line = line + match[0].substr(0, match[0].length - (!afterSpace ? (match[1] || "").length : 0));
    }
    result += line;
    pos += line.length;
    if (pos < len) {
      result += "\r\n";
    }
  }
  return result;
}

// node_modules/nodemailer/dist/esm/mime-node/index.js
var ATEXT = "[A-Za-z0-9!#$%&'*+\\-/=?^_`{|}~\\x80-\\uFFFF]";
var DOT_ATOM = new RegExp("^" + ATEXT + "+(?:\\." + ATEXT + "+)*$");

// node_modules/nodemailer/dist/esm/dkim/relaxed-body.js
var CRLF = Buffer.from("\r\n");
var EMPTY_LINES = Buffer.alloc(4096, CRLF);

// node_modules/nodemailer/dist/esm/dkim/sign.js
import crypto from "node:crypto";
function unsupportedHashAlgoError(hashAlgo) {
  const err = new Error('Unsupported DKIM hash algorithm "' + hashAlgo + '"');
  err.code = ECONFIG;
  return err;
}
function sign(headers, hashAlgo, bodyHash, options) {
  options = options || {};
  const defaultFieldNames = "From:Sender:Reply-To:Subject:Date:Message-ID:To:Cc:MIME-Version:Content-Type:Content-Transfer-Encoding:Content-ID:Content-Description:Resent-Date:Resent-From:Resent-Sender:Resent-To:Resent-Cc:Resent-Message-ID:In-Reply-To:References:List-Id:List-Help:List-Unsubscribe:List-Subscribe:List-Post:List-Owner:List-Archive";
  const fieldNames = options.headerFieldNames || defaultFieldNames;
  const canonicalizedHeaderData = relaxedHeaders(headers, fieldNames, options.skipFields);
  const dkimHeader = generateDKIMHeader(options.domainName, options.keySelector, canonicalizedHeaderData.fieldNames, hashAlgo, bodyHash);
  canonicalizedHeaderData.headers += "dkim-signature:" + relaxedHeaderLine(dkimHeader);
  let signer;
  try {
    signer = crypto.createSign(("rsa-" + hashAlgo).toUpperCase());
  } catch (_E) {
    throw unsupportedHashAlgoError(hashAlgo);
  }
  signer.update(canonicalizedHeaderData.headers, "latin1");
  let signature;
  try {
    signature = signer.sign(options.privateKey, "base64");
  } catch (_E) {
    return false;
  }
  return dkimHeader + signature.replace(/(^.{73}|.{75}(?!\r?\n|\r))/g, "$&\r\n ").trim();
}
sign.relaxedHeaders = relaxedHeaders;
sign.unsupportedHashAlgoError = unsupportedHashAlgoError;
function generateDKIMHeader(domainName, keySelector, fieldNames, hashAlgo, bodyHash) {
  const cleanTagValue = (value) => (value || "").toString().replace(/[\x00-\x1f\x7f;=]/g, "");
  const dkim = [
    "v=1",
    "a=rsa-" + hashAlgo,
    "c=relaxed/relaxed",
    "d=" + toASCII(cleanTagValue(domainName)),
    "q=dns/txt",
    "s=" + cleanTagValue(keySelector),
    "bh=" + bodyHash,
    "h=" + cleanTagValue(fieldNames)
  ].join("; ");
  return foldLines("DKIM-Signature: " + dkim, 76) + ";\r\n b=";
}
function relaxedHeaders(headers, fieldNames, skipFields) {
  const includedFields = /* @__PURE__ */ new Set();
  const skip = /* @__PURE__ */ new Set();
  const headerFields = /* @__PURE__ */ new Map();
  (skipFields || "").toLowerCase().split(":").forEach((field) => {
    skip.add(field.trim());
  });
  (fieldNames || "").toLowerCase().split(":").filter((field) => !skip.has(field.trim())).forEach((field) => {
    includedFields.add(field.trim());
  });
  for (let i = headers.length - 1; i >= 0; i--) {
    const line = headers[i];
    if (includedFields.has(line.key) && !headerFields.has(line.key)) {
      headerFields.set(line.key, relaxedHeaderLine(line.line));
    }
  }
  const headersList = [];
  const fields = [];
  includedFields.forEach((field) => {
    if (headerFields.has(field)) {
      fields.push(field);
      headersList.push(field + ":" + headerFields.get(field));
    }
  });
  return {
    headers: headersList.join("\r\n") + "\r\n",
    fieldNames: fields.join(":")
  };
}
function relaxedHeaderLine(line) {
  return line.substr(line.indexOf(":") + 1).replace(/\r?\n/g, "").replace(/[ \t]+/g, " ").replace(/^ | $/g, "");
}

// node_modules/nodemailer/dist/esm/dkim/index.js
var MAX_MESSAGE_SIZE = 10 * 1024 * 1024;

// node_modules/nodemailer/dist/esm/smtp-connection/http-proxy-client.js
var MAX_RESPONSE_HEADER_BYTES = 64 * 1024;

// node_modules/nodemailer/dist/esm/smtp-connection/data-stream.js
var INSERT_LF = Buffer.from("\n");
var INSERT_LF_DOT = Buffer.from("\n.");
var INSERT_CR = Buffer.from("\r");
var INSERT_DOT = Buffer.from(".");

// node_modules/nodemailer/dist/esm/smtp-connection/index.js
var CONNECTION_TIMEOUT = 2 * 60 * 1e3;
var SOCKET_TIMEOUT = 10 * 60 * 1e3;
var GREETING_TIMEOUT = 30 * 1e3;
var DNS_TIMEOUT = 30 * 1e3;
var MAX_RESPONSE_SIZE = 1024 * 1024;

// node_modules/nodemailer/dist/esm/well-known/services.js
var services = {
  "126": {
    "description": "126 Mail (NetEase)",
    "host": "smtp.126.com",
    "port": 465,
    "secure": true
  },
  "163": {
    "description": "163 Mail (NetEase)",
    "host": "smtp.163.com",
    "port": 465,
    "secure": true
  },
  "1und1": {
    "description": "1&1 Mail (German hosting provider)",
    "host": "smtp.1und1.de",
    "port": 465,
    "secure": true,
    "authMethod": "LOGIN"
  },
  "Aliyun": {
    "description": "Alibaba Cloud Mail",
    "domains": [
      "aliyun.com"
    ],
    "host": "smtp.aliyun.com",
    "port": 465,
    "secure": true
  },
  "AliyunQiye": {
    "description": "Alibaba Cloud Enterprise Mail",
    "host": "smtp.qiye.aliyun.com",
    "port": 465,
    "secure": true
  },
  "AOL": {
    "description": "AOL Mail",
    "domains": [
      "aol.com"
    ],
    "host": "smtp.aol.com",
    "port": 587
  },
  "Aruba": {
    "description": "Aruba PEC (Italian email provider)",
    "domains": [
      "aruba.it",
      "pec.aruba.it"
    ],
    "aliases": [
      "Aruba PEC"
    ],
    "host": "smtps.aruba.it",
    "port": 465,
    "secure": true,
    "authMethod": "LOGIN"
  },
  "Bluewin": {
    "description": "Bluewin (Swiss email provider)",
    "host": "smtpauths.bluewin.ch",
    "domains": [
      "bluewin.ch"
    ],
    "port": 465
  },
  "BOL": {
    "description": "BOL Mail (Brazilian provider)",
    "domains": [
      "bol.com.br"
    ],
    "host": "smtp.bol.com.br",
    "port": 587,
    "requireTLS": true
  },
  "DebugMail": {
    "description": "DebugMail (email testing service)",
    "host": "debugmail.io",
    "port": 25
  },
  "Disroot": {
    "description": "Disroot (privacy-focused provider)",
    "domains": [
      "disroot.org"
    ],
    "host": "disroot.org",
    "port": 587,
    "secure": false,
    "authMethod": "LOGIN"
  },
  "DynectEmail": {
    "description": "Dyn Email Delivery",
    "aliases": [
      "Dynect"
    ],
    "host": "smtp.dynect.net",
    "port": 25
  },
  "ElasticEmail": {
    "description": "Elastic Email",
    "aliases": [
      "Elastic Email"
    ],
    "host": "smtp.elasticemail.com",
    "port": 465,
    "secure": true
  },
  "Ethereal": {
    "description": "Ethereal Email (email testing service)",
    "aliases": [
      "ethereal.email"
    ],
    "host": "smtp.ethereal.email",
    "port": 587
  },
  "FastMail": {
    "description": "FastMail",
    "domains": [
      "fastmail.com",
      "fastmail.fm"
    ],
    "host": "smtp.fastmail.com",
    "port": 465,
    "secure": true
  },
  "Feishu Mail": {
    "description": "Feishu Mail (Lark)",
    "aliases": [
      "Feishu",
      "FeishuMail"
    ],
    "domains": [
      "www.feishu.cn"
    ],
    "host": "smtp.feishu.cn",
    "port": 465,
    "secure": true
  },
  "Forward Email": {
    "description": "Forward Email (email forwarding service)",
    "aliases": [
      "FE",
      "ForwardEmail"
    ],
    "domains": [
      "forwardemail.net"
    ],
    "host": "smtp.forwardemail.net",
    "port": 465,
    "secure": true
  },
  "GandiMail": {
    "description": "Gandi Mail",
    "aliases": [
      "Gandi",
      "Gandi Mail"
    ],
    "host": "mail.gandi.net",
    "port": 587
  },
  "Gmail": {
    "description": "Gmail",
    "aliases": [
      "Google Mail"
    ],
    "domains": [
      "gmail.com",
      "googlemail.com"
    ],
    "host": "smtp.gmail.com",
    "port": 465,
    "secure": true
  },
  "GmailWorkspace": {
    "description": "Gmail Workspace",
    "aliases": [
      "Google Workspace Mail"
    ],
    "host": "smtp-relay.gmail.com",
    "port": 465,
    "secure": true
  },
  "GMX": {
    "description": "GMX Mail",
    "domains": [
      "gmx.com",
      "gmx.net",
      "gmx.de"
    ],
    "host": "mail.gmx.com",
    "port": 587
  },
  "Godaddy": {
    "description": "GoDaddy Email (US)",
    "host": "smtpout.secureserver.net",
    "port": 25
  },
  "GodaddyAsia": {
    "description": "GoDaddy Email (Asia)",
    "host": "smtp.asia.secureserver.net",
    "port": 25
  },
  "GodaddyEurope": {
    "description": "GoDaddy Email (Europe)",
    "host": "smtp.europe.secureserver.net",
    "port": 25
  },
  "hot.ee": {
    "description": "Hot.ee (Estonian email provider)",
    "host": "mail.hot.ee"
  },
  "Hotmail": {
    "description": "Outlook.com / Hotmail",
    "aliases": [
      "Outlook",
      "Outlook.com",
      "Hotmail.com"
    ],
    "domains": [
      "hotmail.com",
      "outlook.com"
    ],
    "host": "smtp-mail.outlook.com",
    "port": 587
  },
  "iCloud": {
    "description": "iCloud Mail",
    "aliases": [
      "Me",
      "Mac"
    ],
    "domains": [
      "icloud.com",
      "me.com",
      "mac.com"
    ],
    "host": "smtp.mail.me.com",
    "port": 587
  },
  "Infomaniak": {
    "description": "Infomaniak Mail (Swiss hosting provider)",
    "host": "mail.infomaniak.com",
    "domains": [
      "ik.me",
      "ikmail.com",
      "etik.com"
    ],
    "port": 587
  },
  "KolabNow": {
    "description": "KolabNow (secure email service)",
    "domains": [
      "kolabnow.com"
    ],
    "aliases": [
      "Kolab"
    ],
    "host": "smtp.kolabnow.com",
    "port": 465,
    "secure": true,
    "authMethod": "LOGIN"
  },
  "Loopia": {
    "description": "Loopia (Swedish hosting provider)",
    "host": "mailcluster.loopia.se",
    "port": 465
  },
  "Loops": {
    "description": "Loops",
    "host": "smtp.loops.so",
    "port": 587
  },
  "mail.ee": {
    "description": "Mail.ee (Estonian email provider)",
    "host": "smtp.mail.ee"
  },
  "Mail.ru": {
    "description": "Mail.ru",
    "host": "smtp.mail.ru",
    "port": 465,
    "secure": true
  },
  "Mailcatch.app": {
    "description": "Mailcatch (email testing service)",
    "host": "sandbox-smtp.mailcatch.app",
    "port": 2525
  },
  "Maildev": {
    "description": "MailDev (local email testing)",
    "port": 1025,
    "ignoreTLS": true
  },
  "MailerSend": {
    "description": "MailerSend",
    "host": "smtp.mailersend.net",
    "port": 587
  },
  "Mailgun": {
    "description": "Mailgun",
    "host": "smtp.mailgun.org",
    "port": 465,
    "secure": true
  },
  "Mailjet": {
    "description": "Mailjet",
    "host": "in.mailjet.com",
    "port": 587
  },
  "Mailosaur": {
    "description": "Mailosaur (email testing service)",
    "host": "mailosaur.io",
    "port": 25
  },
  "MailSenpai": {
    "description": "MailSenpai (SMTP Senpai, EU)",
    "host": "relay.mailsenpai.com",
    "port": 2525,
    "secure": false
  },
  "Mailtrap": {
    "description": "Mailtrap",
    "host": "live.smtp.mailtrap.io",
    "port": 587
  },
  "Mandrill": {
    "description": "Mandrill (by Mailchimp)",
    "host": "smtp.mandrillapp.com",
    "port": 587
  },
  "Naver": {
    "description": "Naver Mail (Korean email provider)",
    "host": "smtp.naver.com",
    "port": 587
  },
  "OhMySMTP": {
    "description": "OhMySMTP (email delivery service)",
    "host": "smtp.ohmysmtp.com",
    "port": 587,
    "secure": false
  },
  "One": {
    "description": "One.com Email",
    "host": "send.one.com",
    "port": 465,
    "secure": true
  },
  "OpenMailBox": {
    "description": "OpenMailBox",
    "aliases": [
      "OMB",
      "openmailbox.org"
    ],
    "host": "smtp.openmailbox.org",
    "port": 465,
    "secure": true
  },
  "Outlook365": {
    "description": "Microsoft 365 / Office 365",
    "host": "smtp.office365.com",
    "port": 587,
    "secure": false
  },
  "Postmark": {
    "description": "Postmark",
    "aliases": [
      "PostmarkApp"
    ],
    "host": "smtp.postmarkapp.com",
    "port": 2525
  },
  "Proton": {
    "description": "Proton Mail",
    "aliases": [
      "ProtonMail",
      "Proton.me",
      "Protonmail.com",
      "Protonmail.ch"
    ],
    "domains": [
      "proton.me",
      "protonmail.com",
      "pm.me",
      "protonmail.ch"
    ],
    "host": "smtp.protonmail.ch",
    "port": 587,
    "requireTLS": true
  },
  "qiye.aliyun": {
    "description": "Alibaba Mail Enterprise Edition",
    "host": "smtp.mxhichina.com",
    "port": "465",
    "secure": true
  },
  "QQ": {
    "description": "QQ Mail",
    "domains": [
      "qq.com"
    ],
    "host": "smtp.qq.com",
    "port": 465,
    "secure": true
  },
  "QQex": {
    "description": "QQ Enterprise Mail",
    "aliases": [
      "QQ Enterprise"
    ],
    "domains": [
      "exmail.qq.com"
    ],
    "host": "smtp.exmail.qq.com",
    "port": 465,
    "secure": true
  },
  "Resend": {
    "description": "Resend",
    "host": "smtp.resend.com",
    "port": 465,
    "secure": true
  },
  "Runbox": {
    "description": "Runbox (Norwegian email provider)",
    "domains": [
      "runbox.com"
    ],
    "host": "smtp.runbox.com",
    "port": 465,
    "secure": true
  },
  "SendCloud": {
    "description": "SendCloud (Chinese email delivery)",
    "host": "smtp.sendcloud.net",
    "port": 2525
  },
  "SendGrid": {
    "description": "SendGrid",
    "host": "smtp.sendgrid.net",
    "port": 587
  },
  "SendinBlue": {
    "description": "Brevo (formerly Sendinblue)",
    "aliases": [
      "Brevo"
    ],
    "host": "smtp-relay.brevo.com",
    "port": 587
  },
  "SendPulse": {
    "description": "SendPulse",
    "host": "smtp-pulse.com",
    "port": 465,
    "secure": true
  },
  "SES": {
    "description": "AWS SES US East (N. Virginia)",
    "host": "email-smtp.us-east-1.amazonaws.com",
    "port": 465,
    "secure": true
  },
  "SES-AP-NORTHEAST-1": {
    "description": "AWS SES Asia Pacific (Tokyo)",
    "host": "email-smtp.ap-northeast-1.amazonaws.com",
    "port": 465,
    "secure": true
  },
  "SES-AP-NORTHEAST-2": {
    "description": "AWS SES Asia Pacific (Seoul)",
    "host": "email-smtp.ap-northeast-2.amazonaws.com",
    "port": 465,
    "secure": true
  },
  "SES-AP-NORTHEAST-3": {
    "description": "AWS SES Asia Pacific (Osaka)",
    "host": "email-smtp.ap-northeast-3.amazonaws.com",
    "port": 465,
    "secure": true
  },
  "SES-AP-SOUTH-1": {
    "description": "AWS SES Asia Pacific (Mumbai)",
    "host": "email-smtp.ap-south-1.amazonaws.com",
    "port": 465,
    "secure": true
  },
  "SES-AP-SOUTHEAST-1": {
    "description": "AWS SES Asia Pacific (Singapore)",
    "host": "email-smtp.ap-southeast-1.amazonaws.com",
    "port": 465,
    "secure": true
  },
  "SES-AP-SOUTHEAST-2": {
    "description": "AWS SES Asia Pacific (Sydney)",
    "host": "email-smtp.ap-southeast-2.amazonaws.com",
    "port": 465,
    "secure": true
  },
  "SES-CA-CENTRAL-1": {
    "description": "AWS SES Canada (Central)",
    "host": "email-smtp.ca-central-1.amazonaws.com",
    "port": 465,
    "secure": true
  },
  "SES-EU-CENTRAL-1": {
    "description": "AWS SES Europe (Frankfurt)",
    "host": "email-smtp.eu-central-1.amazonaws.com",
    "port": 465,
    "secure": true
  },
  "SES-EU-NORTH-1": {
    "description": "AWS SES Europe (Stockholm)",
    "host": "email-smtp.eu-north-1.amazonaws.com",
    "port": 465,
    "secure": true
  },
  "SES-EU-WEST-1": {
    "description": "AWS SES Europe (Ireland)",
    "host": "email-smtp.eu-west-1.amazonaws.com",
    "port": 465,
    "secure": true
  },
  "SES-EU-WEST-2": {
    "description": "AWS SES Europe (London)",
    "host": "email-smtp.eu-west-2.amazonaws.com",
    "port": 465,
    "secure": true
  },
  "SES-EU-WEST-3": {
    "description": "AWS SES Europe (Paris)",
    "host": "email-smtp.eu-west-3.amazonaws.com",
    "port": 465,
    "secure": true
  },
  "SES-SA-EAST-1": {
    "description": "AWS SES South America (S\xE3o Paulo)",
    "host": "email-smtp.sa-east-1.amazonaws.com",
    "port": 465,
    "secure": true
  },
  "SES-US-EAST-1": {
    "description": "AWS SES US East (N. Virginia)",
    "host": "email-smtp.us-east-1.amazonaws.com",
    "port": 465,
    "secure": true
  },
  "SES-US-EAST-2": {
    "description": "AWS SES US East (Ohio)",
    "host": "email-smtp.us-east-2.amazonaws.com",
    "port": 465,
    "secure": true
  },
  "SES-US-GOV-EAST-1": {
    "description": "AWS SES GovCloud (US-East)",
    "host": "email-smtp.us-gov-east-1.amazonaws.com",
    "port": 465,
    "secure": true
  },
  "SES-US-GOV-WEST-1": {
    "description": "AWS SES GovCloud (US-West)",
    "host": "email-smtp.us-gov-west-1.amazonaws.com",
    "port": 465,
    "secure": true
  },
  "SES-US-WEST-1": {
    "description": "AWS SES US West (N. California)",
    "host": "email-smtp.us-west-1.amazonaws.com",
    "port": 465,
    "secure": true
  },
  "SES-US-WEST-2": {
    "description": "AWS SES US West (Oregon)",
    "host": "email-smtp.us-west-2.amazonaws.com",
    "port": 465,
    "secure": true
  },
  "Seznam": {
    "description": "Seznam Email (Czech email provider)",
    "aliases": [
      "Seznam Email"
    ],
    "domains": [
      "seznam.cz",
      "email.cz",
      "post.cz",
      "spoluzaci.cz"
    ],
    "host": "smtp.seznam.cz",
    "port": 465,
    "secure": true
  },
  "SMTP2GO": {
    "description": "SMTP2GO",
    "host": "mail.smtp2go.com",
    "port": 2525
  },
  "Sparkpost": {
    "description": "SparkPost",
    "aliases": [
      "SparkPost",
      "SparkPost Mail"
    ],
    "domains": [
      "sparkpost.com"
    ],
    "host": "smtp.sparkpostmail.com",
    "port": 587,
    "secure": false
  },
  "Tipimail": {
    "description": "Tipimail (email delivery service)",
    "host": "smtp.tipimail.com",
    "port": 587
  },
  "TurboSMTP": {
    "description": "TurboSMTP",
    "host": "pro.turbo-smtp.com",
    "port": 465,
    "secure": true
  },
  "TurboSMTP-EU": {
    "description": "TurboSMTP (EU region)",
    "host": "pro.eu.turbo-smtp.com",
    "port": 465,
    "secure": true
  },
  "Tutanota": {
    "description": "Tutanota (Tuta Mail)",
    "domains": [
      "tutanota.com",
      "tuta.com",
      "tutanota.de",
      "tuta.io"
    ],
    "host": "smtp.tutanota.com",
    "port": 465,
    "secure": true
  },
  "Yahoo": {
    "description": "Yahoo Mail",
    "domains": [
      "yahoo.com"
    ],
    "host": "smtp.mail.yahoo.com",
    "port": 465,
    "secure": true
  },
  "Yandex": {
    "description": "Yandex Mail",
    "domains": [
      "yandex.ru"
    ],
    "host": "smtp.yandex.ru",
    "port": 465,
    "secure": true
  },
  "Zimbra": {
    "description": "Zimbra Mail Server",
    "aliases": [
      "Zimbra Collaboration"
    ],
    "host": "smtp.zimbra.com",
    "port": 587,
    "requireTLS": true
  },
  "Zoho": {
    "description": "Zoho Mail",
    "host": "smtp.zoho.com",
    "port": 465,
    "secure": true,
    "authMethod": "LOGIN"
  }
};

// node_modules/nodemailer/dist/esm/well-known/index.js
var normalized = {};
Object.keys(services).forEach((key) => {
  const service = services[key];
  const normalizedService = normalizeService(service);
  normalized[normalizeKey(key)] = normalizedService;
  [].concat(service.aliases || []).forEach((alias) => {
    normalized[normalizeKey(alias)] = normalizedService;
  });
  [].concat(service.domains || []).forEach((domain) => {
    normalized[normalizeKey(domain)] = normalizedService;
  });
});
function normalizeKey(key) {
  return key.replace(/[^a-zA-Z0-9.-]/g, "").toLowerCase();
}
function normalizeService(service) {
  const response = {};
  Object.keys(service).forEach((key) => {
    if (!["domains", "aliases"].includes(key)) {
      response[key] = service[key];
    }
  });
  return response;
}

// node_modules/nodemailer/dist/esm/nodemailer.js
var ETHEREAL_API = (process.env.ETHEREAL_API || "https://api.nodemailer.com").replace(/\/+$/, "");
var ETHEREAL_WEB = (process.env.ETHEREAL_WEB || "https://ethereal.email").replace(/\/+$/, "");
var ETHEREAL_API_KEY = (process.env.ETHEREAL_API_KEY || "").replace(/\s*/g, "") || null;
var ETHEREAL_CACHE = ["true", "yes", "y", "1"].includes((process.env.ETHEREAL_CACHE || "yes").toString().trim().toLowerCase());

// serverless-src/admin/_lib/adminAuth.ts
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
var ADMIN_SESSION_COOKIE_NAME = "lavistore_admin_session";
var ADMIN_SESSION_DURATION_MS = 8 * 60 * 60 * 1e3;
var ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
var ADMIN_RECOVERY_DURATION_MS = 15 * 60 * 1e3;
var ADMIN_RECOVERY_MAX_AGE_SECONDS = 15 * 60;
var ADMIN_PASSWORD_SALT_BYTES = 16;
var ADMIN_PASSWORD_KEY_LENGTH = 64;
var cachedApp = null;
var cachedFirestore = null;
function normalizePrivateKey(rawKey) {
  if (!rawKey) return void 0;
  let key = rawKey.trim();
  if (key.startsWith('"') && key.endsWith('"') || key.startsWith("'") && key.endsWith("'")) {
    key = key.slice(1, -1);
  }
  key = key.replace(/\\n/g, "\n");
  return key;
}
function getFirebaseAdminApp() {
  if (cachedApp) {
    return cachedApp;
  }
  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    cachedApp = existingApps[0];
    return cachedApp;
  }
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);
  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }
  try {
    cachedApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey
      }),
      projectId
    });
    return cachedApp;
  } catch (err) {
    console.error("[Firebase Admin] Initialization failure:", err?.message || err);
    return null;
  }
}
function getAdminFirestore() {
  if (cachedFirestore) {
    return cachedFirestore;
  }
  const app = getFirebaseAdminApp();
  if (!app) {
    return null;
  }
  try {
    cachedFirestore = getFirestore(app);
    return cachedFirestore;
  } catch (err) {
    console.error("[Firebase Admin Firestore] Error:", err?.message || err);
    return null;
  }
}
function hashAdminPassword(password) {
  const salt = crypto2.randomBytes(ADMIN_PASSWORD_SALT_BYTES);
  const derivedKey = crypto2.scryptSync(
    password,
    salt,
    ADMIN_PASSWORD_KEY_LENGTH
  );
  return `scrypt:${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}
function verifyAdminPasswordHash(password, storedHash) {
  try {
    const [algorithm, saltHex, hashHex] = storedHash.split(":");
    if (algorithm !== "scrypt" || !saltHex || !hashHex) {
      return false;
    }
    const salt = Buffer.from(saltHex, "hex");
    const storedKey = Buffer.from(hashHex, "hex");
    if (storedKey.length !== ADMIN_PASSWORD_KEY_LENGTH) {
      return false;
    }
    const derivedKey = crypto2.scryptSync(
      password,
      salt,
      ADMIN_PASSWORD_KEY_LENGTH
    );
    return crypto2.timingSafeEqual(storedKey, derivedKey);
  } catch {
    return false;
  }
}
function findServerHashedCredential() {
  const candidateFiles = [
    path.join(process.cwd(), "persistent_data", "admin_persistent_settings.json"),
    path.join(process.cwd(), "persistent_data", "store_state.json"),
    path.join(process.cwd(), "src", "data", "admin_persistent_vault.json")
  ];
  for (const filePath of candidateFiles) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(raw);
        if (typeof data?.adminPasswordHash === "string" && data.adminPasswordHash.startsWith("scrypt:")) {
          return {
            adminPasswordHash: data.adminPasswordHash,
            adminPasswordChanged: Boolean(data.adminPasswordChanged),
            adminPasswordChangedAt: data.adminPasswordChangedAt
          };
        }
      }
    } catch {
    }
  }
  return null;
}
async function getAdminCredential() {
  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const docRef = firestore.collection("private_admin").doc("auth");
      const snap = await docRef.get();
      if (snap.exists) {
        const data = snap.data();
        if (typeof data?.adminPasswordHash === "string" && data.adminPasswordHash.startsWith("scrypt:")) {
          return {
            adminPasswordHash: data.adminPasswordHash,
            adminPasswordChanged: Boolean(data.adminPasswordChanged),
            adminPasswordChangedAt: data.adminPasswordChangedAt
          };
        }
      }
      const existingServerHash = findServerHashedCredential();
      if (existingServerHash) {
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const payloadToMigrate = {
          adminPasswordHash: existingServerHash.adminPasswordHash,
          adminPasswordChanged: existingServerHash.adminPasswordChanged,
          adminPasswordChangedAt: existingServerHash.adminPasswordChangedAt || now,
          updatedAt: now
        };
        await docRef.set(payloadToMigrate, { merge: true });
        return existingServerHash;
      }
    } catch (err) {
      console.error("[Admin Credential] Firestore retrieval error:", err?.message || err);
    }
  } else {
    const existingServerHash = findServerHashedCredential();
    if (existingServerHash) {
      return existingServerHash;
    }
  }
  return null;
}
async function persistNewAdminPassword(newPassword) {
  if (typeof newPassword !== "string" || newPassword.trim().length < 8) {
    return false;
  }
  const passwordHash = hashAdminPassword(newPassword.trim());
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const firestore = getAdminFirestore();
  if (!firestore) {
    console.error("[Admin Password] Firebase Admin Firestore not configured.");
    return false;
  }
  try {
    const docRef = firestore.collection("private_admin").doc("auth");
    await docRef.set(
      {
        adminPasswordHash: passwordHash,
        adminPasswordChanged: true,
        adminPasswordChangedAt: now,
        updatedAt: now
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error("[Admin Password] Firestore persistence failure:", err?.message || err);
    return false;
  }
}
function getAdminSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret || secret.length === 0) {
    return null;
  }
  return secret;
}
function createSignedAdminSession() {
  const secret = getAdminSessionSecret();
  if (!secret) {
    return null;
  }
  const now = Date.now();
  const payload = {
    role: "admin",
    iat: now,
    exp: now + ADMIN_SESSION_DURATION_MS
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto2.createHmac("sha256", secret).update(payloadB64).digest("base64url");
  return `${payloadB64}.${signature}`;
}
function serializeCookie(name2, value, options = {}) {
  const parts = [`${encodeURIComponent(name2)}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path || "/"}`);
  if (options.maxAge !== void 0) {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  if (options.httpOnly !== false) {
    parts.push("HttpOnly");
  }
  const isProduction = process.env.NODE_ENV === "production";
  const secure = options.secure !== void 0 ? options.secure : isProduction;
  if (secure) {
    parts.push("Secure");
  }
  const sameSite = options.sameSite || "lax";
  parts.push(`SameSite=${sameSite.charAt(0).toUpperCase() + sameSite.slice(1)}`);
  return parts.join("; ");
}
function buildSessionCookie(token) {
  return serializeCookie(ADMIN_SESSION_COOKIE_NAME, token, {
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    path: "/"
  });
}
function parseRequestBody(req) {
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return {};
    }
  }
  return typeof body === "object" && body !== null ? body : {};
}
function sendResponse(res, statusCode, data, headers) {
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value);
    }
  }
  if (typeof res.status === "function" && typeof res.json === "function") {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.end(JSON.stringify(data));
}
function setCookies(res, cookies) {
  const existing = res.getHeader("Set-Cookie");
  let current = [];
  if (Array.isArray(existing)) {
    current = [...existing];
  } else if (typeof existing === "string") {
    current = [existing];
  }
  res.setHeader("Set-Cookie", [...current, ...cookies]);
}

// serverless-src/admin/change-password.ts
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", req.headers?.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-Type, Authorization"
  );
  if (req.method === "OPTIONS") {
    return sendResponse(res, 200, { ok: true });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendResponse(res, 405, { success: false, error: `Method ${req.method} Not Allowed` });
  }
  try {
    const body = parseRequestBody(req);
    const currentPassword = body?.currentPassword;
    const newPassword = body?.newPassword;
    if (typeof newPassword !== "string" || newPassword.trim().length < 8) {
      return sendResponse(res, 400, {
        success: false,
        error: "A nova senha deve ter no m\xEDnimo 8 caracteres."
      });
    }
    if (typeof currentPassword !== "string" || !currentPassword.trim()) {
      return sendResponse(res, 400, {
        success: false,
        error: "Senha atual \xE9 obrigat\xF3ria."
      });
    }
    const credential = await getAdminCredential();
    if (!credential || !credential.adminPasswordHash) {
      return sendResponse(res, 401, {
        success: false,
        error: "A senha atual informada est\xE1 incorreta."
      });
    }
    const isValidCurrent = verifyAdminPasswordHash(
      currentPassword.trim(),
      credential.adminPasswordHash
    );
    if (!isValidCurrent) {
      return sendResponse(res, 401, {
        success: false,
        error: "A senha atual informada est\xE1 incorreta."
      });
    }
    const saved = await persistNewAdminPassword(newPassword.trim());
    if (!saved) {
      return sendResponse(res, 500, {
        success: false,
        error: "Falha ao salvar a nova senha no banco de dados."
      });
    }
    const sessionToken = createSignedAdminSession();
    if (sessionToken) {
      setCookies(res, [buildSessionCookie(sessionToken)]);
    }
    return sendResponse(res, 200, {
      success: true,
      message: "Senha de ger\xEAncia alterada com sucesso!"
    });
  } catch (err) {
    console.error("[Admin Change Password] Error:", err?.message || err);
    return sendResponse(res, 500, {
      success: false,
      error: "Falha ao alterar senha de ger\xEAncia."
    });
  }
}
export {
  handler as default
};
