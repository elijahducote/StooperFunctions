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
      // Change to text response type instead of json, so we can handle parsing ourselves
      responseType: "text",
      responseEncoding: "utf8"
    };
    
    // Make the API request with proper error handling
    console.log("Making request to Instagram API...");
    const rawResponse = await axios.post(
      "https://save-insta1.p.rapidapi.com/profileposts",
      {username:"_djev_"},
      options
    ).catch((err) => {
      console.error("API request failed:", err.message);
      if (err.response) {
        console.error("Response status:", err.response.status);
        console.error("Response data:", err.response.data.substring(0, 200) + "...");
      }
      throw new Error(`Instagram API request failed: ${err.message}`);
    });
    
    console.log("API request successful, attempting to process response");
    console.log(`Response data type: ${typeof rawResponse.data}`);
    
    // Try multiple methods to extract the data we need
    const items = await extractPostItems(rawResponse.data);
    if (!items || !items.length) {
      throw new Error("Could not extract post items from response");
    }
    
    const nth = items.length;
    console.log(`Found ${nth} items from API response`);
    
    // Process the extracted items
    const candidates = [];
    const captions = [];
    const posts = [];

    let itR8 = nth;
    let curN;
    let tymStamp;

    console.log("Processing posts...");
    for (;itR8;--itR8) {
      curN = nth - itR8;
      
      // Check if the item has the required properties
      const item = items[curN];
      if (!item || !item.node) {
        console.warn(`Skipping item ${curN}: Invalid structure`);
        continue;
      }
      
      // Get the timestamp if available
      if (!item.node.taken_at) {
        console.warn(`Skipping item ${curN}: Missing timestamp`);
        continue;
      }
      
      tymStamp = dayjs.unix(item.node.taken_at).utc().tz("America/Lima");
      console.log(`Post ${curN} timestamp: ${tymStamp.format()}, age in months: ${server_time.diff(tymStamp, "month")}`);
      
      // Check if the item has the required image and caption properties
      const hasImage = item.node.image_versions2 && 
                      item.node.image_versions2.candidates && 
                      item.node.image_versions2.candidates.length > 0 &&
                      item.node.image_versions2.candidates[0].url;
                      
      const hasCaption = item.node.caption && 
                        typeof item.node.caption.text === 'string';
      
      if (server_time.diff(tymStamp, "month") < 3 && hasImage && hasCaption) {
        console.log(`Adding post ${curN} to processing queue`);
        captions[captions.length] = encodeURI(item.node.caption.text);
        candidates[candidates.length] = item.node.image_versions2.candidates[0].url;
        
        // Get image as base64 with proper error handling
        try {
          console.log(`Fetching image for post ${curN}...`);
          const imageBase64 = await getImageAsBase64(item.node.image_versions2.candidates[0].url);
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

// Helper function to extract post items from the response using multiple methods
async function extractPostItems(rawData) {
  console.log("Attempting to extract post items from response");
  
  // Method 1: Try normal JSON parsing
  try {
    console.log("Method 1: Attempting standard JSON parsing");
    const parsedData = JSON.parse(rawData);
    if (parsedData && parsedData.result && Array.isArray(parsedData.result.edges)) {
      console.log("Method 1 successful");
      return parsedData.result.edges;
    }
  } catch (err) {
    console.log(`Method 1 failed: ${err.message}`);
  }
  
  // Method 2: Try to fix common JSON parsing issues
  try {
    console.log("Method 2: Attempting to fix common JSON issues");
    // Replace unescaped quotes, fix unclosed objects/arrays, etc.
    const fixedJson = rawData
      .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') // Fix unquoted keys
      .replace(/\\/g, '\\\\') // Escape backslashes
      .replace(/(?<!\\)"/g, '\\"') // Escape unescaped quotes
      .replace(/(\r\n|\n|\r)/gm, ''); // Remove line breaks
    
    const parsedData = JSON.parse(`{"data":${fixedJson}}`);
    if (parsedData && parsedData.data && parsedData.data.result && Array.isArray(parsedData.data.result.edges)) {
      console.log("Method 2 successful");
      return parsedData.data.result.edges;
    }
  } catch (err) {
    console.log(`Method 2 failed: ${err.message}`);
  }
  
  // Method 3: Use regex to extract the data we need
  try {
    console.log("Method 3: Using regex to extract data");
    // This is a simplified example - you'll need to adjust the regex based on the actual data structure
    const edgesMatch = rawData.match(/"edges"\s*:\s*(\[.*?\])/s);
    if (edgesMatch && edgesMatch[1]) {
      // Try to parse just the edges array
      const edges = JSON.parse(edgesMatch[1]);
      if (Array.isArray(edges)) {
        console.log("Method 3 successful");
        return edges;
      }
    }
  } catch (err) {
    console.log(`Method 3 failed: ${err.message}`);
  }
  
  // Method 4: Handle as text and use string manipulation
  try {
    console.log("Method 4: Using string manipulation");
    // Extract data for each post manually
    const posts = [];
    
    // Find all post sections in the raw data
    const postSections = rawData.split('"node":').slice(1);
    
    for (const section of postSections) {
      try {
        // Extract needed fields for each post
        const captionMatch = section.match(/"caption"\s*:\s*{\s*"text"\s*:\s*"([^"]*?)"/);
        const urlMatch = section.match(/"url"\s*:\s*"([^"]*?)"/);
        const timestampMatch = section.match(/"taken_at"\s*:\s*(\d+)/);
        
        if (captionMatch && urlMatch && timestampMatch) {
          posts.push({
            node: {
              taken_at: parseInt(timestampMatch[1]),
              caption: { text: captionMatch[1] },
              image_versions2: {
                candidates: [{ url: urlMatch[1] }]
              }
            }
          });
        }
      } catch (innerErr) {
        console.log(`Error processing post section: ${innerErr.message}`);
      }
    }
    
    if (posts.length > 0) {
      console.log(`Method 4 successful, extracted ${posts.length} posts`);
      return posts;
    }
  } catch (err) {
    console.log(`Method 4 failed: ${err.message}`);
  }
  
  // Method 5: As a last resort, attempt to use a more lenient JSON parser
  try {
    console.log("Method 5: Using a custom parsing approach");
    
    // Custom parsing function to extract just the data we need
    const extractPostData = (text) => {
      const posts = [];
      let index = 0;
      
      while (index < text.length) {
        // Look for the beginning of a post
        const nodeStart = text.indexOf('"node":', index);
        if (nodeStart === -1) break;
        
        // Find the end of this node (start of next node or end of data)
        const nextNodeStart = text.indexOf('"node":', nodeStart + 6);
        const nodeEnd = nextNodeStart === -1 ? text.length : nextNodeStart;
        
        // Extract the node data
        const nodeText = text.substring(nodeStart + 6, nodeEnd);
        
        try {
          // Extract individual fields with simple string operations
          const taken_at = extractField(nodeText, "taken_at");
          const caption = extractField(nodeText, "caption");
          const captionText = caption ? extractNestedField(caption, "text") : "";
          const imageVersions = extractField(nodeText, "image_versions2");
          const candidates = imageVersions ? extractNestedField(imageVersions, "candidates") : "";
          const url = candidates ? extractUrlFromCandidates(candidates) : "";
          
          if (taken_at && captionText && url) {
            posts.push({
              node: {
                taken_at: parseInt(taken_at),
                caption: { text: captionText },
                image_versions2: {
                  candidates: [{ url: url }]
                }
              }
            });
          }
        } catch (err) {
          console.log(`Error extracting post data: ${err.message}`);
        }
        
        index = nodeEnd;
      }
      
      return posts;
    };
    
    // Helper functions for custom parsing
    const extractField = (text, fieldName) => {
      const fieldStart = text.indexOf(`"${fieldName}":`);
      if (fieldStart === -1) return null;
      
      // Find the start of the value
      let valueStart = fieldStart + fieldName.length + 2;
      while (valueStart < text.length && /\s/.test(text[valueStart])) valueStart++;
      
      // Determine if value is an object, array, string, or number
      let valueEnd;
      if (text[valueStart] === '{') {
        // Object - find matching closing brace
        valueEnd = findMatchingClose(text, valueStart, '{', '}');
      } else if (text[valueStart] === '[') {
        // Array - find matching closing bracket
        valueEnd = findMatchingClose(text, valueStart, '[', ']');
      } else if (text[valueStart] === '"') {
        // String - find closing quote
        valueEnd = findMatchingClose(text, valueStart, '"', '"', true);
      } else {
        // Number or boolean - find next comma or closing brace/bracket
        valueEnd = text.indexOf(',', valueStart);
        const closeBrace = text.indexOf('}', valueStart);
        const closeBracket = text.indexOf(']', valueStart);
        
        if (valueEnd === -1 || (closeBrace !== -1 && closeBrace < valueEnd)) {
          valueEnd = closeBrace;
        }
        if (valueEnd === -1 || (closeBracket !== -1 && closeBracket < valueEnd)) {
          valueEnd = closeBracket;
        }
        if (valueEnd === -1) valueEnd = text.length;
      }
      
      return text.substring(valueStart, valueEnd + 1);
    };
    
    const extractNestedField = (objText, fieldName) => {
      if (!objText) return null;
      return extractField(objText, fieldName);
    };
    
    const extractUrlFromCandidates = (candidatesText) => {
      const urlMatch = candidatesText.match(/"url"\s*:\s*"([^"]*?)"/);
      return urlMatch ? urlMatch[1] : "";
    };
    
    const findMatchingClose = (text, start, openChar, closeChar, isString = false) => {
      let depth = 1;
      let i = start + 1;
      
      while (i < text.length && depth > 0) {
        if (isString) {
          // For strings, check for escape characters
          if (text[i] === '\\') {
            i += 2;
            continue;
          }
          if (text[i] === closeChar) return i;
          i++;
        } else {
          if (text[i] === openChar) depth++;
          else if (text[i] === closeChar) depth--;
          i++;
        }
      }
      
      return i - 1;
    };
    
    const posts = extractPostData(rawData);
    if (posts.length > 0) {
      console.log(`Method 5 successful, extracted ${posts.length} posts`);
      return posts;
    }
  } catch (err) {
    console.log(`Method 5 failed: ${err.message}`);
  }
  
  console.log("All extraction methods failed");
  return null;
}