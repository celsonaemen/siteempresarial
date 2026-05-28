const newsList = document.querySelector("[data-news-list]");
const newsUpdated = document.querySelector("[data-news-updated]");
const NEWS_DATA_URL = "./data/noticias.json";
const INLINE_DATA_KEY = "ALMENARA_NEWS_DATA";

const formatDateTime = (value) => {
  if (!value) {
    return "Data nao informada";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Data nao informada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
};

const truncateText = (value, maxLength) => {
  const text = String(value || "").trim();
  if (!text) {
    return "Clique para abrir a noticia completa.";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}...`;
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
  title.textContent = String(item.title || "Noticia sem titulo");

  const summary = document.createElement("p");
  summary.textContent = truncateText(item.summary, 180);

  const meta = document.createElement("div");
  meta.className = "news-meta";

  const source = document.createElement("span");
  source.textContent = String(item.source || "Fonte nao informada");

  const published = document.createElement("span");
  published.textContent = formatDateTime(item.publishedAt);

  meta.append(source, published);

  const links = document.createElement("div");
  links.className = "news-links";

  const link = document.createElement("a");
  link.href = String(item.url || "#");
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "Abrir noticia";

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
      "Sem noticias no momento",
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
        newsUpdated.textContent = "Atualizacao em andamento.";
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
        "Sem noticias no momento",
        "Estamos atualizando os destaques. Tente novamente em instantes.",
      );
    }
  } catch (error) {
    if (!hasInlineRender) {
      renderStateCard(
        "Falha ao carregar noticias",
        "Nao foi possivel carregar agora. Tente novamente em instantes.",
      );

      if (newsUpdated instanceof HTMLElement) {
        newsUpdated.textContent = "Atualizacao indisponivel no momento.";
      }
    }

    console.error("Erro ao carregar noticias:", error);
  }
};

loadNews();
