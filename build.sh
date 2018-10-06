parcel build src/main.ts --out-file masyu-solver.user.js --no-source-maps

# prepend userscript-header.js to built file
cat src/userscript-header.js > dist/tmpfile
cat dist/masyu-solver.user.js >> dist/tmpfile
rm dist/masyu-solver.user.js
mv dist/tmpfile dist/masyu-solver.user.js
