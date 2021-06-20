import * as Discord from "discord.js";
import * as moment from "moment-timezone";
import { Config } from ".";
import { error, log } from "./log";
import { ESEAItem } from "./types";

const ESEA_GREEN = "#0e9648";

export async function initDiscord(): Promise<Discord.Client> {
  let intents = new Discord.Intents(Discord.Intents.NON_PRIVILEGED);
  intents.add(Discord.Intents.FLAGS.GUILD_MEMBERS);
  const client = new Discord.Client({ ws: { intents } });
  const token = process.env.DISCORD_TOKEN;
  client.login(token);

  return new Promise((resolve, reject) => {
    client.on("ready", () => {
      log(`Logged in as ${client.user!.tag}!`);
      resolve(client);
    });

    client.on("error", (e) => {
      error(e);
      reject(e);
    });
  });
}

export function allVCMembers(client: Discord.Client): string[] {
  return [
    ...client.guilds.cache
      .map((g) => g.channels.cache.filter((c) => c.type === "voice"))
      .flatMap((c) => [...c])
      .reduce((acc, curr) => {
        curr[1].members.forEach((m) => acc.add(m.user.id));
        return acc;
      }, new Set<string>()),
  ];
}

export async function notifyWarmupLatecomers(
  client: Discord.Client,
  config: Config,
  lateUsers: string[]
) {
  const vcMembers = allVCMembers(client);
  const missingMembers = config.teamMembers.filter(
    (m) => !vcMembers.includes(m) && !lateUsers.includes(m)
  );

  if (missingMembers.length === 0) return;

  const c = client.channels.cache.find(
    (c) =>
      c.isText() &&
      "name" in c &&
      c.name === config.channelName &&
      c.guild.name === config.serverName
  )! as Discord.TextChannel;

  const pings = missingMembers.map((id) => `<@${id}>`);

  await c.send(`${pings.join(" ")} YOU ARE LATE FOR WARMUP!!!`);
}

export function getEmbed(item: ESEAItem, config: Config): Discord.MessageEmbed {
  const matchLink = `https://play.esea.net/match/${item.id}`;
  return new Discord.MessageEmbed()
    .setColor(ESEA_GREEN)
    .setTitle("ESEA League Match Soon!")
    .setURL(matchLink)
    .setThumbnail(config.imageUrl)
    .addFields(
      { name: "Map", value: item.map.id },
      {
        name: "Time",
        value: moment(item.date)
          .tz("America/Edmonton")
          .format("ddd, MMM Do @ h:mm A zz"),
      },
      {
        name: "Home",
        value: `[${item.home.name}](https://play.esea.net/teams/${item.home.id})`,
      },
      {
        name: "Away",
        value: `[${item.away.name}](https://play.esea.net/teams/${item.away.id})`,
      },
      { name: "Homepage", value: matchLink }
    )
    .setTimestamp()
    .setFooter("ESEA Scheduling Bot", config.imageUrl);
}

export async function sendMessage(
  client: Discord.Client,
  props: {
    message: string;
    channel: string;
    role: string;
    server: string;
  }
) {
  const channel = client.channels.cache.find(
    (c) =>
      c.isText() &&
      "name" in c &&
      c.name === props.channel &&
      c.guild.name === props.server
  )! as Discord.TextChannel;

  const guild = client.guilds.cache.find((g) => g.name === props.server)!;
  const role = guild.roles.cache.find((r) => r.name === props.role)!;

  await channel.send(`<@&${role.id}> ${props.message}`);
}

export async function sendEmbed(
  client: Discord.Client,
  props: {
    message: Discord.MessageEmbed;
    channel: string;
    role: string;
    server: string;
  }
) {
  const channel = client.channels.cache.find(
    (c) =>
      c.isText() &&
      "name" in c &&
      c.name === props.channel &&
      c.guild.name === props.server
  )! as Discord.TextChannel;

  const guild = client.guilds.cache.find((g) => g.name === props.server)!;
  const role = guild.roles.cache.find((r) => r.name === props.role)!;

  await channel.send(`<@&${role.id}>`, props.message);
}
