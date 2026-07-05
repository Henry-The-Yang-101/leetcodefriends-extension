// match.js — realtime 1v1 challenge controller (content script).
//
// This file contains ZERO networking. It owns the game state machine and the
// on-page overlays, and talks only to the background service worker via
// chrome.runtime.sendMessage (outbound) / chrome.runtime.onMessage (inbound).
// It relies on content.js (loaded before this file, see manifest.json) for
// shared helpers: isDarkMode() and showToastMessage().
//
// Exposes a small `window.LCFMatch` API that content.js's UI (friend cards,
// Challenges tab) calls into to create/accept/decline challenges.

const LCF_ACTIVE_MATCH_STORAGE_KEY = "lcfActiveMatch";
const LCF_COUNTDOWN_SECONDS = 3;
const LCF_URL_POLL_MS = 500;

const LCFMatchState = {
  username: null,
  activeMatch: null, // { matchId, titleSlug, title, challengerUsername, opponentUsername, role }
  onProblemSelf: false,
  onProblemOpponent: false,
  countdownStartAt: null,
  submissionSelf: null,
  submissionOpponent: null,
  matchEnded: false,
  onIncomingChallenge: null // optional callback content.js can register
};

function lcfIsDarkModeSafe() {
  return typeof isDarkMode === "function" ? isDarkMode() : false;
}

function lcfToast(message, type = "") {
  if (typeof showToastMessage === "function") {
    showToastMessage(message, type);
  }
}

// --- persistence across page navigations (LeetCode is a SPA; content
// scripts also fully reload when navigating to a new /problems/{slug} URL) ---

function lcfPersistActiveMatch() {
  chrome.storage.local.set({ [LCF_ACTIVE_MATCH_STORAGE_KEY]: LCFMatchState.activeMatch });
}

function lcfClearActiveMatch() {
  LCFMatchState.activeMatch = null;
  LCFMatchState.onProblemSelf = false;
  LCFMatchState.onProblemOpponent = false;
  LCFMatchState.countdownStartAt = null;
  LCFMatchState.submissionSelf = null;
  LCFMatchState.submissionOpponent = null;
  LCFMatchState.matchEnded = false;
  chrome.storage.local.remove(LCF_ACTIVE_MATCH_STORAGE_KEY);
}

async function lcfRestoreActiveMatch() {
  const stored = await chrome.storage.local.get([LCF_ACTIVE_MATCH_STORAGE_KEY]);
  const match = stored[LCF_ACTIVE_MATCH_STORAGE_KEY];
  if (match) {
    LCFMatchState.activeMatch = match;
    chrome.runtime.sendMessage({
      type: "MATCH_JOIN",
      matchId: match.matchId,
      username: LCFMatchState.username
    });
  }
}

// --- identity: reuses the same window "LEETCODE_USERNAME" postMessage that
// content.js's injected username_obtainer.js already broadcasts. ---

window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data?.type === "LEETCODE_USERNAME" && event.data.username) {
    LCFMatchState.username = event.data.username;
    chrome.runtime.sendMessage({ type: "IDENTIFY", username: LCFMatchState.username });
    lcfRestoreActiveMatch();
  }

  if (event.data?.type === "SUBMISSION_RESULT") {
    lcfHandleLocalSubmission(event.data);
  }
});

// --- injecting the page-context submission interceptor (only while a match
// on the matching problem is active, to avoid patching fetch/XHR on every
// LeetCode page load for users who never use challenges) ---

let lcfInterceptorInjected = false;
function lcfInjectSubmissionInterceptor() {
  if (lcfInterceptorInjected) return;
  lcfInterceptorInjected = true;
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("submission_interceptor.js");
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
}

