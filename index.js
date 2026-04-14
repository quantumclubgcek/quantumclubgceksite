export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- 1. IDENTITY ENDPOINT ---
    // This tells Decap CMS that the user is authenticated via your custom gateway.
    if (url.pathname === "/api/identity") {
      return new Response(JSON.stringify({ url: "", token: "" }), {
        headers: { "content-type": "application/json" },
      });
    }

    // --- 2. GATEWAY PROXY (The Bridge) ---
    // This catches Decap's requests to read/write files and redirects them to GitHub 
    // using your administrative GITHUB_TOKEN.
    if (url.pathname.startsWith("/api/gateway")) {
      const path = url.pathname.replace("/api/gateway", "");
      const githubUrl = `https://api.github.com/repos/quantumclubgcek/quantumclubgceksite/contents${path}`;

      // Clone headers to avoid read-only restrictions
      const headers = new Headers(request.headers);
      
      // CRITICAL: We overwrite the user's header with your Admin PAT
      headers.set("Authorization", `token ${env.GITHUB_TOKEN}`);
      headers.set("User-Agent", "Quantum-Club-CMS-Bridge");
      headers.set("Accept", "application/vnd.github.v3+json");

      // Forward the request (GET, PUT, or DELETE) to GitHub
      const githubResponse = await fetch(githubUrl, {
        method: request.method,
        headers: headers,
        body: request.method !== "GET" && request.method !== "HEAD" ? await request.blob() : null,
      });

      // Return the GitHub response back to Decap CMS
      const responseHeaders = new Headers(githubResponse.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      
      return new Response(githubResponse.body, {
        status: githubResponse.status,
        headers: responseHeaders,
      });
    }

    // --- 3. SERVE STATIC ASSETS ---
    // Serves your website, admin panel, and login pages.
    return await env.ASSETS.fetch(request);
  },
};
