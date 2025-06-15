const puppeteer = require("puppeteer");
const express = require("express");
const app = express();
app.use(express.json());

app.post("/scrape", async (req, res) => {
  try {
    const keyword = req.body.keyword || "produk digital";

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--no-zygote',
        '--single-process',
        '--no-first-run',
        '--no-default-browser-check'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.goto("https://www.facebook.com/ads/library/", {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.waitForSelector('[data-testid="search-input"]', { timeout: 10000 });
    await page.type('[data-testid="search-input"]', keyword);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(8000);

    const results = await page.evaluate(() => {
      const ads = [];
      const cards = document.querySelectorAll('[data-testid="ad-card"]');
      cards.forEach((card, index) => {
        if (index < 3) {
          ads.push({
            page: card.querySelector('[data-testid="actor-name"]')?.innerText || "-",
            caption: card.querySelector('[data-testid="ad-creative-body"]')?.innerText || "-",
            link: card.querySelector("a[href*='ads/library']")?.href || "-"
          });
        }
      });
      return ads;
    });

    await browser.close();
    res.json({ keyword, results });

  } catch (error) {
    console.error("❌ ERROR:", error.message);
    res.status(500).json({
      error: "Scraping gagal",
      detail: error.message
    });
  }
});

app.get("/", (req, res) => res.send("✅ Scraper jalan!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Server aktif di port", PORT);
});
