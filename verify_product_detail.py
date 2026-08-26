import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 390, "height": 844})
        page = await context.new_page()

        await page.goto("http://127.0.0.1:8000/index.html", wait_until="domcontentloaded")
        await page.wait_for_timeout(1000)

        # Navigate to product detail
        first_product = page.locator(".product-card a").first
        if await first_product.count() > 0:
            await first_product.click()
            await page.wait_for_timeout(2000)
        else:
            await page.goto("http://127.0.0.1:8000/product-detail.html?slug=electronics-1", wait_until="domcontentloaded")
            await page.wait_for_timeout(2000)

        # Take screenshot of Product Detail page
        await page.screenshot(path="/home/jules/verification/screenshots/product_detail_redesign.png", full_page=True)
        print("Screenshot captured successfully!")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
