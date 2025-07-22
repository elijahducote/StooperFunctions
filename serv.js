import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import { wrapper } from "./lib/wrapr.js";
import {
  sendMail
} from "./functions/ald/ntry.js";
const app = new Hono();

app.all(logger());
app.post("/send-mail", wrapper(sendMail,"HONO")).get(wrapper(sendMail,"HONO"));

serve(app, (info) =>
{
  console.log(`Running on http://127.0.0.1:${info.port}`);
});