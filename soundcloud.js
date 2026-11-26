import axios from "axios";
import "dotenv/config";

try {

  const auth = Buffer.from(`${process.env.SOUNDCLOUD_CLIENT_ID}:${process.env.SOUNDCLOUD_CLIENT_SECRET}`).toString("base64"),
  tokenParams = new URLSearchParams({
    grant_type: "client_credentials"
  }),
  {data: {refresh_token}} = await axios.post("https://secure.soundcloud.com/oauth/token", tokenParams,
                                    {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json; charset=utf-8",
      "Authorization": `Basic ${auth}`
    }
  }),
  refreshTokenParams = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refresh_token,
    client_id: process.env.SOUNDCLOUD_CLIENT_ID,
    client_secret: process.env.SOUNDCLOUD_CLIENT_SECRET
  }),  
  {data: {access_token}} = await axios.post("https://secure.soundcloud.com/oauth/token", refreshTokenParams.toString(),
      {
        headers: {
          "Accept": "application/json; charset=utf-8",
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    ),
    sc = axios.create(
    {
      baseURL: "https://api.soundcloud.com",
      headers: {
       "Accept": "application/json",
       "Authorization": `OAuth ${access_token}`
      }
    }),
  {data} = await sc.get("/users/968314498/tracks");
  console.log(data[0]);
}
catch (err) {
  console.log("Uh oh!", err);
}