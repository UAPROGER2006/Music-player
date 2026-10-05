const audio = document.getElementById("audio");
const player = document.querySelector(".player");
const cover = document.getElementById("cover");
const coverImage = document.getElementById("coverImage");
const playPauseBtn = document.getElementById("playPause");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const shuffleBtn = document.getElementById("shuffle");
const repeatBtn = document.getElementById("repeat");
const progress = document.getElementById("progress");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const volume = document.getElementById("volume");
const speed = document.getElementById("speed");
const visualStyle = document.getElementById("visualStyle");
const themeSelect = document.getElementById("themeSelect");
const fileInput = document.getElementById("fileInput");
const playlistEl = document.getElementById("playlist");
const trackTitle = document.getElementById("trackTitle");
const trackArtist = document.getElementById("trackArtist");
const trackAlbum = document.getElementById("trackAlbum");
const accentPicker = document.getElementById("accentPicker");
const radiusRange = document.getElementById("radiusRange");
const densitySelect = document.getElementById("densitySelect");
const motionToggle = document.getElementById("motionToggle");
const resetCustomization = document.getElementById("resetCustomization");

const defaultCustomization = {
  accent: "",
  radius: "18",
  density: "comfortable",
  motion: "on",
};

let tracks = [
  {
    title: "Demo track",
    artist: "Файл song.mp3",
    album: "Demo",
    coverUrl: "",
    coverType: "",
    src: "song.mp3",
    duration: "--:--",
  },
];

let currentTrack = 0;
let isShuffle = false;
let isRepeat = false;
let activeTrackButton = null;
let metadataScanId = 0;

audio.volume = 0.8;
audio.playbackRate = 1;

const savedTheme = localStorage.getItem("audio-flow-theme") || "midnight";
applyTheme(savedTheme);
applyCustomization(getSavedCustomization());

renderPlaylist();
loadTrack(0);

playPauseBtn.addEventListener("click", togglePlayback);
prevBtn.addEventListener("click", playPrevious);
nextBtn.addEventListener("click", playNext);
shuffleBtn.addEventListener("click", toggleShuffle);
repeatBtn.addEventListener("click", toggleRepeat);

audio.addEventListener("play", updatePlaybackState);
audio.addEventListener("pause", updatePlaybackState);
audio.addEventListener("loadedmetadata", updateDuration);
audio.addEventListener("timeupdate", updateProgress);
audio.addEventListener("ended", handleTrackEnd);
audio.addEventListener("error", handleAudioError);

progress.addEventListener("input", () => {
  if (!Number.isFinite(audio.duration)) return;
  audio.currentTime = (Number(progress.value) / 100) * audio.duration;
});

volume.addEventListener("input", () => {
  audio.volume = Number(volume.value) / 100;
});

speed.addEventListener("change", () => {
  audio.playbackRate = Number(speed.value);
});

visualStyle.addEventListener("change", () => {
  setCoverStyle(visualStyle.value);
});

themeSelect.addEventListener("change", () => {
  applyTheme(themeSelect.value);
  localStorage.setItem("audio-flow-theme", themeSelect.value);
});

accentPicker.addEventListener("input", () => {
  updateCustomization({ accent: accentPicker.value });
});

radiusRange.addEventListener("input", () => {
  updateCustomization({ radius: radiusRange.value });
});

densitySelect.addEventListener("change", () => {
  updateCustomization({ density: densitySelect.value });
});

motionToggle.addEventListener("change", () => {
  updateCustomization({ motion: motionToggle.checked ? "on" : "off" });
});

resetCustomization.addEventListener("click", () => {
  localStorage.removeItem("audio-flow-customization");
  document.body.style.removeProperty("--accent");
  document.body.style.removeProperty("--active-border");
  document.body.style.removeProperty("--active-track");
  document.body.style.removeProperty("--bg-glow");
  document.body.style.removeProperty("--cover-b");
  applyCustomization(defaultCustomization);
});

