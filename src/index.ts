import * as Discord from "discord.js";
import { readFile } from "fs/promises";
import * as moment from "moment-timezone";

import {
  getEmbed,
  initDiscord,
  notifyWarmupLatecomers,
  sendEmbed,
  sendMessage,
} from "./discord";

import { error, log } from "./log";
import { getMatches } from "./scrape";
import { ESEAData } from "./types";

const SIX_HOURS = 6 * 60 * 60 * 1000;
const FIFTEEN_MINS = 15 * 60 * 1000;

let dayTimeout: NodeJS.Timeout | undefined;
let warmupTimeout: NodeJS.Timeout | undefined;
let lateTimeout: NodeJS.Timeout | undefined;
let lateUsers: string[] = [];

export type Config = {
  serverName: string;
  channelName: string;
  roleName: string;
  imageUrl: string;
  timezone: string;
  teamMembers: string[];
};

async function readConfig(path: string): Promise<Config> {
  return JSON.parse(await readFile(path, { encoding: "utf8" }));
}

function checkMatchTomorrow(
  client: Discord.Client,
  data: ESEAData,
  config: Config
) {
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
          message: getEmbed(hasMatchTomorrow, config),
          server: config.serverName,
          channel: config.channelName,
          role: config.roleName,
        });
        dayTimeout = undefined;
      }, diffMs);
    }
  }
}

function checkMatchToday(
  client: Discord.Client,
  data: ESEAData,
  config: Config
) {
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
          server: config.serverName,
          channel: config.channelName,
          role: config.roleName,
        });
        warmupTimeout = undefined;
      }, msToWarmup - FIFTEEN_MINS);
    }

    // Scold the late team members once warmup starts
    if (msToWarmup > 0 && lateTimeout === undefined) {
      lateTimeout = setTimeout(() => {
        notifyWarmupLatecomers(client, config, lateUsers);
        lateTimeout = undefined;
        lateUsers = [];
      }, msToWarmup);
    }
  }
}

function tick(client: Discord.Client, config: Config) {
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

    checkMatchToday(client, data, config);
    checkMatchTomorrow(client, data, config);
    log("Finished tick");
  };
}

async function main() {
  if (!process.argv[2]) {
    console.error("Provide the path to the config");
    return;
  }
  const config = await readConfig(process.argv[2]);

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

  tick(client, config)();

  // Refresh the data every 6 hours
  log("Starting the interval");
  const interval = setInterval(
    tick(client, config),
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
