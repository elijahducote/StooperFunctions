import axios from "axios";
import {print,envLookup,sendHTMLResponse} from "../../../lib/ntry.js";

export async function joinHbg (body) {
  try {
    const emailPayload = {
      from: "HBG <info@htxgroup.net>",
      to: ["evanducote@gmail.com","ducote.help@gmail.com"],
      headers: {
        "X-Entity-Ref-ID": Math.floor(Date.now() / 1000).toString()
      },
      subject: `New Submission from ${body?.givenName?.[0] || "Unknown"}`,
      html: buildEmailHtml(body)
    },
    hcaptcha = axios.create({
      baseURL: "https://api.hcaptcha.com",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }),
    params = new URLSearchParams();
    
    print(body);
    let errout = "",
    statum;

    params.append("response", body["h-captcha-response"]);
    params.append("secret", envLookup("HCAPTCHA_SECRET"));

    await hcaptcha.post("/siteverify", params).then((resp) => {
      print(`Response: ${resp.data}`);
      statum = resp.data.success;
    }).catch((err) => {
      print(`Error: ${resp.data}`);
      errout += `\n${err}`;
    });

    if (!statum) throw Error(`Captcha verification failed. ${errout}`);


    if (files[files.length - 1].content.length) emailPayload.attachments = files.map(file => ({
        content: file.content.toString("base64"),
        filename: file.filename,
        contentType: file.contentType
    }));

    // Send to Resend API
    await axios.post('https://api.resend.com/emails', emailPayload, {
      headers: {
        "Authorization": `Bearer ${envLookup("HBG_RESEND")}`,
        "Content-Type": "application/json"
      }
    });

    return {
      msg: sendHTMLResponse(1),
      code: 200,
      type: "text/html"
    };
    
  } catch (error) {
    return {
      msg: sendHTMLResponse(0, `${error}`),
      code: 500,
      type: "text/html"
    };
  }
}

// Helper to build HTML email content
function buildEmailHtml (body) {
  return `
  <h1>New Form Submission</h1>
  <p><strong>Name:</strong> ${body?.givenName?.[0] || "N/A"}</p>
  <p><strong>Industry:</strong> ${body?.industry?.[0] || "N/A"}</p>
  <p><strong>Email:</strong> ${body?.email?.[0] || "N/A"}</p>
  <p><strong>Message:</strong> ${body?.message?.[0] || "N/A"}</p
  `;
}