function lcfHandleLocalSubmission(data) {
  const match = LCFMatchState.activeMatch;
  if (!match || LCFMatchState.matchEnded) return;
  if (data.statusMsg !== "Accepted") return;
  if (data.titleSlug && data.titleSlug !== match.titleSlug) return;
  if (LCFMatchState.submissionSelf) return; // only the first accepted submission counts

  LCFMatchState.submissionSelf = {
    runtimePercentile: data.runtimePercentile,
    memoryPercentile: data.memoryPercentile,
    submittedAt: data.timestamp
  };

  chrome.runtime.sendMessage({
    type: "SUBMISSION_RESULT",
    matchId: match.matchId,
    result: {
      username: LCFMatchState.username,
      runtime_percentile: data.runtimePercentile,
      memory_percentile: data.memoryPercentile,
      submitted_at: data.timestamp
    }
  });

  lcfRenderWaitingForOpponentBanner();
  lcfMaybeResolveMatch();
}

// --- URL presence detection ---

function lcfIsOnMatchProblemPage() {
  const match = LCFMatchState.activeMatch;
  if (!match) return false;
  return window.location.pathname.startsWith(`/problems/${match.titleSlug}`);
}

function lcfCheckUrlForOnProblem() {
  const match = LCFMatchState.activeMatch;
  if (!match || LCFMatchState.matchEnded) return;
  if (!lcfIsOnMatchProblemPage()) return;
  if (LCFMatchState.onProblemSelf) return;

  LCFMatchState.onProblemSelf = true;
  lcfInjectSubmissionInterceptor();
  lcfRenderWaitingOverlay();
  chrome.runtime.sendMessage({ type: "ON_PROBLEM", matchId: match.matchId });
  lcfMaybeStartCountdown();
}

setInterval(lcfCheckUrlForOnProblem, LCF_URL_POLL_MS);

// --- countdown (host = challenger picks startAt; both clients count down to
// the same target timestamp) ---

function lcfMaybeStartCountdown() {
  const match = LCFMatchState.activeMatch;
  if (!match || match.role !== "challenger") return;
  if (!LCFMatchState.onProblemSelf || !LCFMatchState.onProblemOpponent) return;
  if (LCFMatchState.countdownStartAt) return;

  // Small buffer so the relayed countdown_start reaches the opponent before
  // the target time arrives, keeping both sides' 3-2-1 in sync.
  const startAt = Date.now() + 800 + LCF_COUNTDOWN_SECONDS * 1000;
  LCFMatchState.countdownStartAt = startAt;
  chrome.runtime.sendMessage({ type: "COUNTDOWN_START", matchId: match.matchId, startAt });
  lcfRenderCountdownOverlay(startAt);
}

function lcfOnRemoteOnProblem() {
  LCFMatchState.onProblemOpponent = true;
  lcfMaybeStartCountdown();
}

function lcfOnRemoteCountdownStart(startAt) {
  if (LCFMatchState.countdownStartAt) return;
  LCFMatchState.countdownStartAt = startAt;
  lcfRenderCountdownOverlay(startAt);
}

// --- winner computation ---

function lcfCompareSubmissions(a, b) {
  // Returns 1 if a beats b, -1 if b beats a, 0 if truly tied.
  if (a.runtimePercentile !== b.runtimePercentile) {
    return a.runtimePercentile > b.runtimePercentile ? 1 : -1;
  }
  if (a.memoryPercentile !== b.memoryPercentile) {
    return a.memoryPercentile > b.memoryPercentile ? 1 : -1;
  }
  if (a.submittedAt !== b.submittedAt) {
    return a.submittedAt < b.submittedAt ? 1 : -1;
  }
  return 0;
}

function lcfMaybeResolveMatch() {
  if (LCFMatchState.matchEnded) return;
  if (!LCFMatchState.submissionSelf || !LCFMatchState.submissionOpponent) return;

  const cmp = lcfCompareSubmissions(LCFMatchState.submissionSelf, LCFMatchState.submissionOpponent);
  const iWon = cmp >= 0; // ties (shouldn't really happen) favor nobody in particular; treat as a draw-ish self win-free case
  lcfEndMatch({
    outcome: cmp === 0 ? "draw" : (iWon ? "win" : "lose"),
    reason: "submission"
  });
}

// --- match end / reporting ---

