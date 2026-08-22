(function () {
  var isSupportedBrowser =
    typeof HTMLScriptElement.supports === "function" &&
    HTMLScriptElement.supports("module") &&
    HTMLScriptElement.supports("importmap") &&
    "serviceWorker" in navigator;

  var isFallbackPage =
    location.pathname
      .split("/")
      .filter((a) => a && a !== "index.html")
      .pop() === "unsupported-browser";

  if (isSupportedBrowser !== isFallbackPage) return;

  isSupportedBrowser
    ? location.replace("..")
    : location.replace("./unsupported-browser");
})();
