(function () {
'use strict';

function installMobileFilterDrawer() {
  const panel = document.querySelector('[data-perk-browser] .search-panel');
  if (!panel || panel.closest('.mobile-filter-shell')) return;

  const shell = document.createElement('div');
  shell.className = 'mobile-filter-shell';
  panel.parentNode.insertBefore(shell, panel);
  shell.appendChild(panel);

  if (!panel.id) panel.id = 'survivor-perk-filters';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mobile-filter-tab';
  button.textContent = 'Filters';
  button.setAttribute('aria-controls', panel.id);
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-label', 'Open perk filters');
  shell.appendChild(button);

  button.addEventListener('click', () => {
    const open = shell.classList.toggle('is-open');
    button.textContent = open ? 'Close' : 'Filters';
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close perk filters' : 'Open perk filters');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !shell.classList.contains('is-open')) return;
    shell.classList.remove('is-open');
    button.textContent = 'Filters';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Open perk filters');
    button.focus();
  });
}

document.addEventListener('DOMContentLoaded', installMobileFilterDrawer);
})();
