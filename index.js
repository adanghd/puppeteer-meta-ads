const puppeteer = require("puppeteer");
const express = require("express");
const app = express();
app.use(express.json());

app.post("/scrape", async (req, res) => {
  const keyword = req.body.keyword || "produk digital";

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.goto("https://www.facebook.com/ads/library", {
    waitUntil: "networkidle2"
  });

  await page.waitForSelector('[data-testid="search-input"]');
  await page.type('[data-testid="search-input"]', keyword);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(5000);

  const results = await page.evaluate(() => {
    const ads = [];
    const cards = document.querySelectorAll('[data-testid="ad-card"]');
    cards.forEach((card, index) => {
      if (index < 3) {
        ads.push({
          page: card.querySelector('[data-testid="actor-name"]')?.innerText,
          caption: card.querySelector('[data-testid="ad-creative-body"]')?.innerText,
          link: card.querySelector("a[href*='ads/library']")?.href || ""
        });
      }
    });
    return ads;
  });

  await browser.close();
  res.json({ keyword, results });
});

app.get("/", (req, res) => res.send("✅ Scraper jalan!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server jalan di port", PORT);
});
