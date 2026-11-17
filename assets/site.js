
const languageLinks = document.querySelectorAll('[data-language]');
const preferenceKey = 'nono-cafe-v2-language';

function currentSection() {
  const hash = location.hash.slice(1);
  const element = document.getElementById(hash);
  return element?.closest('main') && element.id !== 'contenido' ? location.hash : '';
}

for (const link of languageLinks) {
  link.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    try {
      localStorage.setItem(preferenceKey, link.dataset.language);
    } catch {
      // The language link also works without storage.
    }
    const section = currentSection();
    if (section) {
      event.preventDefault();
      location.href = link.href + section;
    }
  });
}

if (document.documentElement.hasAttribute('data-entry')) {
  try {
    if (localStorage.getItem(preferenceKey) === 'en') {
      const english = document.querySelector('[data-language="en"]');
      location.replace(english.href + location.hash);
    }
  } catch {
    // Spanish remains the default when storage is unavailable.
  }
}

function openCategory(hash) {
  const card = document.getElementById(hash.slice(1));
  if (card?.matches('.menu-group')) card.open = true;
  return card;
}

for (const link of document.querySelectorAll('.categories a')) {
  link.addEventListener('click', () => {
    const card = openCategory(link.hash);
    card?.querySelector('summary')?.focus({ preventScroll: true });
  });
}
window.addEventListener('hashchange', () => openCategory(location.hash));
openCategory(location.hash);

const hero = document.querySelector('.hero');
if (hero) {
  const motion = matchMedia('(min-width: 721px) and (prefers-reduced-motion: no-preference)');
  let frame = 0;

  function paint() {
    const progress = motion.matches ? Math.min(Math.max(scrollY, 0) / (innerHeight * 0.75), 1) : 0;
    hero.style.setProperty('--photo-scale', (1 + progress * 0.105).toFixed(4));
    hero.style.setProperty('--spread', (progress * 1.85).toFixed(2) + 'px');
    frame = 0;
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(paint);
  }

  addEventListener('scroll', schedule, { passive: true });
  motion.addEventListener('change', schedule);
  schedule();
}

const menu = document.querySelector('.menu-panel');
if (menu) {
  const toolbar = menu.querySelector('.menu-tools');
  const search = menu.querySelector('#drink-search');
  const savedFilter = menu.querySelector('.menu-saved');
  const clear = menu.querySelector('.menu-clear');
  const status = menu.querySelector('.menu-status');
  const cards = [...menu.querySelectorAll('.menu-group')];
  const storageKey = 'nono-cafe-favourites';
  const normalise = (text) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase(document.documentElement.lang);
  const drinks = cards.flatMap((card) => [...card.querySelectorAll('.drink')].map((row) => ({
    card,
    row,
    id: row.dataset.drink,
    button: row.querySelector('.drink-save'),
    text: normalise([card.querySelector('.category-title').firstChild.textContent,
      row.querySelector('.drink-header strong').textContent,
      row.querySelector('.drink-description').textContent].join(' '))
  })));
  let saved = new Set();
  try {
    const values = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    if (Array.isArray(values)) saved = new Set(values.filter((value) => typeof value === 'string'));
  } catch {
    // Favourites can still be used in the current page.
  }

  let openBeforeFilter;
  function showMatches() {
    const words = normalise(search.value).trim().split(/\s+/).filter(Boolean);
    const onlySaved = savedFilter.getAttribute('aria-pressed') === 'true';
    const filtering = words.length > 0 || onlySaved;
    if (filtering && !openBeforeFilter) openBeforeFilter = new Set(cards.filter((card) => card.open));
    const counts = new Map(cards.map((card) => [card, 0]));

    for (const { card, row, id, text } of drinks) {
      const visible = words.every((word) => text.includes(word)) && (!onlySaved || saved.has(id));
      row.hidden = !visible;
      if (visible) counts.set(card, counts.get(card) + 1);
    }

    for (const card of cards) {
      const count = counts.get(card);
      card.hidden = count === 0;
      card.querySelector('.category-count').textContent = count;
      if (filtering) card.open = count > 0;
      else if (openBeforeFilter) card.open = openBeforeFilter.has(card);
    }
    if (!filtering) openBeforeFilter = undefined;
    clear.hidden = !filtering;

    const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
    status.textContent = total ? status.dataset.count + ' · ' + total :
      (onlySaved && !words.length ? status.dataset.emptySaved : status.dataset.empty);
  }

  function reset() {
    search.value = '';
    savedFilter.setAttribute('aria-pressed', 'false');
    showMatches();
  }

  function paintFavourite(button, selected) {
    button.setAttribute('aria-pressed', String(selected));
  }

  for (const { row, id, button } of drinks) {
    button.hidden = false;
    paintFavourite(button, saved.has(id));
    button.addEventListener('click', () => {
      if (saved.has(id)) saved.delete(id);
      else saved.add(id);
      paintFavourite(button, saved.has(id));
      try {
        localStorage.setItem(storageKey, JSON.stringify([...saved]));
      } catch {
        // Keep the current page state if storage is unavailable.
      }
      if (savedFilter.getAttribute('aria-pressed') === 'true') {
        showMatches();
        if (row.hidden) savedFilter.focus();
      }
    });
  }
  search.addEventListener('input', showMatches);
  savedFilter.addEventListener('click', () => {
    savedFilter.setAttribute('aria-pressed', String(savedFilter.getAttribute('aria-pressed') !== 'true'));
    showMatches();
  });
  clear.addEventListener('click', () => {
    reset();
    search.focus();
  });
  for (const link of menu.querySelectorAll('.categories a')) {
    link.addEventListener('click', () => {
      if (openBeforeFilter) reset();
    }, { capture: true });
  }
  toolbar.hidden = false;
  status.hidden = false;
  showMatches();
}

const about = document.querySelector('.about');
if (about) {
  const index = about.querySelector('.about-tabs');
  const tabs = [...index.querySelectorAll('button')];
  const scenes = [...about.querySelectorAll('.about-scene')];

  function showScene(selected) {
    tabs.forEach((tab, position) => {
      const active = position === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      scenes[position].hidden = !active;
      scenes[position].toggleAttribute('data-active', active);
    });
  }

  index.setAttribute('role', 'tablist');
  tabs.forEach((tab, position) => {
    const scene = scenes[position];
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', scene.id);
    scene.setAttribute('role', 'tabpanel');
    scene.setAttribute('aria-labelledby', tab.id);
    scene.tabIndex = 0;
    tab.addEventListener('click', () => showScene(position));
    tab.addEventListener('keydown', (event) => {
      const next = {
        ArrowRight: (position + 1) % tabs.length,
        ArrowLeft: (position + tabs.length - 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      showScene(next);
      tabs[next].focus();
    });
  });
  showScene(0);
  index.hidden = false;
}
