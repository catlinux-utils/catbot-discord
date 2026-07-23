import { OpenRouter } from "@openrouter/sdk";

import type { Client } from "discord.js";

import "dotenv/config";

const ORclient = new OpenRouter({
  apiKey: process.env.openrouter,
});

export default function skynet(client: Client) {
  client.on("messageCreate", async (message) => {
    if (!message.mentions.users.has(client.user.id)) return;
    if (!client.owners?.includes(message.member.id)) return;

    const completion = await ORclient.chat.send({
      chatRequest: {
        model: "nvidia/nemotron-3-super-120b-a12b:free",
        messages: [
          {
            role: "user",
            content: "How many r's are in the word 'strawberry'?",
          },
        ],
        stream: true,
      },
    });

    console.log(completion);
  });
}
