export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- 1. DECAP CMS GITHUB OAUTH ROUTES ---

    // Redirect to GitHub Login
    if (url.pathname === "/api/auth") {
      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&scope=repo,user`;
      return Response.redirect(githubAuthUrl, 302);
    }

    // Handle the Callback from GitHub
    if (url.pathname === "/api/auth/callback") {
      const code = url.searchParams.get("code");
      
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

      const result = await response.json();

      // This script sends the token back to the Decap CMS admin window
      const script = `
        <script>
          const receiveMessage = (e) => {
            if (e.data === "authorizing:github") {
              window.opener.postMessage(
                'authorization:github:success:${JSON.stringify({
                  token: result.access_token,
                  provider: "github",
                })}',
                e.origin
              );
            }
          };
          window.addEventListener("message", receiveMessage, false);
          window.opener.postMessage("authorizing:github", "*");
        </script>
      `;

      return new Response(script, { headers: { "content-type": "text/html" } });
    }

    // --- 2. SERVE STATIC ASSETS ---
    
    // If the URL isn't an API route, serve your HTML files (index, login, etc.)
    return await env.ASSETS.fetch(request);
  },
};
