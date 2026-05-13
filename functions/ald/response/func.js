import Stripe from "stripe";
import {envLookup,sendHTMLResponse,report,checkValues,tabulateList} from "../../../lib/utility.js";

export async function response (body) {
  const log = [];
  let state = 2,
  code = 400;

  try {
    const stripe = Stripe(envLookup("STRIPE_SK_ALD") || envLookup("STRIPE_SK"),{apiVersion:"2025-02-24.acacia"}),
    payment_intent = body?.payment_intent ?? body?.fields?.payment_intent?.[0],
    raw_username   = body?.username       ?? body?.fields?.username?.[0]       ?? "client";

    if (!payment_intent) {
      report("Missing payment_intent reference.",log,false);
      throw new Error(tabulateList(log));
    }

    let username = String(raw_username);
    const firstchar = username.charCodeAt(0);
    if (firstchar > 96 && firstchar < 123) {
      username = String.fromCharCode(firstchar - 32) + username.slice(1);
    }

    const intent = await stripe.paymentIntents.retrieve(payment_intent);

    if (intent.status === "succeeded") {
      state = 1; code = 200;
      report(`Hi ${username}, we emailed you your receipt.`,log);
    } else if (intent.status === "processing") {
      state = 2; code = 202;
      report("Your payment is processing — awaiting approval.",log);
    } else {
      state = 0; code = 400;
      report(`Payment ${intent.status}.`,log,false);
    }

    return {
      msg: sendHTMLResponse(state, log[log.length - 2] ?? undefined),
      type: "text/html",
      code
    };
  }
  catch (err) {
    report(err?.message || String(err),log,false);
    return {
      msg: sendHTMLResponse(0, log[log.length - 2] ?? undefined),
      type: "text/html",
      code: 500
    };
  }
}
