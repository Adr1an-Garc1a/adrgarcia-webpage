// Runs synchronously in <head> to avoid a flash of the wrong theme.
// Kept tiny and external so the CSP can forbid inline scripts.
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var stored = null;
  try {
    stored = window.localStorage.getItem('theme');
  } catch (e) {
    /* storage unavailable (private mode, blocked) */
  }
  var dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
})();
