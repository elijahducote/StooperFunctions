import axios from "axios";
import {print,envLookup,sendHTMLResponse} from "../../../lib/ntry.js";

export async function contact (body) {
  try {
    const emailPayload = {
      from: "Trifect Show <inquiries@trifect.us>",
      to: body?.email || "example@example.com",
      replyTo: "artisansbond@gmail.com",
      bcc: ["ducote.help@gmail.com"],
      headers: {
        "X-Entity-Ref-ID": Math.floor(Date.now() / 1000).toString()
      },
      subject: `Initial Correspondance`,
      html: buildEmailHtml(body)
    },
    hcaptcha = axios.create({
      baseURL: "https://api.hcaptcha.com",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }),
    params = new URLSearchParams();
    
    let errout = "",
    succout = "",
    statum;

    params.append("response", body["h-captcha-response"]);
    params.append("secret", envLookup("HCAPTCHA_SECRET"));

    await hcaptcha.post("/siteverify", params).then((resp) => {
      statum = resp.data.success;
      if (statum) succout += "\nCaptcha verified.";
      else throw Error("Captcha failed.");
    }).catch((err) => {
      print(`Error: ${resp.data}`);
      errout += `\n${err}`;
    });

    if (!statum) throw Error(`Verification failed. ${errout}`);


    // Send to Resend API
    await axios.post('https://api.resend.com/emails', emailPayload, {
      headers: {
        "Authorization": `Bearer ${envLookup("RESEND_TRIFECT")}`,
        "Content-Type": "application/json"
      }
    }).then((resp) => {
      print(`Response: ${JSON.stringify(resp.data)}`);
    });

    return {
      msg: sendHTMLResponse(1, succout),
      code: 200,
      type: "text/html"
    };
    
  } catch (error) {
    return {
      msg: sendHTMLResponse(0, error),
      code: 500,
      type: "text/html"
    };
  }
}

// Helper to build HTML email content
function buildEmailHtml (body) {
  return `
  <h1>Submission Overview</h1>
  <p><strong>Name:</strong> ${body?.givenName || "N/A"}</p>
  <p><strong>Message:</strong> ${body?.message || "N/A"}</p>`;
}