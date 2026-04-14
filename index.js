export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- 1. IDENTITY ENDPOINTS (Login & Token) ---
    if (url.pathname.startsWith("/api/identity")) {
      // Handle the /token request Decap sends when you click "Login"
      if (url.pathname.endsWith("/token")) {
        return new Response(JSON.stringify({
          access_token: "fake-token-for-client-side-only",
          token_type: "bearer"
        }), {
          headers: { 
            "content-type": "application/json",
            "Access-Control-Allow-Origin": "*" 
          },
        });
      }

      // General identity info
      return new Response(JSON.stringify({ url: "", token: "" }), {
        headers: { 
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
      });
    }

    // --- 2. GATEWAY PROXY (The Bridge) ---
    if (url.pathname.startsWith("/api/gateway")) {
      const path = url.pathname.replace("/api/gateway", "");
      const githubUrl = `https://api.github.com/repos/quantumclubgcek/quantumclubgceksite/contents${path}`;

      const headers = new Headers(request.headers);
      headers.set("Authorization", `token ${env.GITHUB_TOKEN}`);
      headers.set("User-Agent", "Quantum-Club-CMS-Bridge");
      headers.set("Accept", "application/vnd.github.v3+json");

      const githubResponse = await fetch(githubUrl, {
        method: request.method,
        headers: headers,
        body: request.method !== "GET" && request.method !== "HEAD" ? await request.blob() : null,
      });

      const responseHeaders = new Headers(githubResponse.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      
      return new Response(githubResponse.body, {
        status: githubResponse.status,
        headers: responseHeaders,
      });
    }

    // --- 3. SERVE STATIC ASSETS ---
    return await env.ASSETS.fetch(request);
  },
};
