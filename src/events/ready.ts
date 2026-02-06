import type { Client } from "discord.js";

export default function ready(client: Client) {
  client.on("clientReady", async () => {
    client.logs?.startup?.(`Logged in as ${client.user.tag}!`);
    await client.application.fetch();
    const appOwner: any = client.application.owner;
    let owners: string[] = [];
    if (
      appOwner &&
      typeof appOwner === "object" &&
      "members" in appOwner &&
      Array.isArray(appOwner.members)
    ) {
      owners = appOwner.members
        .filter((member: any) => ["admin", "developer"].includes(member.role))
        .map((member: any) => member.user.id);
    } else if (appOwner && "id" in appOwner) {
      owners = [appOwner.id];
    }
    client.owners = owners;
  });
}
