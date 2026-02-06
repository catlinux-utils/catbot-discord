import type { Client, User, Team } from "discord.js";

export default function ready(client: Client) {
  client.on("clientReady", async () => {
    client.logs?.startup?.(`Logged in as ${client.user.tag}!`);
    await client.application.fetch();
    const appOwner: User | Team = client.application.owner as User | Team;

    const isTeam = (o: User | Team): o is Team =>
      !!o && typeof o === "object" && "members" in o;

    let owners: string[] = [];
    if (isTeam(appOwner) && appOwner.members) {
      // Team.members is a Collection; Collection.map returns an array
      owners = appOwner.members
        .filter((member: any) => ["admin", "developer"].includes(member.role))
        .map((member: any) => member.user.id);
    } else if (appOwner && "id" in appOwner) {
      owners = [appOwner.id];
    }
    client.owners = owners;
  });
}
