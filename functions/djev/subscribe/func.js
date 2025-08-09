import axios from "axios";
import {envLookup,sendHTMLResponse,report,checkValues,tabulateList} from "../../../lib/utility.js";

export async function subscribe (body) {
  
  const {fields: {email}} = body,
  svg = ["<svg xmlns=\"http://www.w3.org/2000/svg\" xml:space=\"preserve\" viewBox=\"0 0 330 330\"><path fill=\"#FF0000\" d=\"M257 193c-6-6-16-6-21 0l-11 11-11-11a15 15 0 0 0-21 21l11 11-11 11a15 15 0 1 0 21 21l11-11 11 11a15 15 0 0 0 21 0c6-6 6-16 0-21l-11-11 11-11c6-5 6-15 0-21zM250 0H20l40 30 75 56z\"/><path fill=\"#FF0000\" d=\"M270 130V23l-30 22-96 72-9 3-9-3L0 23v172c0 8 7 15 15 15h106a105 105 0 0 0 104 120 105 105 0 0 0 45-200zm-45 170a75 75 0 1 1 0-150 75 75 0 0 1 0 150z\"/></svg>","<svg xmlns=\"http://www.w3.org/2000/svg\" xml:space=\"preserve\" viewBox=\"0 0 330 330\"><path fill=\"#00AAFF\" d=\"m246 192-34 35-9-10a15 15 0 1 0-22 22l20 20a15 15 0 0 0 22 0l45-45a15 15 0 1 0-22-22zm4-192H20l40 30 75 56z\"/><path fill=\"#00AAFF\" d=\"M270 130V23l-30 22-96 72-9 3-9-3L0 23v172c0 8 7 15 15 15h106a105 105 0 0 0 104 120 105 105 0 0 0 45-200zm-45 170a75 75 0 1 1 0-150 75 75 0 0 1 0 150z\"/></svg>","<svg xmlns=\"http://www.w3.org/2000/svg\" xml:space=\"preserve\" viewBox=\"0 0 330 330\"><path fill=\"#808080\" d=\"M255 210h-15v-15a15 15 0 0 0-30 0v15h-15a15 15 0 0 0 0 30h15v15a15 15 0 0 0 30 0v-15h15a15 15 0 0 0 0-30zM250 0H20l40 30 75 56z\"/><path fill=\"#808080\" d=\"M270 130V23l-30 22-96 72-9 3-9-3L0 23v172c0 8 7 15 15 15h106a105 105 0 0 0 104 120 105 105 0 0 0 45-200zm-45 170a75 75 0 1 1 0-150 75 75 0 0 1 0 150z\"/></svg>"],
  log = [];
  
  let usrname = "Anonymous",
  status = 400;
  
  try {
    usrname = email?.[0].split("@",1)[0];
    
    const firstchar = usrname.charCodeAt(0),
    mailerlite = axios.create({
      baseURL: "https://connect.mailerlite.com/api",
      headers: {
        "Authorization": `Bearer ${envLookup("MAILERLITE_TOKEN")}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Version": "2038-01-19"
      }
    });
    await mailerlite.post("/subscribers", {
      email: email?.[0]
    }).then((resp) => {
      status = resp.status;
      report(`Returned with a status of ${resp.status}`,log);
    }).catch((err) => {
      status = err.status;
      report(err,log,false);
    });
    
    // Capitialize
    if (firstchar > 96 && firstchar < 123) usrname = String.fromCharCode(firstchar - 32) + usrname.slice(1);
    
    if (status === 201) report("Added to mailing list.",log);
    else {
      if (status === 200) report("Already put on mailing list!",log);
      else report("Something went wrong.",log,false);
    }
    
    if (checkValues(log)) return {
      code: 200,
      type: "text/html",
      msg: sendHTMLResponse(1,undefined,{svg:svg[1],msg:tabulateList(log),color:"#00AAFF"})
    };
    else new Error("One or more  conditions not met.");
  }
  catch (err) {
    report(err,log,false);
    console.log(tabulateList(log));
    return {
      code: 400,
      type: "text/html",
      msg: sendHTMLResponse(0,undefined,{svg:svg[0],msg:tabulateList(log),color:"#FF0000"})
    };
  }
  finally {
    return {
      code: 400,
      type: "text/html",
      msg: sendHTMLResponse(2,undefined,{svg:svg[2],msg:tabulateList(log),color:"#808080"})
    };
  }
}