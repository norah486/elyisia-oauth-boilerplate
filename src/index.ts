import { Elysia, error } from "elysia";
import { auth } from "./lib/auth";

export const app = new Elysia()
  .get("/", () => "Hello Elysia")
  .use(auth)
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
