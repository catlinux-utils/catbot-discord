import { JSONFilePreset } from "lowdb/node";

export default async (client) => {
  client.database = await JSONFilePreset(`${process.cwd()}/database/db.json`, {
    economy: { balance: [] },
  });
};
