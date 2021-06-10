import * as Discord from "discord.js";
import * as moment from "moment-timezone";
import { ESEAItem } from "./types";

export async function initDiscord(): Promise<Discord.Client> {
  const client = new Discord.Client();
  const token = process.env.DISCORD_TOKEN;
  client.login(token);

  return new Promise((resolve, reject) => {
    client.on("ready", () => {
      console.info(`Logged in as ${client.user!.tag}!`);
      resolve(client);
    });

    client.on("error", (e) => {
      console.error(e);
      reject(e);
    });
  });
}

export function getEmbed(item: ESEAItem): Discord.MessageEmbed {
  return new Discord.MessageEmbed()
    .setColor("#0e9648")
    .setTitle("ESEA League Match Soon!")
    .setURL(`https://play.esea.net/match/${item.id}`)
    .setThumbnail("https://i.imgur.com/s6FV8zx.png")
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
      { name: "Homepage", value: `https://play.esea.net/match/${item.id}` }
    )
    .setTimestamp()
    .setFooter("ESEA Scheduling Bot", "https://i.imgur.com/s6FV8zx.png");
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
  const c = client.channels.cache.find(
    (c) =>
      c.isText() &&
      "name" in c &&
      c.name === props.channel &&
      c.guild.name === props.server
  )! as Discord.TextChannel;

  const g = client.guilds.cache.find((g) => g.name === props.server)!;
  const r = g.roles.cache.find((r) => r.name === props.role)!;

  await c.send(`<@&${r.id}> ${props.message}`);
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
  const c = client.channels.cache.find(
    (c) =>
      c.isText() &&
      "name" in c &&
      c.name === props.channel &&
      c.guild.name === props.server
  )! as Discord.TextChannel;

  const g = client.guilds.cache.find((g) => g.name === props.server)!;
  const r = g.roles.cache.find((r) => r.name === props.role)!;

  await c.send(`<@&${r.id}>`, props.message);
}
