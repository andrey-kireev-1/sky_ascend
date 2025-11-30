(() => {
  const webApp = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  if (!webApp) return;

  const applyTheme = () => {
    const theme = webApp.themeParams || {};
    const root = document.documentElement;
    if (theme.bg_color) root.style.setProperty("--tg-bg", theme.bg_color);
    if (theme.secondary_bg_color) root.style.setProperty("--tg-secondary-bg", theme.secondary_bg_color);
    if (theme.button_color) root.style.setProperty("--tg-button", theme.button_color);
    if (theme.button_text_color) root.style.setProperty("--tg-button-text", theme.button_text_color);
  };

  const init = () => {
    webApp.ready();
    webApp.expand();
    webApp.setHeaderColor("secondary_bg_color");
    applyTheme();
    webApp.onEvent("themeChanged", applyTheme);

    // Optional: notify Telegram that the content is ready to be interacted with
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("telegram-ready"));
    }
  };

  if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  }
})();
