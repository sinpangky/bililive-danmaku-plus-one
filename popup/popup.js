(function initPopup() {
  "use strict";

  const shared = globalThis.BulletPlusOneShared;
  const PLATFORM_IDS = ["bilibili", "douyin", "huya"];
  const COLOR_FIELDS = [
    { key: "actionStart", label: "+1 渐变起始", defaultValue: "#FF8A34" },
    { key: "actionEnd", label: "+1 渐变结束", defaultValue: "#FF5F3D" },
    { key: "actionText", label: "+1 按钮文字", defaultValue: "#FFFFFF" },
    { key: "focusRing", label: "键盘焦点光环", defaultValue: "#FFB35E" },
    { key: "selection", label: "弹幕选中高亮", defaultValue: "#FF7C39" },
    { key: "panelBackground", label: "提示浮层背景", defaultValue: "#191B20" },
    { key: "panelText", label: "提示浮层文字", defaultValue: "#FFFFFF" },
    { key: "success", label: "成功状态", defaultValue: "#4FD38E" },
    { key: "warning", label: "警告状态", defaultValue: "#FFBF52" },
    { key: "error", label: "错误状态", defaultValue: "#FF5C5C" }
  ];
  const storage = globalThis.chrome?.storage?.sync || null;
  const status = document.querySelector("#status");
  const enabledControls = [
    document.querySelector("#enabled"),
    document.querySelector("#feature-enabled")
  ];
  const fields = {
    altClick: document.querySelector("#altClick"),
    huya: document.querySelector("#platform-huya"),
    bilibili: document.querySelector("#platform-bilibili"),
    douyin: document.querySelector("#platform-douyin")
  };
  const colorControls = new Map();
  let statusTimer = 0;

  function colorControlId(platform, key) {
    return `color-${platform}-${key}`;
  }

  function renderColorFields() {
    PLATFORM_IDS.forEach((platform) => {
      const grid = document.querySelector(`[data-color-grid="${platform}"]`);
      COLOR_FIELDS.forEach((field) => {
        const wrapper = document.createElement("div");
        const label = document.createElement("label");
        const labelText = document.createElement("span");
        const defaultText = document.createElement("small");
        const control = document.createElement("div");
        const picker = document.createElement("input");
        const text = document.createElement("input");
        const reset = document.createElement("button");
        const id = colorControlId(platform, field.key);

        wrapper.className = "color-field";
        wrapper.dataset.colorKey = field.key;
        label.className = "color-field__label";
        label.htmlFor = id;
        labelText.textContent = field.label;
        defaultText.textContent = `默认 ${field.defaultValue}`;
        label.append(labelText, defaultText);

        control.className = "color-control";
        picker.className = "color-picker";
        picker.type = "color";
        picker.value = field.defaultValue;
        picker.setAttribute("aria-label", `${field.label}选色`);
        text.className = "color-text";
        text.id = id;
        text.type = "text";
        text.inputMode = "text";
        text.maxLength = 7;
        text.placeholder = `默认 ${field.defaultValue}`;
        text.spellcheck = false;
        text.autocomplete = "off";
        reset.className = "color-reset";
        reset.type = "button";
        reset.textContent = "默认";
        reset.setAttribute("aria-label", `恢复${field.label}默认颜色`);
        control.append(picker, text, reset);
        wrapper.append(label, control);
        grid.append(wrapper);

        colorControls.set(`${platform}:${field.key}`, {
          defaultValue: field.defaultValue,
          picker,
          reset,
          text
        });
      });
    });
  }

  function readColors() {
    return Object.fromEntries(PLATFORM_IDS.map((platform) => [
      platform,
      Object.fromEntries(COLOR_FIELDS.map((field) => {
        const control = colorControls.get(`${platform}:${field.key}`);
        const current = shared.normalizeHexColor(control.text.value);
        const saved = shared.normalizeHexColor(control.text.dataset.savedValue);
        return [field.key, current || (control.text.value.trim() ? saved : "")];
      }).filter((entry) => entry[1]))
    ]));
  }

  function readForm() {
    return {
      enabled: enabledControls[0].checked,
      altClick: fields.altClick.checked,
      platforms: {
        huya: fields.huya.checked,
        bilibili: fields.bilibili.checked,
        douyin: fields.douyin.checked
      },
      colors: readColors()
    };
  }

  function updatePlatformRows() {
    for (const [platform, field] of Object.entries({
      bilibili: fields.bilibili,
      douyin: fields.douyin,
      huya: fields.huya
    })) {
      const row = document.querySelector(`[data-platform="${platform}"]`);
      const statusText = row.querySelector(".platform-status span");
      row.dataset.enabled = String(field.checked);
      statusText.textContent = field.checked ? "已启用" : "未启用";
    }
  }

  function updateColorSummaries() {
    let total = 0;
    PLATFORM_IDS.forEach((platform) => {
      const customCount = COLOR_FIELDS.reduce((count, field) => {
        const control = colorControls.get(`${platform}:${field.key}`);
        return count + (shared.normalizeHexColor(control.text.value) ? 1 : 0);
      }, 0);
      total += customCount;
      const summary = document.querySelector(
        `[data-color-platform="${platform}"] .color-platform__identity small`
      );
      summary.textContent = customCount ? `${customCount} 项自定义` : "使用默认颜色";
    });
    document.querySelector("#color-count").textContent = `${total} 项自定义`;
  }

  function writeColors(colors) {
    PLATFORM_IDS.forEach((platform) => {
      COLOR_FIELDS.forEach((field) => {
        const control = colorControls.get(`${platform}:${field.key}`);
        const value = shared.normalizeHexColor(colors?.[platform]?.[field.key]);
        control.text.value = value;
        control.text.dataset.savedValue = value;
        control.text.setAttribute("aria-invalid", "false");
        control.picker.value = value || control.defaultValue;
      });
    });
    updateColorSummaries();
  }

  function writeForm(settings) {
    enabledControls.forEach((control) => {
      control.checked = settings.enabled;
    });
    fields.altClick.checked = settings.altClick;
    fields.huya.checked = settings.platforms.huya;
    fields.bilibili.checked = settings.platforms.bilibili;
    fields.douyin.checked = settings.platforms.douyin;
    updatePlatformRows();
    writeColors(settings.colors);
  }

  function setStatus(message, kind) {
    clearTimeout(statusTimer);
    status.textContent = message;
    status.className = `save-status is-visible ${kind ? `is-${kind}` : ""}`.trim();
    statusTimer = setTimeout(() => {
      status.className = "save-status";
    }, 1800);
  }

  async function copyFeedbackEmail() {
    const button = document.querySelector("#feedback-copy");
    const email = button.dataset.email;
    let copied = false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        try {
          await navigator.clipboard.writeText(email);
          copied = true;
        } catch (_error) {
          // Fall through to the selection-based copy path below.
        }
      }
      if (!copied) {
        const input = document.createElement("textarea");
        input.value = email;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        try {
          input.select();
          copied = document.execCommand("copy");
        } finally {
          input.remove();
        }
        if (!copied) {
          throw new Error("copy command rejected");
        }
      }
      setStatus(`反馈邮箱已复制：${email}`, "saved");
    } catch (_error) {
      setStatus(`复制失败，请手动复制：${email}`, "error");
    }
  }

  function save() {
    const settings = readForm();
    updatePlatformRows();
    updateColorSummaries();

    if (!storage) {
      setStatus("预览设置已更新", "saved");
      return;
    }

    storage.set(settings, () => {
      if (chrome.runtime.lastError) {
        setStatus("保存失败，请重试", "error");
      } else {
        setStatus("设置已保存", "saved");
      }
    });
  }

  function commitColorText(control, showError) {
    const raw = control.text.value.trim();
    const value = shared.normalizeHexColor(raw);
    if (!raw) {
      const changed = Boolean(control.text.dataset.savedValue);
      control.text.value = "";
      control.text.dataset.savedValue = "";
      control.text.setAttribute("aria-invalid", "false");
      control.picker.value = control.defaultValue;
      if (changed) {
        save();
      } else {
        updateColorSummaries();
      }
      return true;
    }
    if (!value) {
      control.text.setAttribute("aria-invalid", "true");
      if (showError) {
        setStatus("颜色值请使用 #RRGGBB 格式", "error");
      }
      return false;
    }
    const changed = control.text.dataset.savedValue !== value;
    control.text.value = value;
    control.text.dataset.savedValue = value;
    control.text.setAttribute("aria-invalid", "false");
    control.picker.value = value;
    if (changed) {
      save();
    } else {
      updateColorSummaries();
    }
    return true;
  }

  function bindColorControls() {
    colorControls.forEach((control) => {
      control.picker.addEventListener("input", () => {
        const value = shared.normalizeHexColor(control.picker.value);
        control.text.value = value;
        control.text.dataset.savedValue = value;
        control.text.setAttribute("aria-invalid", "false");
        save();
      });
      control.text.addEventListener("input", () => {
        const raw = control.text.value.trim();
        const value = shared.normalizeHexColor(raw);
        control.text.setAttribute("aria-invalid", String(Boolean(raw && !value)));
        if (!raw || value) {
          commitColorText(control, false);
        } else {
          updateColorSummaries();
        }
      });
      control.text.addEventListener("change", () => commitColorText(control, true));
      control.reset.addEventListener("click", () => {
        control.text.value = "";
        control.text.dataset.savedValue = "";
        control.text.setAttribute("aria-invalid", "false");
        control.picker.value = control.defaultValue;
        save();
      });
    });

    document.querySelectorAll("[data-reset-colors]").forEach((button) => {
      button.addEventListener("click", () => {
        const platform = button.dataset.resetColors;
        COLOR_FIELDS.forEach((field) => {
          const control = colorControls.get(`${platform}:${field.key}`);
          control.text.value = "";
          control.text.dataset.savedValue = "";
          control.text.setAttribute("aria-invalid", "false");
          control.picker.value = control.defaultValue;
        });
        save();
      });
    });
  }

  function bindControls() {
    enabledControls.forEach((control) => {
      control.addEventListener("change", () => {
        enabledControls.forEach((otherControl) => {
          otherControl.checked = control.checked;
        });
        save();
      });
    });

    Object.values(fields).forEach((field) => field.addEventListener("change", save));
    bindColorControls();
  }

  function bindNavigation() {
    const localLinks = [...document.querySelectorAll('.nav-item[href^="#"]')];
    localLinks.forEach((link) => {
      link.addEventListener("click", () => {
        localLinks.forEach((item) => {
          item.classList.toggle("is-active", item === link);
          if (item === link) {
            item.setAttribute("aria-current", "page");
          } else {
            item.removeAttribute("aria-current");
          }
        });
      });
    });
  }

  function bindFeedback() {
    document.querySelector("#feedback-copy").addEventListener("click", copyFeedbackEmail);
  }

  function renderVersion() {
    const manifestVersion = globalThis.chrome?.runtime?.getManifest?.().version;
    if (manifestVersion) {
      document.querySelector("#version").textContent = `v${manifestVersion}`;
    }
  }

  renderColorFields();
  renderVersion();
  bindNavigation();
  bindFeedback();

  if (storage) {
    storage.get(null, (saved) => {
      writeForm(shared.mergeSettings(saved));
      bindControls();
    });

    globalThis.chrome?.storage?.onChanged?.addListener((changes, areaName) => {
      if (areaName !== "sync") {
        return;
      }
      storage.get(null, (saved) => writeForm(shared.mergeSettings(saved)));
    });
  } else {
    writeForm(shared.mergeSettings());
    bindControls();
  }
})();
