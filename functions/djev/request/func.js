import axios from "axios";
import {envLookup,sendHTMLResponse} from "../../../lib/ntry.js";
 
export async function request (body) {
  try {
    const { fields, files } = body;
    
    let statum = false,
    error = false;
    
    const params = new URLSearchParams();
    params.append("secret", envLookup("HCAPTCHA_SECRET"));
    params.append("response", fields.requesttoken?.[0])
    
    await axios.post("https://api.hcaptcha.com/siteverify", params).then((resp) => {
      statum = resp.data.success;
      console.log(resp.data);
    }).catch((err) => {
      console.log(err);
      error = err;
    });
    if (!statum && error) throw new Error(error);
    // Prepare email payload
    const emailPayload = {
      from: "DJ Ev <booking@djev.org>",
      to: ["evanducote@gmail.com","evbeats.net@gmail.com","ducote.help@gmail.com"],
      headers: {
        "X-Entity-Ref-ID": Math.floor(Date.now() / 1000).toString()
      },
      subject: `New Submission: ${fields.event?.[0] || "No Event"}`,
      html: buildEmailHtml(fields)
    };

    // Send to Resend API
    await axios.post('https://api.resend.com/emails', emailPayload, {
      headers: {
        "Authorization": `Bearer ${envLookup("RESEND_API_KEY")}`
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
  <p><strong>Artist:</strong> ${fields.artist?.[0] || "N/A"}</p>
  <p><strong>Song:</strong> ${fields.song?.[0] || "N/A"}</p>
  <p><strong>Link:</strong> ${fields.url?.[0] || "N/A"}</p>
  `;
}