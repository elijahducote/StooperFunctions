import { webhookRequest } from "./lib/utility.js";
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
  sendMail,
  createIntentAld,
  responseAld,
  subscribeAld
} from "./functions/ald/ntry.js";
import {
  updateReleases
} from "./functions/evwave/ntry.js";
import {
  joinHbg
} from "./functions/hbg/ntry.js";
import {
  contact
} from "./functions/trifect/ntry.js";
import {
  contactJavy
} from "./functions/javy/ntry.js";
const app = new Hono();

// At 12:00 AM, only on Wednesday
Deno.cron("update-hbg-flyer", "0 0 * * 3", () => webhookRequest("flyer"));

app.post("/contact-trifect", wrapper(contact,"HONO")).get(wrapper(contact,"HONO"));
app.post("/contact-javy", wrapper(contactJavy,"HONO")).get(wrapper(contactJavy,"HONO"));
app.post("/join-hbg", wrapper(joinHbg,"HONO")).get(wrapper(joinHbg,"HONO"));
app.post("/send-mail", wrapper(sendMail,"HONO")).get(wrapper(sendMail,"HONO"));
app.post("/create-intent-ald", wrapper(createIntentAld,"HONO"));
app.get("/response-ald", wrapper(responseAld,"HONO")).post(wrapper(responseAld,"HONO"));
app.post("/subscribe-ald", wrapper(subscribeAld,"HONO"));
app.post("/create-intent", wrapper(createIntent,"HONO"));
app.post("/deliver", wrapper(deliver,"HONO"));
app.get("/flyer-update", wrapper(flyerUpdate,"HONO"));
app.get("/important", wrapper(important,"HONO"));
app.get("/message", wrapper(message,"HONO"));
app.post("/request", wrapper(request,"HONO"));
app.post("/resend", wrapper(resend,"HONO"));
app.post("/subscribe", wrapper(subscribe,"HONO"));
app.post("/contract", wrapper(contract,"HONO"));
app.get("/update-releases", wrapper(updateReleases,"HONO"));


Deno.serve(app.fetch);
