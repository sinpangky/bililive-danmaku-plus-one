"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sourceRoot = path.join(root, "src");
const extensionRoot = path.join(root, "build", "extension");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

const sourceFiles = walk(sourceRoot);
const favoritesLauncherSource = fs.readFileSync(
  path.join(root, "src", "features", "favorites", "launcher.ts"),
  "utf8"
);
const favoritesComponentSource = fs.readFileSync(
  path.join(root, "src", "features", "favorites", "FavoritesLauncher.vue"),
  "utf8"
);
const favoritesCssSource = fs.readFileSync(
  path.join(root, "src", "styles", "favorites.css"),
  "utf8"
);
const javascriptSources = sourceFiles.filter((file) => file.endsWith(".js"));
if (javascriptSources.length) {
  throw new Error(`Legacy JavaScript remains under src: ${javascriptSources.join(", ")}`);
}

const requiredVueComponents = [
  "src/popup/App.vue",
  "src/popup/components/ColorField.vue",
  "src/popup/components/PlatformRow.vue",
  "src/features/favorites/FavoriteItemRow.vue",
  "src/features/favorites/FavoritesLauncher.vue",
  "src/ui/ActionBar.vue",
  "src/ui/ContentOverlay.vue",
  "src/ui/DouyinOverlay.vue",
  "src/ui/FeedbackToast.vue"
];
requiredVueComponents.forEach((relativePath) => {
  if (!fs.existsSync(path.join(root, relativePath))) {
    throw new Error(`Missing Vue component: ${relativePath}`);
  }
});

if (!favoritesLauncherSource.includes("selectedRoomKey")
    || !favoritesComponentSource.includes("emit('selectRoom', group.roomKey)")
    || !favoritesComponentSource.includes("emit('backToRooms')")) {
  throw new Error("Favorites must use room-list to message-page navigation");
}
if (favoritesLauncherSource.includes("expandedRoomKeys")
    || favoritesComponentSource.includes("toggleGroup")
    || favoritesComponentSource.includes("bcp-favorites-group-items")) {
  throw new Error("Legacy inline room expansion remains in favorites UI");
}
if (favoritesComponentSource.includes("bcp-favorites-radial-item-icon")
    || !/\.bcp-favorites-radial-item\s*\{[\s\S]*?border-radius:\s*50%/.test(favoritesCssSource)) {
  throw new Error("Favorites radial choices must be circular and icon-free");
}

if (fs.existsSync(path.join(root, "src", "popup", "popup.ts"))) {
  throw new Error("The popup still contains the legacy imperative DOM controller");
}

const popupBundle = fs.readFileSync(path.join(extensionRoot, "popup", "popup.js"), "utf8");
const contentBundle = fs.readFileSync(path.join(extensionRoot, "src", "content.js"), "utf8");
const douyinContentBundle = fs.readFileSync(
  path.join(extensionRoot, "src", "douyin-content.js"),
  "utf8"
);
const pageHookBundle = fs.readFileSync(
  path.join(extensionRoot, "src", "douyin-page-hook.js"),
  "utf8"
);
for (const [name, source] of [
  ["popup", popupBundle],
  ["content", contentBundle],
  ["douyin content", douyinContentBundle]
]) {
  if (!source.includes("createApp") || !source.includes("Vue")) {
    throw new Error(`${name} bundle does not contain the Vue runtime`);
  }
}
if (pageHookBundle.includes("function createAppContext")
    || pageHookBundle.includes("@vue/runtime")) {
  throw new Error("The document_start MAIN-world hook must not bundle the Vue runtime");
}
if (!contentBundle.includes("danmakuEchoFavoritesV1")
    || !douyinContentBundle.includes("danmakuEchoFavoritesV1")
    || !contentBundle.includes("bcp-favorites-radial")
    || !douyinContentBundle.includes("bcp-favorites-radial")) {
  throw new Error("The Huya/Bilibili and Douyin bundles must include the local favorites runtime");
}
for (const [name, source] of [
  ["Huya/Bilibili", contentBundle],
  ["Douyin", douyinContentBundle]
]) {
  if (!source.includes("attachShadow")
      || !source.includes("bcp-favorites-host")
      || !source.includes("data-bcp-favorites-runtime-owner")
      || !source.includes("FAVORITES_UI_VERSION = 2")) {
    throw new Error(`${name} favorites UI must keep its versioned Shadow DOM singleton`);
  }
  if (!source.includes("bcp-favorites-group-toggle")
      || !source.includes("time-desc")
      || !source.includes("发送次数")) {
    throw new Error(`${name} favorites UI must group rooms and expose all sort modes`);
  }
}

console.log(
  `Vue architecture OK (${sourceFiles.length} source files, ${requiredVueComponents.length} required components)`
);
