import axios from "axios";
import {envLookup,checkValues,report,tabulateList,sendHTMLResponse,validJSON} from "../../../lib/ntry.js";

export async function updateReleases(body,req) {
  const log = [];
  let statusCode = 400,
  state = 2,
  fyl = {},
  json,
  sha;
  try {
    if (req?.method !== "POST" || !req?.body) {
      report("Payload empty or none sent!",log,false);
      throw Error(tabulateList(log));
    }
    if (!req?.headers?.["x-signature-sha256"]?.length) {
      report("Unauthorized request.",log,false);
      throw Error(tabulateList(log));
    }
    const signature = hexToUint8Array(req.headers["x-signature-sha256"]),
    encoder = new TextEncoder(),
    secret = encoder.encode(envLookup("HMAC_SECRET"));
    passphrase = encoder.encode("evwave.org"),
    keyGen = await crypto.subtle.importKey(
      "raw",
      secret,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    ),
    validRequest = await crypto.subtle.verify(
      "HMAC",
      keyGen,
      signature,
      passphrase
    );
    if (!validRequest) {
      report("Forged authorization.",log,false);
      throw Error(tabulateList(log));
    }
    await axios.get("https://api.github.com/repos/elijahducote/Ev/contents/automation.json",{headers:{"Accept":"application/vnd.github+json","Authorization":`Bearer ${envLookup("GITHUB_TOKEN")}`}})
    .then(response => {
      if (response.status === 200) {
        json = validJSON(atob(response.data.content));
        sha = response?.data?.sha;
        report(`Got file content (${sha})`,log);
        if (!json) report(`Not valid JSON! (${sha})`,log,false);
      }
      else report(`Returned status code of ${response.status}: ${JSON.stringify(response?.data)}`, log, false);
    })
    .catch((error) => {
      report(`There was a problem with the GET request: ${error}`, log, false);
    });
    if (json.tracks.length === 10) {
      json.tracks.pop();
      json.tracks.unshift(body);
    }
    else json.tracks.unshift(body);
    fyl = btoa(JSON.stringify(json));
    await axios.put("https://api.github.com/repos/elijahducote/Ev/contents/automation.json",{"message":"update file","sha":sha,"content":fyl},{headers:{"Accept":"application/vnd.github+json","Authorization":`Bearer ${envLookup("GITHUB_TOKEN")}`}}).then(response => {
      if (response.status === 200) report(`Updated file. (commit ${response.data.commit.sha})`,log);
      else report(`Returned status of ${response.status}: ${JSON.stringify(response?.data)}`,log,false);
    })
    .catch((error) => {
      report(`There was a problem with the PUT request: ${error}`, log, false);
    });
    
    if (checkValues(log,false)) throw Error(tabulateList(log));
    else {
      report("Successfully updated.",log);
      statusCode = 200;
    }
  }
  catch (err) {
    report(`Failed: \n${err}`,log,false);
    state = 0;
  }
  finally {
    return {
      msg:sendHTMLResponse(state,log[~~(log.length/2)-1]),
      type: "text/html",
      code: statusCode
    }
  }
}