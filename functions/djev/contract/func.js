import axios from "axios";
import {sendHTMLResponse} from "../../../lib/ntry.js";

export async function contract (body) {
  try {
    const { fields, files } = body;
    
    if (!fields && !files) throw new Error("Does not exist!");

    let statum = false,
    error = false;
    
    /*const params = new URLSearchParams();
    params.append("secret", Deno.env.get("HCAPTCHA_SECRET"));
    params.append("response", fields.token);

    await axios.post("https://api.hcaptcha.com/siteverify", params).then((resp) => {
      statum = resp.data.success;
    }).catch((err) => {
      error = err;
    });
    if (!statum) throw new Error(error);*/

    // Prepare email payload
    const emailPayload = {
      from: 'DJ Ev <booking@djev.org>',
      to: ["evanducote@gmail.com","evbeats.net@gmail.com","ducote.help@gmail.com"],
      headers: {
        "X-Entity-Ref-ID": Math.floor(Date.now() / 1000).toString()
      },
      subject: `New Payment: \$${fields.amount?.[0] || "No Amount"}`,
      html: buildEmailHtml(fields)
    };
    /*if (files[files.length - 1].content.length) emailPayload.attachments = files.map(file => ({
        content: file.content.toString("base64"),
        filename: file.filename,
        contentType: file.contentType
    }));*/

    // Send to Resend API
    await axios.post('https://api.resend.com/emails', emailPayload, {
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`
      }
    }).catch((err) => {
      error = err;
    });

    
    if (error !== false) throw new Error(error);

    return {
      msg: sendHTMLResponse(1),
      code: 200,
      type: "text/html"
    };
    
  } catch (error) {
    return {
      msg: error,
      //msg: sendHTMLResponse(0, error.message),
      code: 500,
      type: "text/plain"
    };
  }
}

// Helper to build HTML email content
function buildEmailHtml (fields) {
  return `
  <h1>New Payment</h1>
  <p><strong>Amount:</strong> ${fields.amount?.[0] || "N/A"}</p>
  <p><strong>Name:</strong> ${fields.givenname?.[0] || "N/A"}</p>
  <p><strong>Event Type:</strong> ${fields.eventtype?.[0] || "N/A"}</p>
  <p><strong>Event Venue:</strong> ${fields.placeof?.[0] || "N/A"}</p>
  <p><strong>Address:</strong> ${fields.location?.[0] || "N/A"}</p>
  <p><strong>Date & Time:</strong> ${fields.datentime?.[0] || "N/A"}</p>
  <p><strong>Hours:</strong> ${fields.hoursoptions?.[0] || "N/A"}</p>
  `;
}