import { MonacoPyrightProvider } from "monaco-pyright-lsp";
import { CompletionItemKind as lspCompletionItemKind } from "vscode-languageserver/browser";

window.__lcfPyrightProviderClass = MonacoPyrightProvider;
window.__lcfLspCompletionItemKindNames = Object.fromEntries(
  Object.entries(lspCompletionItemKind).map(([name, value]) => [value, name])
);
