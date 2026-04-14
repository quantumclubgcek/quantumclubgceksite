export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 0. HANDLE CORS PREFLIGHT
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, x-requested-with",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

// 1. IDENTITY ENDPOINTS
    if (url.pathname.startsWith("/api/identity")) {
      // In a real Firebase setup, Decap sends the token in the headers
      const authHeader = request.headers.get("Authorization");
      
      // We extract the user info (or use a placeholder if testing)
      const userEmail = "member@quantumclubgcek.com"; 

      // We generate a JWT that includes the "admin" role so they can all edit
      const userJWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiI" + btoa(userEmail) + "IiwiYXBwX21ldGFkYXRhIjp7InJvbGVzIjpbImFkbWluIl19fQ.signature";
      
      return new Response(JSON.stringify({
        url: "",
        token: userJWT,
        access_token: userJWT,
        token_type: "bearer",
        user: {
          email: userEmail,
          app_metadata: { roles: ["admin"] }, 
          user_metadata: { full_name: "Club Member" }
        }
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // 2. GATEWAY PROXY
    if (url.pathname.startsWith("/api/gateway")) {
      const path = url.pathname.replace("/api/gateway", "");

      if (path === "/settings" || path === "/settings/") {
        return new Response(JSON.stringify({ roles: ["admin"], github_enabled: true }), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }

      const githubUrl = `https://api.github.com/repos/quantumclubgcek/quantumclubgceksite/contents${path}`;
      const headers = new Headers();
      headers.set("Authorization", `token ${env.GITHUB_TOKEN}`);
      headers.set("User-Agent", "Quantum-Club-CMS-Bridge");
      headers.set("Accept", "application/vnd.github.v3+json");

      try {
        const githubResponse = await fetch(githubUrl, {
          method: request.method,
          headers: headers,
          body: (request.method !== "GET" && request.method !== "HEAD") ? await request.blob() : null,
        });

        const responseHeaders = new Headers(githubResponse.headers);
        responseHeaders.set("Access-Control-Allow-Origin", "*");

        return new Response(githubResponse.body, {
          status: githubResponse.status,
          headers: responseHeaders,
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Bridge failed" }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    // 3. SERVE STATIC ASSETS
    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      return new Response("Not Found", { status: 404 });
    }
  } // Closes fetch
}; // Closes export
