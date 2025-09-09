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
import {
  sendMail
} from "./functions/ald/ntry.js";
const app = new Hono();

Deno.cron("Run every week", { dayOfWeek: 0, hour: 0, minute: 0 }, flyerUpdate);

app.post("/send-mail", wrapper(sendMail,"HONO")).get(wrapper(sendMail,"HONO"));
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