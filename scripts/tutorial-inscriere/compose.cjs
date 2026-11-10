// Build a music-only tutorial from actual UI captures and Romanian side notes.
const path = require('node:path');
const fs = require('node:fs/promises');
const { spawnSync } = require('node:child_process');
const repo = path.resolve(__dirname, '../..');
const { chromium } = require(path.join(repo, 'apps/web/node_modules/@playwright/test'));
const sharp = require(path.join(repo, 'apps/api/node_modules/sharp'));
const scenes = require(path.join(repo, 'apps/web/src/lib/members/registration-tutorial.json'));
const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);
const temp = path.join(repo, 'tmp/tutorial-inscriere');
const assets = path.join(repo, 'apps/web/static/tutoriale');
const ffmpeg = process.env.TUTORIAL_FFMPEG;
if (!ffmpeg) throw new Error('Set TUTORIAL_FFMPEG to an FFmpeg executable.');
const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const ts = seconds => { const ms = Math.round(seconds * 1000); return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`; };
const stamp = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
function encode(args) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || 'FFmpeg failed');
}
(async () => {
  await fs.mkdir(assets, { recursive: true });
  const logo = 'data:image/png;base64,' + (await fs.readFile(path.join(repo, 'apps/web/static/branding/scouts-cluj-wide.png'))).toString('base64');
  const browser = await chromium.launch({ channel: 'chromium', headless: true });
  let elapsed = 0;
  let vtt = 'WEBVTT\n\n';
  let chapters = 'WEBVTT\n\n';
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
    for (const [i, s] of scenes.entries()) {
      const intro = s.id === 'cover', finish = s.id === 'finish';
      const image = !intro && !finish ? 'data:image/png;base64,' + (await fs.readFile(path.join(temp, s.id + '.png'))).toString('base64') : null;
      const route = ['code', 'google'].includes(s.id) ? 'membri.scout.ro/login' : ['start', 'login'].includes(s.id) ? 'resurse.scoutscluj.ro/login' : 'resurse.scoutscluj.ro/register';
      const content = image
        ? `<div class="window"><div class="address"><span class="dots">● ● ●</span><span>${route}</span><span class="demo">Date de exemplu</span></div><div class="screen"><img src="${image}" /></div></div>`
        : `<div class="hero"><img src="${logo}" /><p class="kicker">RESURSE SCOUTS CLUJ</p><h2>${intro ? 'Primul pas<br>în cercetășie.' : 'Un singur cont.<br>Acces în Resurse.'}</h2><div class="journey"><div><b>1</b> Cererea de înscriere</div><div><b>2</b> Aprobarea centrului</div><div><b>3</b> Autentificarea</div></div><p class="url">resurse.scoutscluj.ro</p></div>`;
      await page.setContent(`<!doctype html><html lang="ro"><meta charset="utf-8"><style>
        *{box-sizing:border-box}body{margin:0;width:1600px;height:900px;background:#f5f6f8;color:#183044;font-family:'Segoe UI',Arial,sans-serif}header{height:110px;display:flex;align-items:center;justify-content:space-between;padding:0 48px;border-bottom:1px solid #e0e4e8;background:#fff}header img{width:200px;height:92px;object-fit:contain}header p{font-size:21px;color:#647285;letter-spacing:.03em}main{display:grid;grid-template-columns:1040px 1fr;gap:42px;padding:36px 48px 26px;height:710px}.window{height:648px;border:1px solid #dfe4e9;border-radius:16px;background:#fff;overflow:hidden;box-shadow:0 8px 28px #182b3a08}.address{display:flex;align-items:center;gap:24px;height:48px;background:#fafbfc;border-bottom:1px solid #e4e8ec;padding:0 22px;color:#627384;font-size:16px}.dots{color:#b7c0c9;letter-spacing:3px}.demo{margin-left:auto;color:#8a6870;font-size:14px}.screen{height:598px;display:flex;align-items:center;justify-content:center;padding:24px}.screen img{width:100%;height:100%;object-fit:contain}.hero{background:#fff;border:1px solid #e0e4e8;border-radius:16px;padding:42px 64px;height:648px}.hero>img{width:300px;height:150px;object-fit:contain;margin:-25px 0 -5px -20px}.kicker{font-size:16px;color:#637487;letter-spacing:.09em;font-weight:600}h2{font-size:58px;line-height:1.1;letter-spacing:-.035em;margin:14px 0 28px}.journey{display:flex;gap:26px;font-size:18px;color:#42586a}.journey>div{max-width:195px;line-height:1.45}.journey b{display:block;background:#f9edef;color:#b51f2a;border-radius:50%;width:32px;height:32px;text-align:center;line-height:32px;margin-bottom:12px}.url{font-size:24px;color:#b51f2a;font-weight:600;margin-top:36px}aside{padding:18px 0 0}.step{font-size:17px;letter-spacing:.08em;text-transform:uppercase;color:#b51f2a;font-weight:600;margin:0 0 17px}h1{font-size:36px;letter-spacing:-.025em;line-height:1.16;margin:0 0 30px;font-weight:650}ul{padding:0;margin:0;list-style:none;display:grid;gap:24px}li{font-size:24px;line-height:1.42;color:#43596b;padding-left:20px;border-left:3px solid #e3c6cb}footer{height:80px;display:flex;align-items:center;justify-content:space-between;padding:0 48px;gap:30px;color:#637487;font-size:16px}.progress{display:flex;gap:7px;flex:1;max-width:580px}.progress i{height:5px;background:#e0e5e9;flex:1;border-radius:2px}.progress i.done{background:#b51f2a}.time{font-variant-numeric:tabular-nums}.silent{font-size:14px}
        </style><header><img src="${logo}" /><p>ÎNSCRIERE ȘI ACCES · GHID PENTRU PĂRINȚI</p></header><main>${content}<aside><p class="step">${intro ? 'Bine ai venit' : finish ? 'La final' : `Pasul ${i} / ${scenes.length-2}`}</p><h1>${escape(s.title)}</h1><ul>${s.points.map(p=>`<li>${escape(p)}</li>`).join('')}</ul></aside></main><footer><span class="time">${stamp(elapsed)} / ${stamp(totalDuration)}</span><div class="progress">${scenes.map((_,j)=>`<i class="${j<=i?'done':''}"></i>`).join('')}</div><span class="silent">Muzică instrumentală · fără voce · date fictive</span></footer></html>`);
      await page.evaluate(() => document.fonts.ready);
      const bounds = await page.locator('aside').evaluate(el => ({ bottom: el.getBoundingClientRect().bottom, content: el.scrollHeight, height: el.clientHeight }));
      if (bounds.content > bounds.height || bounds.bottom > 825) throw new Error('Text overflow: ' + s.id);
      const frame = path.join(temp, `frame-${String(i).padStart(2,'0')}.png`);
      await page.screenshot({ path: frame });
      if (intro) await sharp(frame).webp({ quality: 88 }).toFile(path.join(assets, 'inscriere-parinti-poster.webp'));
      for (const [j, point] of s.points.entries()) vtt += `${ts(elapsed + j*s.duration/s.points.length)} --> ${ts(elapsed + (j+1)*s.duration/s.points.length)}\n${s.title}: ${point}\n\n`;
      chapters += `${ts(elapsed)} --> ${ts(elapsed+s.duration)}\n${s.title}\n\n`;
      elapsed += s.duration;
    }
  } finally { await browser.close(); }
  await fs.writeFile(path.join(assets, 'inscriere-parinti.ro.vtt'), vtt);
  await fs.writeFile(path.join(assets, 'inscriere-parinti.chapters.vtt'), chapters);
  await fs.writeFile(path.join(temp, 'timeline.json'), JSON.stringify({ duration: elapsed, scenes }, null, 2));
  for (const [i, scene] of scenes.entries()) {
    encode(['-loop','1','-i',path.join(temp,`frame-${String(i).padStart(2,'0')}.png`),'-t',String(scene.duration),'-vf',`fade=t=in:st=0:d=0.2:color=0xf5f6f8,fade=t=out:st=${scene.duration-.2}:d=0.2:color=0xf5f6f8,format=yuv420p`,'-r','24','-c:v','libx264','-preset','veryfast','-crf','23','-an',path.join(temp,`clip-${i}.mp4`)]);
    console.log('Encoded scene', i+1, '/', scenes.length);
  }
  await fs.writeFile(path.join(temp, 'clips.txt'), scenes.map((_,i)=>`file 'clip-${i}.mp4'`).join('\n'));
  encode(['-f','concat','-safe','0','-i',path.join(temp,'clips.txt'),'-c','copy',path.join(temp,'picture.mp4')]);
  encode(['-i',path.join(temp,'picture.mp4'),'-i',path.join(temp,'music.mp3'),'-t',String(elapsed),'-map','0:v:0','-map','1:a:0','-c:v','copy','-af',`loudnorm=I=-22:TP=-3:LRA=6,afade=t=in:d=1.2,afade=t=out:st=${elapsed-3}:d=3`,'-c:a','aac','-b:a','128k','-ar','48000','-movflags','+faststart','-metadata','title=Inscriere si autentificare in Resurse - ghid pentru parinti',path.join(assets,'inscriere-parinti.mp4')]);
  console.log('Created tutorial:', elapsed, 'seconds, music only; no voice.');
})().catch(e=>{console.error(e.message);process.exitCode=1});
