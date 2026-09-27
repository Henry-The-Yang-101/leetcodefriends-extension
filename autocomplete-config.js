// Pass the packaged worker URL to the page-world Monaco integration.
document.documentElement.dataset.lcfPyrightWorker = chrome.runtime.getURL("vendor/pyright-worker.js");
