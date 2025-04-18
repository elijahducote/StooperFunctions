import { Hono } from "hono";

const app = new Hono();

app.get("/flyer-update", async (c) => {
  return c.text("Hello Deno!")
});

Deno.serve(app.fetch);