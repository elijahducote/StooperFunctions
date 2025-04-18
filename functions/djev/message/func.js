import {checkValues,tabulateList,report,sendHTMLResponse} from "../lib/utility.js";
import Stripe from "stripe";
const stripe = Stripe(Deno.env.get("STRIPE_SK"),{apiVersion:"2025-02-24.acacia"});

export async function message(body) {
  try {
    const {redirect_status,id} = body;
    /*params = new URLSearchParams(),
    log = [];
    
    if (token) report(`Got token: ${token}`,log);
    else report("Did not receive token.",log,false);
    
    params.append("secret", Deno.env.HCAPTCHA_SECRET);
    params.append("response", token);
    
    await axios.post("https://api.hcaptcha.com/siteverify", params).then((resp) => {
      report(resp.data.success,log);
    }).catch((err) => {
      report(err,log,false);
    });
    
    if (checkValues([1,3,5],false)) throw new Error(tabulateList(log));*/


    if (redirect_status) {
      if  (redirect_status !== "succeeded") throw new Error(`Unsuccessful status of ${status}.`);
    }

    if (id) {
      const {status} = await stripe.paymentIntents.retrieve(id);
      if (status !== "succeeded") throw new Error(`Unsuccessful status of ${status}.`);
    }
    
    return {
      msg: sendHTMLResponse(1,"Payment authorized."),
      type: "text/html",
      code: 200
    }
  }
  catch (err) {
    return {
      msg: sendHTMLResponse(0,err),
      type: "text/html",
      code: 400
    }
  }
}