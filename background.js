// background.js — MV3 background service worker.
//
// This is the ONLY networking context in the realtime-challenges pipeline.
// It owns the single Socket.IO connection to the Flask-SocketIO relay server
// (forced to the "websocket" transport so it never touches LeetCode's page
// CSP or relies on XHR polling). It is a pure bridge: content scripts
// (match.js) send it outbound events via chrome.runtime.sendMessage, and it
// forwards every inbound socket event to all LeetCode tabs via
// chrome.tabs.sendMessage. It contains NO game logic and NO winner
// computation - that all lives in match.js.

importScripts("socket.io.min.js");

const BASE_URL = "https://leetcode-friends.duckdns.org";
const HEARTBEAT_INTERVAL_MS = 20000;

let socket = null;
let currentUsername = null;
let heartbeatTimer = null;
const activeMatchIds = new Set();
const knownTabIds = new Set();

// --- persistence: lets the SW rehydrate identity/active matches after MV3
// idle eviction, without needing the content script to resend everything. ---

async function loadPersistedState() {
  const stored = await chrome.storage.session.get(["username", "activeMatchIds"]);
  currentUsername = stored.username || null;
  (stored.activeMatchIds || []).forEach((id) => activeMatchIds.add(id));
}

function persistState() {
  chrome.storage.session.set({
    username: currentUsername,
    activeMatchIds: Array.from(activeMatchIds)
  });
}

// --- tab bookkeeping (avoids needing the "tabs" permission / tabs.query) ---

function rememberTab(sender) {
  if (sender?.tab?.id != null) knownTabIds.add(sender.tab.id);
}

chrome.tabs.onRemoved.addListener((tabId) => knownTabIds.delete(tabId));

function broadcastToKnownTabs(message) {
  for (const tabId of knownTabIds) {
    chrome.tabs.sendMessage(tabId, message).catch(() => {
      // Tab navigated away / content script not yet injected - ignore.
      knownTabIds.delete(tabId);
    });
  }
}

// --- heartbeat: keeps the SW's WebSocket "active" so Chrome 116+ extends
// the service worker's lifetime past the usual ~30s idle timeout, but only
// while a match is actually in progress (no need to keep it alive otherwise;
// GET /challenges/pending covers offline invite delivery). ---

function updateHeartbeat() {
  const shouldRun = !!socket?.connected && activeMatchIds.size > 0;
  if (shouldRun && !heartbeatTimer) {
    heartbeatTimer = setInterval(() => {
      if (socket?.connected) socket.emit("heartbeat", { ts: Date.now() });
    }, HEARTBEAT_INTERVAL_MS);
  } else if (!shouldRun && heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function endMatch(matchId) {
  if (matchId == null) return;
  activeMatchIds.delete(matchId);
  persistState();
  updateHeartbeat();
}

// --- socket lifecycle ---

// Every event the relay server might emit is forwarded verbatim to all known
// LeetCode tabs; match.js instances filter by match_id/challenge_id. This
// keeps the SW's routing logic simple and self-healing across SW restarts.
const RELAYED_EVENTS = [
  "identified",
  "error",
  "challenge:create:ack",
  "challenge:incoming",
  "challenge:accepted",
  "challenge:declined",
  "match:joined",
  "on_problem",
  "countdown_start",
  "submission_result",
  "concede"
];

function ensureSocket() {
  if (socket) return socket;

  socket = io(BASE_URL, {
    transports: ["websocket"],
    reconnection: true
  });

  socket.on("connect", () => {
    if (currentUsername) socket.emit("identify", { username: currentUsername });
    updateHeartbeat();
  });

  socket.on("disconnect", () => {
    updateHeartbeat();
  });

  RELAYED_EVENTS.forEach((eventName) => {
    socket.on(eventName, (data) => {
      broadcastToKnownTabs({ type: `SOCKET_EVENT:${eventName}`, data });

      if (eventName === "match:joined" && data?.match_id != null) {
        activeMatchIds.add(data.match_id);
        persistState();
        updateHeartbeat();
      }
      if (eventName === "concede" && data?.match_id != null) {
        endMatch(data.match_id);
      }
    });
  });

  return socket;
}

// --- inbound messages from content scripts (match.js) ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  rememberTab(sender);
  handleContentMessage(message).then(sendResponse);
  return true; // keep the message channel open for the async response
});

async function handleContentMessage(message) {
  const sock = ensureSocket();

  switch (message?.type) {
    case "IDENTIFY":
      currentUsername = message.username;
      persistState();
      if (sock.connected) sock.emit("identify", { username: currentUsername });
      return { ok: true };

    case "CHALLENGE_CREATE":
      sock.emit("challenge:create", {
        challenger_username: message.challengerUsername,
        opponent_username: message.opponentUsername,
        title_slug: message.titleSlug,
        title: message.title
      });
      return { ok: true };

    case "CHALLENGE_ACCEPT":
      sock.emit("challenge:accept", { challenge_id: message.challengeId, username: message.username });
      return { ok: true };

    case "CHALLENGE_DECLINE":
      sock.emit("challenge:decline", { challenge_id: message.challengeId, username: message.username });
      return { ok: true };

    case "MATCH_JOIN":
      sock.emit("match:join", { match_id: message.matchId, username: message.username });
      return { ok: true };

    case "ON_PROBLEM":
      sock.emit("on_problem", { match_id: message.matchId });
      return { ok: true };

    case "COUNTDOWN_START":
      sock.emit("countdown_start", { match_id: message.matchId, start_at: message.startAt });
      return { ok: true };

    case "SUBMISSION_RESULT":
      sock.emit("submission_result", { match_id: message.matchId, ...message.result });
      return { ok: true };

    case "CONCEDE":
      sock.emit("concede", { match_id: message.matchId });
      endMatch(message.matchId);
      return { ok: true };

    case "MATCH_ENDED":
      endMatch(message.matchId);
      return { ok: true };

    case "CHALLENGE_RESULT":
      return postChallengeResult(message.payload);

    case "GET_STATE":
      return {
        username: currentUsername,
        activeMatchIds: Array.from(activeMatchIds),
        connected: !!sock.connected
      };

    default:
      return { ok: false, error: `Unknown message type: ${message?.type}` };
  }
}

async function postChallengeResult(payload) {
  try {
    const res = await fetch(`${BASE_URL}/challenge/result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (payload?.challenge_id != null) endMatch(payload.challenge_id);
    return { ok: res.ok, data };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// --- startup ---

loadPersistedState().then(() => {
  ensureSocket();
});
