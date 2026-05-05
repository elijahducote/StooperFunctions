import qs from "node:querystring";
import {Readable} from "node:stream";
import Busboy from "busboy";
import {Buffer} from "node:buffer";
import {print} from "./utility.js";

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export function wrapper(func,type) {
  type = type.toUpperCase();
  return async (...args) => {
    if (type === "HONO") {
      let body;
      const headers = args[0].req.header(), // returns lowercase headers
      method = args[0].req.method; 
      
      // Check if Content-Type header exists before trying to use it
      if (headers["content-type"]) {
        const mainType = headers["content-type"].split(';')[0].trim();
        
        switch (mainType) {
          case "application/x-www-form-urlencoded":
            body = await args[0].req.parseBody();
            break;
          case "application/json":
            body = await args[0].req.json();
            break;
          case "multipart/form-data":
            // Existing multipart/form-data handling...
            if (args[0].req.raw.body instanceof ReadableStream) {
              const bodyStream = Readable.fromWeb(args[0].req.raw.body);
              body = await streamToBuffer(bodyStream);
            } else body = Buffer.from(args[0].req.raw.body, isBase64(args[0].req.raw.body) ? "base64" : "utf8");
            const { fields, files } = await parseFormData(body, headers["content-type"]);
            body = {fields, files};
            break;
        }
      }
      
      // If body is still undefined, get query parameters
      if (body === undefined) body = args[0].req.query();
      else print(JSON.stringify(body));

      const resp = await func(body,{headers,method});
      
      // Send JSON response back as a string
      if (resp.type === "application/json") {
        resp.msg = JSON.stringify(resp.msg);
        print(resp.msg);
      }

      print(resp.msg);
    
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