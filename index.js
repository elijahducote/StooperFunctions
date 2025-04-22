import { Hono } from "npm:hono";
import { wrapper } from "./lib/wrapr.js";
import {
  createIntent,
  deliver,
  flyerUpdate,
  important,
  message,
  request,
  resend,
  subscribe,
  contract
} from "./functions/djev/ntry.js";
const app = new Hono();

Deno.cron("Run every 24 hours", "0 0 * * *", {
  backoffSchedule: [500, 500, 500, 500, 500]
}, flyerUpdate);

app.post("/create-intent", wrapper(createIntent,"HONO"));
app.post("/deliver", wrapper(deliver,"HONO"));
app.get("/flyer-update", wrapper(flyerUpdate,"HONO"));
app.get("/important", wrapper(important,"HONO"));
app.post("/message", wrapper(message,"HONO"));
app.post("/request", wrapper(request,"HONO"));
app.post("/resend", wrapper(resend,"HONO"));
app.post("/subscribe", wrapper(subscribe,"HONO"));
app.post("/contract", wrapper(contract,"HONO"));

Deno.serve(app.fetch);