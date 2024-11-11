import "dotenv/config";
import { exec } from "child_process";

export default (client) => {
  client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.content.startsWith("?exec ")) return;

    if (!client.owners.includes(message.member.id)) {
      return message.reply({
        content: "You are not allowed to use this command",
        ephemeral: true,
      });
    }
    const command = message.content.slice(6).trim();
    exec(
      `docker exec -u user arch_container ${command}}`,
      (error, stdout, stderr) => {
        if (error) {
          message.reply(`Error: ${error.message}`);
          return;
        }
        if (stderr) {
          message.reply(`stderr: ${stderr}`);
          return;
        }
        message.reply(`\`\`\`${stdout}\`\`\``);
      }
    );
  });
};
