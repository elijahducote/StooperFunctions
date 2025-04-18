import { Hono } from "hono";
import { wrapper } from "./lib/wrapr.js";
import {
  createIntent,
  deliver,
  flyerUpdate,
  important,
  message,
  request,
  resend,
  subscribe
} from "./functions/djev/ntry.js";
const app = new Hono();

app.get("/flyer-update", wrapper(flyerUpdate,"HONO"));

Deno.serve(app.fetch);