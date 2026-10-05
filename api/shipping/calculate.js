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
function sanitizeProducts(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [
      {
        id: "default-package",
        width: 16,
        height: 8,
        length: 22,
        weight: 0.5,
        insurance_value: 50,
        quantity: 1
      }
    ];
  }
  return raw.map((item, idx) => {
    const width = Math.max(11, Number(item?.width) || 16);
    const height = Math.max(2, Number(item?.height) || 6);
    const length = Math.max(16, Number(item?.length) || 20);
    const weight = Math.max(0.1, Number(item?.weight) || 0.35);
    const insurance_value = Math.max(1, Number(item?.price ?? item?.insurance_value) || 29.9);
    const quantity = Math.max(1, Math.floor(Number(item?.quantity) || 1));
    return {
      id: String(item?.id || `item-${idx + 1}`),
      width,
      height,
      length,
      weight,
      insurance_value,
      quantity
    };
  });
}
async function calculateMelhorEnvioShipment(fromPostalCode, toPostalCode, products) {
  const token = getMelhorEnvioToken();
  if (!token || token.length <= 10) {
    throw new Error("Melhor Envio token is not configured on the server.");
  }
  const { baseUrl, userAgent } = getShippingEnvironment();
  const url = `${baseUrl}/api/v2/me/shipment/calculate`;
  const payload = {
    from: { postal_code: fromPostalCode },
    to: { postal_code: toPostalCode },
    products,
    options: {
      receipt: false,
      own_hand: false,
      reverse: false,
      non_commercial: false
    }
  };
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "User-Agent": userAgent,
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    let errorSummary = `HTTP ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson && typeof errorJson === "object") {
        errorSummary = errorJson.message || errorJson.error || errorSummary;
      }
    } catch {
    }
    const cleanError = String(errorSummary).replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "[REDACTED]");
    throw new Error(`Melhor Envio API calculation failed: ${cleanError}`);
  }
  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("Unexpected response format from Melhor Envio API.");
  }
  return formatMelhorEnvioOptions(data);
}
function formatMelhorEnvioOptions(data) {
  return data.filter((item) => item && !item.error && (item.custom_price || item.price)).map((item) => {
    const rawPrice = parseFloat(item.custom_price || item.price);
    const deliveryDays = Number(item.custom_delivery_time || item.delivery_time) || 5;
    const carrierName = item.company?.name || (item.name?.toLowerCase().includes("jadlog") ? "Jadlog" : "Correios");
    return {
      id: String(item.id),
      name: `${carrierName} ${item.name}`,
      price: Math.round(rawPrice * 100) / 100,
      originalPrice: Math.round(rawPrice * 100) / 100,
      deadline: `${deliveryDays} dias \xFAteis`,
      deliveryDays,
      carrier: carrierName,
      carrierLogo: item.company?.picture,
      companyName: carrierName
    };
  });
}
function calculateFallbackShipping(toPostalCode, fromPostalCode, products) {
  const cleanToCep = sanitizeCep(toPostalCode) || "01001000";
  const cleanFromCep = sanitizeCep(fromPostalCode) || DEFAULT_ORIGIN_CEP;
  const firstDigit = parseInt(cleanToCep[0], 10) || 0;
  const totalWeightKg = products.reduce(
    (acc, p) => acc + p.weight * p.quantity,
    0
  );
  const weightFactor = Math.min(1.8, Math.max(1, 1 + (totalWeightKg - 0.3) * 0.2));
  const regionMultipliers = {
    0: { pacBase: 12.9, sedexBase: 19.9, jadlogBase: 11.5, daysOffset: 1 },
    // SP Capital
    1: { pacBase: 14.5, sedexBase: 22.9, jadlogBase: 13.9, daysOffset: 2 },
    // SP Interior
    2: { pacBase: 18.9, sedexBase: 28.9, jadlogBase: 17.5, daysOffset: 3 },
    // RJ / ES
    3: { pacBase: 19.5, sedexBase: 29.9, jadlogBase: 18.2, daysOffset: 3 },
    // MG
    4: { pacBase: 24.9, sedexBase: 38.5, jadlogBase: 23.9, daysOffset: 5 },
    // BA / SE
    5: { pacBase: 27.9, sedexBase: 42, jadlogBase: 26.5, daysOffset: 6 },
    // Nordeste
    6: { pacBase: 32.9, sedexBase: 49.9, jadlogBase: 31, daysOffset: 7 },
    // Norte / Nordeste
    7: { pacBase: 22.5, sedexBase: 34.9, jadlogBase: 21, daysOffset: 4 },
    // Centro-Oeste
    8: { pacBase: 19.9, sedexBase: 31.5, jadlogBase: 18.9, daysOffset: 3 },
    // PR / SC
    9: { pacBase: 22.9, sedexBase: 35.9, jadlogBase: 21.5, daysOffset: 4 }
    // RS
  };
  const config = regionMultipliers[firstDigit] || {
    pacBase: 21,
    sedexBase: 32,
    jadlogBase: 19.5,
    daysOffset: 4
  };
  const simulatedOptions = [
    {
      id: "melhor-envio-correios-pac",
      name: "Correios PAC",
      carrier: "Correios",
      price: Math.round(config.pacBase * weightFactor * 100) / 100,
      originalPrice: Math.round(config.pacBase * weightFactor * 100) / 100,
      deadline: `${Math.max(2, 2 + config.daysOffset)} a ${Math.max(4, 4 + config.daysOffset)} dias \xFAteis`,
      deliveryDays: 3 + config.daysOffset,
      carrierLogo: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=80&q=80",
      companyName: "Correios"
    },
    {
      id: "melhor-envio-jadlog-package",
      name: "Jadlog .Package",
      carrier: "Jadlog",
      price: Math.round(config.jadlogBase * weightFactor * 100) / 100,
      originalPrice: Math.round(config.jadlogBase * weightFactor * 100) / 100,
      deadline: `${Math.max(2, 1 + config.daysOffset)} a ${Math.max(3, 3 + config.daysOffset)} dias \xFAteis`,
      deliveryDays: 2 + config.daysOffset,
      companyName: "Jadlog"
    },
    {
      id: "melhor-envio-correios-sedex",
      name: "Correios SEDEX Expresso",
      carrier: "Correios",
      price: Math.round(config.sedexBase * weightFactor * 100) / 100,
      originalPrice: Math.round(config.sedexBase * weightFactor * 100) / 100,
      deadline: `${Math.max(1, config.daysOffset > 3 ? 2 : 1)} a ${Math.max(2, config.daysOffset > 3 ? 3 : 2)} dias \xFAteis`,
      deliveryDays: 1 + Math.min(2, Math.floor(config.daysOffset / 2)),
      carrierLogo: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=80&q=80",
      companyName: "Correios"
    },
    {
      id: "melhor-envio-jadlog-com",
      name: "Jadlog .Com Priorit\xE1rio",
      carrier: "Jadlog",
      price: Math.round(config.jadlogBase * 1.3 * weightFactor * 100) / 100,
      originalPrice: Math.round(config.jadlogBase * 1.3 * weightFactor * 100) / 100,
      deadline: `${Math.max(1, config.daysOffset > 3 ? 2 : 1)} a ${Math.max(2, config.daysOffset > 3 ? 3 : 2)} dias \xFAteis`,
      deliveryDays: 1 + Math.min(2, Math.floor(config.daysOffset / 2)),
      companyName: "Jadlog"
    }
  ];
  return {
    options: simulatedOptions,
    fromPostalCode: cleanFromCep,
    toPostalCode: cleanToCep,
    isSimulated: true,
    source: "fallback_simulator",
    message: "Cota\xE7\xE3o calculada para este CEP."
  };
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

// serverless-src/shipping/calculate.ts
async function handler(req, res) {
  applyCorsHeaders(req, res);
  if (req.method === "OPTIONS") {
    return sendResponse(res, 200, { ok: true });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return sendResponse(res, 405, {
      success: false,
      error: `Method ${req.method} Not Allowed`
    });
  }
  try {
    const body = parseRequestBody(req);
    const { toPostalCode, products, fromPostalCode } = body;
    const cleanToCep = sanitizeCep(toPostalCode);
    if (!cleanToCep) {
      return sendResponse(res, 400, {
        error: "CEP de destino inv\xE1lido. Deve conter 8 d\xEDgitos num\xE9ricos."
      });
    }
    const formattedProducts = sanitizeProducts(products);
    const { isConfigured, fromCep } = getShippingEnvironment();
    const cleanFromCep = sanitizeCep(fromPostalCode) || fromCep;
    if (isConfigured) {
      try {
        const liveOptions = await calculateMelhorEnvioShipment(
          cleanFromCep,
          cleanToCep,
          formattedProducts
        );
        if (Array.isArray(liveOptions) && liveOptions.length > 0) {
          return sendResponse(res, 200, {
            options: liveOptions,
            fromPostalCode: cleanFromCep,
            toPostalCode: cleanToCep,
            isSimulated: false,
            source: "melhor_envio_api"
          });
        }
      } catch (callError) {
        const sanitizedMsg = String(callError?.message || "").replace(/Bearer\s+[^\s]+/gi, "[REDACTED]").replace(/[a-zA-Z0-9_\-]{30,}/g, "[REDACTED]");
        console.warn("[Melhor Envio Serverless] Quotation notice:", sanitizedMsg);
      }
    }
    const fallback = calculateFallbackShipping(
      cleanToCep,
      cleanFromCep,
      formattedProducts
    );
    return sendResponse(res, 200, fallback);
  } catch (error) {
    const sanitizedError = String(error?.message || "Erro interno ao processar cota\xE7\xE3o").replace(/Bearer\s+[^\s]+/gi, "[REDACTED]");
    return sendResponse(res, 500, {
      error: "Falha ao processar o c\xE1lculo de frete.",
      details: sanitizedError
    });
  }
}
export {
  handler as default
};
