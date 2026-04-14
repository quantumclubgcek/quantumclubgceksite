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

    // 1. DYNAMIC IDENTITY ROUTE
    if (url.pathname.startsWith("/api/identity")) {
      let userEmail = "club-member@quantum.club"; // Fallback

      // Capture the email used during the Firebase login attempt
      if (request.method === "POST") {
        try {
          const body = await request.clone().json();
          if (body.email) userEmail = body.email;
        } catch (e) { /* use default */ }
      }

      // Create a payload that identifies the specific user
      const userPayload = {
        sub: btoa(userEmail).substring(0, 12), // Unique ID per user
        email: userEmail,
        app_metadata: { roles: ["admin"] },
        user_metadata: {} // Empty as requested, but present to prevent CMS errors
      };

      const encodedPayload = btoa(JSON.stringify(userPayload)).replace(/=/g, "");
      const finalJWT = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${encodedPayload}.signature`;

      return new Response(JSON.stringify({
        token: finalJWT,
        access_token: finalJWT,
        token_type: "bearer",
        user: userPayload
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // 2. GATEWAY ROUTE (The GitHub Bridge)
    if (url.pathname.startsWith("/api/gateway")) {
      const path = url.pathname.replace("/api/gateway", "");

      // Bypass the 404 settings error
      if (path === "/settings" || path === "/settings/") {
        return new Response(JSON.stringify({ roles: ["admin"], github_enabled: true }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
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
        return new Response("Bridge Connection Failed", { status: 500 });
      }
    }

    // 3. FALLBACK: SERVE ASSETS
    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      return new Response("Not Found", { status: 404 });
    }
  }
};