fileInput.addEventListener("change", (event) => {
  const files = Array.from(event.target.files).filter((file) => file.type.startsWith("audio/"));

  if (!files.length) return;

  revokeObjectUrls();
  metadataScanId += 1;

  tracks = files.map((file) => ({
    title: cleanFileName(file.name),
    artist: "Локальний файл",
    album: "Альбом невідомий",
    coverUrl: "",
    coverType: "",
    src: URL.createObjectURL(file),
    duration: "--:--",
    objectUrl: true,
  }));

  currentTrack = 0;
  renderPlaylist();
  loadTrack(currentTrack);
  readMetadataQueue(files, metadataScanId);
  fileInput.value = "";
});

playlistEl.addEventListener("click", (event) => {
  const button = event.target.closest(".track");

  if (!button) return;

  loadTrack(Number(button.dataset.index), true);
});

document.addEventListener("keydown", (event) => {
  const tagName = event.target.tagName.toLowerCase();
  const isTyping = tagName === "input" || tagName === "select" || tagName === "textarea";

  if (isTyping) return;

  if (event.code === "Space") {
    event.preventDefault();
    togglePlayback();
  }

  if (event.key === "ArrowRight") {
    audio.currentTime = Math.min(audio.currentTime + 5, audio.duration || audio.currentTime);
  }

  if (event.key === "ArrowLeft") {
    audio.currentTime = Math.max(audio.currentTime - 5, 0);
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    setVolume(Math.min(audio.volume + 0.05, 1));
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    setVolume(Math.max(audio.volume - 0.05, 0));
  }
});

function togglePlayback() {
  if (!audio.src) return;

  if (audio.paused) {
    audio.play().catch(() => {
      trackArtist.textContent = "Не вдалося запустити трек. Спробуй додати інший файл.";
      trackAlbum.textContent = "Перевір формат або обери інший аудіофайл.";
    });
  } else {
    audio.pause();
  }
}

function loadTrack(index, shouldPlay = false) {
  currentTrack = index;
  const track = tracks[currentTrack];

  audio.src = track.src;
  audio.load();
  progress.value = 0;
  currentTimeEl.textContent = "0:00";
  durationEl.textContent = track.duration;
  trackTitle.textContent = track.title;
  trackArtist.textContent = track.artist;
  trackAlbum.textContent = track.album;

  updateCover(track);
  updatePlaylistSelection();
  updateMediaSession(track);

  if (shouldPlay) {
    audio.play().catch(() => {
      trackArtist.textContent = "Браузер заблокував автозапуск. Натисни Play.";
      trackAlbum.textContent = track.album;
    });
  }
}

function playPrevious() {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }

  const nextIndex = currentTrack === 0 ? tracks.length - 1 : currentTrack - 1;
  loadTrack(nextIndex, true);
}

function playNext() {
  const nextIndex = isShuffle ? getRandomTrackIndex() : (currentTrack + 1) % tracks.length;
  loadTrack(nextIndex, true);
}

function handleTrackEnd() {
  if (isRepeat) {
    audio.currentTime = 0;
    audio.play();
    return;
  }

  playNext();
}

function toggleShuffle() {
  isShuffle = !isShuffle;
  shuffleBtn.classList.toggle("is-active", isShuffle);
  shuffleBtn.setAttribute("aria-pressed", String(isShuffle));
}

function toggleRepeat() {
  isRepeat = !isRepeat;
  repeatBtn.classList.toggle("is-active", isRepeat);
  repeatBtn.setAttribute("aria-pressed", String(isRepeat));
}

function updatePlaybackState() {
  const isPlaying = !audio.paused;
  player.classList.toggle("is-playing", isPlaying);
  playPauseBtn.textContent = isPlaying ? "Ⅱ" : "▶";
  playPauseBtn.setAttribute("aria-label", isPlaying ? "Поставити на паузу" : "Відтворити");
  playPauseBtn.setAttribute("title", isPlaying ? "Пауза" : "Відтворити");
}

function updateDuration() {
  const formatted = formatTime(audio.duration);
  tracks[currentTrack].duration = formatted;
  durationEl.textContent = formatted;
  updateTrackDuration(currentTrack, formatted);
}

function updateProgress() {
  if (!Number.isFinite(audio.duration)) return;

  const percent = (audio.currentTime / audio.duration) * 100;
  progress.value = String(percent);
  currentTimeEl.textContent = formatTime(audio.currentTime);
}

function handleAudioError() {
  progress.value = 0;
  currentTimeEl.textContent = "0:00";
  durationEl.textContent = "--:--";
  trackArtist.textContent = "Файл не знайдено. Додай свій аудіотрек через кнопку Додати.";
  trackAlbum.textContent = "Якщо файл був переміщений, додай його заново.";
}

