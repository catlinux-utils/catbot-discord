import "dotenv/config";
import { execFile } from "child_process";

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
    execFile(
      "docker",
      [
        "exec",
        "-u",
        "user",
        "-w",
        "/home/user",
        "arch_container",
        "/bin/bash",
        "-c",
        command,
      ],
      (error, stdout, stderr) => {
        /*if (error) {
          client.logs.error(`Error: ${error.message}`);
        }*/
        if (stderr) {
          return message.reply(
            stderr ? `stderr:\n\`\`\`${stderr}\`\`\`` : "no output"
          );
        }
        return message.reply(stdout ? `\`\`\`${stdout}\`\`\`` : "no output");
      }
    );
  });
};

//echo ls | docker exec -u user -w /home/user arch_container /bin/bash -c
