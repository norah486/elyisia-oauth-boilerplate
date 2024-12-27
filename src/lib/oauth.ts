import { Discord } from "arctic";

export const discord = new Discord(
  process.env.DISCORD_CLIENT_ID!,
  process.env.DISCORD_CLIENT_TOKEN!,
  process.env.DISCORD_REDIRECT!
);
