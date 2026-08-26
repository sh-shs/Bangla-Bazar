import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 390, "height": 844})
        page = await context.new_page()

        page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        await page.goto("http://127.0.0.1:8000/product-detail.html?slug=test", wait_until="networkidle")
        await page.wait_for_timeout(3000)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
