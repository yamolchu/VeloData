const ac = require("@antiadmin/anticaptchaofficial");
const { CookieJar } = require("tough-cookie");
const axios = require("axios");
const generator = require("generate-password");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

const jar = new CookieJar();

const fetchOtpCode = require("./fetchOtpCode.ts");
const config = require("../inputs/config.ts");
const delay = require("./delay.ts");

const { random } = require("user-agents");
const { SocksProxyAgent } = require("socks-proxy-agent");
const { HttpsProxyAgent } = require("https-proxy-agent");

const genPassword = () => {
  return generator.generate({
    length: 12,
    numbers: true,
  });
};
const csvWriter = createCsvWriter({
  path: "./result.csv",
  header: [
    { id: "email", title: "Email" },
    { id: "password", title: "Password" },
    { id: "proxy", title: "Proxy" },
  ],
  append: true,
});

const ANTICAPTCHA_API_KEY = config.ANTICAPTCHA_API_KEY;
const SITEURL = "https://velodata.app/";
const SITE_KEY = "0x4AAAAAAAH8rdkQgx1wtszC";

async function signUp(email, proxy) {
  const regUrl = "https://velodata.app/api/a/register";
  await ac.setAPIKey(ANTICAPTCHA_API_KEY);
  const token = await ac.solveTurnstileProxyless(SITEURL, SITE_KEY, "login");

  const headers = {
    authority: "velodata.app",
    accept: "*/*",
    "accept-language":
      "en-US,en;q=0.9,uk;q=0.8,ru-RU;q=0.7,ru;q=0.6,en-GB;q=0.5",
    referer: `https://velodata.app/ref/${config.ref}`,
    "sec-ch-ua":
      '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    cookie: `theme=Light; refby=${config.ref}; ${jar.getCookieStringSync(
      "https://velodata.app"
    )}`,
    "user-agent": random().toString(),
  };

  const session = axios.create({
    headers: headers,
    httpsAgent:
      config.proxyType === "http"
        ? new HttpsProxyAgent(`http://${proxy}`)
        : new SocksProxyAgent(`socks5://${proxy}`),
  });

  const password = genPassword();
  const json_data = {
    email: email.email,
    password: password,
    code: token,
  };

  let cookies;
  try {
    const response = await session.post(regUrl, json_data);
    if (response.status === 200) {
      console.log(`Proxy: ${proxy}`);
      console.log(`Registration ${email.email} was successful`);
      const resultData = [
        {
          email: email.email,
          password: password,
          proxy: proxy,
        },
      ];
      await csvWriter
        .writeRecords(resultData)
        .then(() => {
          console.log("CSV file has been saved.");
        })
        .catch((error) => {
          console.error(error);
        });
      cookies = response.headers["set-cookie"];
    } else {
      console.log(`Error in registration ${email.email}`);
    }
  } catch (error) {
    console.error(`Error in registration ${email.email}:`, error);
  }

  cookies.forEach((cookie) => {
    jar.setCookieSync(cookie, "https://velodata.app");
  });

  await delay(config.waitOtpDelay);

  fetchOtpCode(email)
    .then((otpCode) => {
      console.log("OTP Code:", otpCode);
      const params = {
        ref: otpCode,
      };
      const response = session.get("https://velodata.app/api/a/verify", {
        params,
        headers: { Cookie: jar.getCookieStringSync("https://velodata.app") },
      });
      response
        .then((res) => {
          if (res.status === 200) {
            console.log("The verification was successful");
          } else {
            console.log("Error in verification");
          }
        })
        .catch((error) => {
          console.error("Error in verification:", error);
        });
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}
module.exports = signUp;
