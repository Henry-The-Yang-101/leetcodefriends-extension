// Attach free language services to LeetCode's existing Monaco editor.
(() => {
  if (window.__lcfAutocomplete) return;

  const configuredEditors = new WeakSet();
  const registeredLanguages = new Set();
  const installedTypeDefaults = new WeakSet();
  const state = window.__lcfAutocomplete = {
    ready: false,
    editorCount: 0,
    registeredLanguages: [],
    pythonEngine: "waiting",
    typescriptEngine: "waiting"
  };

  // These imports model the modules observed in LeetCode's Python3 runner.
  // They exist only in Pyright's virtual document; the user's code is untouched.
  const pythonPrelude = [
    "from bisect import *", "from collections import *", "from copy import *",
    "from datetime import *", "from functools import *", "from heapq import *",
    "from io import *", "from itertools import *", "from math import *",
    "from operator import *", "from random import *", "from re import *",
    "from statistics import *", "from string import *", "from sys import *",
    "from sortedcontainers import *", "import sortedcontainers",
    "from typing import *", "import bisect, collections, copy, datetime, functools, heapq",
    "import io, itertools, json, math, operator, os, random, re",
    "import statistics, string, sys, time"
  ].join("\n") + "\n";
  const preludeLines = pythonPrelude.split("\n").length - 1;
  let pyrightStarted = false;

  function installLodashTypes(monaco) {
    const defaults = monaco.languages?.typescript;
    if (!defaults || !Array.isArray(window.__lcfLodashTypes)) return;
    for (const typeDefaults of [defaults.javascriptDefaults, defaults.typescriptDefaults]) {
      if (!typeDefaults?.addExtraLib || installedTypeDefaults.has(typeDefaults)) continue;
      for (const file of window.__lcfLodashTypes) {
        typeDefaults.addExtraLib(file.source, file.path);
      }
      installedTypeDefaults.add(typeDefaults);
    }
    state.typescriptEngine = "Monaco TypeScript service with lodash types";
  }

  function shiftRange(range) {
    if (!range) return range;
    if (range.insert && range.replace) {
      return { insert: shiftRange(range.insert), replace: shiftRange(range.replace) };
    }
    return {
      ...range,
      startLineNumber: range.startLineNumber - preludeLines,
      endLineNumber: range.endLineNumber - preludeLines
    };
  }

  function registerPython(monaco, provider) {
    for (const language of ["python3"]) {
      if (registeredLanguages.has(language)) continue;
      monaco.languages.registerCompletionItemProvider(language, {
        triggerCharacters: ["."],
        async provideCompletionItems(model, position) {
          // Pyright supplies parsing, scope analysis, builtins and member lookup.
          const result = await provider.lspClient.getCompletion(
            pythonPrelude + model.getValue(),
            { line: position.lineNumber + preludeLines - 1, character: position.column - 1 }
          );
          const items = Array.isArray(result) ? result : result?.items || [];
          const word = model.getWordUntilPosition(position);
          const suggestions = items.map(item => {
            const completion = provider.convertCompletionItem(item);
            // LSP and Monaco assign different numbers to the same kind names.
            const kindName = window.__lcfLspCompletionItemKindNames?.[item.kind];
            completion.kind = monaco.languages.CompletionItemKind[kindName] ??
              monaco.languages.CompletionItemKind.Text;
            completion.range = shiftRange(completion.range) || {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: position.column
            };
            if (completion.additionalTextEdits) {
              completion.additionalTextEdits = completion.additionalTextEdits
                .map(edit => ({ ...edit, range: shiftRange(edit.range) }))
                .filter(edit => edit.range.startLineNumber > 0);
            }
            return completion;
          }).filter(item => {
            const range = item.range?.replace || item.range;
            return range?.startLineNumber > 0;
          });
          return { suggestions, incomplete: !Array.isArray(result) && !!result?.isIncomplete };
        }
      });
      registeredLanguages.add(language);
    }
    state.registeredLanguages = [...registeredLanguages];
  }

  async function startPyright(monaco) {
    if (pyrightStarted || !window.__lcfPyrightProviderClass) return;
    const workerUrl = document.documentElement.dataset.lcfPyrightWorker;
    if (!workerUrl) return;
    pyrightStarted = true;
    state.pythonEngine = "loading Pyright";
    try {
      // Start on LeetCode's origin, then load the packaged worker on device.
      const bootstrap = URL.createObjectURL(new Blob(
        ["importScripts(" + JSON.stringify(workerUrl) + ");"],
        { type: "application/javascript" }
      ));
      const provider = new window.__lcfPyrightProviderClass(bootstrap, {
        typeStubs: window.__lcfPythonStubs,
        features: {
          hover: false, completion: false, signatureHelp: false,
          diagnostic: false, rename: false, findDefinition: false
        }
      });
      await Promise.race([
        provider.init(monaco),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Pyright startup timed out")), 20000))
      ]);
      registerPython(monaco, provider);
      state.pythonEngine = "Pyright ready";
    } catch (error) {
      state.pythonEngine = "unavailable: " + (error.message || String(error));
      console.warn("LeetCode Friends: Pyright could not start", error);
    }
  }

  function connect() {
    const monaco = window.monaco;
    if (!monaco?.editor?.getEditors) return;
    installLodashTypes(monaco);
    const editors = monaco.editor.getEditors().filter(editor => {
      const language = editor.getModel()?.getLanguageId();
      return language && language !== "plaintext";
    });
    for (const editor of editors) {
      if (configuredEditors.has(editor)) continue;
      editor.updateOptions({
        quickSuggestions: { other: true, comments: false, strings: false },
        suggestOnTriggerCharacters: true,
        wordBasedSuggestions: "currentDocument"
      });
      configuredEditors.add(editor);
    }
    state.editorCount = editors.length;
    state.ready = editors.length > 0;
    if (editors.some(editor => editor.getModel().getLanguageId() === "python3")) {
      void startPyright(monaco);
    }
  }

  connect();
  window.setInterval(connect, 1000);
})();
