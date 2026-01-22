// ===========================================
// SEMEC Porto Velho - Scripts
// ===========================================

// Constantes de busca
const SEARCH_ROOT_SELECTOR = "[data-search-root]";
const HIGHLIGHT_ATTRIBUTE = "data-search-highlight";
const HIGHLIGHT_CLASS_NAME = "site-search-highlight";

// =========================================
// Funções de Busca (estilo Ctrl+F)
// =========================================

function getSearchRoots() {
  return Array.from(document.querySelectorAll(SEARCH_ROOT_SELECTOR));
}

function openDetailsAncestors(element) {
  let parent = element.parentElement;
  while (parent) {
    if (parent.tagName === 'DETAILS') {
      parent.open = true;
    }
    parent = parent.parentElement;
  }
}

function collectTextNodes(root) {
  const nodes = [];
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.textContent?.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        const parent = node.parentElement;
        if (!parent) {
          return NodeFilter.FILTER_REJECT;
        }
        if (
          parent.closest(`[${HIGHLIGHT_ATTRIBUTE}]`) ||
          parent.closest("[data-search-ignore='true']") ||
          parent.closest("script, style") ||
          parent.closest("[aria-hidden='true']")
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let currentNode = walker.nextNode();
  while (currentNode) {
    nodes.push(currentNode);
    currentNode = walker.nextNode();
  }
  return nodes;
}

function highlightNodeMatches(node, normalizedTerm, hits) {
  if (!node.data || !normalizedTerm) {
    return;
  }

  const termLength = normalizedTerm.length;
  let currentNode = node;
  let remainingText = currentNode.data;
  let matchIndex = remainingText.toLowerCase().indexOf(normalizedTerm);

  while (matchIndex !== -1) {
    const matchNode = currentNode.splitText(matchIndex);
    const afterMatchNode = matchNode.splitText(termLength);
    const highlight = document.createElement("mark");
    highlight.className = HIGHLIGHT_CLASS_NAME;
    highlight.setAttribute(HIGHLIGHT_ATTRIBUTE, "true");
    highlight.setAttribute("tabindex", "-1");
    matchNode.parentNode?.insertBefore(highlight, matchNode);
    highlight.appendChild(matchNode);
    openDetailsAncestors(highlight);
    hits.push(highlight);
    currentNode = afterMatchNode;
    remainingText = currentNode.data ?? "";
    matchIndex = remainingText.toLowerCase().indexOf(normalizedTerm);
  }
}

function highlightMatches(term) {
  const normalizedTerm = term.toLowerCase();
  if (!normalizedTerm) {
    return [];
  }

  const hits = [];
  const roots = getSearchRoots();

  roots.forEach((root) => {
    const textNodes = collectTextNodes(root);
    textNodes.forEach((node) => highlightNodeMatches(node, normalizedTerm, hits));
  });

  return hits;
}

function clearHighlights() {
  const highlights = document.querySelectorAll(`mark[${HIGHLIGHT_ATTRIBUTE}]`);

  highlights.forEach((highlight) => {
    const parent = highlight.parentNode;
    if (!parent) {
      return;
    }

    const textContent = highlight.textContent ?? "";
    parent.replaceChild(document.createTextNode(textContent), highlight);
    parent.normalize();
  });

  getSearchRoots().forEach((root) => root.normalize());
}

// =========================================
// Toggle da Busca Retrátil
// =========================================

function initSearchToggle() {
  const searchToggle = document.getElementById('search-toggle');
  const searchForm = document.getElementById('site-search-form');
  const searchInput = document.getElementById('site-search');

  if (!searchToggle || !searchForm) return;

  searchToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    searchForm.classList.toggle('hidden');
    if (!searchForm.classList.contains('hidden') && searchInput) {
      searchInput.focus();
    }
  });

  // Fechar ao clicar fora
  document.addEventListener('click', (e) => {
    if (!searchForm.contains(e.target) && !searchToggle.contains(e.target)) {
      searchForm.classList.add('hidden');
    }
  });

  // Prevenir fechamento ao clicar no próprio formulário
  searchForm.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

// =========================================
// Handler de Busca
// =========================================

let feedbackTimeout = null;

function showFeedback(message) {
  const feedbackEl = document.getElementById('search-feedback');
  if (!feedbackEl) return;

  feedbackEl.textContent = message;
  feedbackEl.classList.remove('hidden');

  if (feedbackTimeout) {
    clearTimeout(feedbackTimeout);
  }

  feedbackTimeout = setTimeout(() => {
    feedbackEl.classList.add('hidden');
    feedbackTimeout = null;
  }, 4000);
}

