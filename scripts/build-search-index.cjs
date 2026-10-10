const fs = require('node:fs');
const path = require('node:path');
const { root, searchEntries } = require('./site-utils.cjs');

fs.mkdirSync(path.join(root, 'src/data'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/data/search-index.json'), JSON.stringify(searchEntries(), null, 2) + '\n');
console.log('Search index updated: ' + searchEntries().length + ' pages and sections.');
