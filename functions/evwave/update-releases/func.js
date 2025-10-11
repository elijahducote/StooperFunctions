import axios from "axios";
import {envLookup,sendHTMLResponse} from "../../../lib/ntry.js";

var payload = [],
poplus = [],
stats,
albums,
sorted,
json,
leng,
i,
cur,
sha,
msgcode,
fyl,
token,
NTH,
latestAlbum,
albumTracks;

export async function updateReleases(body) {
  try {
    await axios.get("https://api.github.com/repos/elijahducote/Ev/contents/automation.json",{headers:{"Accept":"application/vnd.github+json","Authorization":`Bearer ${envLookup("GITHUB_TOKEN")}`,"X-GitHub-Api-Version":"2022-11-28"}})
    .then(response => {
      if (response.status === 200) {
        json = JSON.parse(atob(response.data.content));
        sha = response.data.sha;
      }
      else throw new Error("Uh, oh! " + response.status);
    });
  }
  catch (error) {
    console.log("Failed fetch",error)
    return {
      code:400,
      type: "text/html",
      msg: sendHTMLResponse(0, "There was a problem with the GET request: " + error),
    };
  }
  
  try {
    await axios.post("https://accounts.spotify.com/api/token",`grant_type=refresh_token&refresh_token=${envLookup("SPOTIFY_REFRESH_TOKEN")}`,{headers:{"Content-Type":"application/x-www-form-urlencoded","Authorization":"Basic " + (btoa(envLookup("SPOTIFY_CLIENT_ID") + ":" + envLookup("SPOTIFY_CLIENT_SECRET")))}})
    .then(response => {
      if (response.status === 200) token = response.data.access_token;
      else throw new Error("Uh, oh! " + response.status);
    });
  }
  catch (error) {
    console.log("Failed POST",error);
    return {
      code:400,
      type: "text/html",
      msg:sendHTMLResponse(0,"There was a problem with the POST request: " + error),
    };
  }
  
  try {
    // Get all albums first
    await axios.get("https://api.spotify.com/v1/artists/3DNggTwKmMtPa51K3zl0SV/albums?include_groups=album,single&limit=50",{headers:{"Authorization": `Bearer ${token}`}})
    .then(response => {
      if (response.status === 200) albums = response.data.items;
      else throw new Error("Uh, oh! " + response.status);
    });

    // Sort albums by date to find the latest one
    sorted = albums.sort((a, b) => {
      const dateA = new Date(a.release_date);
      const dateB = new Date(b.release_date);
      return dateB - dateA;
    });

    // Get the latest album
    latestAlbum = sorted[0];

    // Fetch tracks from the latest album
    await axios.get(`https://api.spotify.com/v1/albums/${latestAlbum.id}/tracks`,{headers:{"Authorization": `Bearer ${token}`}})
    .then(response => {
      if (response.status === 200) albumTracks = response.data.items;
      else throw new Error("Uh, oh! " + response.status);
    });

    // Format the tracks from the latest album (in order)
    leng = albumTracks.length;
    for (i = 0; i < leng; i++) {
      poplus[i] = {
        name: albumTracks[i].name,
        url: albumTracks[i].external_urls.spotify,
        album: latestAlbum.name,
        date: latestAlbum.release_date,
        cover: latestAlbum.images[0].url,
        id: albumTracks[i].id,
        track_number: albumTracks[i].track_number
      };
    }
  }
  catch (error) {
    return {
      code:400,
      type: "text/html",
      msg: sendHTMLResponse(0,"There was a problem with the GET request: " + error),
    };
  }
  
  try {
    var arrlen = albums.length;
    for (NTH = arrlen;NTH;--NTH) {
      payload.push({name:sorted[arrlen - NTH].name,url:sorted[arrlen - NTH].external_urls.spotify,cover:sorted[arrlen - NTH].images[0].url,date:sorted[arrlen - NTH].release_date,id:sorted[arrlen - NTH].id});
    }
    json.discography = payload;
    json.tracks = poplus;
    fyl = JSON.stringify(json);
    
    await axios.put("https://api.github.com/repos/elijahducote/Ev/contents/automation.json",{"message":"update file","sha":sha,"content":btoa(fyl)},{headers:{"Accept":"application/vnd.github+json","Authorization":`Bearer ${envLookup("GITHUB_TOKEN")}`,"X-GitHub-Api-Version":"2022-11-28"}}).then(response => {
      if (response.status === 200) {
        msgcode = response.data.commit.sha;
      }
      else throw new Error("Uh, oh! " + response.status);
    });
    return {
      code:200,
      type: "text/html",
      msg: sendHTMLResponse(1, `Success! (#${msgcode})`),
    };
  }
  catch (error) {
    return {
      code:400,
      type: "text/html",
      msg: sendHTMLResponse(0, "There was a problem with the PUT request: " + error),
    };
  }
}