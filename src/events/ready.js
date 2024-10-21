export default (client) => {
  const { log } = client.utils.logging;
  client.on("ready", async () => {
    log(`Logged in as ${client.user.tag}!`);
    await client.application.fetch();
    const owners = client.application.owner.members
      ? client.application.owner.members
          .filter((member) => ["admin", "developer"].includes(member.role))
          .map((member) => member.user.id)
      : [client.application.owner.id];
    client.owners = owners;
  });
};