function lcfEndMatch({ outcome, reason }) {
  if (LCFMatchState.matchEnded) return;
  LCFMatchState.matchEnded = true;

  const match = LCFMatchState.activeMatch;
  lcfRenderResultOverlay(outcome, reason);

  if (match) {
    const winnerUsername =
      outcome === "win" ? LCFMatchState.username :
      outcome === "lose" ? lcfOpponentUsername() :
      null;

    const isChallenger = match.role === "challenger";
    const challengerSub = isChallenger ? LCFMatchState.submissionSelf : LCFMatchState.submissionOpponent;
    const opponentSub = isChallenger ? LCFMatchState.submissionOpponent : LCFMatchState.submissionSelf;

    chrome.runtime.sendMessage({
      type: "CHALLENGE_RESULT",
      payload: {
        challenge_id: match.matchId,
        winner_username: winnerUsername,
        challenger_runtime_pct: challengerSub?.runtimePercentile ?? null,
        challenger_memory_pct: challengerSub?.memoryPercentile ?? null,
        opponent_runtime_pct: opponentSub?.runtimePercentile ?? null,
        opponent_memory_pct: opponentSub?.memoryPercentile ?? null,
        challenger_submitted_at: challengerSub?.submittedAt ?? null,
        opponent_submitted_at: opponentSub?.submittedAt ?? null
      }
    });
    chrome.runtime.sendMessage({ type: "MATCH_ENDED", matchId: match.matchId });
  }

  setTimeout(lcfClearActiveMatch, 15000);
}

function lcfOpponentUsername() {
  const match = LCFMatchState.activeMatch;
  if (!match) return null;
  return match.role === "challenger" ? match.opponentUsername : match.challengerUsername;
}

function lcfConcede() {
  const match = LCFMatchState.activeMatch;
  if (!match || LCFMatchState.matchEnded) return;
  chrome.runtime.sendMessage({ type: "CONCEDE", matchId: match.matchId });
  lcfEndMatch({ outcome: "lose", reason: "concede" });
}

function lcfOnRemoteConcede() {
  if (LCFMatchState.matchEnded) return;
  lcfEndMatch({ outcome: "win", reason: "opponent_concede" });
}

// --- inbound socket events (relayed by background.js) ---

chrome.runtime.onMessage.addListener((message) => {
  if (!message?.type || !message.type.startsWith("SOCKET_EVENT:")) return;
  const eventName = message.type.slice("SOCKET_EVENT:".length);
  const data = message.data || {};
  const match = LCFMatchState.activeMatch;

  switch (eventName) {
    case "error":
      lcfToast(data.error || "Something went wrong", "error");
      break;

    case "challenge:incoming":
      if (typeof LCFMatchState.onIncomingChallenge === "function") {
        LCFMatchState.onIncomingChallenge(data);
      }
      break;

    case "challenge:accepted": {
      const role = data.challenger_username === LCFMatchState.username ? "challenger" : "opponent";
      LCFMatchState.activeMatch = {
        matchId: data.match_id,
        titleSlug: data.title_slug,
        title: data.title,
        challengerUsername: data.challenger_username,
        opponentUsername: data.opponent_username,
        role
      };
      lcfPersistActiveMatch();
      chrome.runtime.sendMessage({
        type: "MATCH_JOIN",
        matchId: data.match_id,
        username: LCFMatchState.username
      });
      lcfToast(`Challenge on! Heading to "${data.title || data.title_slug}"...`, "success");
      lcfNavigateToProblem(data.title_slug);
      break;
    }

    case "challenge:declined":
      lcfToast(`${data.opponent_username} declined your challenge.`, "error");
      break;

    case "on_problem":
      if (match && data.match_id === match.matchId) lcfOnRemoteOnProblem();
      break;

    case "countdown_start":
      if (match && data.match_id === match.matchId) lcfOnRemoteCountdownStart(data.start_at);
      break;

    case "submission_result":
      if (match && data.match_id === match.matchId && !LCFMatchState.submissionOpponent) {
        LCFMatchState.submissionOpponent = {
          runtimePercentile: data.runtime_percentile,
          memoryPercentile: data.memory_percentile,
          submittedAt: data.submitted_at
        };
        lcfMaybeResolveMatch();
      }
      break;

    case "concede":
      if (match && data.match_id === match.matchId) lcfOnRemoteConcede();
      break;

    default:
      break;
  }
});

