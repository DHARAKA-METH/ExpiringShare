export function getShareUrl(shareUrl) {
  if (shareUrl.startsWith("http://") || shareUrl.startsWith("https://")) {
    return shareUrl;
  }

  if (typeof window === "undefined") {
    return shareUrl;
  }

  return new URL(shareUrl, window.location.origin).toString();
}
