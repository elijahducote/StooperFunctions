const Busboy = require('busboy');
const axios = require('axios');

exports.handler = async function (event, context) {
  try {
    // Handle binary body
    const contentType = event.headers['content-type'],
    bodyBuffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8'),
    // Parse multipart form data
    { fields, files } = await parseFormData(bodyBuffer, contentType);
    
    let statum = false,
    error = false;
    
    const params = new URLSearchParams();
    params.append('secret', process.env.HCAPTCHA_SECRET);
    params.append('response', fields.token);

    await axios.post("https://api.hcaptcha.com/siteverify", params).then((resp) => {
      statum = resp.data.success;
    }).catch((err) => {
      error = err;
    });
    if (!statum) throw new Error(error);
    // Prepare email payload
    const emailPayload = {
      from: 'DJ Ev <booking@djev.org>',
      to: ["evanducote@gmail.com","evbeats.net@gmail.com","ducote.help@gmail.com"],
      headers: {
        "X-Entity-Ref-ID": Math.floor(Date.now() / 1000).toString()
      },
      subject: `New Submission: ${fields.event?.[0] || 'No Event'}`,
      html: buildEmailHtml(fields)
    };
    if (files[files.length - 1].content.length) emailPayload.attachments = files.map(file => ({
        content: file.content.toString('base64'),
        filename: file.filename,
        contentType: file.contentType
    }));

    // Send to Resend API
    await axios.post('https://api.resend.com/emails', emailPayload, {
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      }
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: sendHTMLResponse(1)
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: sendHTMLResponse(0, error.message)
    };
  }
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

// Helper to build HTML email content
function buildEmailHtml (fields) {
  return `
  <h1>New Form Submission</h1>
  <p><strong>Date:</strong> ${fields.date?.[0] || "N/A"}</p>
  <p><strong>Location:</strong> ${fields.locale?.[0] || "N/A"}</p>
  <p><strong>Email:</strong> ${fields.email?.[0] || "N/A"}</p>
  <p><strong>Event:</strong> ${fields.event?.[0] || "N/A"}</p>
  <p><strong>Selection:</strong> ${fields.selection?.join(", ") || "None"}</p>
  <p><strong>Requests:</strong> ${fields.requests?.[0] || "N/A"}</p>
  <p><strong>Dislikes:</strong> ${fields.dislikes?.[0] || "N/A"}</p>
  <p><strong>Comments:</strong> ${fields.comments?.[0] || "N/A"}</p>
  `;
}

function sendHTMLResponse (status,msg,cfg)
{
 const statum = ["ERROR!","success...","Unknown?"],
 msg_responses = ["SOMETHING HAS GONE AWRY!","everything went according to plan...","The. Unexpected. Happened?"],
 hexcodes = ["#FF0000","#7FFFD4","#808080"],
 svg_icons = ["<svg xmlns=http://www.w3.org/2000/svg viewBox=\"0 0 32 32\"><path fill=#FF0000 fill-rule=evenodd d=\"M21.7 20.2c.3.4.3 1 0 1.5a1 1 0 0 1-1.5 0L16 17.4l-4.3 4.3a1 1 0 0 1-1.4 0 1 1 0 0 1 0-1.4l4.3-4.3-4.3-4.2a1 1 0 1 1 1.4-1.4l4.3 4.2 4.3-4.3a1 1 0 0 1 1.4 0c.4.4.4 1 0 1.4L17.4 16l4.3 4.2ZM16 0a16 16 0 1 0 0 32 16 16 0 0 0 0-32Z\"/></svg>","<svg class=success fill=none xmlns=http://www.w3.org/2000/svg viewBox=\"0 0 24 24\" ><path fill=#7FFFD4 fill-rule=evenodd clip-rule=evenodd d=\"M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Zm-6-3c.3.3.3.7 0 1l-5 5c-.3.3-.7.3-1 0l-2-2a.7.7 0 1 1 1-1l1.5 1.4 2.2-2.2L15 9c.3-.3.7-.3 1 0Z\"/></svg>","<svg xmlns=http://www.w3.org/2000/svg viewBox=\"0 0 16 16\"><path fill=#808080 fill-rule=evenodd d=\"M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM4.5 7.5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7z\"/></svg>"],
 fallbackCfg = {
   status: 2, // used for page titles/heading
   msg: 2, // message response
   color: 2, // color of text
   svg: 2, // icon to display
 };
 
 
 if (cfg)
 {
   if (status) {
    fallbackCfg.status = status;
    fallbackCfg.msg = status;
    fallbackCfg.color = status;
    fallbackCfg.svg = status;
   }
   
   if (!cfg.status && cfg.status !== 0) cfg.status = statum[fallbackCfg.status];
   if (!cfg.msg) cfg.msg = msg_responses[fallbackCfg.msg];
   if (!cfg.color) cfg.color = hexcodes[fallbackCfg.color];
   if (!cfg.svg) cfg.svg = svg_icons[fallbackCfg.svg];
 }
 else
 {
   cfg = {};
   cfg.status = statum[fallbackCfg.status];
   cfg.msg = msg_responses[fallbackCfg.msg];
   cfg.color = hexcodes[fallbackCfg.color];
   cfg.svg = svg_icons[fallbackCfg.svg];
   if (status + 1) {
    cfg.status = statum[status];
    cfg.msg = msg_responses[status];
    cfg.color = hexcodes[status];
    cfg.svg = svg_icons[status];
   }
   if (msg) cfg.msg = msg;
 }
  return `<!doctype html><meta charset=utf-8><title>${cfg.status}</title><meta name=viewport content="width=device-width,initial-scale=1.0" /><link rel=preconnect href=https://fonts.googleapis.com><link rel=preconnect href=https://fonts.gstatic.com crossorigin><link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wdth,wght@0,75..100,300..800;1,75..100,300..800&display=swap" rel=stylesheet><body><style>:root{font-size:1px}body,html{background:#000;font-size:35rem;font-family:"Open Sans",serif;font-weight:400;font-style:normal;font-optical-sizing:auto;font-variation-settings:"wdth" 100}.container{padding:0;min-width:auto;margin:0 -50% 0 -50%;width:100%;max-height:100vh;max-width:100vw;display:block;position:absolute;inset:0 50% 0 50%;box-sizing:content-box;background:#000}@media (min-height:626px) and (min-width:365px){.container{font-size:20rem}}@media (min-height:912px) and (min-width:540px){.container{font-size:24rem}.container{font-size:30rem}}@media (min-width:992px) and (min-height:654px){.container{font-size:36rem}}@media (min-width:1363px) and (min-height:559px){.container{font-size:40rem}}@media (min-width:1932px) and (min-height:1121px){.container{font-size:56rem}}svg.success{width:6.125em;margin-top:-.5em}.wrapper{line-height:1.5em;letter-spacing:.075em;right:100%;margin:5em 0 0 0;color:#fff;left:0;width:100%;padding:0;position:absolute;box-sizing:border-box;display:flex;text-align:center;justify-content:center;align-content:center;object-position:center;align-items:center}svg{width:5em}</style><div class=container><div class=wrapper style="margin:0 auto">${cfg.svg}</div><div class=wrapper><h2 style=color:${cfg.color};>${cfg.status}</h2></div><br><br><br><div class=wrapper><p>${cfg.msg}</p></div></div>`;
}