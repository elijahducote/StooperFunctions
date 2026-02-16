import axios from "axios";
import {print,envLookup,sendHTMLResponse} from "../../../lib/ntry.js";

export async function joinHbg (body) {
  try {
    const emailPayload = {
      from: "HBG <info@htxgroup.net>",
      to: body?.email || "example@example.com",
      bcc: ["info@htxgroup.net","evbeats.net@gmail.com"],
      headers: {
        "X-Entity-Ref-ID": Math.floor(Date.now() / 1000).toString()
      },
      subject: `Your Submission Is Received, ${body?.givenName || "Unknown"}`,
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
      print(`Response: ${resp.data}`);
      statum = resp.data.success;
      if (statum) succout += "\nCaptcha verified.";
      else throw Error("Captcha failed.");
    }).catch((err) => {
      print(`Error: ${resp.data}`);
      errout += `\n${err}`;
    });

    if (!statum) throw Error(`Verification failed. ${errout}`);

    if (body?.enroll === "true") {
      try {
        const mailerlite = axios.create({
          baseURL: "https://connect.mailerlite.com/api",
          headers: {
            "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${envLookup("MAILERLITE_HBG")}`
          }
        });
        
        await mailerlite.post("/subscribers",
        {
          email: body?.email,
          fields:
          {
            name: body?.givenName,
            phone: body?.phone
          }
        })
        .then((resp) => {
          if (resp.status === 201 || resp.status === 200) succout += `\nAdded user to mailing list.`;
          else throw new Error("Could not add user to mailing list. Try again!");
        })
        .catch((err) => {
          print(`Error: ${resp.data}`);
          errout += `\n${err}`;
        });
      }
      catch (err) {
        errout += `\n${err}`;
      }
    }

    // Send to Resend API
    await axios.post('https://api.resend.com/emails', emailPayload, {
      headers: {
        "Authorization": `Bearer ${envLookup("HBG_RESEND")}`,
        "Content-Type": "application/json"
      }
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
  <h1>Thank You, You'll Be Contacted Shortly</h1>
  <p><strong>Your Name:</strong> ${body?.givenName || "N/A"}</p>
  <p><strong>Your Phone:</strong> ${body?.phone || "N/A"}</p>
  <p><strong>Your Industry:</strong> ${body?.industry || "N/A"}</p>
  <p><strong>Your Email:</strong> ${body?.email || "N/A"}</p>
  <p><strong>Your Message:</strong> ${body?.message || "N/A"}</p>`;
}