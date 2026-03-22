(function () {
  var input = document.getElementById('tools-search');
  var list = document.querySelector('.service-list');
  var noResults = document.getElementById('tools-no-results');

  if (!input || !list) return;

  var dataEl = document.getElementById('tools-data');
  if (!dataEl) return;

  var tools = JSON.parse(dataEl.textContent);

  var fuse = new Fuse(tools, {
    keys: ['title', 'description', 'keywords'],
    threshold: 0.3,
    minMatchCharLength: 2,
  });

  var items = list.querySelectorAll('li');

  input.addEventListener('input', function () {
    var query = input.value.trim();

    if (query.length < 2) {
      items.forEach(function (li) { li.style.display = ''; });
      if (noResults) noResults.style.display = 'none';
      return;
    }

    var results = fuse.search(query);
    var matchedUrls = new Set(results.map(function (r) { return r.item.url; }));

    var anyVisible = false;
    items.forEach(function (li) {
      var link = li.querySelector('a');
      var href = link ? link.getAttribute('href') : '';
      if (matchedUrls.has(href)) {
        li.style.display = '';
        anyVisible = true;
      } else {
        li.style.display = 'none';
      }
    });

    if (noResults) noResults.style.display = anyVisible ? 'none' : '';
  });
})();
