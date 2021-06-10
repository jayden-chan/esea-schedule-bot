import { readFile } from "fs/promises";
import * as moment from "moment-timezone";

import { initDiscord, getEmbed, sendMessage } from "./discord";
import { ESEAData } from "./types";

async function main() {
  const client = await initDiscord();

  const json: ESEAData = JSON.parse(
    await readFile("out.json", { encoding: "utf8" })
  );

  const today = moment();
  const hasMatchIn24H = json.data.find((match) => {
    const date = moment(match.date);

    const diff = date.diff(today, "hours");

    if (Math.abs(diff) < 24) {
      return true;
    }
    return false;
  });

  if (hasMatchIn24H) {
    const { id, map, home, away, date } = hasMatchIn24H;
    const embed = getEmbed({
      id,
      home,
      away,
      map: map.id,
      time: moment(date)
        .tz("America/Edmonton")
        .format("ddd, MMM Do @ h:mm A zz"),
    });

    await sendMessage(client, {
      message: embed,
      server: "this shit ass server",
      channel: "general",
      role: "RAT",
    });
  }

  client.destroy();
}

main();
