const Imap = require("imap");

async function fetchOtpCode(email) {
  const imapConfig = {
    user: email.email,
    password: email.imapPass,
    host: "outlook.office365.com",
    port: 993,
    tls: true,
  };
  const imap = new Imap(imapConfig);

  // Create a Promise that resolves with the OTP code
  const getOtpCode = new Promise((resolve, reject) => {
    function openInbox(cb) {
      imap.openBox("INBOX", true, cb);
    }

    imap.once("ready", () => {
      openInbox((err, box) => {
        if (err) reject(err);

        const searchCriteria = [["FROM", "support@velodata.app"]];

        imap.search(searchCriteria, (err, results) => {
          if (err) reject(err);

          const f = imap.fetch(results[results.length - 1], { bodies: "" });

          f.on("message", (msg, seqno) => {
            msg.on("body", (stream, info) => {
              let buffer = "";

              stream.on("data", (chunk) => {
                buffer += chunk.toString("utf8");
              });

              stream.on("end", () => {
                const otpCode = buffer
                  .split('line-break: anywhere;">')
                  .slice(-1)[0]
                  .split("</h2>")[0];
                resolve(otpCode);
              });
            });
          });

          f.once("error", (err) => {
            reject(err);
          });

          f.once("end", () => {
            imap.end();
          });
        });
      });
    });

    imap.once("error", (err) => {
      reject(err);
    });

    imap.once("end", () => {
      console.log("Connection ended");
    });

    imap.connect();
  });

  try {
    const otpCode = await getOtpCode;
    return otpCode;
  } catch (error) {
    console.error(error);
    return null;
  }
}

module.exports = fetchOtpCode;
