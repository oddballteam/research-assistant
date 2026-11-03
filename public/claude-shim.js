/* Stands in for Claude's artifact runtime. The Research Assistant asks window.claude.use("downloads")
   for one thing: saving a Markdown file. It never generates text, so there is no server call, no key
   and no sign-in. Drafts live in this browser's localStorage (key: va-research-assistant-v1), which the app
   manages itself. */
(function () {
  'use strict';
  var root = globalThis;

  var downloads = {
    save: async function (o) {
      var blob = o.data instanceof Blob ? o.data : new Blob([String(o.data)], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = o.filename || 'download'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
  };

  root.claude = {
    use: function (name) {
      if (name === 'downloads') return Promise.resolve(downloads);
      /* Nothing else is offered here. The app treats a null answer as "not available" and falls back to Copy. */
      return Promise.resolve(null);
    }
  };
})();
