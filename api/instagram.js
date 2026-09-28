export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");

  if(req.method==="OPTIONS"){
    return res.status(204).end();
  }

  if(req.method!=="GET"){
    return res.status(405).json({error:"Method not allowed"});
  }

  const token=process.env.INSTAGRAM_ACCESS_TOKEN;

  if(!token){
    return res.status(503).json({
      error:"Instagram API is not configured"
    });
  }

  const fields=[
    "id",
    "caption",
    "media_type",
    "media_url",
    "thumbnail_url",
    "permalink",
    "timestamp"
  ].join(",");

  const url=new URL("https://graph.instagram.com/me/media");
  url.searchParams.set("fields",fields);
  url.searchParams.set("limit","6");
  url.searchParams.set("access_token",token);

  try{
    const response=await fetch(url,{
      headers:{Accept:"application/json"}
    });

    const payload=await response.json();

    if(!response.ok){
      console.error("Instagram API error",payload);
      return res.status(response.status).json({
        error:"Instagram API request failed"
      });
    }

    const data=(payload.data || []).map(item=>({
      id:item.id,
      caption:item.caption || "",
      media_type:item.media_type || "",
      media_url:item.media_url || "",
      thumbnail_url:item.thumbnail_url || "",
      permalink:item.permalink || "",
      timestamp:item.timestamp || ""
    }));

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=3600"
    );

    return res.status(200).json({data});
  }catch(error){
    console.error("Instagram feed error",error);
    return res.status(500).json({
      error:"Instagram feed unavailable"
    });
  }
}
