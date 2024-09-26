export default (client) => {
  client.on("ready", async () => {
    console.log(`Logged in as ${client.user.tag}!`);
  });
};
