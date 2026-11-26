import axios from "axios";
import { Buffer } from "node:buffer";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import {envLookup,checkValues,report,tabulateList,sendHTMLResponse,validJSON} from "../../../lib/ntry.js";

dayjs.extend(utc);

const SOUNDCLOUD_USER_ID = "968314498",
MAX_TRACKS = 10,
OUTPUT_TIME_FORMAT = "ddd, DD MMM YYYY HH:mm:ss [+0000]";

function parseCreatedAt(value) {
  let timestamp;
  if (value instanceof Date) timestamp = value.getTime();
  else if (typeof value === "number") timestamp = value;
  else if (typeof value === "string" && value.length) {
    let normalized = value.trim(),
    legacy = /^(\d{4})\/(\d{2})\/(\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\s*([+-])(\d{2}):?(\d{2}))?$/.exec(normalized);
    if (legacy) normalized = `${legacy[1]}-${legacy[2]}-${legacy[3]}T${legacy[4]}${legacy[5] ? `${legacy[5]}${legacy[6]}:${legacy[7]}` : "Z"}`;
    timestamp = Date.parse(normalized);
  }
  else return null;
  if (!Number.isFinite(timestamp)) return null;
  const parsed = dayjs(timestamp).utc();
  return parsed.isValid() ? parsed : null;
}

function normalizeTrack(track) {
  return track?.origin ?? track?.track ?? track;
}

function trackCreatedAt(track) {
  const candidates = [
    track?.created_at,
    track?.createdAt,
    track?.last_modified,
    track?.lastModified,
    track?.release_date,
    track?.releaseDate,
    track?.timestamp,
    track?.origin?.created_at,
    track?.track?.created_at
  ];
  for (const candidate of candidates) {
    const parsed = parseCreatedAt(candidate);
    if (parsed) return parsed;
  }
  return null;
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
    time:createdAt ? createdAt.format(OUTPUT_TIME_FORMAT) : "",
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
  {data} = await sc.get(`/users/${SOUNDCLOUD_USER_ID}/tracks`);
  if (!Array.isArray(data) || !data.length) {
    report("SoundCloud returned no tracks.",log,false);
    throw Error(tabulateList(log));
  }
  report(`Got ${data.length} SoundCloud track(s).`,log);
  return data;
}

function buildTracks(data,log) {
  const items = data.filter(item => item && typeof item === "object");
  if (!items.length) {
    report("SoundCloud returned no usable track items.",log,false);
    throw Error(tabulateList(log));
  }
  const first = normalizeTrack(items[0]),
  firstCreatedAt = trackCreatedAt(items[0]),
  guaranteedId = String(first?.id ?? ""),
  now = dayjs(),
  seen = new Map(),
  order = entry => entry.createdAt ? entry.createdAt.valueOf() : Number.NEGATIVE_INFINITY,
  sortEntries = entries => entries.sort((a,b) => order(a) === order(b) ? 0 : order(b) - order(a));
  if (!firstCreatedAt) {
    const keys = Object.keys(items[0]).join(",") || "none",
    sample = JSON.stringify(items[0])?.slice(0,240) ?? "";
    report(`First SoundCloud item has no usable timestamp (keys: ${keys}; sample: ${sample}).`,log);
  }
  seen.set(guaranteedId,{track:first,createdAt:firstCreatedAt});
  let included = 1,
  missing = firstCreatedAt ? 0 : 1;
  for (let i = 1;i < items.length;++i) {
    const item = items[i],
    track = normalizeTrack(item),
    createdAt = trackCreatedAt(item);
    if (!createdAt) {
      ++missing;
      continue;
    }
    if (now.diff(createdAt,"month") >= 6) continue;
    const id = String(track?.id ?? "");
    if (seen.has(id)) continue;
    seen.set(id,{track,createdAt});
    ++included;
  }
  const tracks = sortEntries([...seen.values()]),
  capped = tracks.slice(0,MAX_TRACKS);
  if (!capped.some(({track}) => String(track?.id ?? "") === guaranteedId)) {
    capped[capped.length - 1] = seen.get(guaranteedId);
    sortEntries(capped);
  }
  const result = capped.map(({track,createdAt}) => mapTrack(track,createdAt));
  if (missing) report(`${missing} SoundCloud item(s) had no usable timestamp.`,log);
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
