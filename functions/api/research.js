const DEFAULT_TIMEOUT_MS = 900000;

export async function onRequestPost(context) {
  const { request, env } = context;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, code: "invalid_json", message: "Request body must be JSON." }, 400);
  }

  const validationError = validatePayload(payload);
  if (validationError) {
    return json({ ok: false, code: "invalid_payload", message: validationError }, 400);
  }

  if (shouldUseShippingRateTool(payload)) {
    return json({
      ok: true,
      report: await runShippingRateTool(payload, env),
      diagnostics: {
        tool: "shipping_rate_quote",
        mode: "internal_tool",
        provider: "envia_rate_only",
      },
    });
  }

  if (shouldUseProfitabilityTool(payload)) {
    return json({
      ok: true,
      report: await runProfitabilityTool(payload, env),
      diagnostics: {
        tool: "unit_economics_filter",
        mode: "internal_tool",
      },
    });
  }

  if (env.APP_PASSWORD && request.headers.get("x-app-password") !== env.APP_PASSWORD) {
    return json(
      {
        ok: false,
        code: "forbidden",
        message: "Clave de acceso incorrecta.",
      },
      403,
    );
  }

  if (!env.HARNESS_URL || !env.HARNESS_TOKEN) {
    return json(
      {
        ok: false,
        code: "harness_not_configured",
        message: "Cloudflare backend is live, but HARNESS_URL/HARNESS_TOKEN are not configured.",
      },
      503,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(env.HARNESS_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS);

  try {
    const upstream = await fetch(new URL("/research", env.HARNESS_URL).toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.HARNESS_TOKEN}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await upstream.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { ok: false, code: "invalid_harness_response", raw: text.slice(0, 1000) };
    }

    return json(body, upstream.status);
  } catch (error) {
    const timedOut = error && error.name === "AbortError";
    return json(
      {
        ok: false,
        code: timedOut ? "harness_timeout" : "harness_unreachable",
        message: timedOut ? "The research harness took too long." : "Could not reach the private research harness.",
      },
      timedOut ? 504 : 502,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function onRequestGet() {
  return json({ ok: true, service: "alibaba-sourcing-cloudflare-proxy" });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") return "Missing payload.";
  if (!stringField(payload.naturalRequest, 3000)) return "Missing or invalid request.";
  if (payload.product && !stringField(payload.product, 500)) return "Invalid product.";
  if (payload.productDetails && !stringField(payload.productDetails, 2000)) return "Invalid product details.";
  if (payload.goals && !Array.isArray(payload.goals)) return "Invalid goals.";
  if (payload.destination && typeof payload.destination !== "string") return "Invalid destination.";
  return "";
}

function stringField(value, maxLength) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function payloadText(payload) {
  return `${payload.naturalRequest || ""} ${payload.reference || ""} ${payload.problem || ""} ${payload.product || ""} ${payload.productDetails || ""}`;
}

function shouldUseProfitabilityTool(payload) {
  const text = payloadText(payload).toLowerCase();
  const intentPattern =
    /rentab|margen|ganancia|utilidad|dejar dinero|deja dinero|unit economics|economics|break ?even|roas|cac|costo|costos|precio|env[ií]o|shipping|devoluciones|returns|recompra|pagar por cliente|conseguir cliente/;
  return intentPattern.test(text);
}

function shouldUseShippingRateTool(payload) {
  const text = payloadText(payload).toLowerCase();
  const shippingIntent =
    /cotiz|tarifa|paqueter[ií]a|env[ií]o|enviar|paquete|ship|shipping|cp origen|cp destino|c[oó]digo postal|codigo postal/.test(text);
  const economicsIntent =
    /rentab|margen|ganancia|utilidad|dejar dinero|deja dinero|unit economics|break ?even|roas|cac|costo del producto|costo producto|devoluciones|returns|recompra|precio de venta|venta promedio/.test(text);
  return shippingIntent && !economicsIntent;
}

async function runShippingRateTool(payload, env) {
  const text = payloadText(payload);
  const currency = inferCurrency(text, payload.market);
  const defaults = defaultProfitabilityAssumptions(text, currency);
  const declaredValue =
    extractMoneyNear(text, ["valor declarado", "valor del paquete", "valor producto", "producto vale", "asegurar"]) ||
    defaults.aov;
  const shippingQuote = await resolveShippingCost({
    payload: {
      ...payload,
      market: currency === "MXN" ? "MX" : payload.market,
    },
    text,
    currency,
    defaults,
    extracted: {},
    env,
    aov: declaredValue,
  });
  const profile = shippingQuote.profile || {};
  const route = {
    originZip: profile.originZip || "",
    originCity: profile.originCity || "",
    originState: profile.originState || "",
    destinationZip: profile.destinationZip || "",
    destinationCity: profile.destinationCity || "",
    destinationState: profile.destinationState || "",
  };
  const packageInfo = {
    weightKg: round((profile.weightOz || 0) / 35.274, 3),
    lengthCm: round((profile.lengthIn || 0) * 2.54, 1),
    widthCm: round((profile.widthIn || 0) * 2.54, 1),
    heightCm: round((profile.heightIn || 0) * 2.54, 1),
    assumedWeight: Boolean(profile.assumedWeight),
    assumedDimensions: Boolean(profile.assumedDimensions),
  };
  const live = isLiveShippingQuote(shippingQuote);
  const warnings = [];

  if (!live && shippingQuote.mode !== "user_provided") {
    if (shippingQuote.mode === "estimated_no_envia_token") {
      warnings.push("Aún no hay ENVIA_TOKEN en Cloudflare; el resultado queda marcado como estimación.");
    } else if (shippingQuote.mode === "estimated_after_envia_error") {
      warnings.push("Envia.com respondió con error; revisa token/carriers y mientras tanto el resultado queda marcado como estimación.");
    } else {
      warnings.push(
        currency === "MXN"
          ? "Faltan datos para cotizar con Envia.com; el resultado queda marcado como estimación."
          : "Aún no hay API key de cotización o faltan datos; el resultado queda marcado como estimación.",
      );
    }
  }
  if (shippingQuote.missingFields?.length) {
    warnings.push(`Para una cotización más precisa falta: ${shippingQuote.missingFields.join(", ")}.`);
  }
  if (packageInfo.assumedDimensions) {
    warnings.push("Las medidas del paquete fueron asumidas; si la caja es más grande, puede subir por peso volumétrico.");
  }

  return {
    type: "shipping_quote",
    toolUsed: "shipping_rate_quote",
    provider: currency === "MXN" ? "Envia.com rate quote" : "EasyPost rate quote",
    rateOnly: true,
    problem: payload.problem,
    reference: payload.reference,
    market: currency === "MXN" ? "MX" : payload.market || "US",
    createdAt: new Date().toLocaleString("es-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    shippingQuote,
    route,
    package: packageInfo,
    warnings,
    nextSteps: buildShippingQuoteSteps(shippingQuote, currency),
  };
}

async function runProfitabilityTool(payload, env) {
  const text = payloadText(payload);
  const currency = inferCurrency(text, payload.market);
  const defaults = defaultProfitabilityAssumptions(text, currency);
  const extracted = extractProfitabilityNumbers(text);
  const feesPercent = extracted.feesPercent ?? 3.2;
  const feesFixed = extracted.feesFixed ?? (currency === "MXN" ? 6 : 0.3);
  const targetNetMargin = extracted.targetNetMargin ?? 15;
  const aov = extracted.aov ?? defaults.aov;
  const cogs = extracted.cogs ?? defaults.cogs;
  const shippingQuote = await resolveShippingCost({ payload, text, currency, defaults, extracted, env, aov });
  const shipping = shippingQuote.amount;
  const returnRate = extracted.returnRate ?? defaults.returnRate;
  const returnLoss = extracted.returnLoss ?? cogs + shipping + (aov * (feesPercent / 100) + feesFixed);
  const fees = aov * (feesPercent / 100) + feesFixed;
  const returnsReserve = (returnRate / 100) * returnLoss;
  const variableCosts = cogs + shipping + fees + returnsReserve;
  const contribution = aov - variableCosts;
  const margin = aov > 0 ? contribution / aov : 0;
  const targetProfit = aov * (targetNetMargin / 100);
  const cacMax = Math.max(0, contribution);
  const cacTarget = Math.max(0, contribution - targetProfit);
  const breakEvenRoas = cacMax > 0 ? aov / cacMax : Infinity;
  const targetRoas = cacTarget > 0 ? aov / cacTarget : Infinity;
  const repurchaseMultiplier = extracted.repurchaseMultiplier ?? defaults.repurchaseMultiplier;
  const ltvContribution = Math.max(0, contribution * repurchaseMultiplier);

  const profitability = {
    ideaName: cleanIdeaName(payload.reference, payload.problem),
    currency,
    aov,
    cogs,
    shipping,
    feesPercent,
    feesFixed,
    fees,
    returnRate,
    returnLoss,
    returnsReserve,
    variableCosts,
    contribution,
    margin,
    targetNetMargin,
    targetProfit,
    cacMax,
    cacTarget,
    breakEvenRoas,
    targetRoas,
    repurchaseMultiplier,
    ltvContribution,
    differentiation: extracted.differentiation ?? defaults.differentiation,
    channel: extracted.channel ?? defaults.channel,
    shippingQuote,
    assumptions: buildAssumptionNotes({
      extracted,
      defaults,
      currency,
      feesPercent,
      feesFixed,
      targetNetMargin,
      shippingQuote,
    }),
  };
  const score = calculateProfitabilityScore(profitability);
  const verdict = getProfitabilityVerdict(profitability, score);

  return {
    type: "profitability",
    toolUsed: "unit_economics_filter",
    problem: payload.problem,
    reference: payload.reference,
    market: payload.market || "US",
    createdAt: new Date().toLocaleString("es-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    profitability,
    score,
    verdict,
    risks: buildProfitabilityRisks(profitability),
    steps: buildProfitabilitySteps(profitability, verdict),
  };
}

function inferCurrency(text, market) {
  const value = text.toLowerCase();
  if (
    market === "MX" ||
    /\b(mxn|pesos?|méxico|mexico|cp origen|cp destino|c[oó]digo postal|codigo postal|jalisco|zacatecas|zapopan|guadalajara|monterrey|cdmx|edomex|quer[eé]taro|puebla|tijuana|m[eé]rida|merida)\b/.test(value)
  ) {
    return "MXN";
  }
  return "USD";
}

function defaultProfitabilityAssumptions(text, currency) {
  const value = text.toLowerCase();
  const multiply = currency === "MXN" ? 18 : 1;
  const defaults = {
    aov: 55,
    cogs: 16,
    shipping: 8,
    returnRate: 10,
    repurchaseMultiplier: 1.15,
    differentiation: "weak",
    channel: "meta",
    category: "producto ecommerce",
    package: { weightOz: 16, lengthIn: 8, widthIn: 6, heightIn: 3 },
  };

  if (/skin|skincare|piel|beauty|belleza|serum|jolie/.test(value)) {
    Object.assign(defaults, {
      aov: 68,
      cogs: 16,
      shipping: 8.5,
      returnRate: 8,
      repurchaseMultiplier: 1.35,
      differentiation: "clear",
      channel: "meta",
      category: "skincare",
      package: { weightOz: 12, lengthIn: 7, widthIn: 5, heightIn: 3 },
    });
  } else if (/suplement|protein|prote[ií]na|vitamin|magnesium|creatina|collagen|col[aá]geno/.test(value)) {
    Object.assign(defaults, {
      aov: 58,
      cogs: 14,
      shipping: 7.5,
      returnRate: 7,
      repurchaseMultiplier: 1.7,
      differentiation: "weak",
      channel: "meta",
      category: "suplementos",
      package: { weightOz: 20, lengthIn: 6, widthIn: 5, heightIn: 5 },
    });
  } else if (/filter|water|agua|ducha|shower|hard/.test(value)) {
    Object.assign(defaults, {
      aov: 84,
      cogs: 22,
      shipping: 10,
      returnRate: 10,
      repurchaseMultiplier: 1.15,
      differentiation: "clear",
      channel: "tiktok-organic",
      category: "filtro de ducha",
      package: { weightOz: 28, lengthIn: 9, widthIn: 6, heightIn: 4 },
    });
  } else if (/gadget|viral|tiktok shop|accesorio/.test(value)) {
    Object.assign(defaults, {
      aov: 29,
      cogs: 9,
      shipping: 6.5,
      returnRate: 12,
      repurchaseMultiplier: 1,
      differentiation: "weak",
      channel: "tiktok-paid",
      category: "gadget viral",
      package: { weightOz: 8, lengthIn: 6, widthIn: 4, heightIn: 2 },
    });
  } else if (/ropa|apparel|fashion|moda|leggings|camiseta|shirt/.test(value)) {
    Object.assign(defaults, {
      aov: 64,
      cogs: 18,
      shipping: 8,
      returnRate: 18,
      repurchaseMultiplier: 1.15,
      differentiation: "weak",
      channel: "influencers",
      category: "moda",
      package: { weightOz: 14, lengthIn: 12, widthIn: 10, heightIn: 2 },
    });
  }

  if (currency === "MXN") {
    defaults.aov = Math.round(defaults.aov * multiply);
    defaults.cogs = Math.round(defaults.cogs * multiply);
    defaults.shipping = Math.round(defaults.shipping * multiply);
  }

  return defaults;
}

async function resolveShippingCost({ payload, text, currency, defaults, extracted, env, aov }) {
  const profile = extractShippingProfile(text, payload.market, env, defaults, aov);
  if (extracted.shipping != null) {
    return {
      mode: "user_provided",
      amount: extracted.shipping,
      currency,
      profile,
      notes: ["Usé el envío escrito por el usuario."],
      missingFields: [],
      rates: [],
    };
  }

  const estimate = estimateShippingCost(profile, defaults, currency);
  if (currency === "MXN") {
    if (!env.ENVIA_TOKEN) {
      return {
        mode: "estimated_no_envia_token",
        amount: estimate.amount,
        currency,
        profile,
        notes: [
          estimate.note,
          "Para cotizar paqueterías mexicanas en vivo configura ENVIA_TOKEN en Cloudflare.",
        ],
        missingFields: profile.missingFields,
        rates: [],
      };
    }

    if (!canQuoteEnviaMexico(profile)) {
      return {
        mode: "estimated_missing_mx_details",
        amount: estimate.amount,
        currency,
        profile,
        notes: [
          estimate.note,
          `Para cotizar en México necesito: ${profile.missingFields.join(", ")}.`,
        ],
        missingFields: profile.missingFields,
        rates: [],
      };
    }

    const live = await quoteEnviaMexicoRates(profile, env);
    if (!live.ok) {
      return {
        mode: "estimated_after_envia_error",
        amount: estimate.amount,
        currency,
        profile,
        notes: [
          estimate.note,
          `Intenté cotizar con Envia.com pero falló: ${live.message}`,
        ],
        missingFields: profile.missingFields,
        rates: [],
      };
    }

    return {
      mode: "live_envia_mx",
      amount: live.selected.amount,
      currency: live.selected.currency,
      carrier: live.selected.carrier,
      service: live.selected.service,
      deliveryDays: live.selected.deliveryDays,
      deliveryEstimate: live.selected.deliveryEstimate,
      profile,
      notes: [`Cotización en vivo México: ${live.selected.carrier} ${live.selected.service}.`],
      missingFields: [],
      rates: live.rates,
    };
  }

  if (!env.EASYPOST_API_KEY) {
    return {
      mode: "estimated_no_api_key",
      amount: estimate.amount,
      currency,
      profile,
      notes: [estimate.note, "Para cotizar carriers en vivo configura EASYPOST_API_KEY en Cloudflare."],
      missingFields: profile.missingFields,
      rates: [],
    };
  }

  if (currency !== "USD") {
    return {
      mode: "estimated_unsupported_currency",
      amount: estimate.amount,
      currency,
      profile,
      notes: [
        estimate.note,
        "La cotización automática actual está preparada para envíos domésticos en USD; usé estimado para este mercado.",
      ],
      missingFields: profile.missingFields,
      rates: [],
    };
  }

  if (!canQuoteEasyPost(profile)) {
    return {
      mode: "estimated_missing_details",
      amount: estimate.amount,
      currency,
      profile,
      notes: [
        estimate.note,
        `Para cotizar en vivo necesito: ${profile.missingFields.join(", ")}.`,
      ],
      missingFields: profile.missingFields,
      rates: [],
    };
  }

  const live = await quoteEasyPostRates(profile, env.EASYPOST_API_KEY);
  if (!live.ok) {
    return {
      mode: "estimated_after_quote_error",
      amount: estimate.amount,
      currency,
      profile,
      notes: [
        estimate.note,
        `Intenté cotizar con EasyPost pero falló: ${live.message}`,
      ],
      missingFields: profile.missingFields,
      rates: [],
    };
  }

  return {
    mode: "live_easypost",
    amount: live.selected.amount,
    currency: live.selected.currency,
    carrier: live.selected.carrier,
    service: live.selected.service,
    deliveryDays: live.selected.deliveryDays,
    profile,
    notes: [`Cotización en vivo: ${live.selected.carrier} ${live.selected.service}.`],
    missingFields: [],
    rates: live.rates,
  };
}

function extractShippingProfile(text, market, env, defaults, declaredValue) {
  const postalCodes = extractPostalCodes(text);
  const labeledOriginZip = extractZipNear(text, ["origen", "desde", "sale de", "bodega", "warehouse", "from", "zip origen", "cp origen"]);
  const labeledDestinationZip = extractZipNear(text, ["destino", "hacia", "cliente", "enviar a", "ship to", "to", "zip destino", "cp destino"]);
  const originZip =
    labeledOriginZip ||
    env.SHIP_FROM_ZIP ||
    postalCodes.find((zip) => zip !== labeledDestinationZip) ||
    "";
  const destinationZip =
    labeledDestinationZip ||
    postalCodes.find((zip) => zip !== originZip) ||
    "";
  const dimensions = extractDimensions(text) || {};
  const originLocation = inferMexicoLocation(originZip);
  const destinationLocation = inferMexicoLocation(destinationZip);
  const profile = {
    country: market === "MX" ? "MX" : "US",
    originZip,
    destinationZip,
    originState: env.SHIP_FROM_STATE || originLocation.state || "",
    originCity: env.SHIP_FROM_CITY || originLocation.city || "",
    originStreet: env.SHIP_FROM_STREET || "Warehouse",
    originName: env.SHIP_FROM_NAME || "Agent Genia",
    originPhone: env.SHIP_FROM_PHONE || "+52 5555555555",
    originEmail: env.SHIP_FROM_EMAIL || "shipping@example.com",
    destinationState: extractStateNear(text, ["estado destino", "destino estado", "estado cliente"]) || destinationLocation.state || "",
    destinationCity: extractTextNear(text, ["ciudad destino", "destino ciudad", "ciudad cliente"]) || destinationLocation.city || "",
    destinationStreet: extractTextNear(text, ["calle destino", "direccion destino", "dirección destino"]) || "Direccion pendiente",
    declaredValue: Number.isFinite(declaredValue) && declaredValue > 0 ? declaredValue : 1000,
    weightOz: extractWeightOz(text) || defaults.package.weightOz,
    lengthIn: dimensions.lengthIn || defaults.package.lengthIn,
    widthIn: dimensions.widthIn || defaults.package.widthIn,
    heightIn: dimensions.heightIn || defaults.package.heightIn,
    assumedWeight: !extractWeightOz(text),
    assumedDimensions: !dimensions.lengthIn,
  };

  profile.missingFields = [];
  if (!profile.originZip) profile.missingFields.push("zip/código postal de origen");
  if (!profile.destinationZip) profile.missingFields.push("zip/código postal del cliente");
  if (profile.country === "MX" && !profile.originState) profile.missingFields.push("estado de origen");
  if (profile.country === "MX" && !profile.destinationState) profile.missingFields.push("estado destino");
  if (profile.assumedWeight) profile.missingFields.push("peso del paquete");
  if (profile.assumedDimensions) profile.missingFields.push("largo x ancho x alto del paquete");
  return profile;
}

function extractPostalCodes(text) {
  return [...new Set((text.match(/\b\d{5}\b/g) || []).filter((zip) => Number(zip.slice(0, 2)) <= 99))];
}

function extractZipNear(text, labels) {
  for (const label of labels) {
    const forward = new RegExp(`${escapeRegExp(label)}[^0-9]{0,35}(\\d{5}(?:-\\d{4})?)`, "i");
    const backward = new RegExp(`(\\d{5}(?:-\\d{4})?)[^a-z0-9]{0,35}${escapeRegExp(label)}`, "i");
    const match = text.match(forward) || text.match(backward);
    if (match) return match[1];
  }
  return "";
}

function extractTextNear(text, labels) {
  for (const label of labels) {
    const match = text.match(new RegExp(`${escapeRegExp(label)}\\s*[:=-]?\\s*([a-záéíóúñ\\s.]{2,35})`, "i"));
    if (match) return match[1].replace(/\s+/g, " ").trim().replace(/[.,;]+$/, "");
  }
  return "";
}

function extractStateNear(text, labels) {
  const states = {
    aguascalientes: "AG",
    "baja california": "BC",
    "baja california sur": "BS",
    campeche: "CM",
    chiapas: "CS",
    chihuahua: "CH",
    cdmx: "CX",
    "ciudad de mexico": "CX",
    "ciudad de méxico": "CX",
    coahuila: "CO",
    colima: "CL",
    durango: "DG",
    guanajuato: "GT",
    guerrero: "GR",
    hidalgo: "HG",
    jalisco: "JA",
    "estado de mexico": "EM",
    "estado de méxico": "EM",
    edomex: "EM",
    michoacan: "MI",
    michoacán: "MI",
    morelos: "MO",
    nayarit: "NA",
    "nuevo leon": "NL",
    "nuevo león": "NL",
    oaxaca: "OA",
    puebla: "PU",
    queretaro: "QT",
    querétaro: "QT",
    "quintana roo": "QR",
    "san luis potosi": "SL",
    "san luis potosí": "SL",
    sinaloa: "SI",
    sonora: "SO",
    tabasco: "TB",
    tamaulipas: "TM",
    tlaxcala: "TL",
    veracruz: "VE",
    yucatan: "YU",
    yucatán: "YU",
    zacatecas: "ZA",
  };
  const value = extractTextNear(text, labels).toLowerCase();
  if (!value) return "";
  const code = value.match(/\b[A-Z]{2}\b/i)?.[0]?.toUpperCase();
  if (code) return code;
  return states[value] || "";
}

function extractWeightOz(text) {
  const match =
    text.match(/(?:peso del paquete|peso paquete|weight|paquete pesa|pesa|\bpeso\b)\D{0,20}([0-9]+(?:[.,][0-9]+)?)\s*(oz|onza|onzas|lb|lbs|libra|libras|kg|kilo|kilos|g|gr|gramos?)\b/i) ||
    text.match(/\b([0-9]+(?:[.,][0-9]+)?)\s*(kg|kilo|kilos|g|gr|gramos?|lb|lbs|oz|onzas?)\b/i);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  const unit = match[2].toLowerCase();
  if (!Number.isFinite(value) || value <= 0) return null;
  if (["lb", "lbs", "libra", "libras"].includes(unit)) return value * 16;
  if (["kg", "kilo", "kilos"].includes(unit)) return value * 35.274;
  if (["g", "gr", "gramo", "gramos"].includes(unit)) return value * 0.035274;
  return value;
}

function extractDimensions(text) {
  const match =
    text.match(/(?:dimensiones|medidas|size|caja)\D{0,20}([0-9]+(?:[.,][0-9]+)?)\s*[x×]\s*([0-9]+(?:[.,][0-9]+)?)\s*[x×]\s*([0-9]+(?:[.,][0-9]+)?)\s*(in|inch|inches|pulgadas?|cm|centimetros|centímetros)?/i) ||
    text.match(/\b([0-9]+(?:[.,][0-9]+)?)\s*[x×]\s*([0-9]+(?:[.,][0-9]+)?)\s*[x×]\s*([0-9]+(?:[.,][0-9]+)?)\s*(in|inch|inches|pulgadas?|cm|centimetros|centímetros)\b/i);
  if (!match) return null;
  const values = [match[1], match[2], match[3]].map((item) => Number(item.replace(",", ".")));
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) return null;
  const unit = (match[4] || "in").toLowerCase();
  const multiplier = ["cm", "centimetro", "centimetros", "centímetro", "centímetros"].includes(unit) ? 0.393701 : 1;
  return {
    lengthIn: values[0] * multiplier,
    widthIn: values[1] * multiplier,
    heightIn: values[2] * multiplier,
  };
}

function estimateShippingCost(profile, defaults, currency) {
  if (currency === "MXN") {
    const weightKg = profile.weightOz / 35.274;
    const dimensionalWeightKg = (profile.lengthIn * 2.54 * profile.widthIn * 2.54 * profile.heightIn * 2.54) / 5000;
    const billableWeight = Math.max(0.5, weightKg, dimensionalWeightKg);
    const sameMetro = profile.originZip && profile.destinationZip && profile.originZip.slice(0, 2) === profile.destinationZip.slice(0, 2);
    const sameRegion =
      profile.originZip &&
      profile.destinationZip &&
      Math.abs(Number(profile.originZip.slice(0, 2)) - Number(profile.destinationZip.slice(0, 2))) <= 8;
    const base = sameMetro ? 95 : sameRegion ? 125 : 155;
    const perKg = sameMetro ? 28 : sameRegion ? 36 : 52;
    const amount = Math.max(defaults.shipping, Math.round(base + billableWeight * perKg));
    return {
      amount,
      note: `Estimé envío doméstico en México usando peso facturable aproximado (${round(billableWeight, 2)} kg).`,
    };
  }

  const weightLb = Math.max(0.25, profile.weightOz / 16);
  const dimensionalWeightLb = (profile.lengthIn * profile.widthIn * profile.heightIn) / 139;
  const billableWeight = Math.max(weightLb, dimensionalWeightLb);
  const base = profile.destinationZip && profile.originZip ? 4.85 : defaults.shipping * 0.75;
  const amount = round(Math.max(defaults.shipping, base + billableWeight * 1.65 + (billableWeight > 2 ? 1.75 : 0)), 2);
  return {
    amount,
    note: `Estimé envío con peso facturable de ${round(billableWeight, 2)} lb.`,
  };
}

function inferMexicoLocation(zip) {
  if (!zip || !/^\d{5}$/.test(zip)) return {};
  const prefix = Number(zip.slice(0, 2));
  const ranges = [
    [1, 16, "CX", "Ciudad de Mexico"],
    [20, 20, "AG", "Aguascalientes"],
    [21, 22, "BC", "Tijuana"],
    [23, 23, "BS", "La Paz"],
    [24, 24, "CM", "Campeche"],
    [25, 27, "CO", "Saltillo"],
    [28, 28, "CL", "Colima"],
    [29, 30, "CS", "Tuxtla Gutierrez"],
    [31, 33, "CH", "Chihuahua"],
    [34, 35, "DG", "Durango"],
    [36, 38, "GT", "Leon"],
    [39, 41, "GR", "Acapulco"],
    [42, 43, "HG", "Pachuca"],
    [44, 49, "JA", "Guadalajara"],
    [50, 57, "EM", "Toluca"],
    [58, 61, "MI", "Morelia"],
    [62, 62, "MO", "Cuernavaca"],
    [63, 63, "NA", "Tepic"],
    [64, 67, "NL", "Monterrey"],
    [68, 71, "OA", "Oaxaca"],
    [72, 75, "PU", "Puebla"],
    [76, 76, "QT", "Queretaro"],
    [77, 77, "QR", "Cancun"],
    [78, 79, "SL", "San Luis Potosi"],
    [80, 82, "SI", "Culiacan"],
    [83, 85, "SO", "Hermosillo"],
    [86, 86, "TB", "Villahermosa"],
    [87, 89, "TM", "Tampico"],
    [90, 90, "TL", "Tlaxcala"],
    [91, 96, "VE", "Veracruz"],
    [97, 97, "YU", "Merida"],
    [98, 99, "ZA", "Zacatecas"],
  ];
  const match = ranges.find(([from, to]) => prefix >= from && prefix <= to);
  return match ? { state: match[2], city: match[3] } : {};
}

function canQuoteEnviaMexico(profile) {
  return (
    profile.country === "MX" &&
    profile.originZip &&
    profile.destinationZip &&
    profile.originState &&
    profile.destinationState &&
    profile.weightOz > 0 &&
    profile.lengthIn > 0 &&
    profile.widthIn > 0 &&
    profile.heightIn > 0
  );
}

async function quoteEnviaMexicoRates(profile, env) {
  const carriers = (env.ENVIA_CARRIERS || "dhl,estafeta,fedex,ups,paquetexpress")
    .split(",")
    .map((carrier) => carrier.trim().toLowerCase())
    .filter(Boolean);
  const baseUrl = (env.ENVIA_API_BASE || (env.ENVIA_ENV === "sandbox" ? "https://api-test.envia.com" : "https://api.envia.com")).replace(/\/$/, "");
  const results = await Promise.all(carriers.map((carrier) => quoteEnviaCarrierRate(profile, env.ENVIA_TOKEN, baseUrl, carrier)));
  const rates = results
    .flatMap((result) => (result.ok ? result.rates : []))
    .filter((rate) => Number.isFinite(rate.amount) && rate.amount > 0)
    .sort((a, b) => a.amount - b.amount);

  if (!rates.length) {
    const message =
      results.find((result) => !result.ok)?.message ||
      "Envia.com no regresó tarifas para la ruta y paquete enviados.";
    return { ok: false, message };
  }

  return {
    ok: true,
    selected: rates[0],
    rates: rates.slice(0, 6),
  };
}

async function quoteEnviaCarrierRate(profile, token, baseUrl, carrier) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${baseUrl}/ship/rate/`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        origin: {
          name: profile.originName,
          phone: profile.originPhone,
          street: profile.originStreet,
          city: profile.originCity || "Ciudad de Mexico",
          state: profile.originState,
          country: "MX",
          postalCode: profile.originZip,
        },
        destination: {
          name: "Cliente",
          phone: "+52 5555555555",
          street: profile.destinationStreet,
          city: profile.destinationCity || "Ciudad de Mexico",
          state: profile.destinationState,
          country: "MX",
          postalCode: profile.destinationZip,
        },
        packages: [
          {
            type: "box",
            content: "Producto ecommerce",
            amount: 1,
            declaredValue: Math.max(1, round(profile.declaredValue, 2)),
            lengthUnit: "CM",
            weightUnit: "KG",
            weight: round(profile.weightOz / 35.274, 2),
            dimensions: {
              length: round(profile.lengthIn * 2.54, 1),
              width: round(profile.widthIn * 2.54, 1),
              height: round(profile.heightIn * 2.54, 1),
            },
          },
        ],
        shipment: {
          type: 1,
          carrier,
        },
        settings: {
          currency: "MXN",
        },
      }),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, message: body?.message || body?.error || `${carrier}: HTTP ${response.status}` };
    }

    const data = Array.isArray(body.data) ? body.data : Array.isArray(body) ? body : [];
    const rates = data
      .map((rate) => ({
        carrier: rate.carrier || carrier,
        service: rate.serviceDescription || rate.service || "servicio",
        amount: Number(rate.totalPrice ?? rate.total ?? rate.price),
        currency: rate.currency || "MXN",
        deliveryDays: rate.deliveryDate?.dateDifference ?? null,
        deliveryEstimate: rate.deliveryEstimate || "",
      }))
      .filter((rate) => Number.isFinite(rate.amount) && rate.amount > 0);

    return rates.length ? { ok: true, rates } : { ok: false, message: `${carrier}: sin tarifas disponibles` };
  } catch (error) {
    const message = error && error.name === "AbortError" ? `${carrier}: timeout` : error instanceof Error ? error.message : String(error);
    return { ok: false, message };
  } finally {
    clearTimeout(timeout);
  }
}

function canQuoteEasyPost(profile) {
  return (
    profile.country === "US" &&
    profile.originZip &&
    profile.destinationZip &&
    profile.weightOz > 0 &&
    profile.lengthIn > 0 &&
    profile.widthIn > 0 &&
    profile.heightIn > 0
  );
}

async function quoteEasyPostRates(profile, apiKey) {
  try {
    const response = await fetch("https://api.easypost.com/v2/shipments", {
      method: "POST",
      headers: {
        authorization: `Basic ${btoa(`${apiKey}:`)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        shipment: {
          to_address: {
            name: "Customer",
            street1: "Address omitted",
            city: profile.destinationCity || "Unknown",
            state: profile.destinationState || "NA",
            zip: profile.destinationZip,
            country: profile.country,
            phone: "5555555555",
            email: "customer@example.com",
          },
          from_address: {
            name: profile.originName,
            street1: profile.originStreet,
            city: profile.originCity || "Unknown",
            state: profile.originState || "NA",
            zip: profile.originZip,
            country: profile.country,
            phone: profile.originPhone,
            email: profile.originEmail,
          },
          parcel: {
            length: round(profile.lengthIn, 2),
            width: round(profile.widthIn, 2),
            height: round(profile.heightIn, 2),
            weight: round(profile.weightOz, 2),
          },
        },
      }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, message: body?.error?.message || `HTTP ${response.status}` };
    }

    const rates = Array.isArray(body.rates)
      ? body.rates
          .map((rate) => ({
            carrier: rate.carrier,
            service: rate.service,
            amount: Number(rate.rate),
            currency: rate.currency || "USD",
            deliveryDays: rate.delivery_days ?? null,
          }))
          .filter((rate) => Number.isFinite(rate.amount) && rate.amount > 0)
          .sort((a, b) => a.amount - b.amount)
      : [];

    if (!rates.length) {
      return { ok: false, message: "EasyPost no regresó tarifas disponibles." };
    }

    return {
      ok: true,
      selected: rates[0],
      rates: rates.slice(0, 5),
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

function extractProfitabilityNumbers(text) {
  return {
    aov: extractMoneyNear(text, [
      "precio",
      "venta",
      "vender",
      "vendo",
      "pedido",
      "orden",
      "aov",
      "ticket",
      "cobrar",
    ]),
    cogs: extractMoneyNear(text, [
      "costo del producto",
      "costo producto",
      "producto me cuesta",
      "me cuesta",
      "proveedor",
      "fabricacion",
      "fabricación",
      "cogs",
      "unitario",
    ]),
    shipping: extractMoneyNear(text, ["envio", "envío", "shipping", "fulfillment", "entrega", "paqueteria", "paquetería"]),
    feesFixed: extractMoneyNear(text, ["fee fijo", "cargo fijo", "tarifa fija"]),
    returnLoss: extractMoneyNear(text, ["costo por devolucion", "costo por devolución", "return loss", "perdida por devolucion", "pérdida por devolución"]),
    feesPercent: extractPercentNear(text, ["fee", "fees", "tarjeta", "stripe", "shopify", "plataforma", "procesador"]),
    returnRate: extractPercentNear(text, ["devoluciones", "returns", "regresan", "refund", "reembolso"]),
    targetNetMargin: extractPercentNear(text, ["margen objetivo", "ganancia objetivo", "utilidad objetivo"]),
    repurchaseMultiplier: inferRepurchase(text),
    differentiation: inferDifferentiation(text),
    channel: inferChannel(text),
  };
}

function extractMoneyNear(text, labels) {
  for (const label of labels) {
    const forward = new RegExp(`${escapeRegExp(label)}[^0-9$]{0,45}(?:[$]|usd|mxn|pesos?)?\\s*([0-9]+(?:[.,][0-9]+)?)`, "i");
    const backward = new RegExp(`(?:[$]|usd|mxn|pesos?)?\\s*([0-9]+(?:[.,][0-9]+)?)[^a-z0-9]{0,45}${escapeRegExp(label)}`, "i");
    const matches = [text.match(forward), text.match(backward)].filter(Boolean);
    for (const match of matches) {
      const amount = Number(match[1].replace(",", "."));
      if (looksLikePostalCodeAmount(match[0], amount)) continue;
      const context = text.slice(Math.max(0, (match.index || 0) - 45), (match.index || 0) + match[0].length);
      if (looksLikeProductCostNearShipping(context, label)) continue;
      return amount;
    }
  }
  return null;
}

function looksLikePostalCodeAmount(context, amount) {
  return /\b(cp|c\.p\.|zip|codigo postal|código postal)\b/i.test(context) && amount >= 10000 && amount <= 99999;
}

function looksLikeProductCostNearShipping(context, label) {
  const isShippingLabel = /env[ií]o|shipping|fulfillment|entrega|paqueter[ií]a/i.test(label);
  return isShippingLabel && /costo\s+(del\s+)?producto|producto\s+me\s+cuesta|cogs|proveedor/i.test(context);
}

function extractPercentNear(text, labels) {
  for (const label of labels) {
    const forward = new RegExp(`${escapeRegExp(label)}[^0-9%]{0,45}([0-9]+(?:[.,][0-9]+)?)\\s*%`, "i");
    const backward = new RegExp(`([0-9]+(?:[.,][0-9]+)?)\\s*%[^a-z0-9]{0,45}${escapeRegExp(label)}`, "i");
    const match = text.match(forward) || text.match(backward);
    if (match) return Number(match[1].replace(",", "."));
  }
  return null;
}

function inferRepurchase(text) {
  const value = text.toLowerCase();
  if (/suscripci[oó]n|cada mes|mensual|recurrente|consumible|suplement|vitamin|prote[ií]na/.test(value)) return 1.7;
  if (/recompra alta|reponer|cartucho|refill|repuesto|rutina|skincare/.test(value)) return 1.35;
  if (/recompra baja|one time|una vez|no recompra/.test(value)) return 1;
  return null;
}

function inferDifferentiation(text) {
  const value = text.toLowerCase();
  if (/patente|patentado|propietari|clinico|cl[ií]nico|certificaci[oó]n|dif[ií]cil de copiar/.test(value)) return "defensible";
  if (/diferente|diferenci|[uú]nico|mecanismo|prueba|certificado|mejor que/.test(value)) return "clear";
  if (/commodity|gen[eé]rico|igual|dropshipping|solo empaque|sin diferencia/.test(value)) return "commodity";
  return null;
}

function inferChannel(text) {
  const value = text.toLowerCase();
  if (/tiktok org[aá]nico|organico en tiktok|orgánico en tiktok/.test(value)) return "tiktok-organic";
  if (/tiktok ads|anuncios en tiktok|tiktok paid/.test(value)) return "tiktok-paid";
  if (/influencer|creador/.test(value)) return "influencers";
  if (/google|search|seo/.test(value)) return "search";
  if (/amazon/.test(value)) return "amazon";
  if (/meta|facebook|instagram|paid ads|anuncios/.test(value)) return "meta";
  return null;
}

function buildAssumptionNotes({ extracted, defaults, currency, feesPercent, feesFixed, targetNetMargin, shippingQuote }) {
  const notes = [];
  notes.push(
    extracted.aov == null
      ? `No diste precio; usé ${formatMoney(defaults.aov, currency)} como venta promedio inicial para ${defaults.category}.`
      : `Usé el precio que escribiste: ${formatMoney(extracted.aov, currency)} por pedido.`,
  );
  notes.push(
    extracted.cogs == null
      ? `No diste costo de producto; usé ${formatMoney(defaults.cogs, currency)} como costo inicial.`
      : `Usé el costo de producto que escribiste: ${formatMoney(extracted.cogs, currency)}.`,
  );
  notes.push(...buildShippingNotes(shippingQuote, currency));
  notes.push(
    extracted.returnRate == null
      ? `No diste devoluciones; asumí ${defaults.returnRate}% de pedidos con devolución.`
      : `Usé devoluciones estimadas de ${extracted.returnRate}%.`,
  );
  notes.push(`Cobros de plataforma estimados: ${feesPercent}% + ${formatMoney(feesFixed, currency)} por pedido.`);
  notes.push(`Meta sana: dejar ${targetNetMargin}% de la venta como ganancia antes de escalar.`);
  notes.push("Esto es un filtro inicial: confirma precio, proveedor, envío, comisiones y devoluciones antes de comprar inventario.");
  return notes;
}

function buildShippingNotes(shippingQuote, currency) {
  if (shippingQuote.mode === "live_envia_mx") {
    const days = shippingQuote.deliveryDays ? `, entrega aprox. ${shippingQuote.deliveryDays} días` : "";
    return [
      `Envío cotizado en vivo para México: ${formatMoney(shippingQuote.amount, shippingQuote.currency)} con ${shippingQuote.carrier} ${shippingQuote.service}${days}.`,
      `Paquete usado: ${round(shippingQuote.profile.weightOz / 35.274, 2)} kg, ${round(shippingQuote.profile.lengthIn * 2.54, 1)} x ${round(shippingQuote.profile.widthIn * 2.54, 1)} x ${round(shippingQuote.profile.heightIn * 2.54, 1)} cm.`,
    ];
  }

  if (shippingQuote.mode === "live_easypost") {
    return [
      `Envío cotizado en vivo: ${formatMoney(shippingQuote.amount, shippingQuote.currency)} con ${shippingQuote.carrier} ${shippingQuote.service}.`,
      `Paquete usado: ${round(shippingQuote.profile.weightOz, 1)} oz, ${round(shippingQuote.profile.lengthIn, 1)} x ${round(shippingQuote.profile.widthIn, 1)} x ${round(shippingQuote.profile.heightIn, 1)} in.`,
    ];
  }

  if (shippingQuote.mode === "user_provided") {
    return [`Usé el envío que escribiste: ${formatMoney(shippingQuote.amount, currency)}.`];
  }

  const details = shippingQuote.missingFields?.length
    ? ` Para mejorar precisión escribe ${shippingQuote.missingFields.join(", ")}.`
    : "";
  return [`No diste envío exacto; usé ${formatMoney(shippingQuote.amount, currency)} por pedido. ${shippingQuote.notes.join(" ")}${details}`];
}

function cleanIdeaName(reference, problem) {
  const ref = (reference || "").trim();
  if (ref && ref !== "marca de referencia") {
    return ref.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0];
  }
  return (problem || "Idea ecommerce").replace(/\s+/g, " ").slice(0, 90);
}

function calculateProfitabilityScore(data) {
  if (data.aov <= 0) return 0;

  let score = 0;
  score += clamp(((data.margin - 0.25) / 0.4) * 24, 0, 24);
  score += data.breakEvenRoas <= 1.8 ? 16 : data.breakEvenRoas <= 2.5 ? 12 : data.breakEvenRoas <= 3.2 ? 8 : data.breakEvenRoas <= 4 ? 4 : 0;
  score += data.cogs / data.aov <= 0.25 ? 8 : data.cogs / data.aov <= 0.35 ? 5 : data.cogs / data.aov <= 0.45 ? 2 : 0;
  score += data.shipping / data.aov <= 0.1 ? 6 : data.shipping / data.aov <= 0.16 ? 4 : data.shipping / data.aov <= 0.23 ? 2 : 0;
  score += data.returnRate <= 6 ? 6 : data.returnRate <= 12 ? 4 : data.returnRate <= 20 ? 2 : 0;
  score += { 1: 0, 1.15: 3, 1.35: 6, 1.7: 8 }[data.repurchaseMultiplier] || 0;
  score += { commodity: -8, weak: 0, clear: 6, defensible: 9 }[data.differentiation] || 0;
  score += data.cacTarget / data.aov >= 0.35 ? 8 : data.cacTarget / data.aov >= 0.2 ? 5 : data.cacTarget / data.aov >= 0.1 ? 2 : 0;

  const paidCacFloor = data.currency === "MXN" ? 350 : 20;
  if (isPaidChannel(data.channel)) {
    score += data.cacTarget >= paidCacFloor ? 5 : -10;
  } else {
    score += 4;
  }

  return Math.round(clamp(score, 0, 100));
}

function getProfitabilityVerdict(data, score) {
  const paidCacFloor = data.currency === "MXN" ? 350 : 20;
  const severe =
    data.aov <= 0 ||
    data.contribution <= 0 ||
    data.margin < 0.25 ||
    data.breakEvenRoas > 4.5 ||
    (isPaidChannel(data.channel) && data.cacTarget < paidCacFloor * 0.55);

  if (severe || score < 48) {
    return {
      level: "fail",
      label: "No lanzar todavía",
      title: "La idea se ve muy apretada",
      copy:
        "Antes de comprar inventario, mejora el precio, baja costos, baja envío o encuentra una diferencia más fuerte.",
    };
  }

  if (score < 72) {
    return {
      level: "watch",
      label: "Probar muy pequeño",
      title: "Puede funcionar, pero con cuidado",
      copy:
        "Haz una página simple, lista de espera o muestra pequeña. No compres mucho inventario hasta ver si conseguir clientes sale barato.",
    };
  }

  return {
    level: "pass",
    label: "Sí se puede probar pequeño",
    title: "La idea tiene espacio para respirar",
    copy:
      "Los números permiten un experimento controlado. Aun así, respeta el máximo que puedes pagar por cliente.",
  };
}

function buildProfitabilityRisks(data) {
  const risks = [];
  const paidCacFloor = data.currency === "MXN" ? 350 : 20;

  if (data.aov <= 0) risks.push("<strong>Falta precio.</strong> Necesitamos saber en cuánto se vendería cada pedido.");
  if (data.contribution <= 0) risks.push("<strong>Pierde dinero antes de anuncios.</strong> El producto, envío y devoluciones cuestan más que la venta.");
  if (data.margin < 0.35) risks.push(`<strong>Queda poco dinero por venta.</strong> Después de costos solo queda ${formatPercent(data.margin)} antes de anuncios.`);
  if (data.cogs / data.aov > 0.35) risks.push(`<strong>Producto caro.</strong> El producto consume ${formatPercent(data.cogs / data.aov)} de lo que cobras.`);
  if (data.shipping / data.aov > 0.16) risks.push(`<strong>Envío pesado.</strong> El envío consume ${formatPercent(data.shipping / data.aov)} de lo que cobras.`);
  if (data.shippingQuote?.mode && !isLiveShippingQuote(data.shippingQuote) && data.shippingQuote.mode !== "user_provided") {
    const provider = data.currency === "MXN" ? "Envia.com" : "EasyPost";
    risks.push(`<strong>Envío sin cotización viva.</strong> Para precisión real necesitamos origen, destino, peso, medidas y una API key de ${provider} configurada.`);
  }
  if (data.returnRate > 15) risks.push(`<strong>Muchas devoluciones.</strong> Estás asumiendo que regresan ${formatPercent(data.returnRate / 100)} de los pedidos.`);
  if (data.breakEvenRoas > 3.2) risks.push(`<strong>Los anuncios tendrían que ser muy buenos.</strong> Necesitas vender ${formatRoas(data.breakEvenRoas)} por cada $1 en anuncios solo para no perder.`);
  if (isPaidChannel(data.channel) && data.cacTarget < paidCacFloor) {
    risks.push(`<strong>Muy poco presupuesto para conseguir clientes.</strong> La meta sana es ${formatMoney(data.cacTarget, data.currency)} por cliente en ${channelLabels[data.channel]}.`);
  }
  if (data.differentiation === "commodity") risks.push("<strong>Se parece demasiado a otras opciones.</strong> Si solo cambia el empaque, será más caro convencer a la gente.");
  if (data.repurchaseMultiplier === 1) risks.push("<strong>No parece que vuelvan a comprar.</strong> Entonces casi toda la ganancia debe salir del primer pedido.");

  if (!risks.length) {
    risks.push("<strong>No hay bloqueo obvio.</strong> El siguiente riesgo es comprobar que estos números sean reales con proveedor, página simple y una prueba pequeña.");
  }

  return risks;
}

function buildProfitabilitySteps(data, verdict) {
  const steps = [];
  const channel = channelLabels[data.channel];

  if (verdict.level === "fail") {
    steps.push("No compres inventario todavía. Primero sube el precio con bundle, baja el costo del producto/envío o usa un canal menos caro.");
  } else {
    steps.push(`Prueba pequeña permitida: no pagues más de <strong>${formatMoney(data.cacTarget, data.currency)}</strong> para conseguir un cliente.`);
  }

  steps.push(`Dónde conseguir clientes: <strong>${channel}</strong>. La primera prueba debe medir costo por cliente, no me gusta ni vistas.`);
  steps.push(`Anuncios: necesitas vender <strong>${formatRoas(data.breakEvenRoas)}</strong> por cada $1 gastado solo para no perder.`);
  if (!isLiveShippingQuote(data.shippingQuote)) {
    const zipLabel = data.currency === "MXN" ? "CP origen, CP destino" : "origen ZIP, destino ZIP";
    steps.push(`Para mejorar el cálculo de envío, escribe: ${zipLabel}, peso del paquete y medidas largo x ancho x alto.`);
  }
  steps.push(`Recompra: <strong>${repurchaseLabels[data.repurchaseMultiplier]}</strong>. No cuentes recompra como ganancia hasta verla en datos reales.`);
  steps.push(`Diferenciación: <strong>${differentiationLabels[data.differentiation]}</strong>.`);

  if (data.margin >= 0.5 && data.cacTarget > 0) {
    steps.push("Siguiente búsqueda: mira competidores con precio parecido y anuncios activos para comparar oferta, no copiar promesas.");
  }

  return steps;
}

function buildShippingQuoteSteps(shippingQuote, currency) {
  const steps = [];
  if (isLiveShippingQuote(shippingQuote)) {
    steps.push("Usa la tarifa más barata como costo base de envío en el cálculo de rentabilidad.");
    steps.push("Antes de prometer tiempos al cliente, valida cobertura y días de entrega con la paquetería seleccionada.");
  } else {
    const provider = currency === "MXN" ? "Envia.com" : "EasyPost";
    steps.push(`Configura la API key de ${provider} para pasar de estimación a cotización viva.`);
    steps.push("Escribe siempre origen, destino, peso y medidas; sin medidas puede cambiar por peso volumétrico.");
  }
  steps.push("No se creó guía ni se compró envío; esta herramienta solo cotiza tarifas.");
  return steps;
}

const repurchaseLabels = {
  1: "Sin recompra clara",
  1.15: "Baja",
  1.35: "Media",
  1.7: "Alta",
};

const differentiationLabels = {
  commodity: "Casi igual a los demás",
  weak: "Un poco diferente",
  clear: "Se entiende la diferencia",
  defensible: "Difícil de copiar",
};

const channelLabels = {
  meta: "Facebook/Instagram",
  "tiktok-organic": "videos orgánicos en TikTok",
  "tiktok-paid": "anuncios en TikTok",
  influencers: "creadores o influencers",
  search: "Google",
  amazon: "Amazon",
};

function isPaidChannel(channel) {
  return ["meta", "tiktok-paid", "influencers"].includes(channel);
}

function isLiveShippingQuote(shippingQuote) {
  return shippingQuote?.mode === "live_easypost" || shippingQuote?.mode === "live_envia_mx";
}

function formatMoney(value, currency) {
  const locale = currency === "MXN" ? "es-MX" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatPercent(value) {
  return `${Math.round((Number.isFinite(value) ? value : 0) * 100)}%`;
}

function formatRoas(value) {
  if (!Number.isFinite(value)) return "Sin margen";
  return `${value.toFixed(value >= 10 ? 0 : 1)}x`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, digits = 2) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(),
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization,x-app-password",
  };
}
