# Elysia OAuth Boilerplate

Repository showing the boilerplate used to integrate [Elysia](https://elysiajs.com/) with OAuth from [arctic](https://arcticjs.dev/).

> [!NOTE]
> This example uses both Prisma and Discord as an example to easily follow along and assumes you've already created an OAuth application for the service you wish to use. If you are not sure of how to do this please refer to the documentation of the service you wish to use for more information.

## Configuration

For any other issues or changes you may look at the [Lucia documentation](https://lucia-auth.com/) so you can edit the code accordingly.

Using Prisma initialize the database with SQLite using `bunx prisma init --datasource-provider sqlite` and add the following tables to your schema:

```prisma
model User {
  id        String    @id @default(uuid())
  discordId String    @unique
  username  String
  name      String
  avatar    String
  createdAt DateTime  @default(now())
  Session   Session[]
}

model Session {
  id        String   @id
  userId    String
  expiresAt DateTime

  user User @relation(references: [id], fields: [userId], onDelete: Cascade)
}
```

Create or modify the `.env` file in your root directory with the following or replacing with the provider you wish to use

```.env
DISCORD_CLIENT_ID=""
DISCORD_CLIENT_TOKEN=""
DISCORD_REDIRECT="http://localhost:3000/login/callback"
```

## License

This template is available under the CC0 license. Feel free to learn from it and incorporate it in your own projects.
