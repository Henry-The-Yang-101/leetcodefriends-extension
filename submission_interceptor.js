(function () {
  // LeetCode polls this endpoint after a submission until it resolves
  // (state becomes "SUCCESS"). We only care about accepted submissions.
  const CHECK_URL_PATTERN = /\/submissions\/detail\/(\d+)\/check\/?/;

  /**
   * Extracts the current problem's title slug from the page URL, e.g.
   * "https://leetcode.com/problems/two-sum/" -> "two-sum".
   */
  function getTitleSlugFromLocation() {
    const match = window.location.pathname.match(/\/problems\/([^/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Reports an accepted submission up to the content script (match.js),
   * which forwards it to the background service worker for relay to the
   * opponent. We never touch the network beyond observing here.
   */
  function reportAcceptedSubmission(submissionId, result) {
    window.postMessage({
      type: "SUBMISSION_RESULT",
      submissionId,
      titleSlug: getTitleSlugFromLocation(),
      statusMsg: result.status_msg,
      runtimePercentile: result.runtime_percentile ?? null,
      memoryPercentile: result.memory_percentile ?? null,
      statusRuntime: result.status_runtime ?? null,
      statusMemory: result.status_memory ?? null,
      timestamp: Date.now()
    }, "*");
  }

  function handleCheckResponseJson(json) {
    if (!json) return;
    if (json.state === "SUCCESS" && json.status_msg === "Accepted") {
      reportAcceptedSubmission(json.submission_id ?? null, json);
    }
  }

  // --- fetch() interception ---
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url;
    const isCheckRequest = typeof url === "string" && CHECK_URL_PATTERN.test(url);

    const fetchPromise = originalFetch.apply(this, args);
    if (!isCheckRequest) return fetchPromise;

    return fetchPromise.then((response) => {
      response.clone().json()
        .then(handleCheckResponseJson)
        .catch(() => {});
      return response;
    });
  };

  // --- XMLHttpRequest interception (defensive; LeetCode primarily uses fetch) ---
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__lcfIsCheckRequest = typeof url === "string" && CHECK_URL_PATTERN.test(url);
    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    if (this.__lcfIsCheckRequest) {
      this.addEventListener("load", function () {
        try {
          handleCheckResponseJson(JSON.parse(this.responseText));
        } catch (e) {
          // ignore parse errors
        }
      });
    }
    return originalSend.apply(this, args);
  };
})();
