const newsList = document.querySelector("[data-news-list]");
const newsUpdated = document.querySelector("[data-news-updated]");
const marketUpdated = document.querySelector("[data-market-updated]");

const NEWS_DATA_URL = "./data/noticias.json";
const MARKET_DATA_URL = "./data/mercado.json";

const INLINE_NEWS_KEY = "ALMENARA_NEWS_DATA";
const INLINE_MARKET_KEY = "ALMENARA_MARKET_DATA";

const formatDateTime = (value) => {
  if (!value) {
    return "Data não informada";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Data não informada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
};

const truncateText = (value, maxLength) => {
  const text = String(value || "").trim();
  if (!text) {
    return "Clique para abrir a notícia completa.";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}...`;
};

const formatMoney = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(number);
};

const formatPercent = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }

  return `${number.toFixed(2).replace(".", ",")}%`;
};

const setMarketText = (key, value, meta) => {
  const valueNode = document.querySelector(`[data-market-value="${key}"]`);
  const metaNode = document.querySelector(`[data-market-meta="${key}"]`);

  if (valueNode instanceof HTMLElement) {
    valueNode.textContent = value;
  }

  if (metaNode instanceof HTMLElement) {
    metaNode.textContent = meta;
  }
};

const renderStateCard = (title, message) => {
  if (!(newsList instanceof HTMLElement)) {
    return;
  }

  newsList.innerHTML = "";
  const card = document.createElement("article");
  card.className = "news-card news-live-card news-state";

  const heading = document.createElement("h3");
  heading.textContent = title;

  const text = document.createElement("p");
  text.textContent = message;

  card.append(heading, text);
  newsList.append(card);
};

const buildNewsCard = (item) => {
  const article = document.createElement("article");
  article.className = "news-card news-live-card";

  const title = document.createElement("h3");
  title.textContent = String(item.title || "Notícia sem título");

  const summary = document.createElement("p");
  summary.textContent = truncateText(item.summary, 180);

  const meta = document.createElement("div");
  meta.className = "news-meta";

  const source = document.createElement("span");
  source.textContent = String(item.source || "Fonte não informada");

  const published = document.createElement("span");
  published.textContent = formatDateTime(item.publishedAt);

  meta.append(source, published);

  const links = document.createElement("div");
  links.className = "news-links";

  const link = document.createElement("a");
  link.href = String(item.url || "#");
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "Abrir notícia";

  links.append(link);
  article.append(title, summary, meta, links);

  return article;
};

const renderNewsItems = (items) => {
  if (!(newsList instanceof HTMLElement)) {
    return false;
  }

  if (!Array.isArray(items) || !items.length) {
    renderStateCard(
      "Sem notícias no momento",
      "Estamos atualizando os destaques. Tente novamente em instantes.",
    );
    return false;
  }

  newsList.innerHTML = "";
  items.slice(0, 12).forEach((item) => {
    newsList.append(buildNewsCard(item));
  });
  return true;
};

const applyNewsPayload = (payload) => {
  if (!payload || !Array.isArray(payload.items)) {
    return false;
  }

  const filtered = payload.items.filter((item) => item?.title && item?.url);
  const rendered = renderNewsItems(filtered);

  if (rendered && newsUpdated instanceof HTMLElement) {
    const generatedAt = payload.generatedAt ? formatDateTime(payload.generatedAt) : "sem data";
    newsUpdated.textContent = `Atualizado em: ${generatedAt}`;
  }

  return rendered;
};

const applyMarketPayload = (payload) => {
  if (!payload || !payload.items) {
    return false;
  }

  const usd = payload.items.USDBRL;
  const eur = payload.items.EURBRL;
  const btc = payload.items.BTCBRL;
  const selic = payload.items.SELIC;

  const hasAnyData = Boolean(usd || eur || btc || selic);
  if (!hasAnyData) {
    return false;
  }

  setMarketText(
    "USDBRL",
    formatMoney(usd?.value),
    `Variação diária: ${formatPercent(usd?.pctChange)}`,
  );
  setMarketText(
    "EURBRL",
    formatMoney(eur?.value),
    `Variação diária: ${formatPercent(eur?.pctChange)}`,
  );
  setMarketText(
    "BTCBRL",
    formatMoney(btc?.value),
    `Variação diária: ${formatPercent(btc?.pctChange)}`,
  );
  setMarketText(
    "SELIC",
    Number.isFinite(Number(selic?.value))
      ? `${Number(selic.value).toFixed(2).replace(".", ",")}% a.a.`
      : "--",
    selic?.date ? `Último valor oficial: ${selic.date}` : "Último valor oficial: --",
  );

  if (marketUpdated instanceof HTMLElement) {
    marketUpdated.textContent = payload.generatedAt
      ? `Indicadores atualizados em ${formatDateTime(payload.generatedAt)}`
      : "Indicadores atualizados.";
  }

  return true;
};

const renderMarketUnavailable = () => {
  setMarketText("USDBRL", "--", "Variação diária: indisponível");
  setMarketText("EURBRL", "--", "Variação diária: indisponível");
  setMarketText("BTCBRL", "--", "Variação diária: indisponível");
  setMarketText("SELIC", "--", "Último valor oficial: indisponível");

  if (marketUpdated instanceof HTMLElement) {
    marketUpdated.textContent = "Indicadores indisponíveis no momento.";
  }
};

let hasInlineNews = false;
const inlineNewsPayload = globalThis[INLINE_NEWS_KEY];
if (inlineNewsPayload) {
  hasInlineNews = applyNewsPayload(inlineNewsPayload);
}

let hasInlineMarket = false;
const inlineMarketPayload = globalThis[INLINE_MARKET_KEY];
if (inlineMarketPayload) {
  hasInlineMarket = applyMarketPayload(inlineMarketPayload);
}

const loadNews = async () => {
  if (!(newsList instanceof HTMLElement)) {
    return;
  }

  // Em file://, muitos navegadores bloqueiam fetch de JSON local.
  if (window.location.protocol === "file:") {
    if (newsUpdated instanceof HTMLElement && !hasInlineNews) {
      newsUpdated.textContent = "Atualização em andamento.";
    }
    return;
  }

  try {
    const response = await fetch(`${NEWS_DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const rendered = applyNewsPayload(payload);
    if (!rendered && !hasInlineNews) {
      renderStateCard(
        "Sem notícias no momento",
        "Estamos atualizando os destaques. Tente novamente em instantes.",
      );
    }
  } catch (error) {
    if (!hasInlineNews) {
      renderStateCard(
        "Falha ao carregar notícias",
        "Não foi possível carregar agora. Tente novamente em instantes.",
      );

      if (newsUpdated instanceof HTMLElement) {
        newsUpdated.textContent = "Atualização indisponível no momento.";
      }
    }

    console.error("Erro ao carregar notícias:", error);
  }
};

const loadMarket = async () => {
  if (!(marketUpdated instanceof HTMLElement)) {
    return;
  }

  if (!hasInlineMarket) {
    marketUpdated.textContent = "Atualizando indicadores...";
  }

  // Em file://, muitos navegadores bloqueiam fetch de JSON local.
  if (window.location.protocol === "file:") {
    if (!hasInlineMarket) {
      marketUpdated.textContent = "Atualização em andamento.";
    }
    return;
  }

  try {
    const response = await fetch(`${MARKET_DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const rendered = applyMarketPayload(payload);
    if (!rendered && !hasInlineMarket) {
      renderMarketUnavailable();
    }
  } catch (error) {
    if (!hasInlineMarket) {
      renderMarketUnavailable();
    }
    console.error("Erro ao carregar indicadores de mercado:", error);
  }
};

loadNews();
loadMarket();
