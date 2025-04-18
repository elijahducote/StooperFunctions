import qs from "node:querystring";
import Busboy from "busboy";
import {print} from "./utility.js";

export function wrapper(func,type) {
  type = type.toUpperCase();
  return async (...args) => {
    if (type === "NETLIFY") {
      let {body, headers, isBase64Encoded, queryStringParameters} = args[0],
      mime;
      if (headers["content-type"]) {
        mime = headers["content-type"];
        mime = mime.toLowerCase();
        if (mime.startsWith("application/json")) mime = "application/json";
      }
      
      switch (mime) {
        case "application/x-www-form-urlencoded":
          body = qs.parse(body);
          break;
        case "application/json":
          body = JSON.parse(body);
          break;
        case "multipart/form-data":
          body = Buffer.from(body, isBase64Encoded ? "base64" : "utf8");
          const { fields, files } = await parseFormData(body, "multipart/form-data");
          body = {fields, files};
          break;
      }
      //body = "aaa";
      if (body === undefined) body = {};
      if (queryStringParameters) body = Object.assign(body, queryStringParameters);
      const resp = await func(body);
      if (resp.type === "application/json") resp.msg = JSON.stringify(resp.msg);
      return {
        headers: {
          "content-type": resp.type
        },
        statusCode: resp.code,
        body: resp.msg
      };
    }
    if (type === "HONO") {
      let body;
      switch (args[0].req.header("Content-Type")) {
        case "application/x-www-form-urlencoded":
          body = await args[0].req.parseBody();
          break;
        case "application/json":
          body = await args[0].req.json();
          break;
        case "multipart/form-data":
          body = Buffer.from(args[0].req.raw.body, isBase64(args[0].req.raw.body) ? "base64" : "utf8");
          const { fields, files } = await parseFormData(body, "multipart/form-data");
          body = {fields, files};
          break;
      }
      if (body === undefined) body = args[0].req.query();
      const resp = await func(body);
      print(JSON.stringify(resp));
      if (resp.type === "application/json") resp.msg = JSON.stringify(resp.msg);
      
      return args[0].body(resp.msg, resp.code,
      {
        "Content-Type": resp.type
      });
    }
  };
}

function isBase64(str) {
  if (str.length % 4 !== 0) return false;
  
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(str)) return false;
  
  try {
    const decoded = atob(str);
    if (/^[\x20-\x7E]*$/.test(decoded)) return true;
  } catch (e) {
    return false;
  }
  return false;
}

// Helper to parse multipart data
function parseFormData (bodyBuffer, contentType) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: { "content-type": contentType } });
    const fields = {};
    const files = [];
  
    busboy.on("file", (name, file, info) => {
      const chunks = [];
      file.on("data", (data) => chunks.push(data));
      file.on("end", () => {
        files.push({
          filename: info.filename,
          contentType: info.mimeType,
          content: Buffer.concat(chunks)
        });
      });
    });
  
    busboy.on("field", (name, value) => {
      fields[name] = fields[name] || [];
      fields[name].push(value);
    });
  
    busboy.on("finish", () => resolve({ fields, files }));
    busboy.on("error", reject);
    busboy.end(bodyBuffer);
  });
}