function renderPlaylist() {
  const fragment = document.createDocumentFragment();

  tracks.forEach((track, index) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    const trackIndex = document.createElement("span");
    const trackText = document.createElement("span");
    const trackName = document.createElement("span");
    const trackMeta = document.createElement("span");
    const trackAlbumName = document.createElement("span");
    const trackDuration = document.createElement("span");

    button.className = `track${index === currentTrack ? " is-current" : ""}`;
    button.type = "button";
    button.dataset.index = String(index);

    trackIndex.className = "track-index";
    trackIndex.textContent = String(index + 1);

    trackName.className = "track-name";
    trackName.textContent = track.title;

    trackMeta.className = "track-meta";
    trackMeta.textContent = track.artist;

    trackAlbumName.className = "track-album";
    trackAlbumName.textContent = track.album;

    trackDuration.className = "track-duration";
    trackDuration.textContent = track.duration;

    trackText.append(trackName, trackMeta, trackAlbumName);
    button.append(trackIndex, trackText, trackDuration);
    item.append(button);
    fragment.append(item);
  });

  playlistEl.replaceChildren(fragment);
  activeTrackButton = playlistEl.querySelector(`[data-index="${currentTrack}"]`);
}

function updatePlaylistSelection() {
  activeTrackButton?.classList.remove("is-current");
  activeTrackButton = playlistEl.querySelector(`[data-index="${currentTrack}"]`);
  activeTrackButton?.classList.add("is-current");
}

function updateTrackDuration(index, value) {
  const button = playlistEl.querySelector(`[data-index="${index}"]`);
  const duration = button?.querySelector(".track-duration");

  if (duration) {
    duration.textContent = value;
  }
}

function updateCover(track) {
  const hasCover = Boolean(track.coverUrl);

  coverImage.src = hasCover ? track.coverUrl : "";
  coverImage.hidden = !hasCover;
  cover.classList.toggle("has-cover", hasCover);
}

function setCoverStyle(style) {
  cover.classList.remove("cover-style-art", "cover-style-vinyl", "cover-style-spectrum", "cover-style-poster");
  cover.classList.add(`cover-style-${style}`);
}

function applyTheme(theme) {
  const allowedThemes = ["midnight", "neon", "sunset", "ice", "mono"];
  const nextTheme = allowedThemes.includes(theme) ? theme : "midnight";

  document.body.dataset.theme = nextTheme;
  themeSelect.value = nextTheme;
}

function getSavedCustomization() {
  try {
    return {
      ...defaultCustomization,
      ...JSON.parse(localStorage.getItem("audio-flow-customization")),
    };
  } catch {
    return { ...defaultCustomization };
  }
}

function updateCustomization(changes) {
  const nextCustomization = {
    ...getSavedCustomization(),
    ...changes,
  };

  applyCustomization(nextCustomization);
  localStorage.setItem("audio-flow-customization", JSON.stringify(nextCustomization));
}

function applyCustomization(settings) {
  const customization = {
    ...defaultCustomization,
    ...settings,
  };

  applyAccentColor(customization.accent);

  document.body.style.setProperty("--radius", `${customization.radius}px`);
  document.body.dataset.density = customization.density;
  document.body.dataset.motion = customization.motion;

  accentPicker.value = customization.accent || "#48c6a8";
  radiusRange.value = customization.radius;
  densitySelect.value = customization.density;
  motionToggle.checked = customization.motion !== "off";
}

function applyAccentColor(color) {
  if (!/^#[0-9a-f]{6}$/i.test(color || "")) return;

  const rgb = hexToRgb(color);

  document.body.style.setProperty("--accent", color);
  document.body.style.setProperty("--active-border", `rgba(${rgb}, 0.5)`);
  document.body.style.setProperty("--active-track", `rgba(${rgb}, 0.12)`);
  document.body.style.setProperty("--bg-glow", `rgba(${rgb}, 0.18)`);
  document.body.style.setProperty("--cover-b", `rgba(${rgb}, 0.25)`);
}

function hexToRgb(color) {
  const value = color.replace("#", "");
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);

  return `${red}, ${green}, ${blue}`;
}

