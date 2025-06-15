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
    await page.goto("https://www.facebook.com/ads/library", {
      waitUntil: "networkidle2"
    });

    await page.waitForSelector('[data-testid="search-input"]', { timeout: 10000 });
    await page.type('[data-testid="search-input"]', keyword);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(5000);

    const results = await page.evaluate(() => {
      const ads = [];
      const cards = document.querySelectorAll('[data-testid="ad-card"]');
      cards.forEach((card, index) => {
        if (index < 3) {
          ads.push({
            page: card.querySelector('[data-testid="actor-name"]')?.innerText || "Tidak ditemukan",
            caption: card.querySelector('[data-testid="ad-creative-body"]')?.innerText || "Tidak ada caption",
            link: card.querySelector("a[href*='ads/library']")?.href || "-"
          });
        }
      });
      return ads;
    });

    await browser.close();
    res.json({ keyword, results });

  } catch (err) {
    console.error("❌ ERROR SAAT SCRAPING:", err.message);
    res.status(500).json({ error: "Gagal scraping", detail: err.message });
  }
});

app.get("/", (req, res) => res.send("✅ Scraper jalan!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Server jalan di port", PORT);
});
