import fs from "fs";

export default async (client) => {
  fs.readdirSync(`${process.cwd()}/src/events`).forEach(async (handler) => {
    await import(`${process.cwd()}/src/events/${handler}`).then((module) => {
      module.default(client);
    });
  });
};
