const fs = require('node:fs');
const path = require('node:path');
const { root, searchEntries, searchSource } = require('./site-utils.cjs');

fs.writeFileSync(path.join(root, 'assets/js/search-index.js'), searchSource(), 'utf8');
console.log('Search index updated: ' + searchEntries().length + ' pages and sections.');
