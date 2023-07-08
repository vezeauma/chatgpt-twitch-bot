import { ChatGPTAPI, ChatMessage } from "chatgpt";
import tmi from "tmi.js";
import dotenv from "dotenv";
import { retry, retryAsync } from "ts-retry";

dotenv.config();

const client = new tmi.Client({
  options: { debug: true },
  connection: {
    secure: true,
    reconnect: true,
  },
  identity: {
    username: process.env.TWITCH_NAME,
    password: process.env.TWITCH_TOKEN,
  },
  channels: [process.env.TWITCH_CHANNEL as string],
});

let chatGPTAPI: ChatGPTAPI;
let result : ChatMessage;
var active = true;

(async function () {
  if (process.env.OPENAI_API_KEY) {
    let api_gpt:string = process.env.OPENAI_API_KEY.toString()
    
    chatGPTAPI = new ChatGPTAPI({ apiKey: api_gpt });
  }
})();


client.connect();


client.on("message", async (channel, tags, message, self) => {
  if (self || !message.startsWith("!")) {
    return;
  }

  const args = message.slice(1).split(" ");
  const command = args.shift()?.toLowerCase();
  const prompt = args.join(" ");

  if (`${command} ${prompt}` ==`${process.env.COMMAND_NAME} test`) {
    client.say(channel, `@${tags.username}, test`);
  } else if (command === `${process.env.COMMAND_NAME}`) {
    if (active) {
      // Do command stuff

      const res = await retryAsync(
        async () => {
          if(result==null) {
            result = await chatGPTAPI.sendMessage(prompt)
          } else {
            result = await chatGPTAPI.sendMessage(prompt,{parentMessageId: result.id})
          }
          client.say(channel, `@${tags.username}, ${result.text}`);
          console.log(result)
        },
        { delay: 100, maxTry: 5 }
      );
      active = false;
        setTimeout(() => {
            active = true;
        }, 30000);
    } else {
      // Do stuff if the command is in cooldown
      client.say(channel, `@${tags.username} - Sorry, please wait 30 sec`);
    }
  } 
})
