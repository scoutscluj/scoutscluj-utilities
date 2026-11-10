const { spawn } = require("node:child_process");
const path = require("node:path");
const repo = path.resolve(__dirname, "../..");
const fixture = spawn(
  process.execPath,
  ["apps/web/e2e/fixtures/member-admissions-api.mjs"],
  { cwd: repo, stdio: "inherit" },
);
const web = spawn(process.execPath, ["apps/web/build/index.js"], {
  cwd: repo,
  env: {
    ...process.env,
    PUBLIC_API_BASE_URL: "http://127.0.0.1:3027",
    HOST: "127.0.0.1",
    PORT: "5197",
    ORIGIN: "http://127.0.0.1:5197",
  },
  stdio: "inherit",
});
const stop = () => {
  fixture.kill();
  web.kill();
};
process.on("SIGINT", () => {
  stop();
  process.exit();
});
process.on("SIGTERM", () => {
  stop();
  process.exit();
});
process.on("exit", stop);
