import axios from "axios";
import { Buffer } from "node:buffer";

import {envLookup,checkValues,tabulateList,report,sendHTMLResponse} from "../../../lib/utility.js";
import { jsonrepair } from "jsonrepair";
// DayJS
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Lima");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getImageAsBase64(imageUrl) {
  try {
    await sleep(2000);
    const { data } = await axios.get(imageUrl, {
      responseType: "arraybuffer"
    });
    console.log(imageUrl);
    const base64 = Buffer.from(data, "binary").toString("base64");
    return base64;
  } catch (err) {
    console.error("Error fetching image:", err);
    throw err;
  }
}

async function updateMultipleFiles(files) {
  try {
    const gh = axios.create({
      baseURL:"https://api.github.com/repos/elijahducote/DJ",
      headers: {
        "Authorization": `Bearer ${envLookup("GITHUB_TOKEN")}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    }),
    // Get the latest commit SHA
    { data: branch } = await gh.get("/git/ref/heads/main");
    let latestCommitSHA = branch.object.sha;
    
    console.log(`Starting with commit SHA: ${latestCommitSHA}`);
    
    for (const file of files) {
      console.log(`Processing file: ${file.uri}`);
      
      // Create blob
      console.log(`Creating blob for ${file.uri}...`);
      const { data: blob } = await gh.post("/git/blobs", {
        content: file.img,
        encoding: "base64"
      });
      console.log(`Blob created with SHA: ${blob.sha}`);
      
      // Get the current tree
      console.log(`Getting current tree...`);
      const { data: currentTree } = await gh.get(`/git/trees/${latestCommitSHA}`);
      
      // Create a new tree
      console.log(`Creating new tree...`);
      const newTree = {
        base_tree: currentTree.sha,
        tree: [{
          path: file.uri,
          mode: "100644",
          type: "blob",
          sha: blob.sha
        }]
      };
      console.log(`New tree object: ${JSON.stringify(newTree, null, 2)}`);
      
      const { data: tree } = await gh.post("/git/trees", newTree);
      const newTreeSHA = tree.sha;
      console.log(`New tree created with SHA: ${newTreeSHA}`);
      
      // Create a new commit
      console.log(`Creating new commit...`);
      const { data: commit } = await gh.post("/git/commits", {
        message: `Update file: ${file.uri}`,
        tree: newTreeSHA,
        parents: [latestCommitSHA]
      });
      const newCommitSHA = commit.sha;
      console.log(`New commit created with SHA: ${newCommitSHA}`);
      
      // Update the reference
      console.log(`Updating reference...`);
      await gh.patch("/git/refs/heads/main", {
        sha: newCommitSHA
      });
      
      console.log(`File ${file.uri} updated successfully!`);
      
      // Update latestCommitSHA for the next iteration
      latestCommitSHA = newCommitSHA;
    }
    
    console.log("All files updated successfully!");
  } catch (err) {
    console.error("Error updating files:", err.response ? err.response.data : err.message);
    if (err.response && err.response.data) {
      console.error("Error details:", JSON.stringify(err.response.data, null, 2));
    }
    throw err;
  }
}

async function updateFlyers (captions) {
  let log = [];
  try {
    const gh = axios.create({
      baseURL:"https://api.github.com/repos/elijahducote/DJ",
      headers: {
        "Authorization": `Bearer ${envLookup("GITHUB_TOKEN")}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
    await Promise.allSettled(
    [
      gh.get("/commits/main"),
      gh.get("/contents/ntra/src/important.json")
    ]).then(async (vow) => {
      const {status: commitStatus, data: commitResponse} = vow[0].value,
      {status: fileStatus, data: fileResponse} = vow[1].value;
      
      // Checks
      if (commitStatus === 200) report(`Got the latest commit: "${commitResponse.sha}"`,log);
      else report(`Something not right: "${commitResponse}"`,log,false);
      if (fileStatus === 200) report(`Got the important.json file: "${fileResponse.sha}"`,log);
      else report(`Something not right: "${fileResponse}"`,log,false);
      
      if (checkValues(log)) {
        const {sha: latestCommit} = vow[0].value.data,
        {content: fileContent, sha: blobHash} = vow[1].value.data,
        jsonObject = JSON.parse(atob(fileContent));
        if (latestCommit === jsonObject.hash) {
          report("Hash is already updated! Skipping.",log,false);
          return;
        }
        else report("New hash.",log);
        jsonObject.hash = latestCommit;
        jsonObject.captions = captions;
        
        const jsonString = JSON.stringify(jsonObject);

        console.log(jsonString);
        await gh.put("/contents/ntra/src/important.json",
        {
            sha: blobHash,
            content: btoa(jsonString),
            message: "Update on file contents."
        })
        .then(resp => {
          report(`Updated requested file: "Status ${resp.status}"`,log);
        })
        .catch(err => {
          report(`Couldn't update requested file: "${err}"`,log,false);
        });
      }
      if (checkValues(log,false)) throw new Error("Condition(s) not satified!");
    })
    .catch(err => {
      report(`${err}`,log,false);
    });
    
  }
  catch (err) {
    report(`Critical error: ${err}`,log,false);
  }
  finally {
    if (checkValues(log)) return sendHTMLResponse(1,tabulateList(log));
    else return sendHTMLResponse(0,tabulateList(log));
  }
}

export async function flyerUpdate() {
  let resp;
  try {
    const server_time = dayjs().utc().tz("America/Lima"),
    options = {
      headers: {
        "x-rapidapi-host": "instagram-scraper-api12.p.rapidapi.com",
        
        // 9d5c26be38msh6d01dc42e5e9bffp1fcb31jsn8279a6c0b958
        // 40e82884e3msh4daf8915a723745p1675c7jsn0d210687a2bb
        "x-rapidapi-key": envLookup("RAPIDAPI_KEY"),
        "Content-Type": "application/json"
      },
      responseEncoding: "utf8"
    },
    response = await axios.get(
      "https://instagram-scraper-api12.p.rapidapi.com/api/v1/posts/full?username=_djev_",
      options
    ).catch((err) => {
      console.error("API request failed:", err.response);
      throw new Error(`API request failed: ${err.response}`);
    });
    
    console.log(response.data);
    
    response.data = JSON.parse(jsonrepair(JSON.stringify(response.data)));

    // Validate the response structure
    if (!response?.data?.data) {
      console.error("Unexpected API response structure:", JSON.stringify(response.data));
      throw new Error("API response missing expected data structure");
    }

    const {data: {data: items}} = response;

    const nth = items.length,
    candidates = [],
    captions = [],
    posts = [];

    let itR8 = nth,
    curN,
    tymStamp;

    for (;itR8;--itR8) {
      curN = nth - itR8;
      tymStamp = dayjs.unix(items[curN].taken_at).utc().tz("America/Lima");
      if (server_time.diff(tymStamp,"month") < 6 && items[curN].image_versions2.candidates[0].url) {
        if (items[curN].caption?.text?.length) captions[captions.length] = encodeURI(items[curN].caption.text);
        else captions[captions.length] = "No caption.";
        candidates[candidates.length] = items[curN].image_versions2.candidates[0].url;
        posts[posts.length] = {uri:`ntra/src/media/flyers/${curN}.jpg`,img:await getImageAsBase64(items[curN].image_versions2.candidates[0].url)};
      }
    }
    
    await updateMultipleFiles(posts);

    console.log(captions);
    resp = await updateFlyers(captions);

    return {
      msg: resp,
      code: 200,
      type: "text/html"
    }
  }
  catch (err) {
    return {
      msg: err,
      code: 400,
      type: "text/plain"
    }
  }

}
