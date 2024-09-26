import fs from "fs";

export default async (client) => {
  fs.readdirSync(`${process.cwd()}/events`).forEach(async (handler) => {
    await import(`${process.cwd()}/events/${handler}`).then((module) => {
      module.default(client);
    });
  });
};
