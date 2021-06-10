import * as moment from "moment-timezone";
import * as Discord from "discord.js";

import { initDiscord, getEmbed, sendEmbed, sendMessage } from "./discord";
import { getMatches } from "./scrape";
import { ESEAData } from "./types";

const SIX_HOURS = 6 * 60 * 60 * 1000;
const SERVER_NAME = "Rat With Gun eSports";
const CHANNEL_NAME = "schedule";
const ROLE_NAME = "RAT";

let dayTimeout: NodeJS.Timeout | undefined;
let warmupTimeout: NodeJS.Timeout | undefined;

function log(message?: any, ...optionalParams: any[]) {
  console.log(
    `[${moment().format("MMM-DD hh:mm A")}]`,
    message,
    ...optionalParams
  );
}

function error(message?: any, ...optionalParams: any[]) {
  console.error(
    `[${moment().format("MMM-DD hh:mm A")}]`,
    message,
    ...optionalParams
  );
}

function tick(client: Discord.Client) {
  return async () => {
    log("Starting tick");

    let data: ESEAData | undefined = undefined;
    let timeout = 3000;
    while (data === undefined) {
      try {
        data = await getMatches();
      } catch (e) {
        error(`failed to fetch data, sleeping for ${timeout} ms`);
        await new Promise((resolve) => setTimeout(resolve, timeout));
        timeout += 10000;
      }

      if (timeout >= 103000) {
        error("Failed to fetch ESEA data after 10 attempts");
        return;
      }
    }

    const now = moment();
    const hasMatchTomorrow = data.data.find((match) => {
      const date = moment(match.date);
      const diff = date.diff(now, "hours");

      return diff < 31 && diff > 24;
    });

    const hasMatchToday = data.data.find((match) => {
      const date = moment(match.date);
      const diff = date.diff(now, "hours");

      return diff > 0 && diff < 6;
    });

    if (hasMatchTomorrow) {
      log(`Match for tomorrow found, scheduling notification`);

      // Send the message 24 hours before the start date
      const diffMs = moment(hasMatchTomorrow.date)
        .subtract(24, "hours")
        .diff(moment(), "ms");

      if (diffMs > 0 && dayTimeout === undefined) {
        dayTimeout = setTimeout(() => {
          sendEmbed(client, {
            message: getEmbed(hasMatchTomorrow),
            server: SERVER_NAME,
            channel: CHANNEL_NAME,
            role: ROLE_NAME,
          });
          dayTimeout = undefined;
        }, diffMs);
      }
    }

    if (hasMatchToday) {
      log(`Match for today found, scheduling notification`);

      // Send the warmup message 1:15 before the start date
      const diffMs = moment(hasMatchToday.date)
        .subtract(75, "minutes")
        .diff(moment(), "ms");

      if (diffMs > 0 && warmupTimeout === undefined) {
        warmupTimeout = setTimeout(() => {
          sendMessage(client, {
            message: "WARMUP IN 15 MINUTES, GET IN HERE",
            server: SERVER_NAME,
            channel: CHANNEL_NAME,
            role: ROLE_NAME,
          });
          warmupTimeout = undefined;
        }, diffMs);
      }
    }
    log("Finished tick");
  };
}

async function main() {
  log("Logging into discord");
  const client = await initDiscord();

  tick(client)();

  // Refresh the data every 6 hours
  log("Starting the interval");
  const interval = setInterval(
    tick(client),
    SIX_HOURS + Math.floor(Math.random() * 15000)
  );

  const exit = () => {
    log("Exiting....");
    clearInterval(interval);

    dayTimeout && clearTimeout(dayTimeout);
    warmupTimeout && clearTimeout(warmupTimeout);

    client.destroy();
    log("Exited successfully");
    process.exit(0);
  };

  process.on("SIGINT", exit);
  process.on("SIGTERM", exit);
}

main();