function lcfNavigateToProblem(titleSlug) {
  const targetPath = `/problems/${titleSlug}/`;
  if (!window.location.pathname.startsWith(`/problems/${titleSlug}`)) {
    window.location.href = `https://leetcode.com${targetPath}`;
  }
}

// --- overlays ---

let lcfOverlayEl = null;

function lcfRemoveOverlay() {
  if (lcfOverlayEl) {
    lcfOverlayEl.remove();
    lcfOverlayEl = null;
  }
}

function lcfBaseOverlayStyles(el) {
  const dark = lcfIsDarkModeSafe();
  el.style.position = "fixed";
  el.style.inset = "0";
  el.style.zIndex = "2147483647";
  el.style.display = "flex";
  el.style.flexDirection = "column";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.fontFamily = '"Roboto Mono", monospace';
  el.style.backgroundColor = dark ? "rgba(15, 15, 15, 0.88)" : "rgba(255, 255, 255, 0.9)";
  el.style.backdropFilter = "blur(6px)";
  el.style.color = dark ? "#e0e0e0" : "#1a1a1a";
  el.style.textAlign = "center";
  el.style.gap = "12px";
}

function lcfRenderWaitingOverlay() {
  lcfRemoveOverlay();
  lcfOverlayEl = document.createElement("div");
  lcfBaseOverlayStyles(lcfOverlayEl);

  const title = document.createElement("div");
  title.textContent = "⚔️ Waiting for your opponent to arrive...";
  title.style.fontSize = "22px";
  title.style.fontWeight = "bold";

  const subtitle = document.createElement("div");
  subtitle.textContent = "The 3-second countdown starts as soon as you're both here.";
  subtitle.style.fontSize = "14px";
  subtitle.style.opacity = "0.8";

  lcfOverlayEl.appendChild(title);
  lcfOverlayEl.appendChild(subtitle);
  lcfOverlayEl.appendChild(lcfBuildConcedeButton());
  document.body.appendChild(lcfOverlayEl);
}

function lcfRenderWaitingForOpponentBanner() {
  // Called after we've submitted but the opponent hasn't finished yet.
  if (!lcfOverlayEl) return;
  lcfRemoveOverlay();
  lcfOverlayEl = document.createElement("div");
  lcfBaseOverlayStyles(lcfOverlayEl);
  lcfOverlayEl.style.backgroundColor = "transparent";
  lcfOverlayEl.style.backdropFilter = "none";
  lcfOverlayEl.style.pointerEvents = "none";
  lcfOverlayEl.style.justifyContent = "flex-start";
  lcfOverlayEl.style.paddingTop = "16px";

  const banner = document.createElement("div");
  banner.textContent = "✅ Submitted! Waiting for your opponent to finish...";
  banner.style.pointerEvents = "auto";
  banner.style.backgroundColor = "#ffa116";
  banner.style.color = "#1a1a1a";
  banner.style.padding = "10px 20px";
  banner.style.borderRadius = "8px";
  banner.style.fontWeight = "bold";
  banner.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";

  lcfOverlayEl.appendChild(banner);
  document.body.appendChild(lcfOverlayEl);
}

function lcfBuildConcedeButton() {
  const button = document.createElement("button");
  button.textContent = "Concede";
  button.style.marginTop = "8px";
  button.style.padding = "8px 20px";
  button.style.backgroundColor = "#dc3545";
  button.style.color = "#fff";
  button.style.border = "none";
  button.style.borderRadius = "8px";
  button.style.cursor = "pointer";
  button.style.fontFamily = '"Roboto Mono", monospace';
  button.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
  button.addEventListener("click", lcfConcede);
  return button;
}

