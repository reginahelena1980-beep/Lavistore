import { createRequire } from 'module'; const require = createRequire(import.meta.url);

// serverless-src/shipping/_lib/melhorEnvio.ts
var DEFAULT_ORIGIN_CEP = "01001000";
var DEFAULT_SUPPORT_EMAIL = "estilobeeadm@gmail.com";
var PRODUCTION_BASE_URL = "https://melhorenvio.com.br";
var SANDBOX_BASE_URL = "https://sandbox.melhorenvio.com.br";
function getShippingEnvironment() {
  const envRaw = (process.env.MELHOR_ENVIO_ENV || "production").trim().toLowerCase();
  const env = envRaw === "sandbox" ? "sandbox" : "production";
  const defaultBase = env === "sandbox" ? SANDBOX_BASE_URL : PRODUCTION_BASE_URL;
  const baseUrl = (process.env.MELHOR_ENVIO_BASE_URL || defaultBase).trim().replace(/\/+$/, "");
  const rawFromCep = process.env.MELHOR_ENVIO_FROM_CEP || DEFAULT_ORIGIN_CEP;
  const fromCep = sanitizeCep(rawFromCep) || DEFAULT_ORIGIN_CEP;
  const email = (process.env.MELHOR_ENVIO_EMAIL || DEFAULT_SUPPORT_EMAIL).trim();
  const userAgent = `Lavistore Kids (${email})`;
  const token = getMelhorEnvioToken();
  const isConfigured = Boolean(token && token.length > 10);
  return {
    isConfigured,
    env,
    baseUrl,
    fromCep,
    userAgent
  };
}
function getMelhorEnvioToken() {
  const token = process.env.MELHOR_ENVIO_TOKEN;
  if (!token || typeof token !== "string") {
    return "";
  }
  return token.trim();
}
function sanitizeCep(raw) {
  if (typeof raw !== "string" && typeof raw !== "number") {
    return null;
  }
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length !== 8) {
    return null;
  }
  return digits;
}
function applyCorsHeaders(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", req.headers?.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-Type, Date"
  );
}
function sendResponse(res, statusCode, data) {
  if (typeof res.status === "function" && typeof res.json === "function") {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.end(JSON.stringify(data));
}

// serverless-src/shipping/config.ts
async function handler(req, res) {
  applyCorsHeaders(req, res);
  if (req.method === "OPTIONS") {
    return sendResponse(res, 200, { ok: true });
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return sendResponse(res, 405, {
      success: false,
      error: `Method ${req.method} Not Allowed`
    });
  }
  try {
    const { isConfigured, env } = getShippingEnvironment();
    return sendResponse(res, 200, {
      success: true,
      configured: isConfigured,
      env
    });
  } catch {
    return sendResponse(res, 500, {
      success: false,
      configured: false
    });
  }
}
export {
  handler as default
};
