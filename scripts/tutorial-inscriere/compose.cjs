// Build a music-only tutorial from actual UI captures and Romanian side notes.
const path = require("node:path");
const fs = require("node:fs/promises");
const { spawnSync, spawn } = require("node:child_process");
const repo = path.resolve(__dirname, "../..");
const { chromium } = require(
  path.join(repo, "apps/web/node_modules/@playwright/test"),
);
const sharp = require(path.join(repo, "apps/api/node_modules/sharp"));
const scenes = require(
  path.join(repo, "apps/web/src/lib/members/registration-tutorial.json"),
);
const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);
const temp = path.join(repo, "tmp/tutorial-inscriere");
const assets = path.join(repo, "apps/web/static/tutoriale");
const ffmpeg = process.env.TUTORIAL_FFMPEG;
if (!ffmpeg) throw new Error("Set TUTORIAL_FFMPEG to an FFmpeg executable.");
const escape = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const ts = (seconds) => {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
};
const stamp = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
function encode(args) {
  const result = spawnSync(
    ffmpeg,
    ["-hide_banner", "-loglevel", "error", "-y", ...args],
    { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
  );
  if (result.status !== 0) throw new Error(result.stderr || "FFmpeg failed");
}

// Render deterministic browser frames; capture timing is independent of machine speed.
async function animateScene(page, scene, index, elapsed) {
  const meta = await fs
    .readFile(path.join(temp, scene.id + ".json"), "utf8")
    .then(JSON.parse)
    .catch(() => null);
  await page.addStyleTag({
    content: `
    .window,.hero{will-change:transform,opacity}.screen{position:relative}
    aside li{border-radius:0 10px 10px 0;padding-top:4px;padding-bottom:4px;will-change:transform,opacity}
    .focus-box{position:fixed;pointer-events:none;border:3px solid #ba1e2b;border-radius:9px;box-shadow:0 0 0 5px #ba1e2b12;z-index:20}
    .motion-pointer{position:fixed;pointer-events:none;z-index:21;width:36px;height:44px;filter:drop-shadow(0 2px 3px #122d3c44)}
    .click-ring{position:fixed;pointer-events:none;border:3px solid #ba1e2b;border-radius:50%;z-index:19}
    .journey>div{transition:none}.journey b{box-shadow:0 0 0 0 transparent}
    .progress i{position:relative;overflow:hidden}.progress i.current{background:#e0e5e9}.progress i.current:after{content:'';position:absolute;inset:0;background:#b51f2a;transform-origin:left;transform:scaleX(var(--fill,0))}
  `,
  });
  await page.evaluate(
    ({ duration, elapsed, total, index, meta }) => {
      const box = document.createElement("div");
      box.className = "focus-box";
      document.body.append(box);
      const pointer = document.createElement("div");
      pointer.className = "motion-pointer";
      pointer.innerHTML =
        '<svg viewBox="0 0 36 44"><path d="M3 2 29 23 18 25 25 38 18 42 11 28 3 36Z" fill="#ba1e2b" stroke="white" stroke-width="2.5" stroke-linejoin="round"/></svg>';
      document.body.append(pointer);
      const ring = document.createElement("div");
      ring.className = "click-ring";
      document.body.append(ring);
      const progress = [...document.querySelectorAll(".progress i")];
      progress[index].classList.add("current");
      const ease = (x) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
      const time = (x) =>
        `${Math.floor(x / 60)}:${String(Math.floor(x) % 60).padStart(2, "0")}`;
      window.drawTutorial = (t) => {
        const enter = ease(t / 0.65),
          exit = Math.min(1, (duration - t) / 0.3),
          alpha = enter * exit;
        const left = document.querySelector(".window,.hero");
        left.style.transform = `translateX(${-28 * (1 - enter)}px)`;
        left.style.opacity = alpha;
        const heading = document.querySelector("aside h1");
        heading.style.transform = `translateY(${16 * (1 - ease((t - 0.12) / 0.6))}px)`;
        heading.style.opacity = ease((t - 0.12) / 0.6) * exit;
        document.querySelector(".step").style.opacity = alpha;
        const bullets = [...document.querySelectorAll("aside li")];
        const active = Math.min(
          bullets.length - 1,
          Math.floor(
            (Math.max(0, t - 0.8) / (duration - 0.8)) * bullets.length,
          ),
        );
        bullets.forEach((el, j) => {
          const reveal = ease((t - 0.3 - j * 0.65) / 0.55);
          el.style.opacity = reveal * exit;
          el.style.transform = `translateY(${20 * (1 - reveal)}px)`;
          el.style.borderLeftColor = j === active ? "#b51f2a" : "#e3c6cb";
          el.style.background = j === active ? "#b51f2a08" : "transparent";
        });
        document.querySelector(".time").textContent =
          `${time(elapsed + t)} / ${time(total)}`;
        progress[index].style.setProperty("--fill", String(t / duration));
        [...document.querySelectorAll(".journey>div")].forEach((el, j) => {
          const x = ease((t - j * 0.45) / 0.65);
          el.style.opacity = x * exit;
          el.style.transform = `translateY(${16 * (1 - x)}px)`;
          const badge = el.querySelector("b");
          const on = Math.min(2, Math.floor(t / (duration / 3))) === j;
          badge.style.boxShadow = on
            ? `0 0 0 ${5 + Math.sin(t * 2) * 2}px #b51f2a14`
            : "none";
        });
        const image = document.querySelector(".screen img");
        if (!image || !meta?.focus?.length || t < 0.8 || t > duration - 0.35) {
          box.style.opacity = pointer.style.opacity = ring.style.opacity = "0";
          return;
        }
        const targets = meta.focus;
        const span = (duration - 1.4) / targets.length;
        const slot = Math.min(targets.length - 1, Math.floor((t - 0.8) / span));
        const q = Math.max(0, t - 0.8 - slot * span);
        const target = targets[slot],
          previous = targets[Math.max(0, slot - 1)];
        const bounds = image.getBoundingClientRect();
        const scale = Math.min(
          bounds.width / meta.width,
          bounds.height / meta.height,
        );
        const ox = bounds.x + (bounds.width - meta.width * scale) / 2,
          oy = bounds.y + (bounds.height - meta.height * scale) / 2;
        const fade = Math.min(1, q / 0.25) * exit;
        box.style.cssText += `;left:${ox + target.x * scale - 4}px;top:${oy + target.y * scale - 4}px;width:${target.width * scale + 8}px;height:${target.height * scale + 8}px;opacity:${fade * (0.75 + 0.15 * Math.sin(t * 2))};`;
        const move = ease(q / 0.65);
        const from = {
          x: previous.x + previous.width * 0.78,
          y: previous.y + previous.height * 0.65,
        };
        const to = {
          x: target.x + target.width * 0.78,
          y: target.y + target.height * 0.65,
        };
        const cx = ox + (from.x + (to.x - from.x) * move) * scale,
          cy = oy + (from.y + (to.y - from.y) * move) * scale;
        pointer.style.left = cx + "px";
        pointer.style.top = cy + "px";
        pointer.style.opacity = alpha;
        const click = Math.max(0, q - 0.7) % 2.5;
        const radius = 12 + Math.min(1, click / 0.8) * 22;
        ring.style.cssText += `;left:${cx - radius}px;top:${cy - radius}px;width:${radius * 2}px;height:${radius * 2}px;opacity:${q > 0.7 && click < 0.8 ? (1 - click / 0.8) * 0.55 * exit : 0};`;
      };
    },
    { duration: scene.duration, elapsed, total: totalDuration, index, meta },
  );
  const protocol = await page.context().newCDPSession(page);
  const clip = path.join(temp, `clip-${index}.mp4`);
  const child = spawn(
    ffmpeg,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "image2pipe",
      "-vcodec",
      "mjpeg",
      "-framerate",
      "24",
      "-i",
      "pipe:0",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "21",
      "-pix_fmt",
      "yuv420p",
      "-an",
      clip,
    ],
    { stdio: ["pipe", "ignore", "pipe"], windowsHide: true },
  );
  let errors = "",
    inputError = null;
  child.stderr.on("data", (chunk) => (errors += chunk));
  child.stdin.on("error", (error) => (inputError = error));
  const finished = new Promise((resolve) => {
    child.on("error", (error) => resolve({ code: -1, error }));
    child.on("close", (code) => resolve({ code }));
  });
  try {
    for (let frame = 0; frame < scene.duration * 24; frame++) {
      if (inputError) throw inputError;
      await page.evaluate((t) => window.drawTutorial(t), frame / 24);
      const capture = await protocol.send("Page.captureScreenshot", {
        format: "jpeg",
        quality: 94,
        captureBeyondViewport: false,
        optimizeForSpeed: true,
      });
      const picture = Buffer.from(capture.data, "base64");
      if (scene.id === "profile" && (frame === 18 || frame === 144))
        await fs.writeFile(
          path.join(temp, `motion-profile-${frame}.jpg`),
          picture,
        );
      if (!child.stdin.write(picture))
        await new Promise((resolve, reject) => {
          const onDrain = () => {
            child.stdin.off("error", onError);
            resolve();
          };
          const onError = (error) => {
            child.stdin.off("drain", onDrain);
            reject(error);
          };
          child.stdin.once("drain", onDrain);
          child.stdin.once("error", onError);
        });
    }
  } finally {
    child.stdin.end();
  }
  await protocol.detach();
  const result = await finished;
  if (result.code !== 0)
    throw new Error(
      errors || String(result.error) || "Animation encoding failed",
    );
  console.log(
    "Animated scene",
    index + 1,
    "/",
    scenes.length,
    scene.id,
    scene.duration * 24,
    "frames",
  );
}
(async () => {
  await fs.mkdir(assets, { recursive: true });
  const logo =
    "data:image/png;base64," +
    (
      await fs.readFile(
        path.join(repo, "apps/web/static/branding/scouts-cluj-wide.png"),
      )
    ).toString("base64");
  const browser = await chromium.launch({
    channel: "chromium",
    headless: true,
  });
  let elapsed = 0;
  let vtt = "WEBVTT\n\n";
  let chapters = "WEBVTT\n\n";
  try {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 900 },
      deviceScaleFactor: 1,
    });
    for (const [i, s] of scenes.entries()) {
      const intro = s.id === "cover",
        finish = s.id === "finish";
      const image =
        !intro && !finish
          ? "data:image/png;base64," +
            (await fs.readFile(path.join(temp, s.id + ".png"))).toString(
              "base64",
            )
          : null;
      const route = ["code", "google"].includes(s.id)
        ? "membri.scout.ro/login"
        : ["start", "login"].includes(s.id)
          ? "resurse.scoutscluj.ro/login"
          : "resurse.scoutscluj.ro/register";
      const content = image
        ? `<div class="window"><div class="address"><span class="dots">● ● ●</span><span>${route}</span><span class="demo">Date de exemplu</span></div><div class="screen"><img src="${image}" /></div></div>`
        : `<div class="hero"><img src="${logo}" /><p class="kicker">RESURSE SCOUTS CLUJ</p><h2>${intro ? "Primul pas<br>în cercetășie." : "Un singur cont.<br>Acces în Resurse."}</h2><div class="journey"><div><b>1</b> Cererea de înscriere</div><div><b>2</b> Aprobarea centrului</div><div><b>3</b> Autentificarea</div></div><p class="url">resurse.scoutscluj.ro</p></div>`;
      await page.setContent(`<!doctype html><html lang="ro"><meta charset="utf-8"><style>
        *{box-sizing:border-box}body{margin:0;width:1600px;height:900px;background:#f5f6f8;color:#183044;font-family:'Segoe UI',Arial,sans-serif}header{height:110px;display:flex;align-items:center;justify-content:space-between;padding:0 48px;border-bottom:1px solid #e0e4e8;background:#fff}header img{width:200px;height:92px;object-fit:contain}header p{font-size:21px;color:#647285;letter-spacing:.03em}main{display:grid;grid-template-columns:1040px 1fr;gap:42px;padding:36px 48px 26px;height:710px}.window{height:648px;border:1px solid #dfe4e9;border-radius:16px;background:#fff;overflow:hidden;box-shadow:0 8px 28px #182b3a08}.address{display:flex;align-items:center;gap:24px;height:48px;background:#fafbfc;border-bottom:1px solid #e4e8ec;padding:0 22px;color:#627384;font-size:16px}.dots{color:#b7c0c9;letter-spacing:3px}.demo{margin-left:auto;color:#8a6870;font-size:14px}.screen{height:598px;display:flex;align-items:center;justify-content:center;padding:24px}.screen img{width:100%;height:100%;object-fit:contain}.hero{background:#fff;border:1px solid #e0e4e8;border-radius:16px;padding:42px 64px;height:648px}.hero>img{width:300px;height:150px;object-fit:contain;margin:-25px 0 -5px -20px}.kicker{font-size:16px;color:#637487;letter-spacing:.09em;font-weight:600}h2{font-size:58px;line-height:1.1;letter-spacing:-.035em;margin:14px 0 28px}.journey{display:flex;gap:26px;font-size:18px;color:#42586a}.journey>div{max-width:195px;line-height:1.45}.journey b{display:block;background:#f9edef;color:#b51f2a;border-radius:50%;width:32px;height:32px;text-align:center;line-height:32px;margin-bottom:12px}.url{font-size:24px;color:#b51f2a;font-weight:600;margin-top:36px}aside{padding:18px 0 0}.step{font-size:17px;letter-spacing:.08em;text-transform:uppercase;color:#b51f2a;font-weight:600;margin:0 0 17px}h1{font-size:36px;letter-spacing:-.025em;line-height:1.16;margin:0 0 30px;font-weight:650}ul{padding:0;margin:0;list-style:none;display:grid;gap:24px}li{font-size:24px;line-height:1.42;color:#43596b;padding-left:20px;border-left:3px solid #e3c6cb}footer{height:80px;display:flex;align-items:center;justify-content:space-between;padding:0 48px;gap:30px;color:#637487;font-size:16px}.progress{display:flex;gap:7px;flex:1;max-width:580px}.progress i{height:5px;background:#e0e5e9;flex:1;border-radius:2px}.progress i.done{background:#b51f2a}.time{font-variant-numeric:tabular-nums}.silent{font-size:14px}
        </style><header><img src="${logo}" /><p>ÎNSCRIERE ȘI ACCES · GHID PENTRU PĂRINȚI</p></header><main>${content}<aside><p class="step">${intro ? "Bine ai venit" : finish ? "La final" : `Pasul ${i} / ${scenes.length - 2}`}</p><h1>${escape(s.title)}</h1><ul>${s.points.map((p) => `<li>${escape(p)}</li>`).join("")}</ul></aside></main><footer><span class="time">${stamp(elapsed)} / ${stamp(totalDuration)}</span><div class="progress">${scenes.map((_, j) => `<i class="${j <= i ? "done" : ""}"></i>`).join("")}</div><span class="silent">Muzică instrumentală · fără voce · date fictive</span></footer></html>`);
      await page.evaluate(() => document.fonts.ready);
      const bounds = await page.locator("aside").evaluate((el) => ({
        bottom: el.getBoundingClientRect().bottom,
        content: el.scrollHeight,
        height: el.clientHeight,
      }));
      if (bounds.content > bounds.height || bounds.bottom > 825)
        throw new Error("Text overflow: " + s.id);
      const frame = path.join(temp, `frame-${String(i).padStart(2, "0")}.png`);
      await page.screenshot({ path: frame });
      if (intro)
        await sharp(frame)
          .webp({ quality: 88 })
          .toFile(path.join(assets, "inscriere-parinti-poster.webp"));
      if (
        !process.env.TUTORIAL_RENDER_SCENES ||
        process.env.TUTORIAL_RENDER_SCENES.split(",").includes(s.id)
      )
        await animateScene(page, s, i, elapsed);
      for (const [j, point] of s.points.entries())
        vtt += `${ts(elapsed + (j * s.duration) / s.points.length)} --> ${ts(elapsed + ((j + 1) * s.duration) / s.points.length)}\n${s.title}: ${point}\n\n`;
      chapters += `${ts(elapsed)} --> ${ts(elapsed + s.duration)}\n${s.title}\n\n`;
      elapsed += s.duration;
    }
  } finally {
    await browser.close();
  }
  await fs.writeFile(
    path.join(assets, "inscriere-parinti.ro.vtt"),
    vtt.trimEnd() + "\n",
  );
  await fs.writeFile(
    path.join(assets, "inscriere-parinti.chapters.vtt"),
    chapters.trimEnd() + "\n",
  );
  await fs.writeFile(
    path.join(temp, "timeline.json"),
    JSON.stringify({ duration: elapsed, scenes }, null, 2),
  );
  await fs.writeFile(
    path.join(temp, "clips.txt"),
    scenes.map((_, i) => `file 'clip-${i}.mp4'`).join("\n"),
  );
  encode([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    path.join(temp, "clips.txt"),
    "-c",
    "copy",
    path.join(temp, "picture.mp4"),
  ]);
  encode([
    "-i",
    path.join(temp, "picture.mp4"),
    "-i",
    path.join(temp, "music.mp3"),
    "-t",
    String(elapsed),
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-af",
    `loudnorm=I=-22:TP=-3:LRA=6,afade=t=in:d=1.2,afade=t=out:st=${elapsed - 3}:d=3`,
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ar",
    "48000",
    "-movflags",
    "+faststart",
    "-metadata",
    "title=Inscriere si autentificare in Resurse - ghid pentru parinti",
    path.join(assets, "inscriere-parinti.mp4"),
  ]);
  encode([
    "-i",
    path.join(assets, "inscriere-parinti.mp4"),
    "-c:v",
    "libvpx-vp9",
    "-b:v",
    "0",
    "-crf",
    "30",
    "-row-mt",
    "1",
    "-cpu-used",
    "4",
    "-threads",
    "4",
    "-c:a",
    "libopus",
    "-b:a",
    "96k",
    path.join(assets, "inscriere-parinti.webm"),
  ]);
  console.log(
    "Created animated tutorial:",
    elapsed,
    "seconds, music only; no voice.",
  );
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
