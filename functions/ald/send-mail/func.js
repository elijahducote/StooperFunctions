import axios from "axios";
import {sendHTMLResponse,checkValues,report,tabulateList} from "../../../lib/ntry.js";

export async function sendMail (body) {
  const log = [];
  let susValue = 9,
  statusCode = 200,
  state = 2,
  datum;
  if (body?.fields?.length) {
    datum = body?.fields;
    report("Fields were entered!",log);
  }
  else report("Fields was empty!",log,false);
  try {
    if (checkValues(log,[1],false)) new Error(log[0]);
    const hf = axios.create({
      baseURL: "https://router.huggingface.co/v1",
      headers: {
       "Authorization": `Bearer ${process?.env?.HF_TOKEN}`,
       "Content-Type": "application/json",
      }
    });
  
  
    await hf.post("/chat/completions",
    {
      model: "mistralai/Mistral-7B-Instruct-v0.3:together",
      messages: [
        {
          role: "user",
          content: `Perform a analysis on the text: "${datum?.mail}", using just one number and determine its magnitude factoring in the text's meaning by comparing and contrasting whether it sounds like a suspicious/spam/scam/phishing/social engineering attempt (closer to zero), potentially suspicious/spam/scam/phishing/social engineering (closer to the mid-range), or not suspicious/spam/scam/phishing/social engineering (closer to nine) from one out of ten.\nYou MUST state the guessed number prefixed at the very start of your response and only then your explanation following after; no exceptions.`
        }
      ]
    }).then((resp) => {
      if (resp?.status === 200) {
        console.log(resp?.data?.choices?.[0]?.message);
        if (resp?.data?.choices?.[0]?.message?.content?.length > 0) {
          susValue = resp?.data?.choices?.[0]?.message?.content;
          const nth = susValue.length;
          let itR8 = nth,
          sus = "",
          cur;
          for (;itR8;--itR8) {
            cur = nth - itR8;
            sus += susValue[cur];
            if (susValue.charCodeAt(cur+1) > 57 || susValue.charCodeAt(cur+1) < 48) break;
          }
          susValue = parseInt(sus);
          if (susValue < 4) report(`Received bad suspicion score of ${sus}`,log,false);
          else report(`Passed suspicion score of ${sus}`,log);
        }
        else throw new Error(`Returned with a status code of ${resp?.status}`);
      }
      else throw new Error(JSON.stringify(resp?.data));
    }).catch((err) => {
      report(JSON.stringify(err?.response?.data?.error?.message) || err,log,false);
    });
    if (checkValues(log,[1,3,5,7,9,11,13,15],false)) {
      statusCode = 400;
      state = 0;
      throw Error(tabulateList(log));
    }
    else report(`Suceeded!`,log);
  }
  catch (err) {
    report(`Failed: \n${err}`,log,false);
  }
  finally {
    return {
      msg:sendHTMLResponse(state,log[~~(log.length/2)-1]),
      type: "text/html",
      code: statusCode
    }
  }
}