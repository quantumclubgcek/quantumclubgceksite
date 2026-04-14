export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. OAUTH INITIATION (Redirects the user to GitHub to log in)
    if (url.pathname === "/api/auth") {
      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&scope=repo,user`;
      return Response.redirect(githubAuthUrl, 302);
    }

    // 2. OAUTH CALLBACK (Handles the return from GitHub with the auth code)
    // Matches the /api/auth/callback path seen in your 404 error
    if (url.pathname === "/api/auth/callback" || url.pathname === "/api/callback") {
      const code = url.searchParams.get("code");
      
      if (!code) {
        return new Response("No code found", { status: 400 });
      }

      // Exchange the code for a GitHub Access Token
      const response = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept": "application/json",
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const data = await response.json();

      if (data.error) {
        return new Response(JSON.stringify(data), { status: 401 });
      }
      
      // This script passes the token back to the Decap CMS window
      const script = `
        <script>
          const receiveMessage = (message) => {
            window.opener.postMessage(
              'authorization:github:success:${JSON.stringify({
                token: data.access_token,
                provider: "github",
              })}',
              message.origin
            );
            window.removeEventListener("message", receiveMessage, false);
          }
          window.addEventListener("message", receiveMessage, false);
          window.opener.postMessage("authorizing:github", "*");
        </script>
      `;

      return new Response(script, { 
        headers: { "Content-Type": "text/html" } 
      });
    }

    // 3. FALLBACK: SERVE SITE ASSETS (Serves your actual blog files)
    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      return new Response("Not Found", { status: 404 });
    }
  }
};
