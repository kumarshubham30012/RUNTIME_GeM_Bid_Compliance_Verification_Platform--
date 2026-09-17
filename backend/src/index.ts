import { env } from "./config/env";
import { createApp } from "./app";
import { getDb } from "./db/client";

getDb();

const app = createApp();

app.listen(env.port, () => {
  console.log(`Backend listening on http://localhost:${env.port}`);
});
