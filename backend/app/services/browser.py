import asyncio
import logging
from dataclasses import dataclass

from playwright.async_api import async_playwright, Browser, Page

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class PageCapture:
    screenshot: bytes
    dom_tree: list[dict] | None
    text_content: str | None
    error: str | None = None


DOM_EXTRACTOR_JS = """
() => {
  const results = [];
  const seen = new Map();

  function walk(node, depth, parentSelector) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'noscript') return;

    const id = node.id || null;
    const classes = Array.from(node.classList);
    const attributes = {};
    for (const attr of node.attributes) {
      if (!['id', 'class', 'style'].includes(attr.name)) {
        attributes[attr.name] = attr.value;
      }
    }

    const rect = node.getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0;

    let selector;
    if (id) {
      selector = '#' + id;
    } else {
      selector = tag + (classes.length ? '.' + classes.join('.') : '');
    }
    const fullPath = parentSelector ? parentSelector + ' > ' + selector : selector;

    let finalPath;
    const cnt = (seen.get(fullPath) || 0) + 1;
    seen.set(fullPath, cnt);
    if (cnt > 1) {
      const deduped = selector + ':nth-of-type(' + cnt + ')';
      finalPath = parentSelector ? parentSelector + ' > ' + deduped : deduped;
    } else {
      finalPath = fullPath;
    }

    let text = null;
    if (node.childNodes.length === 1 && node.firstChild.nodeType === Node.TEXT_NODE) {
      const t = node.textContent.trim();
      if (t) text = t;
    }

    results.push({
      tag,
      id,
      classes,
      attributes,
      path: finalPath,
      depth,
      visible,
      text,
      rect: visible ? { x: rect.x, y: rect.y, w: rect.width, h: rect.height } : null,
      childCount: node.children.length,
    });

    for (const child of node.children) {
      walk(child, depth + 1, finalPath);
    }
  }

  walk(document.body, 0, '');
  return results;
}
"""


class PlaywrightManager:
    def __init__(self):
        self._playwright = None
        self._browser: Browser | None = None
        self._semaphore = asyncio.Semaphore(settings.max_concurrent_browsers)
        self._lock = asyncio.Lock()

    async def start(self):
        self._playwright = await async_playwright().start()
        browser_type = getattr(self._playwright, settings.playwright_browser)
        self._browser = await browser_type.launch(
            headless=settings.playwright_headless,
            args=self._launch_args(),
        )
        logger.info("Browser launched: %s", settings.playwright_browser)

    @staticmethod
    def _launch_args():
        return [
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-background-networking',
        ]

    async def stop(self):
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        logger.info("Browser stopped.")

    async def _restart_browser(self):
        """Restart the browser after a crash. Caller must hold self._lock."""
        try:
            if self._browser:
                await self._browser.close()
        except Exception:
            pass
        browser_type = getattr(self._playwright, settings.playwright_browser)
        self._browser = await browser_type.launch(
            headless=settings.playwright_headless,
            args=self._launch_args(),
        )
        logger.info("Browser restarted successfully")

    async def _ensure_browser_connected(self):
        """Check if browser is alive; restart if necessary."""
        if self._browser and self._browser.is_connected():
            return
        async with self._lock:
            if self._browser and self._browser.is_connected():
                return
            logger.warning("Browser disconnected, restarting...")
            await self._restart_browser()

    @staticmethod
    def _is_connection_error(error: Exception) -> bool:
        msg = str(error).lower()
        return any(
            phrase in msg
            for phrase in (
                "connection closed",
                "target closed",
                "browser has been closed",
                "browser is closed",
                "session closed",
                "protocol error",
            )
        )

    async def capture_page(
        self,
        url: str,
        viewport_width: int = settings.viewport_width,
        viewport_height: int = settings.viewport_height,
        full_page: bool = True,
        retry_on_disconnect: bool = True,
    ) -> PageCapture:
        async with self._semaphore:
            await self._ensure_browser_connected()

            try:
                context = await self._browser.new_context(
                    viewport={"width": viewport_width, "height": viewport_height},
                    ignore_https_errors=True,
                )
            except Exception as e:
                if retry_on_disconnect and self._is_connection_error(e):
                    logger.warning(
                        "Browser connection lost during new_context, restarting..."
                    )
                    async with self._lock:
                        await self._restart_browser()
                    return await self.capture_page(
                        url, viewport_width, viewport_height, full_page,
                        retry_on_disconnect=False,
                    )
                raise

            page = await context.new_page()

            nav_error = None
            try:
                await page.goto(url, wait_until="networkidle", timeout=settings.navigation_timeout_ms)
            except Exception as e:
                nav_error = e
                logger.warning("Navigation to %s: %s", url, e)

            if nav_error:
                # Navigation had issues, but try to capture whatever loaded
                try:
                    screenshot = await page.screenshot(full_page=full_page, type="png")
                    dom_tree = await self._safe_evaluate(page, DOM_EXTRACTOR_JS)
                    text_content = await self._safe_evaluate(page, "document.body.innerText")
                    # Only set warning (not error) if screenshot was captured successfully
                    if screenshot:
                        logger.info("Partial capture succeeded for %s despite navigation issue", url)
                        return PageCapture(
                            screenshot=screenshot,
                            dom_tree=dom_tree,
                            text_content=text_content,
                            error=None,  # Don't flag as error — screenshot is usable
                        )
                    return PageCapture(
                        screenshot=b"",
                        dom_tree=None,
                        text_content=None,
                        error=f"Navigation issue: {nav_error}",
                    )
                except Exception as e2:
                    return PageCapture(
                        screenshot=b"",
                        dom_tree=None,
                        text_content=None,
                        error=f"Failed to load page: {e2}",
                    )
                finally:
                    await context.close()

            # Navigation succeeded, capture all data
            try:
                screenshot, dom_tree, text_content = await asyncio.gather(
                    page.screenshot(full_page=full_page, type="png"),
                    page.evaluate(DOM_EXTRACTOR_JS),
                    page.evaluate("document.body.innerText"),
                )
                return PageCapture(
                    screenshot=screenshot,
                    dom_tree=dom_tree,
                    text_content=text_content,
                )
            except Exception as e:
                logger.error("Capture failed for %s: %s", url, e)
                return PageCapture(
                    screenshot=b"",
                    dom_tree=None,
                    text_content=None,
                    error=str(e),
                )
            finally:
                await context.close()

    async def _safe_evaluate(self, page, expression):
        try:
            return await page.evaluate(expression)
        except Exception:
            return None


_manager: PlaywrightManager | None = None


async def get_browser() -> PlaywrightManager:
    global _manager
    if _manager is None:
        _manager = PlaywrightManager()
        await _manager.start()
    return _manager


async def close_browser():
    global _manager
    if _manager:
        await _manager.stop()
        _manager = None
