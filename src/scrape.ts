import { hostname } from "os";
import * as puppeteer from "puppeteer";
import { ESEAData } from "./types";
import { error, log } from "./log";

export async function getMatches(apiUrl: string) {
  const randomUseragent = require("random-useragent");
  const userAgent = randomUseragent.getRandom();

  log("Launching browser");
  const browser =
    process.env.NODE_ENV === "production"
      ? await puppeteer.launch({
          args: ["--disable-dev-shm-usage", "--disable-gpu"],
          executablePath: "/usr/bin/chromium-browser",
        })
      : await puppeteer.launch();

  log("Creating new page");
  const page = await browser.newPage();

  /* <Logging code for debugging> */

  // page
  //   .on("console", (message) =>
  //     console.log(
  //       `${message.type().substr(0, 3).toUpperCase()} ${message.text()}`
  //     )
  //   )
  //   .on("pageerror", ({ message }) => console.log(message))
  //   .on("response", (response) =>
  //     console.log(`${response.status()} ${response.url()}`)
  //   )
  //   .on("requestfailed", (request) =>
  //     console.log(`${request.failure().errorText} ${request.url()}`)
  //   );

  /* </Logging code for debugging> */

  await page.setUserAgent(userAgent);
  await page.setCookie({
    name: "cookie_consent",
    value: "1",
    domain: "play.esea.net",
  });

  await page.setViewport({ width: 1280, height: 720 });
  log("Navigating to the page");
  await page.goto(apiUrl);

  log("Fetching data");
  const json: ESEAData = await page.evaluate(() => {
    return JSON.parse(document.querySelector("body")!.innerText);
  });

  log("Closing browser");
  await browser.close();

  log("Finished fetching ESEA data");
  return json;
}
