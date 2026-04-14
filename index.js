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

    // 1. IDENTITY ROUTE (Admin-Only Check)
    if (url.pathname.startsWith("/api/identity")) {
      const ADMIN_EMAIL = "member@quantum.club"; // <-- CHANGE THIS TO YOUR EMAIL
      let attemptedEmail = "";

      if (request.method === "POST") {
        try {
          const body = await request.clone().json();
          attemptedEmail = body.email;
        } catch (e) {}
      }

      // STRICT CHECK: If the email doesn't match the admin email, reject the request
      if (attemptedEmail !== ADMIN_EMAIL) {
        return new Response(JSON.stringify({ error: "Unauthorized: Admin access only." }), {
          status: 401,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // If it matches, create the session object with mandatory metadata
      const userObj = {
        id: btoa(ADMIN_EMAIL).substring(0, 12),
        email: ADMIN_EMAIL,
        app_metadata: { roles: ["admin"] },
        user_metadata: { 
          full_name: "Admin User", 
          avatar_url: "" 
        }
      };

      const tokenPayload = {
        sub: userObj.id,
        email: userObj.email,
        app_metadata: userObj.app_metadata,
        user_metadata: userObj.user_metadata,
        iat: Math.floor(Date.now() / 1000)
      };

      const encodedPayload = btoa(JSON.stringify(tokenPayload)).replace(/=/g, "");
      const finalJWT = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${encodedPayload}.signature`;

      return new Response(JSON.stringify({
        token: finalJWT,
        access_token: finalJWT,
        token_type: "bearer",
        user: userObj
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // 2. GATEWAY ROUTE (GitHub Bridge)
    if (url.pathname.startsWith("/api/gateway")) {
      const path = url.pathname.replace("/api/gateway", "");

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
        return new Response("Bridge Error", { status: 500 });
      }
    }

    // 3. FALLBACK: ASSETS
    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      return new Response("Not Found", { status: 404 });
    }
  }
};
