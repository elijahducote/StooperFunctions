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
import {
  updateReleases
} from "./functions/evwave/ntry.js";
import {
  joinHbg
} from "./functions/hbg/ntry.js";
const app = new Hono();

Deno.cron("Run every Wednesday", "0 0 * * WED", flyerUpdate);

app.post("/join-hbg", wrapper(joinHbg,"HONO")).get(wrapper(joinHbg,"HONO"));
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
app.get("/update-releases", wrapper(updateReleases,"HONO"));

Deno.serve(app.fetch);