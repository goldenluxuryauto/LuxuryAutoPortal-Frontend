// Utilities for normalizing and detecting embeddable video URLs.
// Supports YouTube (all common URL formats), Vimeo, and direct video files.

export type VideoSource =
  | { type: "youtube"; videoId: string; embedUrl: string; startSeconds?: number }
  | { type: "vimeo"; videoId: string; embedUrl: string }
  | { type: "direct"; url: string }
  | { type: "unknown"; url: string };

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

function parseUrl(raw: string): URL | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  try {
    return new URL(trimmed);
  } catch {
    try {
      return new URL("https://" + trimmed);
    } catch {
      return null;
    }
  }
}

function parseTimeToSeconds(value: string | null): number | undefined {
  if (!value) return undefined;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!match) return undefined;
  const h = parseInt(match[1] || "0", 10);
  const m = parseInt(match[2] || "0", 10);
  const s = parseInt(match[3] || "0", 10);
  const total = h * 3600 + m * 60 + s;
  return total > 0 ? total : undefined;
}

export function getYouTubeVideoId(rawUrl: string): string | null {
  const url = parseUrl(rawUrl);
  if (!url) return null;

  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return null;

  // youtu.be/<id>
  if (host === "youtu.be" || host === "www.youtu.be") {
    const id = url.pathname.replace(/^\/+/, "").split("/")[0];
    return isValidYouTubeId(id) ? id : null;
  }

  // youtube.com/watch?v=<id>
  const vParam = url.searchParams.get("v");
  if (vParam && isValidYouTubeId(vParam)) return vParam;

  // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length >= 2) {
    const [prefix, id] = parts;
    if (["embed", "shorts", "live", "v"].includes(prefix) && isValidYouTubeId(id)) {
      return id;
    }
  }

  return null;
}

function isValidYouTubeId(id: string | undefined | null): id is string {
  return !!id && /^[A-Za-z0-9_-]{6,}$/.test(id);
}

export function getVimeoVideoId(rawUrl: string): string | null {
  const url = parseUrl(rawUrl);
  if (!url) return null;

  const host = url.hostname.toLowerCase();
  if (!VIMEO_HOSTS.has(host)) return null;

  const parts = url.pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  if (last && /^\d+$/.test(last)) return last;
  return null;
}

export function parseVideoSource(rawUrl: string): VideoSource {
  if (!rawUrl || !rawUrl.trim()) return { type: "unknown", url: rawUrl };

  const youtubeId = getYouTubeVideoId(rawUrl);
  if (youtubeId) {
    const url = parseUrl(rawUrl);
    const startSeconds = parseTimeToSeconds(
      url?.searchParams.get("t") || url?.searchParams.get("start") || null
    );
    const params = new URLSearchParams();
    params.set("rel", "0");
    params.set("modestbranding", "1");
    params.set("playsinline", "1");
    if (startSeconds) params.set("start", String(startSeconds));
    const embedUrl = `https://www.youtube.com/embed/${youtubeId}?${params.toString()}`;
    return { type: "youtube", videoId: youtubeId, embedUrl, startSeconds };
  }

  const vimeoId = getVimeoVideoId(rawUrl);
  if (vimeoId) {
    const embedUrl = `https://player.vimeo.com/video/${vimeoId}`;
    return { type: "vimeo", videoId: vimeoId, embedUrl };
  }

  // Direct file if it looks like one
  if (/\.(mp4|webm|ogg|ogv|mov|m4v|avi)(\?.*)?$/i.test(rawUrl.trim())) {
    return { type: "direct", url: rawUrl.trim() };
  }

  return { type: "unknown", url: rawUrl.trim() };
}

export function isEmbeddableVideoUrl(rawUrl: string): boolean {
  const source = parseVideoSource(rawUrl);
  return source.type === "youtube" || source.type === "vimeo" || source.type === "direct";
}
