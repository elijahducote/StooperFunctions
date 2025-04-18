import Stripe from "stripe";
import {checkValues,tabulateList,report} from "../../lib/utility.js";
const stripe = Stripe(Deno.env.get("STRIPE_SK"),{apiVersion:"2025-02-24.acacia"});

export async function createIntent(body) {
  try {
    const log = [],
    {payment_method, amount, confirmation_token, idempotencyKey, idempotencyKey1} = body;
    
    if (payment_method) report(`Got the payment method: ${payment_method}.`,log);
    else report(`Did not recieve the payment method.`,log,false);
    if (amount) report(`Got the amount: ${amount}.`,log);
    else report(`Did not recieve the amount.`,log,false);
    if (confirmation_token) report(`Got the token: ${confirmation_token}.`,log);
    else report(`Did not recieve the token from the client.`,log,false);
    
    const {id: customer} = await stripe.customers.create({
      //payment_method,
      name: "Anonymous",
      email: "test@example.com"
    },{
      idempotencyKey
    }),
    {client_secret, status, error} = await stripe.paymentIntents.create({
      customer,
      amount,
      confirmation_token,
      confirm: true,
      currency: "usd",
      automatic_payment_methods: {enabled: true}
    },{
      idempotencyKey: idempotencyKey1
    });

    /*if (error) report(error,log,false);
    else report(`Intent created. (${client_secret})`,log);*/
    
    // if (checkValues([1,3,5],false)) throw new Error(tabulateList(log));

    return {
      msg: {client_secret,status},
      type: "application/json",
      code: 200
    };
  }
  catch (error) {
    return {
      msg: {error},
      type: "application/json",
      code: 400
    };
  }
}