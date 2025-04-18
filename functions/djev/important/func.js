import axios from "axios";
import {checkValues,tabulateList,report,sendHTMLResponse} from "../../lib/utility.js";

export async function important () {
  let log = [];
  try {
    const gh = axios.create({
      baseURL: "https://api.github.com/repos/elijahducote/trifectshow",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("GIT")}`,
        "Accept": "application/vnd.github.object+json,text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
        "Referer": "https://example.com/",
        "Connection": "keep-alive"
      },
      withCredentials: false
    });
    
    await Promise.allSettled(
    [
      gh.get("/commits/main"),
      gh.get("/contents/important.json")
    ]).then(async (vow) => {
      const {status: commitStatus, data: commitResponse} = vow[0].value,
      {status: fileStatus, data: fileResponse} = vow[1].value;
      
      // Checks
      if (commitStatus === 200) report(`Got the latest commit: "${commitResponse.sha}"`,log);
      else report(`Something not right: "${commitResponse}"`,log,false);
      if (fileStatus === 200) report(`Got the important.json file: "${fileResponse.sha}"`,log);
      else report(`Something not right: "${fileResponse}"`,log,false);
      
      if (checkValues(log,[1,3])) {
        const {sha: latestCommit} = vow[0].value.data,
        {content: fileContent, sha: blobHash} = vow[1].value.data,
        jsonObject = JSON.parse(atob(fileContent));
        if (latestCommit === jsonObject.hash) {
          report("Hash is already updated! Skipping.",log,false);
          return;
        }
        else report("New hash.",log);
        jsonObject.hash = latestCommit;
        
        await gh.put("/contents/important.json",
        {
            sha: blobHash,
            content: btoa(JSON.stringify(jsonObject)),
            message: "Update on file contents."
        })
        .then(resp => {
          report(`Updated requested file: "Status ${resp.status}"`,log);
        })
        .catch(err => {
          report(`Couldn't update requested file: "${err}"`,log,false);
        });
      }
      if (checkValues(log,[1,3,5,7],false)) throw new Error("Condition(s) not satified!");
    })
    .catch(err => {
      report(`${err}`,log,false);
    });
    
  }
  catch (err) {
    report(`Critical error: ${err}`,log,false);
  }
  finally {
    if (checkValues([1,3,5,7,9],log)) return {
      msg: sendHTMLResponse(1,tabulateList(log)),
      type: "text/html",
      code: 200
    };
    else return {
      msg: sendHTMLResponse(0,tabulateList(log)),
      type: "text/html",
      code: 400
    };
  }
}