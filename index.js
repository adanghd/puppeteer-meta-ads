const puppeteer = require("puppeteer");
const express = require("express");
const app = express();
app.use(express.json());

app.post("/scrape", async (req, res) => {
  const keyword = req.body.keyword || "produk digital";

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--no-zygote",
        "--single-process",
        "--no-first-run",
        "--no-default-browser-check"
      ]
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Step 1: Load homepage Ads Library (dengan extra timeout)
    await page.goto("https://www.facebook.com/ads/library", {
      waitUntil: "domcontentloaded",
      timeout: 90000
    });

    // Step 2: Tunggu stabil / pastikan tidak redirect
    await page.waitForTimeout(4000);

    // Step 3: Cari search box (maksimal retry 3x)
    let inputBox;
    for (let i = 0; i < 3; i++) {
      try {
        inputBox = await page.waitForSelector('[data-testid="search-input"]', { timeout: 8000 });
        if (inputBox) break;
      } catch (e) {
        console.warn(`Retry ${i + 1}: search input not ready yet...`);
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForTimeout(3000);
      }
    }

    if (!inputBox) {
      throw new Error("Gagal mendeteksi search box setelah 3 kali coba");
    }

    // Step 4: Masukkan keyword & cari
    await inputBox.click({ clickCount: 3 });
    await inputBox.type(keyword, { delay: 50 });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(10000); // tunggu hasil iklan keluar

    // Step 5: Ambil hasil iklan
    const results = await page.evaluate(() => {
      const ads = [];
      const cards = document.querySelectorAll('[data-testid="ad-card"]');
      cards.forEach((card, index) => {
        if (index < 5) {
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
    if (browser) await browser.close();
    console.error("❌ FATAL ERROR:", error.message);
    res.status(500).json({
      error: "Gagal scraping",
      detail: error.message
    });
  }
});

app.get("/", (req, res) => res.send("✅ Scraper siap 24 jam"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Server aktif di port", PORT);
});
