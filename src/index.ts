import * as moment from "moment-timezone";
import * as Discord from "discord.js";

import {
  initDiscord,
  getEmbed,
  sendEmbed,
  sendMessage,
  notifyWarmupLatecomers,
} from "./discord";

import { getMatches } from "./scrape";
import { log, error } from "./log";
import { ESEAData } from "./types";

const SIX_HOURS = 6 * 60 * 60 * 1000;
const FIFTEEN_MINS = 15 * 60 * 1000;
const SERVER_NAME = "Rat With Gun eSports";
const CHANNEL_NAME = "schedule";
const ROLE_NAME = "RAT";

let dayTimeout: NodeJS.Timeout | undefined;
let warmupTimeout: NodeJS.Timeout | undefined;
let lateTimeout: NodeJS.Timeout | undefined;
let lateUsers: string[] = [];

function checkMatchTomorrow(client: Discord.Client, data: ESEAData) {
  const now = moment();
  const hasMatchTomorrow = data.data.find((match) => {
    const date = moment(match.date);
    const diff = date.diff(now, "hours");

    return diff < 31 && diff > 24;
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
}

function checkMatchToday(client: Discord.Client, data: ESEAData) {
  const now = moment();
  const hasMatchToday = data.data.find((match) => {
    const date = moment(match.date);
    const diff = date.diff(now, "hours");

    return diff > 0 && diff < 6;
  });

  if (hasMatchToday) {
    log(`Match for today found, scheduling notification`);

    const msToWarmup = moment(hasMatchToday.date)
      .subtract(60, "minutes")
      .diff(moment(), "ms");

    // Send the warmup message 1:15 before the start date
    if (msToWarmup - FIFTEEN_MINS > 0 && warmupTimeout === undefined) {
      warmupTimeout = setTimeout(() => {
        sendMessage(client, {
          message: "WARMUP IN 15 MINUTES, GET IN HERE",
          server: SERVER_NAME,
          channel: CHANNEL_NAME,
          role: ROLE_NAME,
        });
        warmupTimeout = undefined;
      }, msToWarmup - FIFTEEN_MINS);
    }

    // Scold the late team members once warmup starts
    if (msToWarmup > 0 && lateTimeout === undefined) {
      lateTimeout = setTimeout(() => {
        notifyWarmupLatecomers(client, SERVER_NAME, CHANNEL_NAME, lateUsers);
        lateTimeout = undefined;
        lateUsers = [];
      }, msToWarmup);
    }
  }
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
        error(e);
        await new Promise((resolve) => setTimeout(resolve, timeout));
        timeout += 10000;
      }

      if (timeout >= 103000) {
        error("Failed to fetch ESEA data after 10 attempts");
        return;
      }
    }

    checkMatchToday(client, data);
    checkMatchTomorrow(client, data);
    log("Finished tick");
  };
}

async function main() {
  log("Logging into discord");
  const client = await initDiscord();

  client.on("message", (message) => {
    if (message.content.startsWith("!esea")) {
      const command = message.content.split(" ")[1];
      if (command === undefined) {
        message.channel.send(`<@${message.author.id}> Provide a command.`);
        return;
      }

      switch (command) {
        case "late":
          lateUsers.push(message.author.id);
          message.channel.send(
            `<@${message.author.id}> Added you to the late list`
          );
          break;
      }
    }
  });

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
    lateTimeout && clearTimeout(lateTimeout);

    client.destroy();
    log("Exited successfully");
    process.exit(0);
  };

  process.on("SIGINT", exit);
  process.on("SIGTERM", exit);
}

main();
