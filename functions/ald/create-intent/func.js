import Stripe from "stripe";
import {envLookup,checkValues,tabulateList,report} from "../../../lib/utility.js";

export async function createIntent (body) {
  try {
    const stripe = Stripe(envLookup("STRIPE_SK_ALD") || envLookup("STRIPE_SK"),{apiVersion:"2025-02-24.acacia"});
    const log = [],
    {amount, confirmation_token, email, name, idempotencyKey, idempotencyKey1} = body;

    if (amount) report(`Got the amount: ${amount}.`,log);
    else report(`Did not receive the amount.`,log,false);
    if (confirmation_token) report(`Got the confirmation token.`,log);
    else report(`Did not receive the confirmation token.`,log,false);

    if (checkValues(log,true) === false) {
      return {
        msg: {error: tabulateList(log)},
        type: "application/json",
        code: 400
      };
    }

    const {id: customer} = await stripe.customers.create({
      name: name || "ALD client",
      email: email || undefined
    },{
      idempotencyKey
    }),
    {client_secret, status, id} = await stripe.paymentIntents.create({
      customer,
      amount,
      confirmation_token,
      confirm: true,
      currency: "usd",
      receipt_email: email || undefined,
      automatic_payment_methods: {enabled: true}
    },{
      idempotencyKey: idempotencyKey1
    });

    return {
      msg: {client_secret, status, id},
      type: "application/json",
      code: 200
    };
  }
  catch (error) {
    return {
      msg: {error: error?.message || String(error)},
      type: "application/json",
      code: 400
    };
  }
}
