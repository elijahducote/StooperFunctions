import axios from "axios";
import { Buffer } from "node:buffer";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import {envLookup,checkValues,report,tabulateList,sendHTMLResponse,validJSON} from "../../../lib/ntry.js";

dayjs.extend(utc);
dayjs.extend(customParseFormat);

const SOUNDCLOUD_USER_ID = "968314498",
TRACK_LIMIT = 200,
MAX_TRACKS = 10,
CREATED_AT_FORMAT = "YYYY/MM/DD HH:mm:ss ZZ",
OUTPUT_TIME_FORMAT = "ddd, DD MMM YYYY HH:mm:ss [+0000]";

function parseCreatedAt(value) {
  if (typeof value !== "string" || !value.length) return null;
  const parsed = dayjs(value,CREATED_AT_FORMAT,true).utc();
  return parsed.isValid() ? parsed : null;
}

function cleanURL(value) {
  if (typeof value !== "string" || !value.length) return "";
  return value.split(/[?#]/,1)[0];
}

function mapTrack(track,createdAt) {
  return {
    name:track?.title ?? "",
    about:track?.description ?? "",
    tags:track?.tag_list ?? "",
    url:cleanURL(track?.permalink_url),
    cover:track?.artwork_url ?? "",
    embed:"",
    time:createdAt.format(OUTPUT_TIME_FORMAT),
    id:track?.id === undefined || track?.id === null ? "" : String(track.id)
  };
}

async function getSoundCloudTracks(log) {
  const clientId = envLookup("SOUNDCLOUD_CLIENT_ID"),
  clientSecret = envLookup("SOUNDCLOUD_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    report("SoundCloud credentials are missing.",log,false);
    throw Error(tabulateList(log));
  }
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
  tokenParams = new URLSearchParams({
    grant_type: "client_credentials"
  }),
  {data: {refresh_token: refreshToken}} = await axios.post("https://secure.soundcloud.com/oauth/token",tokenParams,
  {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json; charset=utf-8",
      "Authorization": `Basic ${auth}`
    }
  });
  report("Got the SoundCloud refresh token.",log);
  if (!refreshToken) {
    report("SoundCloud did not return a refresh token.",log,false);
    throw Error(tabulateList(log));
  }
  const refreshTokenParams = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret
  }),
  {data: {access_token: accessToken}} = await axios.post("https://secure.soundcloud.com/oauth/token",refreshTokenParams.toString(),
  {
    headers: {
      "Accept": "application/json; charset=utf-8",
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });
  report("Got the SoundCloud access token.",log);
  if (!accessToken) {
    report("SoundCloud did not return an access token.",log,false);
    throw Error(tabulateList(log));
  }
  const sc = axios.create(
  {
    baseURL: "https://api.soundcloud.com",
    headers: {
      "Accept": "application/json",
      "Authorization": `OAuth ${accessToken}`
    }
  }),
  {data} = await sc.get(`/users/${SOUNDCLOUD_USER_ID}/tracks`,{
    params: {
      limit: TRACK_LIMIT
    }
  });
  if (!Array.isArray(data) || !data.length) {
    report("SoundCloud returned no tracks.",log,false);
    throw Error(tabulateList(log));
  }
  report(`Got ${data.length} SoundCloud track(s).`,log);
  return data;
}

function buildTracks(data,log) {
  const firstCreatedAt = parseCreatedAt(data[0]?.created_at);
  if (!firstCreatedAt) {
    report("The first SoundCloud track has an invalid created_at.",log,false);
    throw Error(tabulateList(log));
  }
  const now = dayjs(),
  seen = new Map();
  seen.set(String(data[0]?.id ?? ""),{track:data[0],createdAt:firstCreatedAt});
  let included = 1;
  for (let i = 1;i < data.length;++i) {
    const track = data[i],
    createdAt = parseCreatedAt(track?.created_at);
    if (!createdAt || now.diff(createdAt,"month") >= 6) continue;
    const id = String(track?.id ?? "");
    if (seen.has(id)) continue;
    seen.set(id,{track,createdAt});
    ++included;
  }
  const tracks = [...seen.values()],
  guaranteedId = String(data[0]?.id ?? "");
  tracks.sort((a,b) => b.createdAt.valueOf() - a.createdAt.valueOf());
  const capped = tracks.slice(0,MAX_TRACKS);
  if (!capped.some(({track}) => String(track?.id ?? "") === guaranteedId)) {
    capped[capped.length - 1] = seen.get(guaranteedId);
    capped.sort((a,b) => b.createdAt.valueOf() - a.createdAt.valueOf());
  }
  const result = capped.map(({track,createdAt}) => mapTrack(track,createdAt));
  report(`Selected ${result.length} track(s) from ${included} candidate(s).`,log);
  return result;
}

export async function updateReleases() {
  const log = [];
  let statusCode = 400,
  state = 2,
  fyl = {},
  json,
  sha;
  try {
    /* if (req?.method !== "POST" || !req?.body) {
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
    }*/
    await axios.get("https://api.github.com/repos/elijahducote/Ev/contents/automation.json",{headers:{"Accept":"application/vnd.github+json","Authorization":`Bearer ${envLookup("GITHUB_TOKEN")}`}})
    .then(response => {
      if (response.status === 200) {
        json = validJSON(atob(response.data.content));
        sha = response?.data?.sha;
        report(`Got file content (${sha})`,log);
        if (!json) report(`Not valid JSON! (${sha})`,log,false);
        else if (!Array.isArray(json.tracks)) report(`No tracks array in file content (${sha})`,log,false);
      }
      else report(`Returned status code of ${response.status}: ${JSON.stringify(response?.data)}`, log, false);
    })
    .catch((error) => {
      report(`There was a problem with the GET request: ${error}`, log, false);
    });
    if (!json || !Array.isArray(json.tracks)) throw Error(tabulateList(log));
    json.tracks = buildTracks(getSoundCloudTracks(log),log);
    fyl = Buffer.from(JSON.stringify(json),"utf8").toString("base64");
    await axios.put("https://api.github.com/repos/elijahducote/Ev/contents/automation.json",{"message":"update file","sha":sha,"content":fyl},{headers:{"Accept":"application/vnd.github+json","Authorization":`Bearer ${envLookup("GITHUB_TOKEN")}`}}).then(response => {
      if (response.status === 200) report(`Updated file. (commit ${response.data.commit.sha})`,log);
      else report(`Returned status of ${response.status}: ${JSON.stringify(response?.data)}`,log,false);
    })
    .catch((error) => {
      report(`There was a problem with the PUT request: ${error}`, log, false);
    });
    
    if (!checkValues(log)) throw Error(tabulateList(log));
    report("Successfully updated.",log);
    state = 1;
    statusCode = 200;
  }
  catch (err) {
    report(`Failed: \n${err}`,log,false);
    state = 0;
  }
  finally {
    return {
      msg:sendHTMLResponse(state,tabulateList(log)),
      type: "text/html",
      code: statusCode
    }
  }
}
