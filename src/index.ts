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

const emails = parseEmails("./inputs/emails.txt");
const proxies = parseProxies("./inputs/proxies.txt");

const numThreads = config.numThreads;

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

// if (isMainThread) {
//   for (let i = 0; i < emails.length; i++) {
//     const worker = new Worker(__filename, {
//       workerData: { email: emails[i], proxy: proxies[i] },
//     });
//     worker.on("message", (message) => {
//       console.log(message);
//     });
//     worker.on("error", (error) => {
//       console.error(error);
//     });
//     worker.on("exit", (code) => {
//       if (code !== 0) {
//         console.error(`Thread Exit ${code}`);
//       }
//     });

//     // Остановка создания потоков, когда достигнуто указанное количество
//     if (i + 1 === numThreads) {
//       break;
//     }
//   }
// } else {
//   const { email, proxy } = workerData;
//   signUp(email, proxy);
// }

function signUpRecursive(emails, proxies, index = 0, numThreads = 4) {
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

if (isMainThread) {
  for (let i = 0; i < numThreads; i++) {
    signUpRecursive(emails, proxies, i, numThreads);
  }
} else {
  const { email, proxy } = workerData;
  signUp(email, proxy);
}
