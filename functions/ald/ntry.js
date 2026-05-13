import {sendMail} from "./send-mail/func.js";
import {createIntent} from "./create-intent/func.js";
import {response} from "./response/func.js";
import {subscribe} from "./subscribe/func.js";

export {
  sendMail,
  createIntent as createIntentAld,
  response   as responseAld,
  subscribe  as subscribeAld
};
