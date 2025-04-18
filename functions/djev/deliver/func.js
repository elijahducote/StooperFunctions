import axios from "axios";

export async function deliver (body) {
    const queryStringParameters = new URLSearchParams(body),
    nametag = ["Try again","Success"],
    svg = ["<svg xmlns=\"http://www.w3.org/2000/svg\" xml:space=\"preserve\" viewBox=\"0 0 330 330\"><path fill=\"#FF0000\" d=\"M257 193c-6-6-16-6-21 0l-11 11-11-11a15 15 0 0 0-21 21l11 11-11 11a15 15 0 1 0 21 21l11-11 11 11a15 15 0 0 0 21 0c6-6 6-16 0-21l-11-11 11-11c6-5 6-15 0-21zM250 0H20l40 30 75 56z\"/><path fill=\"#FF0000\" d=\"M270 130V23l-30 22-96 72-9 3-9-3L0 23v172c0 8 7 15 15 15h106a105 105 0 0 0 104 120 105 105 0 0 0 45-200zm-45 170a75 75 0 1 1 0-150 75 75 0 0 1 0 150z\"/></svg>","<svg xmlns=\"http://www.w3.org/2000/svg\" xml:space=\"preserve\" viewBox=\"0 0 330 330\"><path fill=\"#00FF00\" d=\"M255 210h-15v-15a15 15 0 0 0-30 0v15h-15a15 15 0 0 0 0 30h15v15a15 15 0 0 0 30 0v-15h15a15 15 0 0 0 0-30zM250 0H20l40 30 75 56z\"/><path fill=\"#00FF00\" d=\"M270 130V23l-30 22-96 72-9 3-9-3L0 23v172c0 8 7 15 15 15h106a105 105 0 0 0 104 120 105 105 0 0 0 45-200zm-45 170a75 75 0 1 1 0-150 75 75 0 0 1 0 150z\"/></svg>"];
    
    let ndx = 0,
    respcode = 400,
    usrname = "Anonymous",
    contents = "<div class=wrapper><h2 style=color:#FF0000>Failed.</h2></div><br><br><br><div class=wrapper><p>Oops. Gone awry!</p></div>",
    email,
    token,
    msg,
    status,
    statum = true;
    
    try {
        const params = Object.fromEntries(queryStringParameters);
        email = params.mailbox;
        msg = params.message;
        token = params.response;
        usrname = email.split("@",1)[0];
        
        let errout = "Oops. Gone awry!",
        firstchar = usrname.charCodeAt(0);
        
        if (firstchar > 96 && firstchar < 123) {
            usrname = String.fromCharCode(firstchar - 32) + usrname.slice(1);
        }
        
        
        
        const hcaptcha = axios.create({
            baseURL: "https://api.hcaptcha.com",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        }),
        resend = axios.create({
            baseURL: "https://api.resend.com",
            headers: {
                "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
                "Content-Type": "application/json"
            }
        });
        
        queryStringParameters.append("secret",Deno.env.get("HCAPTCHA_SECRET"));
        
        await hcaptcha.post("/siteverify", queryStringParameters).then((resp) => {
            statum = resp.data.success;
        }).catch((err) => {
            errout += `\n${err}`;
        });
        
        if (!statum) throw new Error(errout);
        
        await resend.post("/emails", {
            from: "Evwave Music <booking@djev.org>",
            to: ["evbeats.net@gmail.com"],
            subject: `Incoming Message from ${usrname}`,
            html: `<style>:root{font-size:1px}body,html{line-height:1.5em;background:#000;font-size:35rem;font-family:Helvetica}.container{padding:0;min-width:auto;margin:0 -50% 0 -50%;width:100%;max-height:100vh;max-width:100vw;display:block;position:absolute;inset:0 50% 0 50%;box-sizing:content-box;background:#000}@media (min-height:626px) and (min-width:365px){.container{font-size:20rem}}@media (min-height:912px) and (min-width:540px){.container{font-size:24rem}.container{font-size:30rem}}@media (min-width:992px) and (min-height:654px){.container{font-size:36rem}}@media (min-width:1363px) and (min-height:559px){.container{font-size:40rem}}@media (min-width:1932px) and (min-height:1121px){.container{font-size:56rem}}.wrapper{overflow-wrap:break-word;word-wrap: break-word;word-break:break-word;hyphens:auto;font-weight:800;line-height:1.5em;letter-spacing:.075em;right:100%;margin:5em 0 0 0;color:#fff;left:0;width:100%;padding:0;position:absolute;box-sizing:border-box;display:flex;text-align:center;justify-content:center;align-content:center;object-position:center;align-items:center}svg{width:5em}h2{bottom:0.75em;position:relative}</style><div class=container><div class=wrapper style="margin:0 auto"><svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 330 330"><path fill="#00AAFF" d="m246 192-34 35-9-10a15 15 0 1 0-22 22l20 20a15 15 0 0 0 22 0l45-45a15 15 0 1 0-22-22zm4-192H20l40 30 75 56z"/><path fill="#00AAFF" d="M270 130V23l-30 22-96 72-9 3-9-3L0 23v172c0 8 7 15 15 15h106a105 105 0 0 0 104 120 105 105 0 0 0 45-200zm-45 170a75 75 0 1 1 0-150 75 75 0 0 1 0 150z"/></svg></div><div class=wrapper><h2 style=color:#00AAFF>New Message from ${email}</h2></div><br/><div class=wrapper><p>${msg}</p></div></div>`,
            headers: {
                "X-Entity-Ref-ID": Math.floor(Date.now() / 1000).toString()
            }
        }).then((resp) => {
            status = resp.status;
        }).catch((err) => {
            errout += `\n${err}`;
        });
        
        respcode = status;
        
        if (status === 200) {
            ndx = 1;
            contents = "<div class=wrapper><h2 style=color:#00FF00>Success.</h2></div><br><br><br><div class=wrapper><p>Delivered message.</p></div>";
        }
        else throw new Error(errout);
    }
    catch (err) {
        contents = `<div class=wrapper><h2 style=color:#FF0000>Failed.</h2></div><br><br><br><div class=wrapper><p>${err}</p></div>`;
    }
    finally {
        return {
            msg: `<!doctype html><html><head><meta http-equiv=refresh content="7;url=https://djev.org/booking?usr=${usrname}&status=${respcode}"><meta charset=utf-8 /><title>${nametag[ndx]}.</title><link href=../../fonts.css rel=stylesheet></head><body><style>:root{font-size:1px}body,html{background:#000;font-size:35rem;font-family:Brisa Sans}.container{padding:0;min-width:auto;margin:0 -50% 0 -50%;width:100%;max-height:100vh;max-width:100vw;display:block;position:absolute;inset:0 50% 0 50%;box-sizing:content-box;background:#000}@media (min-height:626px) and (min-width:365px){.container{font-size:20rem}}@media (min-height:912px) and (min-width:540px){.container{font-size:24rem}.container{font-size:30rem}}@media (min-width:992px) and (min-height:654px){.container{font-size:36rem}}@media (min-width:1363px) and (min-height:559px){.container{font-size:40rem}}@media (min-width:1932px) and (min-height:1121px){.container{font-size:56rem}}.wrapper{line-height:1.5em;letter-spacing:.075em;right:100%;margin:5em 0 0 0;color:#fff;left:0;width:100%;padding:0;position:absolute;box-sizing:border-box;display:flex;text-align:center;justify-content:center;align-content:center;object-position:center;align-items:center}svg{width:5em}</style><div class=container><div class=wrapper style="margin:0 auto">${svg[ndx]}</div>${contents}</div></body></html>`,
            code: respcode,
            type: "text/html",
        };
    }
}