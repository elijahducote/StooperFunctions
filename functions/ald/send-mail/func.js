// Network
import axios from "axios";

// Utility
import {envLookup, sendHTMLResponse,checkValues,report,tabulateList,buildEmailHtml} from "../../../lib/ntry.js";

export async function sendMail (body) {
  const log = [],
  params = new URLSearchParams();
  let statusCode = 200,
  isVerified = false,
  state = 2,
  datum;
  if (body?.fields && Object.keys(body.fields).length > 0) {
    datum = body.fields;
    report("Fields were entered!",log);
  }
  else report("Fields was empty!",log,false);
  try {
    params.append("secret", envLookup("HCAPTCHA_SECRET"));
    params.append("response", datum?.["h-captcha-response"]);

    await axios.post("https://api.hcaptcha.com/siteverify", params).then((resp) => {
      if (resp?.data?.success) {
        isVerified = true;
        report("Verified as not a robot!",log);
      }
      else throw new Error("Captcha not completed!");
    }).catch((err) => {
      report(err?.data?.["error-codes"],log,false);
    });
    if (!isVerified) throw new Error("Could not be verified!");

    const emailPayload =
    {
      from: 'ALD <info@arborlifedesigns.com>',
      to: ["arborlifedesigns@gmail.com","ducote.help@gmail.com"],
      headers: {
        "X-Entity-Ref-ID": Math.floor(Date.now() / 1000).toString()
      },
      subject: `New Submission from ${datum?.name?.[0] || "Unknown"}`,
      html: buildEmailHtml(
        {
          name: datum?.name?.[0],
          email: datum?.email?.[0],
          location: datum?.location?.[0],
          phone: datum?.phone?.[0],
          message: datum?.mail?.[0]
        })
    };
    await axios.post("https://api.resend.com/emails", emailPayload,
      {
        headers: {
          "Authorization": `Bearer ${envLookup("RESEND_API_KEY")}`,
          "Content-Type": "application/json",
          'User-Agent': "ALD/1.0",
        }
      }).then((resp) => {
        if (resp?.status === 200) report(`Sent email with the ID of ${resp?.data?.id}`,log);
        else throw new Error(`Returned with a status code of ${resp?.status}`);
      }).catch((err) => {
        report(JSON.stringify(err?.response?.data?.error?.message) || err,log,false);
      });
      if (checkValues(log,false)) throw new Error("Checks failed!");
      else state = 1;
    }
    catch (err) {
      state = 0;
      statusCode = 400;
      report(`Failed: \n${err}`,log,false);
    }
    finally {
      return {
        msg:sendHTMLResponse(state,tabulateList(log)),
        type: "text/html",
        code: statusCode
      }
    }
  }
