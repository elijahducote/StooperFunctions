import axios from "npm:axios";

import {checkValues,tabulateList,report,sendHTMLResponse} from "../../../lib/utility.js";

// DayJS
import dayjs from "npm:dayjs";
import utc from "npm:dayjs/plugin/utc.js";
import timezone from "npm:dayjs/plugin/timezone.js";
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
        "Authorization": `Bearer ${Deno.env.get("GITHUB_TOKEN")}`,
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
        "Authorization": `Bearer ${Deno.env.get("GITHUB_TOKEN")}`,
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
    if (checkValues([1,3,5,7],log)) return sendHTMLResponse(1,tabulateList(log));
    else return sendHTMLResponse(0,tabulateList(log));
  }
}

export async function flyerUpdate() {
  let resp;
  try {
    // Start with getting the server time
    const server_time = dayjs().utc().tz("America/Lima");
    console.log(`Server time: ${server_time.format()}`);
    
    // Set up API options
    const options = {
      headers: {
        "x-rapidapi-host": "save-insta1.p.rapidapi.com",
        "x-rapidapi-key": "40e82884e3msh4daf8915a723745p1675c7jsn0d210687a2bb",
        "Content-Type": "application/json"
      },
      responseType: "json",
      responseEncoding: "utf8"
    };
    
    // Make the API request with proper error handling
    console.log("Making request to Instagram API...");
    const response = await axios.post(
      "https://save-insta1.p.rapidapi.com/profileposts",
      {username:"_djev_"},
      options
    ).catch((err) => {
      console.error("API request failed:", err.message);
      if (err.response) {
        console.error("Response status:", err.response.status);
        console.error("Response data:", JSON.stringify(err.response.data));
      }
      throw new Error(`Instagram API request failed: ${err.message}`);
    });
    
    // Validate the response structure
    console.log("API request successful, validating response structure...");
    if (!response.data) {
      console.error("API response missing data field");
      throw new Error("API response missing data field");
    }
    if (!response.data.result) {
      console.error("API response missing result field:", JSON.stringify(response.data));
      throw new Error("API response missing result field");
    }
    if (!response.data.result.edges) {
      console.error("API response missing edges field:", JSON.stringify(response.data.result));
      throw new Error("API response missing edges field");
    }
    
    // Now safely extract the items
    const items = response.data.result.edges;
    const nth = items.length;
    console.log(`Found ${nth} items from API response`);
    
    // Proceed with processing
    const candidates = [];
    const captions = [];
    const posts = [];

    let itR8 = nth;
    let curN;
    let tymStamp;

    console.log("Processing posts...");
    for (;itR8;--itR8) {
      curN = nth - itR8;
      
      // Validate item structure before accessing properties
      if (!items[curN] || !items[curN].node) {
        console.warn(`Skipping item ${curN}: Invalid structure`);
        continue;
      }
      
      // Check timestamp exists
      if (!items[curN].node.taken_at) {
        console.warn(`Skipping item ${curN}: Missing timestamp`);
        continue;
      }
      
      tymStamp = dayjs.unix(items[curN].node.taken_at).utc().tz("America/Lima");
      console.log(`Post ${curN} timestamp: ${tymStamp.format()}, age in months: ${server_time.diff(tymStamp, "month")}`);
      
      // Check all required fields exist
      const hasImage = items[curN].node.image_versions2 && 
                       items[curN].node.image_versions2.candidates && 
                       items[curN].node.image_versions2.candidates.length > 0 &&
                       items[curN].node.image_versions2.candidates[0].url;
                       
      const hasCaption = items[curN].node.caption && 
                         items[curN].node.caption.text !== undefined;
      
      if (server_time.diff(tymStamp, "month") < 3 && hasImage && hasCaption) {
        console.log(`Adding post ${curN} to processing queue`);
        captions[captions.length] = encodeURI(items[curN].node.caption.text);
        candidates[candidates.length] = items[curN].node.image_versions2.candidates[0].url;
        
        // Get image as base64 with proper error handling
        try {
          console.log(`Fetching image for post ${curN}...`);
          const imageBase64 = await getImageAsBase64(items[curN].node.image_versions2.candidates[0].url);
          posts[posts.length] = {uri:`ntra/src/media/flyers/${curN}.jpg`, img: imageBase64};
          console.log(`Successfully processed image for post ${curN}`);
        } catch (imgErr) {
          console.error(`Failed to fetch image for post ${curN}:`, imgErr.message);
          // Continue with other posts rather than failing completely
          continue;
        }
      } else {
        console.log(`Skipping post ${curN}: too old or missing image/caption`);
      }
    }
    
    // Only proceed if we have posts to update
    if (posts.length === 0) {
      console.log("No valid posts found to update");
      return {
        msg: "No posts to update",
        code: 200,
        type: "text/plain"
      };
    }
    
    // Update files with proper error handling
    console.log(`Updating ${posts.length} files to GitHub...`);
    try {
      await updateMultipleFiles(posts);
      console.log("Files successfully updated to GitHub");
    } catch (updateErr) {
      console.error("Failed to update files to GitHub:", updateErr.message);
      throw new Error(`GitHub file update failed: ${updateErr.message}`);
    }

    // Update flyers with proper error handling
    console.log(`Updating flyer captions...`);
    console.log("Captions:", captions);
    try {
      resp = await updateFlyers(captions);
      console.log("Flyers successfully updated");
    } catch (flyerErr) {
      console.error("Failed to update flyers:", flyerErr.message);
      throw new Error(`Flyer update failed: ${flyerErr.message}`);
    }

    return {
      msg: resp,
      code: 200,
      type: "text/html"
    };
  }
  catch (err) {
    console.error("flyerUpdate function failed:", err.message);
    return {
      msg: `Error: ${err.message}`,
      code: 400,
      type: "text/plain"
    };
  }
}