function handleSearch(event) {
  event.preventDefault();
  const searchInput = document.getElementById('site-search');
  if (!searchInput) return;

  const query = searchInput.value.trim();

  if (query.length < 3) {
    clearHighlights();
    showFeedback("Por favor, informe ao menos 3 caracteres para buscar.");
    return;
  }

  const hasSearchableContent = getSearchRoots().length > 0;
  if (!hasSearchableContent) {
    showFeedback("Não há conteúdo disponível para pesquisa nesta página.");
    return;
  }

  clearHighlights();
  const hits = highlightMatches(query);

  if (!hits.length) {
    showFeedback("Nenhum resultado encontrado.");
    return;
  }

  const firstHit = hits[0];
  firstHit.scrollIntoView({ behavior: "smooth", block: "center" });
  firstHit.focus({ preventScroll: true });

  showFeedback(
    hits.length === 1
      ? "1 resultado encontrado."
      : `${hits.length} resultados encontrados.`
  );
}

// =========================================
// Navegação por Etapas (Steps)
// =========================================

let currentStep = 1;
const totalSteps = 4;

function nextStep() {
  if (currentStep < totalSteps) {
    const currentElement = document.querySelector(`[data-step="${currentStep}"].step-content`);
    if (currentElement) {
      currentElement.classList.add('hidden');
    }

    currentStep++;
    const nextElement = document.querySelector(`[data-step="${currentStep}"].step-content`);
    if (nextElement) {
      nextElement.classList.remove('hidden');
    }

    updateStepIndicator();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function updateStepIndicator() {
  document.querySelectorAll('.step').forEach((step, index) => {
    const stepNumber = index + 1;
    if (stepNumber <= currentStep) {
      step.classList.add('active');
    } else {
      step.classList.remove('active');
    }
  });
}

function resetSteps() {
  document.querySelectorAll('.step-content').forEach(step => {
    step.classList.add('hidden');
  });
  const summaryElement = document.getElementById('summary');
  if (summaryElement) {
    summaryElement.classList.add('hidden');
  }

  currentStep = 1;
  const firstStep = document.querySelector(`[data-step="${currentStep}"].step-content`);
  if (firstStep) {
    firstStep.classList.remove('hidden');
  }

  updateStepIndicator();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showSummary() {
  document.querySelectorAll('.step-content').forEach(step => {
    step.classList.add('hidden');
  });

  const summaryElement = document.getElementById('summary');
  if (summaryElement) {
    summaryElement.classList.remove('hidden');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initializeStepIndicators() {
  document.querySelectorAll('.step').forEach((step, index) => {
    step.addEventListener('click', () => {
      const targetStep = index + 1;
      if (targetStep <= currentStep) {
        const currentElement = document.querySelector(`[data-step="${currentStep}"].step-content`);
        if (currentElement) {
          currentElement.classList.add('hidden');
        }

        currentStep = targetStep;
        const targetElement = document.querySelector(`[data-step="${currentStep}"].step-content`);
        if (targetElement) {
          targetElement.classList.remove('hidden');
        }

        updateStepIndicator();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}

// =========================================
// Animação das Progress Bars
// =========================================

function animateProgressBars() {
  const progressBars = document.querySelectorAll('.progress-fill');
  progressBars.forEach(bar => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            const currentWidth = entry.target.style.width;
            entry.target.style.width = '0%';
            setTimeout(() => {
              entry.target.style.width = currentWidth;
            }, 100);
          }, 500);
        }
      });
    });
    observer.observe(bar);
  });
}

// =========================================
// Inicialização
// =========================================

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar toggle de busca
  initSearchToggle();

  // Inicializar formulário de busca
  const searchForm = document.getElementById('site-search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', handleSearch);
  }

  // Limpar highlights quando o campo de busca estiver vazio
  const searchInput = document.getElementById('site-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (!searchInput.value.trim()) {
        clearHighlights();
      }
    });
  }

  // Inicializar indicadores de etapas
  initializeStepIndicators();

  // Inicializar animações
  animateProgressBars();

  // Definir estado inicial
  updateStepIndicator();
});

// Expor funções globalmente para uso nos botões inline
window.nextStep = nextStep;
window.resetSteps = resetSteps;
window.showSummary = showSummary;
