"use strict";

const port = Number(process.argv[2] || 9448);
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
const serviceWorker = targets.find((target) => (
  target.type === "service_worker" && target.url.endsWith("/background/service-worker.js")
));
const page = targets.find((target) => target.type === "page" && /^https?:/.test(target.url));

if (!serviceWorker || !page) {
  throw new Error("Could not find the extension service worker and a page target");
}

const extensionId = new URL(serviceWorker.url).host;
const socket = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
const events = [];
let nextId = 1;

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) {
      request.reject(new Error(message.error.message));
    } else {
      request.resolve(message.result);
    }
    return;
  }
  if (["Runtime.exceptionThrown", "Runtime.consoleAPICalled", "Log.entryAdded"].includes(message.method)) {
    events.push(message);
  }
});

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

function send(method, params = {}) {
  const id = nextId;
  nextId += 1;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

await send("Runtime.enable");
await send("Log.enable");
await send("Page.enable");
await send("Page.navigate", { url: `chrome-extension://${extensionId}/index.html` });
await delay(2_000);

const evaluation = await send("Runtime.evaluate", {
  expression: `({
    url: location.href,
    title: document.title,
    bodyText: document.body?.innerText,
    htmlLength: document.documentElement?.outerHTML.length,
    appChildren: document.querySelector("#app")?.childElementCount,
    appHtml: document.querySelector("#app")?.innerHTML.slice(0, 300),
    vueComponentCount: document.querySelectorAll(
      ".setting-row,.platform-row,.color-field"
    ).length,
    actionSwitches: [
      "action-plus-one",
      "action-reply",
      "action-favorite",
      "side-chat-capsule-bilibili",
      "side-chat-capsule-douyu",
      "side-chat-capsule-huya"
    ].map((id) => ({
      id,
      present: Boolean(document.getElementById(id)),
      checked: Boolean(document.getElementById(id)?.checked)
    })),
    colorFieldCount: document.querySelectorAll(".color-field").length,
    readyState: document.readyState
  })`,
  returnByValue: true
});

const saveRoundTrip = await send("Runtime.evaluate", {
  expression: `(async () => {
    const input = document.getElementById("action-reply");
    const sideChatInput = document.getElementById("side-chat-capsule-bilibili");
    const originalSideChatValue = sideChatInput.checked;
    input.checked = false;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    sideChatInput.checked = !originalSideChatValue;
    sideChatInput.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 250));
    const saved = await chrome.storage.sync.get(null);
    const persisted = saved.actions?.reply === false;
    const sideChatPersisted = saved.sideChatCapsule?.bilibili === !originalSideChatValue;
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    sideChatInput.checked = originalSideChatValue;
    sideChatInput.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      persisted,
      restored: input.checked === true,
      sideChatPersisted,
      sideChatRestored: sideChatInput.checked === originalSideChatValue
    };
  })()`,
  returnByValue: true,
  awaitPromise: true
});

const value = evaluation.result.value;
const roundTripValue = saveRoundTrip.result.value;
console.log(JSON.stringify({ extensionId, result: value, saveRoundTrip: roundTripValue, events }, null, 2));
if (!value.appChildren
    || value.actionSwitches.some((item) => !item.present)
    || value.colorFieldCount !== 30
    || !roundTripValue.persisted
    || !roundTripValue.restored
    || !roundTripValue.sideChatPersisted
    || !roundTripValue.sideChatRestored
    || events.some((event) => event.method === "Runtime.exceptionThrown")) {
  process.exitCode = 1;
}
socket.close();
