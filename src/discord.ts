import * as Discord from "discord.js";
import * as moment from "moment-timezone";

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

export function getEmbed(props: {
  id: number;
  map: string;
  time: string;
  home: { id: number; name: string };
  away: { id: number; name: string };
}): Discord.MessageEmbed {
  return new Discord.MessageEmbed()
    .setColor("#0e9648")
    .setTitle("ESEA League Match Soon!")
    .setURL(`https://play.esea.net/match/${props.id}`)
    .setThumbnail("https://i.imgur.com/s6FV8zx.png")
    .addFields(
      { name: "Map", value: props.map },
      { name: "Time", value: props.time },
      {
        name: "Home",
        value: `[${props.home.name}](https://play.esea.net/teams/${props.home.id})`,
      },
      {
        name: "Away",
        value: `[${props.away.name}](https://play.esea.net/teams/${props.away.id})`,
      },
      { name: "Homepage", value: `https://play.esea.net/match/${props.id}` }
    )
    .setTimestamp()
    .setFooter("ESEA Scheduling Bot", "https://i.imgur.com/s6FV8zx.png");
}

export async function sendMessage(
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
