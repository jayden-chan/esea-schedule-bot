import * as puppeteer from "puppeteer";
import { ESEAData } from "./types";

export async function getMatches() {
  const randomUseragent = require("random-useragent");
  const userAgent = randomUseragent.getRandom();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

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

  await page.setUserAgent(userAgent);
  await page.setCookie({
    name: "cookie_consent",
    value: "1",
    domain: "play.esea.net",
  });

  await page.setViewport({ width: 1280, height: 720 });
  await page.goto("https://play.esea.net/api/teams/8762726/matches");

  const json: ESEAData = await page.evaluate(() => {
    return JSON.parse(document.querySelector("body")!.innerText);
  });

  await browser.close();

  return json;
}
