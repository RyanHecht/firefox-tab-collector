// Trigger: open http://yt-collect.invalid/ in Firefox (see ../yt-collect).
// The request is cancelled, the trigger tab closed, and collection runs.
const TRIGGER = "*://yt-collect.invalid/*";

const YT_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);

function parse(url) {
  try { return new URL(url); } catch { return null; }
}

function isYouTube(tab) {
  const u = parse(tab.url);
  return !!u && YT_HOSTS.has(u.hostname);
}

function isHomepage(tab) {
  const u = parse(tab.url);
  return !!u && u.hostname !== "youtu.be" && u.pathname === "/";
}

let running = false;

async function collect() {
  if (running) return;
  running = true;
  try {
    // Normal windows only, in window order then tab order.
    const windows = await browser.windows.getAll({ populate: true, windowTypes: ["normal"] });
    const tabs = windows
      .filter((w) => !w.incognito)
      .flatMap((w) => w.tabs.slice().sort((a, b) => a.index - b.index))
      .filter(isYouTube);
    if (tabs.length === 0) return;

    // Keep one homepage (the most recently used) as the first tab; close the rest.
    const homes = tabs.filter(isHomepage);
    const keepHome = homes.reduce((best, t) => (!best || t.lastAccessed > best.lastAccessed ? t : best), null);
    const dupes = homes.filter((t) => t !== keepHome);
    const ordered = [...(keepHome ? [keepHome] : []), ...tabs.filter((t) => !isHomepage(t))];

    if (dupes.length) await browser.tabs.remove(dupes.map((t) => t.id));

    // If every YouTube tab already lives alone in one window, just reorder in place.
    const winIds = new Set(ordered.map((t) => t.windowId));
    let targetWin;
    if (winIds.size === 1) {
      const win = windows.find((w) => w.id === ordered[0].windowId);
      const others = win.tabs.filter((t) => !isYouTube(t));
      if (others.length === 0) targetWin = win.id;
    }

    if (targetWin === undefined) {
      const win = await browser.windows.create({ tabId: ordered[0].id });
      targetWin = win.id;
      if (ordered.length > 1) {
        await browser.tabs.move(ordered.slice(1).map((t) => t.id), { windowId: targetWin, index: -1 });
      }
    } else {
      await browser.tabs.move(ordered.map((t) => t.id), { windowId: targetWin, index: 0 });
    }

    await browser.tabs.update(ordered[0].id, { active: true });
    await browser.windows.update(targetWin, { focused: true });
  } catch (e) {
    console.error("youtube-collector:", e);
  } finally {
    running = false;
  }
}

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    const closing = details.tabId >= 0 ? browser.tabs.remove(details.tabId).catch(() => {}) : Promise.resolve();
    closing.then(collect);
    return { cancel: true };
  },
  { urls: [TRIGGER], types: ["main_frame"] },
  ["blocking"]
);

browser.browserAction.onClicked.addListener(collect);
