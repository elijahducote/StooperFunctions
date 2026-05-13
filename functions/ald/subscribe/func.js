import axios from "axios";
import {envLookup,sendHTMLResponse,report,checkValues,tabulateList} from "../../../lib/utility.js";

export async function subscribe (body) {
  const email = body?.fields?.email?.[0] ?? body?.email,
  log = [];

  let usrname = "Anonymous",
  status = 400;

  try {
    if (!email) {
      report("No email provided.",log,false);
      throw new Error(tabulateList(log));
    }

    usrname = email.split("@",1)[0];

    const firstchar = usrname.charCodeAt(0),
    mailerlite = axios.create({
      baseURL: "https://connect.mailerlite.com/api",
      headers: {
        "Authorization": `Bearer ${envLookup("MAILERLITE_TOKEN_ALD") || envLookup("MAILERLITE_TOKEN")}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Version": "2038-01-19"
      }
    });

    await mailerlite.post("/subscribers", {
      email,
      groups: [envLookup("MAILERLITE_GROUP_ALD") || envLookup("MAILERLITE_GROUP")].filter(Boolean)
    }).then((resp) => {
      status = resp.status;
      report(`Returned with a status of ${resp.status}`,log);
    }).catch((err) => {
      status = err?.response?.status || 400;
      report(JSON.stringify(err?.response?.data?.message || err?.message || err),log,false);
    });

    if (firstchar > 96 && firstchar < 123) usrname = String.fromCharCode(firstchar - 32) + usrname.slice(1);

    if (status === 201) report("Added to mailing list.",log);
    else if (status === 200) report("Already on mailing list.",log);
    else report("Could not subscribe.",log,false);

    if (checkValues(log)) {
      return {
        code: 200,
        type: "text/html",
        msg: sendHTMLResponse(1,tabulateList(log))
      };
    }
    throw new Error("Subscribe failed.");
  }
  catch (err) {
    report(err?.message || String(err),log,false);
    return {
      code: 400,
      type: "text/html",
      msg: sendHTMLResponse(0,tabulateList(log))
    };
  }
}
