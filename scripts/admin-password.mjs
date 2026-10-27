import { randomBytes, pbkdf2Sync } from "node:crypto";
import { createInterface } from "node:readline";

// The password is read interactively, never from command-line arguments/history.
if (!process.stdin.isTTY)
  throw new Error("请在交互终端运行 npm run admin:password。");
const rl = createInterface({ input: process.stdin, output: process.stdout });
process.stdout.write("设置管理员密码（至少 16 位，输入不回显）：");
rl._writeToOutput = () => {};
rl.question("", (password) => {
  rl.close();
  process.stdout.write("\n");
  if (password.length < 16 || password.length > 256) {
    console.error("密码需要 16–256 位，请重新运行。");
    process.exitCode = 1;
    return;
  }
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, 100000, 32, "sha256");
  console.log(
    `ADMIN_PASSWORD_HASH=pbkdf2-sha256:100000:${salt.toString("hex")}:${hash.toString("hex")}`,
  );
  console.log(
    "将这行写入 .dev.vars；线上通过 wrangler secret put ADMIN_PASSWORD_HASH 设置冒号分隔的值。不要提交此哈希。",
  );
});
