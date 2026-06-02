const body = document.body;
const menuToggle = document.querySelector("[data-menu-toggle]");
const nav = document.querySelector("[data-nav]");
const footerToggle = document.querySelector("#footer-menu");
const footerPanel = document.querySelector(".footer-panel");
const whatsappForm = document.querySelector("[data-whatsapp-form]");
const contactForm = document.querySelector("#solicitar-contato");
const contactLinks = document.querySelectorAll('a[href="#solicitar-contato"]');
const stepDockCards = Array.from(document.querySelectorAll(".steps article"));
const revealTargets = document.querySelectorAll(
  ".intro-item, .action-card, .service-card, .regime-card, .feature-list div, .steps article, .faq-item, .contact-copy, .contact-card",
);
const whatsappNumber = "553384401388";
const dockInteractionQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

const setSelectValue = (select, value) => {
  if (!(select instanceof HTMLSelectElement)) {
    return;
  }

  const cleanValue = String(value || "").trim().toLowerCase();
  if (!cleanValue) {
    return;
  }

  const foundOption = Array.from(select.options).find(
    (option) => option.value.trim().toLowerCase() === cleanValue,
  );

  if (foundOption) {
    select.value = foundOption.value;
  }
};

let highlightTimeoutId;
const highlightForm = () => {
  if (!(contactForm instanceof HTMLElement)) {
    return;
  }

  if (highlightTimeoutId) {
    clearTimeout(highlightTimeoutId);
  }

  contactForm.classList.remove("is-highlighted");
  void contactForm.offsetWidth;
  contactForm.classList.add("is-highlighted");

  highlightTimeoutId = window.setTimeout(() => {
    contactForm.classList.remove("is-highlighted");
  }, 950);
};

const closeMenu = () => {
  if (!(menuToggle instanceof HTMLButtonElement) || !(nav instanceof HTMLElement)) {
    return;
  }

  nav.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Abrir menu");
};

const clearStepDockState = () => {
  stepDockCards.forEach((card) => {
    card.classList.remove("is-dock-hover", "is-dock-near", "is-dock-far");
  });
};

const setStepDockState = (activeIndex) => {
  if (!dockInteractionQuery.matches) {
    return;
  }

  clearStepDockState();

  stepDockCards.forEach((card, index) => {
    const distance = Math.abs(index - activeIndex);

    if (distance === 0) {
      card.classList.add("is-dock-hover");
      return;
    }

    if (distance === 1) {
      card.classList.add("is-dock-near");
      return;
    }

    if (distance === 2) {
      card.classList.add("is-dock-far");
    }
  });
};

if (stepDockCards.length) {
  const stepsContainer = stepDockCards[0].closest(".steps");

  stepDockCards.forEach((card, index) => {
    card.addEventListener("pointerenter", () => setStepDockState(index));
  });

  if (stepsContainer instanceof HTMLElement) {
    stepsContainer.addEventListener("pointerleave", clearStepDockState);
  }

  if (typeof dockInteractionQuery.addEventListener === "function") {
    dockInteractionQuery.addEventListener("change", clearStepDockState);
  }
}

if (menuToggle instanceof HTMLButtonElement && nav instanceof HTMLElement) {
  menuToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
  });

  nav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      closeMenu();
    }
  });

  document.addEventListener("click", (event) => {
    if (!nav.classList.contains("is-open")) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (!nav.contains(target) && !menuToggle.contains(target)) {
      closeMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 820) {
      closeMenu();
    }
  });
}

if (footerToggle instanceof HTMLInputElement && footerPanel instanceof HTMLElement) {
  footerPanel.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      footerToggle.checked = false;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      footerToggle.checked = false;
    }
  });
}

if (contactLinks.length) {
  const interestSelect = whatsappForm?.querySelector("[data-interest-select]");
  const regimeSelect = whatsappForm?.querySelector("[data-regime-select]");

  contactLinks.forEach((link) => {
    link.addEventListener("click", () => {
      setSelectValue(interestSelect, link.getAttribute("data-interest"));
      setSelectValue(regimeSelect, link.getAttribute("data-regime"));
      highlightForm();

      if (footerToggle instanceof HTMLInputElement) {
        footerToggle.checked = false;
      }

      window.setTimeout(() => {
        const nomeField = whatsappForm?.querySelector('input[name="nome"]');
        if (nomeField instanceof HTMLInputElement) {
          nomeField.focus({ preventScroll: true });
        }
      }, 340);
    });
  });
}

if (body.classList.contains("motion-on")) {
  const revealItem = (item) => item.classList.add("is-visible");
  const revealAllItems = () => revealTargets.forEach(revealItem);

  body.classList.add("motion-ready");

  if (!("IntersectionObserver" in window)) {
    revealAllItems();
  } else {
    const revealFallbackId = window.setTimeout(revealAllItems, 1800);
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          revealItem(entry.target);
          observer.unobserve(entry.target);
        });

        if (Array.from(revealTargets).every((item) => item.classList.contains("is-visible"))) {
          window.clearTimeout(revealFallbackId);
        }
      },
      {
        root: null,
        threshold: 0.06,
        rootMargin: "0px 0px 180px 0px",
      },
    );

    revealTargets.forEach((item) => {
      const rect = item.getBoundingClientRect();

      if (rect.top < window.innerHeight + 180) {
        revealItem(item);
        return;
      }

      revealObserver.observe(item);
    });
  }
}

if (whatsappForm instanceof HTMLFormElement) {
  whatsappForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const submitButton = whatsappForm.querySelector(".button-fizzy");
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
      submitButton.classList.add("is-sending");
    }

    const formData = new FormData(whatsappForm);
    const nome = String(formData.get("nome") || "").trim() || "Não informado";
    const empresa = String(formData.get("empresa") || "").trim() || "Não informado";
    const interesse = String(formData.get("interesse") || "").trim() || "Não informado";
    const regime = String(formData.get("regime") || "").trim() || "Não informado";
    const mensagem = String(formData.get("mensagem") || "").trim() || "Não informado";

    const text = [
      "Olá! Vim pelo site da Almenara Contabilidade e quero solicitar atendimento.",
      "",
      `Nome: ${nome}`,
      `Empresa: ${empresa}`,
      `Interesse: ${interesse}`,
      `Regime tributário: ${regime}`,
      `Mensagem: ${mensagem}`,
      "",
      "Privacidade: usuário ciente do uso dos dados para atendimento via WhatsApp.",
    ].join("\n");

    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;

    window.setTimeout(() => {
      window.location.href = url;
    }, 420);

    window.setTimeout(() => {
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
        submitButton.classList.remove("is-sending");
      }
    }, 2600);
  });
}
