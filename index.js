import { Hono } from "hono";

const app = new Hono();

app.get("/deno", (c) => c.text("Hello Deno!"));

Deno.serve(app.fetch);