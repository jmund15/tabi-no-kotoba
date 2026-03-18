/**
 * Auto-verification script for the Japanese Learning App.
 *
 * Usage:
 *   node verify.mjs                  — verify ultimate.jsx (default)
 *   node verify.mjs initjsx.jsx      — verify a specific JSX file
 *   node verify.mjs booking_tracker.html — verify a standalone HTML file
 *
 * What it does:
 *   1. For JSX: starts Vite dev server, points src/main.jsx at the target file
 *   2. For HTML: serves the file directly via a simple static server
 *   3. Launches headless Chromium via Playwright
 *   4. Navigates to the page, waits for render
 *   5. Captures console errors and exceptions
 *   6. Takes a full-page screenshot of the initial view
 *   7. For JSX apps: clicks each tab and screenshots it
 *   8. Writes screenshots to ./screenshots/
 *   9. Prints a summary report
 */

import { chromium } from "playwright";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import http from "http";

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
const targetFile = process.argv[2] || "ultimate.jsx";
const isHTML = targetFile.endsWith(".html");
const screenshotDir = path.join(ROOT, "screenshots");

// Ensure screenshot dir exists
fs.mkdirSync(screenshotDir, { recursive: true });

// Clean old screenshots
for (const f of fs.readdirSync(screenshotDir)) {
  if (f.endsWith(".png")) fs.unlinkSync(path.join(screenshotDir, f));
}

const consoleMessages = [];
const errors = [];

async function startViteServer() {
  // Point main.jsx at the target file
  const mainPath = path.join(ROOT, "src", "main.jsx");
  const mainContent = `import React from "react";
import { createRoot } from "react-dom/client";
import App from "../${targetFile}";

createRoot(document.getElementById("root")).render(<App />);
`;
  fs.writeFileSync(mainPath, mainContent);

  return new Promise((resolve, reject) => {
    const proc = spawn("node", [
      path.join(ROOT, "node_modules", "vite", "bin", "vite.js"),
      "--host", "127.0.0.1", "--port", "0",
    ], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    let resolved = false;
    const onData = (data) => {
      output += data.toString();
      if (resolved) return;
      // Strip ANSI color codes before matching
      const clean = output.replace(/\x1b\[[0-9;]*m/g, "");
      const match = clean.match(/(http:\/\/127\.0\.0\.1:\d+)/);
      if (match) { resolved = true; resolve({ url: match[1], proc }); }
    };
    proc.stdout.on("data", onData);
    proc.stderr.on("data", (data) => {
      const msg = data.toString();
      // Vite may print URL to stderr in some versions
      onData(data);
      if (msg.includes("error") || msg.includes("Error")) {
        errors.push(`[Vite stderr] ${msg.trim()}`);
      }
    });
    proc.on("error", (err) => reject(new Error(`Vite spawn failed: ${err.message}`)));
    // Timeout after 30s
    setTimeout(() => reject(new Error("Vite failed to start within 30s\nOutput so far: " + output)), 30000);
  });
}

async function startHTMLServer(htmlFile) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const filePath = path.join(ROOT, htmlFile);
      const content = fs.readFileSync(filePath, "utf8");
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(content);
    });
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      resolve({ url: `http://127.0.0.1:${port}`, proc: server });
    });
  });
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