function lcfRenderCountdownOverlay(startAt) {
  lcfRemoveOverlay();
  lcfOverlayEl = document.createElement("div");
  lcfBaseOverlayStyles(lcfOverlayEl);
  // Block all interaction with the problem/editor underneath until GO.
  lcfOverlayEl.style.pointerEvents = "auto";

  const number = document.createElement("div");
  number.style.fontSize = "96px";
  number.style.fontWeight = "bold";
  number.style.color = "#ffa116";

  const label = document.createElement("div");
  label.textContent = "Get ready to code!";
  label.style.fontSize = "16px";
  label.style.opacity = "0.85";

  lcfOverlayEl.appendChild(number);
  lcfOverlayEl.appendChild(label);
  document.body.appendChild(lcfOverlayEl);

  const tick = () => {
    if (!lcfOverlayEl) return; // overlay was replaced/removed (e.g. match ended early)
    const msLeft = startAt - Date.now();
    if (msLeft <= 0) {
      lcfRemoveOverlay();
      return;
    }
    const secondsLeft = Math.ceil(msLeft / 1000);
    number.textContent = secondsLeft <= 0 ? "GO!" : String(secondsLeft);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function lcfRenderResultOverlay(outcome, reason) {
  lcfRemoveOverlay();
  lcfOverlayEl = document.createElement("div");
  lcfBaseOverlayStyles(lcfOverlayEl);

  const messages = {
    win: { emoji: "🏆", text: "You win!" },
    lose: { emoji: "💀", text: "You lose!" },
    draw: { emoji: "🤝", text: "It's a tie!" }
  };
  const { emoji, text } = messages[outcome] || messages.draw;

  const title = document.createElement("div");
  title.textContent = `${emoji} ${text}`;
  title.style.fontSize = "40px";
  title.style.fontWeight = "bold";

  const subtitle = document.createElement("div");
  subtitle.style.fontSize = "14px";
  subtitle.style.opacity = "0.85";
  subtitle.textContent = lcfResultSubtitle(outcome, reason);

  const closeButton = document.createElement("button");
  closeButton.textContent = "Close";
  closeButton.style.marginTop = "12px";
  closeButton.style.padding = "8px 24px";
  closeButton.style.backgroundColor = "#ffa116";
  closeButton.style.color = "#1a1a1a";
  closeButton.style.border = "none";
  closeButton.style.borderRadius = "8px";
  closeButton.style.cursor = "pointer";
  closeButton.style.fontFamily = '"Roboto Mono", monospace';
  closeButton.style.fontWeight = "bold";
  closeButton.addEventListener("click", lcfRemoveOverlay);

  lcfOverlayEl.appendChild(title);
  lcfOverlayEl.appendChild(subtitle);
  lcfOverlayEl.appendChild(closeButton);
  document.body.appendChild(lcfOverlayEl);
}

function lcfResultSubtitle(outcome, reason) {
  if (reason === "concede") return "You conceded the match.";
  if (reason === "opponent_concede") return "Your opponent conceded or disconnected.";
  const self = LCFMatchState.submissionSelf;
  const opp = LCFMatchState.submissionOpponent;
  if (self && opp) {
    return `Runtime beats: you ${self.runtimePercentile?.toFixed(1)}% vs opponent ${opp.runtimePercentile?.toFixed(1)}%`;
  }
  return "";
}

// --- public API for content.js's UI (friend cards, Challenges tab) ---

window.LCFMatch = {
  setIncomingChallengeHandler(fn) {
    LCFMatchState.onIncomingChallenge = fn;
  },
  getUsername() {
    return LCFMatchState.username;
  },
  sendChallenge(opponentUsername, titleSlug, title) {
    chrome.runtime.sendMessage({
      type: "CHALLENGE_CREATE",
      challengerUsername: LCFMatchState.username,
      opponentUsername,
      titleSlug,
      title
    });
  },
  acceptChallenge(challengeId) {
    chrome.runtime.sendMessage({
      type: "CHALLENGE_ACCEPT",
      challengeId,
      username: LCFMatchState.username
    });
  },
  declineChallenge(challengeId) {
    chrome.runtime.sendMessage({
      type: "CHALLENGE_DECLINE",
      challengeId,
      username: LCFMatchState.username
    });
  }
};
