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

app.post("/create-intent", wrapper(createIntent,"HONO"));
app.post("/deliver", wrapper(deliver,"HONO"));
app.get("/flyer-update", wrapper(flyerUpdate,"HONO"));
app.get("/important", wrapper(important,"HONO"));
app.post("/message", wrapper(message,"HONO"));
app.post("/request", wrapper(request,"HONO"));
app.post("/resend", wrapper(resend,"HONO"));
app.post("/subscribe", wrapper(subscribe,"HONO"));

Deno.serve(app.fetch);