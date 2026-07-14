import { getSession } from "@/lib/sessionOptions";
import { createClient } from "@/utils/supabase/server";

function buildLogoutCleanupHtml(loginPath = "/login") {
  const safeLoginPath = JSON.stringify(loginPath);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <meta http-equiv="refresh" content="1; url=${loginPath}" />
    <title>Logging out - WhereKeep</title>
  </head>
  <body>
    <script>
      (function () {
        try {
          window.localStorage.clear();
        } catch (error) {}

        try {
          window.sessionStorage.clear();
        } catch (error) {}

        window.location.replace(${safeLoginPath});
      })();
    </script>
  </body>
</html>`;
}

export async function GET() {
  try {
    const session = await getSession();
    session.destroy();

    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("Logout route error:", err);
  }

  return new Response(buildLogoutCleanupHtml("/login"), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