async function readMetadataQueue(files, scanId) {
  for (let index = 0; index < files.length; index += 1) {
    if (scanId !== metadataScanId) return;

    const metadata = await readMp3Metadata(files[index]);

    if (scanId !== metadataScanId) return;

    if (metadata.title || metadata.artist || metadata.album || metadata.coverUrl) {
      updateTrackMetadata(index, metadata);
    }

    await yieldToBrowser();
  }
}

function updateTrackMetadata(index, metadata) {
  const track = tracks[index];

  if (!track) return;

  track.title = metadata.title || track.title;
  track.artist = metadata.artist || track.artist;
  track.album = metadata.album || track.album;

  if (metadata.coverUrl && metadata.coverUrl !== track.coverUrl) {
    if (track.coverUrl) {
      URL.revokeObjectURL(track.coverUrl);
    }

    track.coverUrl = metadata.coverUrl;
    track.coverType = metadata.coverType || "image/jpeg";
  }

  const button = playlistEl.querySelector(`[data-index="${index}"]`);
  button?.querySelector(".track-name")?.replaceChildren(document.createTextNode(track.title));
  button?.querySelector(".track-meta")?.replaceChildren(document.createTextNode(track.artist));
  button?.querySelector(".track-album")?.replaceChildren(document.createTextNode(track.album));

  if (index === currentTrack) {
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist;
    trackAlbum.textContent = track.album;
    updateCover(track);
    updateMediaSession(track);
  }
}

function updateMediaSession(track) {
  if (!("mediaSession" in navigator)) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist,
    album: track.album || "Audio Flow Player",
    artwork: track.coverUrl
      ? [
          { src: track.coverUrl, sizes: "512x512", type: track.coverType || "image/jpeg" },
        ]
      : [],
  });

  navigator.mediaSession.setActionHandler("play", () => audio.play());
  navigator.mediaSession.setActionHandler("pause", () => audio.pause());
  navigator.mediaSession.setActionHandler("previoustrack", playPrevious);
  navigator.mediaSession.setActionHandler("nexttrack", playNext);
}

function getRandomTrackIndex() {
  if (tracks.length <= 1) return currentTrack;

  let randomIndex = currentTrack;
  while (randomIndex === currentTrack) {
    randomIndex = Math.floor(Math.random() * tracks.length);
  }

  return randomIndex;
}

function setVolume(value) {
  audio.volume = value;
  volume.value = String(Math.round(value * 100));
}

function cleanFileName(name) {
  return name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim() || "Без назви";
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "--:--";

  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
}

async function readMp3Metadata(file) {
  if (!file.name.toLowerCase().endsWith(".mp3")) return {};

  try {
    const headerBuffer = await file.slice(0, 10).arrayBuffer();
    const header = new Uint8Array(headerBuffer);

    if (header[0] !== 0x49 || header[1] !== 0x44 || header[2] !== 0x33) {
      return {};
    }

    const version = header[3];
    const flags = header[5];
    const tagSize = syncSafeToInt(header[6], header[7], header[8], header[9]);
    const bytesToRead = Math.min(file.size, tagSize + 10, 5 * 1024 * 1024);
    const tagBuffer = await file.slice(0, bytesToRead).arrayBuffer();

    return parseId3Tag(new Uint8Array(tagBuffer), version, flags, tagSize);
  } catch {
    return {};
  }
}

function parseId3Tag(bytes, version, flags, tagSize) {
  const result = {};
  const frameMap = version === 2
    ? { TT2: "title", TP1: "artist", TAL: "album", PIC: "cover" }
    : { TIT2: "title", TPE1: "artist", TALB: "album", APIC: "cover" };
  const headerSize = version === 2 ? 6 : 10;
  const frameIdSize = version === 2 ? 3 : 4;
  let offset = getFrameOffset(bytes, version, flags);
  const end = Math.min(bytes.length, tagSize + 10);

  while (offset + headerSize <= end) {
    const frameId = readAscii(bytes, offset, frameIdSize);

    if (!frameId.trim() || /^\0+$/.test(frameId)) break;

    const frameSize = version === 2
      ? readUint24(bytes, offset + 3)
      : version === 4
        ? syncSafeToInt(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7])
        : readUint32(bytes, offset + 4);

    const frameStart = offset + headerSize;
    const frameEnd = frameStart + frameSize;

    if (frameSize <= 0 || frameEnd > end) break;

    const field = frameMap[frameId];
    if (field) {
      const frame = bytes.slice(frameStart, frameEnd);

      if (field === "cover") {
        const cover = decodeImageFrame(frame, version);

        if (cover) {
          result.coverUrl = cover.url;
          result.coverType = cover.type;
        }
      } else {
        result[field] = decodeTextFrame(frame);
      }
    }

    if (result.title && result.artist && result.album && result.coverUrl) break;

    offset = frameEnd;
  }

  return result;
}

