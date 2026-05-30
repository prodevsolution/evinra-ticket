/* Evinra · Theme toggle (persisted + respects prefers-color-scheme)
   Dispatches `themechange` CustomEvent so charts/widgets can rebuild. */
(function(){
  const KEY  = 'evinra-theme';
  const root = document.documentElement;
  const mql  = window.matchMedia('(prefers-color-scheme: light)');

  // Initialize theme immediately
  const saved = localStorage.getItem(KEY);
  const initialTheme = saved || (mql.matches ? 'light' : 'dark');
  root.setAttribute('data-theme', initialTheme);
  root.dataset.theme = initialTheme;

  function setTheme(next){
    root.setAttribute('data-theme', next);
    root.dataset.theme = next;
    localStorage.setItem(KEY, next);
    console.log('Theme changed to:', next);
    window.dispatchEvent(new CustomEvent('themechange', {detail:{theme:next}}));
  }

  function bind(){
    const buttons = document.querySelectorAll('[data-toggle-theme]');
    console.log('Found toggle buttons:', buttons.length);
    buttons.forEach((btn, i) => {
      if (btn.__themeBound) return;
      btn.__themeBound = true;
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
        console.log('Toggle clicked, switching to:', next);
        setTheme(next);
      });
    });
  }

  // Bind immediately and on DOMContentLoaded
  bind();
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bind, {once:true});
  }

  // Listen for OS theme changes
  mql.addEventListener('change', e => {
    if (!localStorage.getItem(KEY)){
      const theme = e.matches ? 'light' : 'dark';
      root.setAttribute('data-theme', theme);
      root.dataset.theme = theme;
      window.dispatchEvent(new CustomEvent('themechange'));
    }
  });

  window.Evinra = Object.assign(window.Evinra || {}, { setTheme });
  console.log('Theme.js loaded, initial theme:', initialTheme);
})();
