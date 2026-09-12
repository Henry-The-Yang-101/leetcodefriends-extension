const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadContentScript() {
  const context = vm.createContext({
    chrome: {},
    console,
    document: {
      documentElement: { classList: { contains: () => false } }
    },
    fetch: () => {},
    requestAnimationFrame: () => {},
    setInterval,
    setTimeout,
    window: {
      addEventListener: () => {},
      innerHeight: 800,
      location: { pathname: '/' }
    }
  });
  const source = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');
  vm.runInContext(source, context);
  return context;
}

test('formatTimeAgo preserves activity feed labels', () => {
  const context = loadContentScript();
  const labels = vm.runInContext(`[
    formatTimeAgo(970, new Date(1000 * 1000)),
    formatTimeAgo(880, new Date(1000 * 1000)),
    formatTimeAgo(-6200, new Date(1000 * 1000)),
    formatTimeAgo(-171800, new Date(1000 * 1000))
  ]`, context);

  assert.deepEqual(Array.from(labels), [
    'just now',
    '2 minutes ago',
    '2 hours ago',
    '2 days ago'
  ]);
});

test('positionPopup keeps the popup inside the viewport', () => {
  const context = loadContentScript();
  const result = vm.runInContext(`(() => {
    const popup = { style: {} };
    const button = { getBoundingClientRect: () => ({ bottom: 40 }) };
    positionPopup(popup, button);
    return popup.style;
  })()`, context);

  assert.equal(result.top, '52px');
  assert.equal(result.right, '3px');
  assert.equal(result.maxHeight, '736px');
});
