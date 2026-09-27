# Bundled autocomplete libraries

- [Monaco Pyright LSP](https://github.com/SardineFish/monaco-pyright-lsp), MIT. Its license is included at `vendor/monaco-pyright-lsp.LICENSE`. It packages [Pyright](https://github.com/microsoft/pyright), MIT, and Python type information for the local worker.
- [lodash TypeScript definitions](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/lodash), MIT, are bundled into `vendor/lodash-types.js` from the `@types/lodash` npm package.
- [sortedcontainers-stubs](https://github.com/h4l/sortedcontainers-stubs), Apache 2.0, supplies Python declarations for LeetCode's `SortedList`, `SortedDict`, and `SortedSet`. Its license is included at `vendor/sortedcontainers-stubs.LICENSE`.

Run `npm ci && npm run build:autocomplete` to rebuild the generated vendor files from the pinned package lock and checked-in Python stubs.
