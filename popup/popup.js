(function initPopup() {
  "use strict";

  const shared = globalThis.BulletPlusOneShared;
  const fields = {
    enabled: document.querySelector("#enabled"),
    altClick: document.querySelector("#altClick"),
    huya: document.querySelector("#platform-huya"),
    bilibili: document.querySelector("#platform-bilibili"),
    douyin: document.querySelector("#platform-douyin")
  };
  const status = document.querySelector("#status");
  let statusTimer = 0;

  function readForm() {
    return {
      enabled: fields.enabled.checked,
      altClick: fields.altClick.checked,
      platforms: {
        huya: fields.huya.checked,
        bilibili: fields.bilibili.checked,
        douyin: fields.douyin.checked
      }
    };
  }

  function writeForm(settings) {
    fields.enabled.checked = settings.enabled;
    fields.altClick.checked = settings.altClick;
    fields.huya.checked = settings.platforms.huya;
    fields.bilibili.checked = settings.platforms.bilibili;
    fields.douyin.checked = settings.platforms.douyin;
  }

  function setStatus(message, kind) {
    clearTimeout(statusTimer);
    status.textContent = message;
    status.className = `status ${kind ? `is-${kind}` : ""}`;
    statusTimer = setTimeout(() => {
      status.textContent = "设置会自动保存";
      status.className = "status";
    }, 1600);
  }

  function save() {
    chrome.storage.sync.set(readForm(), () => {
      if (chrome.runtime.lastError) {
        setStatus("保存失败，请重试", "error");
      } else {
        setStatus("已保存", "saved");
      }
    });
  }

  chrome.storage.sync.get(null, (saved) => {
    writeForm(shared.mergeSettings(saved));
    Object.values(fields).forEach((field) => field.addEventListener("change", save));
  });
})();