async function run() {
  console.log(`\n🔍 Verifying: ${targetFile}`);
  console.log("─".repeat(50));

  // Start server
  let url, proc;
  try {
    if (isHTML) {
      ({ url, proc } = await startHTMLServer(targetFile));
      console.log(`📁 HTML server at ${url}`);
    } else {
      ({ url, proc } = await startViteServer());
      console.log(`⚡ Vite dev server at ${url}`);
    }
  } catch (e) {
    console.error(`❌ Server failed to start: ${e.message}`);
    process.exit(1);
  }

  // Launch browser
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 }, // iPhone 14 Pro Max size
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Collect console messages
  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === "error") {
      consoleMessages.push(`❌ ERROR: ${text}`);
      errors.push(text);
    } else if (type === "warning" && !text.includes("DevTools")) {
      consoleMessages.push(`⚠️  WARN: ${text}`);
    }
  });

  page.on("pageerror", (err) => {
    errors.push(`PAGE ERROR: ${err.message}`);
    consoleMessages.push(`💥 PAGE ERROR: ${err.message}`);
  });

  // Navigate
  console.log(`🌐 Loading page...`);
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
  } catch (e) {
    console.error(`❌ Page failed to load: ${e.message}`);
    // Take error screenshot
    await page.screenshot({
      path: path.join(screenshotDir, `error-${timestamp()}.png`),
      fullPage: true,
    });
    await cleanup(browser, proc);
    process.exit(1);
  }

  // Wait a bit for animations
  await page.waitForTimeout(1000);

  // Take initial screenshot
  const prefix = targetFile.replace(/\.[^.]+$/, "");
  await page.screenshot({
    path: path.join(screenshotDir, `${prefix}-initial.png`),
    fullPage: true,
  });
  console.log(`📸 Screenshot: ${prefix}-initial.png`);

  // For JSX apps, try clicking tabs
  if (!isHTML) {
    // Find all tab buttons
    const tabButtons = await page.$$('div[style*="border-bottom"] > button');
    if (tabButtons.length > 0) {
      console.log(`🗂️  Found ${tabButtons.length} tabs`);

      for (let i = 0; i < tabButtons.length; i++) {
        const btn = tabButtons[i];
        const label = await btn.textContent();
        const tabName = label.trim().replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

        try {
          await btn.click();
          await page.waitForTimeout(600); // Wait for animations

          await page.screenshot({
            path: path.join(screenshotDir, `${prefix}-tab-${i}-${tabName}.png`),
            fullPage: true,
          });
          console.log(`📸 Screenshot: ${prefix}-tab-${i}-${tabName}.png`);
        } catch (e) {
          errors.push(`Tab click failed (${label}): ${e.message}`);
        }
      }
    } else {
      console.log(`ℹ️  No tab buttons detected — took full page screenshot only`);
    }

    // Additional interactions: try expanding a phrase
    try {
      const firstPhrase = await page.$('.phrase-card');
      if (firstPhrase) {
        await firstPhrase.click();
        await page.waitForTimeout(400);
        await page.screenshot({
          path: path.join(screenshotDir, `${prefix}-expanded-phrase.png`),
          fullPage: true,
        });
        console.log(`📸 Screenshot: ${prefix}-expanded-phrase.png`);
      }
    } catch (e) {
      // Not critical
    }
  } else {
    // For HTML files, just scroll and screenshot
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(screenshotDir, `${prefix}-scrolled.png`),
      fullPage: true,
    });
    console.log(`📸 Screenshot: ${prefix}-scrolled.png`);
  }

  // Print report
  console.log("\n" + "═".repeat(50));
  console.log("📋 VERIFICATION REPORT");
  console.log("═".repeat(50));
  console.log(`File: ${targetFile}`);
  console.log(`Screenshots: ./screenshots/`);

  if (consoleMessages.length > 0) {
    console.log(`\nConsole output (${consoleMessages.length} messages):`);
    consoleMessages.forEach((m) => console.log(`  ${m}`));
  } else {
    console.log(`\n✅ No console errors or warnings`);
  }

  if (errors.length > 0) {
    console.log(`\n❌ ${errors.length} ERROR(S) FOUND:`);
    errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
    console.log("\n🔧 Fix the errors above and run again.");
  } else {
    console.log(`\n✅ ALL CHECKS PASSED — no errors detected`);
  }

  console.log("═".repeat(50) + "\n");

  await cleanup(browser, proc);
  process.exit(errors.length > 0 ? 1 : 0);
}

async function cleanup(browser, proc) {
  await browser.close();
  if (proc.kill) proc.kill();
  else if (proc.close) proc.close();
}

run().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