function getFrameOffset(bytes, version, flags) {
  const hasExtendedHeader = version > 2 && (flags & 0x40) !== 0;

  if (!hasExtendedHeader || bytes.length < 14) return 10;

  const extendedSize = version === 4
    ? syncSafeToInt(bytes[10], bytes[11], bytes[12], bytes[13])
    : readUint32(bytes, 10);

  return version === 4 ? 10 + extendedSize : 14 + extendedSize;
}

function decodeImageFrame(frame, version) {
  if (!frame.length) return null;

  const encoding = frame[0];
  let offset = 1;
  let mimeType = "image/jpeg";

  if (version === 2) {
    const imageFormat = readAscii(frame, offset, 3).toLowerCase();
    offset += 3;
    mimeType = imageFormat === "png" ? "image/png" : "image/jpeg";
  } else {
    const mimeEnd = findByte(frame, 0, offset);

    if (mimeEnd === -1) return null;

    mimeType = readAscii(frame, offset, mimeEnd - offset) || "image/jpeg";
    offset = mimeEnd + 1;
  }

  offset += 1;
  offset = skipEncodedString(frame, offset, encoding);

  if (offset >= frame.length) return null;

  const blob = new Blob([frame.slice(offset)], { type: mimeType });

  return {
    type: mimeType,
    url: URL.createObjectURL(blob),
  };
}

function decodeTextFrame(frame) {
  if (!frame.length) return "";

  const encoding = frame[0];
  const payload = frame.slice(1);
  let decoder = new TextDecoder("latin1");
  let textBytes = payload;

  if (encoding === 1) {
    if (payload[0] === 0xfe && payload[1] === 0xff) {
      decoder = new TextDecoder("utf-16be");
      textBytes = payload.slice(2);
    } else {
      decoder = new TextDecoder("utf-16le");
      textBytes = payload[0] === 0xff && payload[1] === 0xfe ? payload.slice(2) : payload;
    }
  }

  if (encoding === 2) {
    decoder = new TextDecoder("utf-16be");
  }

  if (encoding === 3) {
    decoder = new TextDecoder("utf-8");
  }

  return decoder.decode(textBytes).replace(/\0/g, "").trim();
}

function skipEncodedString(bytes, offset, encoding) {
  const step = encoding === 1 || encoding === 2 ? 2 : 1;

  if (step === 2) {
    for (let index = offset; index + 1 < bytes.length; index += 2) {
      if (bytes[index] === 0 && bytes[index + 1] === 0) {
        return index + 2;
      }
    }

    return bytes.length;
  }

  const end = findByte(bytes, 0, offset);
  return end === -1 ? bytes.length : end + 1;
}

function syncSafeToInt(a, b, c, d) {
  return (a << 21) | (b << 14) | (c << 7) | d;
}

function readUint24(bytes, offset) {
  return (bytes[offset] << 16) | (bytes[offset + 1] << 8) | bytes[offset + 2];
}

function readUint32(bytes, offset) {
  return (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
}

function readAscii(bytes, offset, length) {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

function findByte(bytes, value, start = 0) {
  for (let index = start; index < bytes.length; index += 1) {
    if (bytes[index] === value) return index;
  }

  return -1;
}

function yieldToBrowser() {
  return new Promise((resolve) => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(resolve, { timeout: 120 });
    } else {
      setTimeout(resolve, 0);
    }
  });
}

function revokeObjectUrls() {
  tracks.forEach((track) => {
    if (track.objectUrl) {
      URL.revokeObjectURL(track.src);
    }

    if (track.coverUrl) {
      URL.revokeObjectURL(track.coverUrl);
    }
  });
}
