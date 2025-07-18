import axios from "npm:axios";
import {sendHTMLResponse} from "../../../lib/ntry.js";

export async function resend (body) {
  try {
    const { fields, files } = body;
    
    let statum = false,
    error = "Unable to verify!",
    feedback;
    
    /*const params = new URLSearchParams();
    params.append("secret", Deno.env.get("HCAPTCHA_SECRET"));
    params.append("response", fields.token?.[0]);

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
      subject: `New Submission: ${fields?.event?.[0] || "No Event"}`,
      html: buildEmailHtml(fields)
    };
    if (files[files.length - 1].content.length) emailPayload.attachments = files.map(file => ({
        content: file.content.toString("base64"),
        filename: file.filename,
        contentType: file.contentType
    }));

    console.log(emailPayload);
    // Send to Resend API
    await axios.post('https://api.resend.com/emails', emailPayload, {
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
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
      msg: sendHTMLResponse(0, error.message),
      code: 500,
      type: "text/html"
    };
  }
}

// Helper to build HTML email content
function buildEmailHtml (fields) {
  return `
  <h1>New Form Submission</h1>
  <p><strong>Date:</strong> ${fields?.date?.[0] || "N/A"}</p>
  <p><strong>Location:</strong> ${fields?.locale?.[0] || "N/A"}</p>
  <p><strong>Hours:</strong> ${fields?.workhrs?.[0] || "N/A"}</p>
  <p><strong>Email:</strong> ${fields?.email?.[0] || "N/A"}</p>
  <p><strong>Event:</strong> ${fields?.event?.[0] || "N/A"}</p>
  <p><strong>Selection:</strong> ${fields?.selection?.join(", ") || "None"}</p>
  <p><strong>Requests:</strong> ${fields?.requests?.[0] || "N/A"}</p>
  <p><strong>Dislikes:</strong> ${fields?.dislikes?.[0] || "N/A"}</p>
  <p><strong>Comments:</strong> ${fields?.comments?.[0] || "N/A"}</p>
  `;
}