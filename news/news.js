const newsList = document.querySelector("[data-news-list]");
const newsUpdated = document.querySelector("[data-news-updated]");
const marketUpdated = document.querySelector("[data-market-updated]");
const NEWS_DATA_URL = "./data/noticias.json";
const INLINE_DATA_KEY = "ALMENARA_NEWS_DATA";
const MARKET_QUOTES_URL = "https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL";
const MARKET_SELIC_URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json";

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

const applyPayload = (payload) => {
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

let hasInlineRender = false;
const inlinePayload = globalThis[INLINE_DATA_KEY];
if (inlinePayload) {
  hasInlineRender = applyPayload(inlinePayload);
}

const loadNews = async () => {
  if (!(newsList instanceof HTMLElement)) {
    return;
  }

  // Em file://, muitos navegadores bloqueiam fetch de JSON local.
  if (window.location.protocol === "file:") {
    if (newsUpdated instanceof HTMLElement) {
      if (!hasInlineRender) {
        newsUpdated.textContent = "Atualização em andamento.";
      }
    }
    return;
  }

  try {
    const response = await fetch(`${NEWS_DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const rendered = applyPayload(payload);
    if (!rendered && !hasInlineRender) {
      renderStateCard(
        "Sem notícias no momento",
        "Estamos atualizando os destaques. Tente novamente em instantes.",
      );
    }
  } catch (error) {
    if (!hasInlineRender) {
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

  marketUpdated.textContent = "Atualizando indicadores...";

  try {
    const [quotesResponse, selicResponse] = await Promise.all([
      fetch(`${MARKET_QUOTES_URL}?v=${Date.now()}`, { cache: "no-store" }),
      fetch(`${MARKET_SELIC_URL}&v=${Date.now()}`, { cache: "no-store" }),
    ]);

    if (!quotesResponse.ok) {
      throw new Error(`Quotes HTTP ${quotesResponse.status}`);
    }

    if (!selicResponse.ok) {
      throw new Error(`Selic HTTP ${selicResponse.status}`);
    }

    const quotesPayload = await quotesResponse.json();
    const selicPayload = await selicResponse.json();

    const usd = quotesPayload?.USDBRL;
    const eur = quotesPayload?.EURBRL;
    const btc = quotesPayload?.BTCBRL;
    const selic = Array.isArray(selicPayload) ? selicPayload[0] : null;

    setMarketText(
      "USDBRL",
      formatMoney(usd?.bid),
      `Variação diária: ${formatPercent(usd?.pctChange)}`,
    );
    setMarketText(
      "EURBRL",
      formatMoney(eur?.bid),
      `Variação diária: ${formatPercent(eur?.pctChange)}`,
    );
    setMarketText(
      "BTCBRL",
      formatMoney(btc?.bid),
      `Variação diária: ${formatPercent(btc?.pctChange)}`,
    );
    setMarketText(
      "SELIC",
      Number.isFinite(Number(selic?.valor))
        ? `${Number(selic.valor).toFixed(2).replace(".", ",")}% a.a.`
        : "--",
      selic?.data ? `Último valor oficial: ${selic.data}` : "Último valor oficial: --",
    );

    marketUpdated.textContent = `Indicadores atualizados em ${new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date())}`;
  } catch (error) {
    setMarketText("USDBRL", "--", "Variação diária: indisponível");
    setMarketText("EURBRL", "--", "Variação diária: indisponível");
    setMarketText("BTCBRL", "--", "Variação diária: indisponível");
    setMarketText("SELIC", "--", "Último valor oficial: indisponível");
    marketUpdated.textContent = "Indicadores indisponíveis no momento.";
    console.error("Erro ao carregar indicadores de mercado:", error);
  }
};

loadNews();
loadMarket();
