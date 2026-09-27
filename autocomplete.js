// Runs in LeetCode's page context so it can use the Monaco instance already
// powering the code editor. Suggestions are generated locally; no API is used.
(() => {
  if (window.__lcfAutocomplete) return;

  const pythonBuiltins = [
    "abs", "all", "any", "bin", "bool", "chr", "dict", "divmod",
    "enumerate", "filter", "float", "frozenset", "getattr", "hasattr",
    "hash", "hex", "int", "isinstance", "iter", "len", "list", "map",
    "max", "min", "next", "object", "ord", "pow", "print", "range",
    "reversed", "round", "set", "slice", "sorted", "str", "sum", "tuple",
    "type", "zip"
  ];
  const registeredLanguages = new Set();
  const configuredEditors = new WeakSet();

  const state = window.__lcfAutocomplete = {
    ready: false,
    editorCount: 0,
    registeredLanguages: []
  };

  function provideCompletions(monaco, model, position) {
    const word = model.getWordUntilPosition(position);
    const prefix = word.word.toLowerCase();
    if (!prefix) return { suggestions: [] };

    const range = {
      startLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endLineNumber: position.lineNumber,
      endColumn: word.endColumn
    };
    const language = model.getLanguageId();
    const suggestions = [];
    const seen = new Set();

    // Monaco's own matching, ranking, and suggestion widget handle display.
    // These local candidates fill the gap when LeetCode disables completion.
    if (language === "python" || language === "python3") {
      for (const name of pythonBuiltins) {
        if (!name.startsWith(prefix)) continue;
        suggestions.push({
          label: name,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: name,
          range,
          detail: "Python built-in"
        });
        seen.add(name);
      }
    }

    const source = model.getValue();
    for (const match of source.matchAll(/\b[A-Za-z_][A-Za-z_0-9]*\b/g)) {
      const name = match[0];
      if (seen.has(name) || name.toLowerCase() === prefix ||
          !name.toLowerCase().startsWith(prefix)) continue;
      seen.add(name);
      suggestions.push({
        label: name,
        kind: monaco.languages.CompletionItemKind.Variable,
        insertText: name,
        range,
        detail: "In this solution"
      });
      if (suggestions.length >= 80) break;
    }

    return { suggestions };
  }

  function registerLanguage(monaco, language) {
    if (registeredLanguages.has(language)) return;
    monaco.languages.registerCompletionItemProvider(language, {
      provideCompletionItems(model, position) {
        return provideCompletions(monaco, model, position);
      }
    });
    registeredLanguages.add(language);
    state.registeredLanguages = [...registeredLanguages];
  }

  function connect() {
    const monaco = window.monaco;
    if (!monaco?.editor?.getEditors ||
        !monaco?.languages?.registerCompletionItemProvider) return;

    for (const editor of monaco.editor.getEditors()) {
      const model = editor.getModel();
      if (!model || model.getLanguageId() === "plaintext") continue;
      registerLanguage(monaco, model.getLanguageId());
      if (!configuredEditors.has(editor)) {
        editor.updateOptions({
          quickSuggestions: { other: true, comments: false, strings: false },
          suggestOnTriggerCharacters: true,
          wordBasedSuggestions: "currentDocument"
        });
        configuredEditors.add(editor);
      }
    }

    state.editorCount = monaco.editor.getEditors().filter(editor => {
      const model = editor.getModel();
      return model && model.getLanguageId() !== "plaintext";
    }).length;
    state.ready = state.editorCount > 0;
  }

  connect();
  // LeetCode mounts/replaces editors during navigation and language changes.
  window.setInterval(connect, 1000);
})();
