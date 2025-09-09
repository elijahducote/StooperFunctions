import axios from "axios";

import {envLookup} from "../../../lib/ntry.js";

const axiosInstance = axios.create({
  baseURL:"https://api.github.com/repos/elijahducote/DJEv",
  headers: {
    "Authorization": `Bearer ${envLookup("GITHUB_TOKEN")}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  }
});


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
    // Get the latest commit SHA
    const { data: branch } = await axiosInstance.get("/git/ref/heads/main");
    let latestCommitSHA = branch.object.sha;
    
    console.log(`Starting with commit SHA: ${latestCommitSHA}`);
    
    for (const file of files) {
      console.log(`Processing file: ${file.uri}`);
      
      // Create blob
      console.log(`Creating blob for ${file.uri}...`);
      const { data: blob } = await axiosInstance.post("/git/blobs", {
        content: file.img,
        encoding: "base64"
      });
      console.log(`Blob created with SHA: ${blob.sha}`);
      
      // Get the current tree
      console.log(`Getting current tree...`);
      const { data: currentTree } = await axiosInstance.get(`/git/trees/${latestCommitSHA}`);
      
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
      
      const { data: tree } = await axiosInstance.post("/git/trees", newTree);
      const newTreeSHA = tree.sha;
      console.log(`New tree created with SHA: ${newTreeSHA}`);
      
      // Create a new commit
      console.log(`Creating new commit...`);
      const { data: commit } = await axiosInstance.post("/git/commits", {
        message: `Update file: ${file.uri}`,
        tree: newTreeSHA,
        parents: [latestCommitSHA]
      });
      const newCommitSHA = commit.sha;
      console.log(`New commit created with SHA: ${newCommitSHA}`);
      
      // Update the reference
      console.log(`Updating reference...`);
      await axiosInstance.patch("/git/refs/heads/main", {
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

export async function updater() {
  try {
    const {data: ig} = await axios.request({
      method: "GET",
      url: "https://instagram-scraper-api2.p.rapidapi.com/v1.2/posts",
      params: {
        username_or_id_or_url: "_djev_"
      },
      headers: {
        "x-rapidapi-key": envLookup("RAPIDAPI_KEY"),
        "x-rapidapi-host": "instagram-scraper-api2.p.rapidapi.com"
      }
    }),
    nth = ig.data.items.length;
    
    let limit = 8,
    i = limit,
    posts = [],
    img,
    cur;
    
    
    if (nth < limit) {
      limit = nth;
      i = nth;
    }
    for (;i;--i) {
      cur = limit - i;
      if (ig.data.items[cur].media_type !== 1) continue;
      img = await getImageAsBase64(ig.data.items[cur].image_versions.items[0].url);
      posts.push({img,uri:`img/${posts.length}.jpg`});
      console.log(posts.length - 1);
    }
    updateMultipleFiles(posts);
    return {
      statusCode:200,
      headers: {
        "Content-Type": "text/html"
      },
      body:"Success!"
    };
  }
  catch (err) {
    return {
      c:400,
      headers: {
        "Content-Type": "text/html"
      },
      body:`Error! ${err}`
    };
  }
}