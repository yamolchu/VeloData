const ac = require("@antiadmin/anticaptchaofficial");
const {
  Worker,
  workerData,
  isMainThread,
  parentPort,
} = require("worker_threads");
const { simpleParser } = require("mailparser");
const inspect = require("util").inspect;
const fs = require("fs");

const config = require("../inputs/config.ts");
const signUp = require("./signup.ts");
const delay = require("./delay.ts");

const emails = parseEmails("./inputs/emails.txt");
const proxies = parseProxies("./inputs/proxies.txt");

const numThreads = config.numThreads;
const customDelay = config.customDelay;

function parseEmails(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  const emails = [];

  lines.forEach((line) => {
    const [email, imapPass] = line.split(":");
    emails.push({ email: email.trim(), imapPass: imapPass.trim() });
  });

  return emails;
}
function parseProxies(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  const proxies = [];

  lines.forEach((line) => {
    const proxy = line.trim();
    proxies.push(proxy);
  });

  return proxies;
}

async function signUpRecursive(emails, proxies, index = 0, numThreads = 4) {
  if (index >= emails.length) {
    return;
  }

  const worker = new Worker(__filename, {
    workerData: { email: emails[index], proxy: proxies[index] },
  });
  worker.on("message", (message) => {
    console.log(message);
  });
  worker.on("error", (error) => {
    console.error(error);
  });
  worker.on("exit", (code) => {
    if (code !== 0) {
      console.error(`Thread Exit ${code}`);
    }
    signUpRecursive(emails, proxies, index + numThreads, numThreads);
  });
}
const main = async () => {
  if (isMainThread) {
    for (let i = 0; i < numThreads; i++) {
      await delay(customDelay);
      signUpRecursive(emails, proxies, i, numThreads);
    }
  } else {
    await delay(customDelay);
    const { email, proxy } = workerData;
    signUp(email, proxy);
  }
};
main();
