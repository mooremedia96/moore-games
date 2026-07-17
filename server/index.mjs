import "dotenv/config";
import express from "express";

import { getDashboard } from "./routes/dashboard.mjs";

import {
    exchangeYouTubeAuthorizationCode,
    getYouTubeAuthorizationUrl,
} from "./services/youtube.mjs";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json());

app.get("/api/health", (request, response) => {
    response.json({
        status: "ok",
        service: "Moore Games API",
        updatedAt: new Date().toISOString(),
    });
});

app.get("/auth/youtube", (request, response) => {
    try {
        const authorizationUrl =
            getYouTubeAuthorizationUrl();

        response.redirect(authorizationUrl);
    } catch (error) {
        console.error(
            "YouTube authorization error:",
            error
        );

        response.status(500).send(error.message);
    }
});

app.get(
    "/auth/youtube/callback",
    async (request, response) => {
        try {
            if (request.query.error) {
                return response
                    .status(400)
                    .send(
                        `Google authorization failed: ${request.query.error}`
                    );
            }

            const code = request.query.code;

            if (!code) {
                return response
                    .status(400)
                    .send(
                        "Google did not return an authorization code."
                    );
            }

            const tokens =
                await exchangeYouTubeAuthorizationCode(
                    code
                );

            console.log(
                "\nYouTube authorization successful."
            );

            if (tokens.refresh_token) {
                console.log(
                    "\nAdd this line to your .env file:\n"
                );

                console.log(
                    `YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`
                );

                console.log(
                    "\nThen restart the API.\n"
                );
            } else {
                console.log(
                    "Google did not return a new refresh token."
                );
            }

            response.send(`
                <main style="
                    max-width: 640px;
                    margin: 80px auto;
                    padding: 30px;
                    font-family: Arial, sans-serif;
                    text-align: center;
                ">
                    <h1>YouTube authorization successful</h1>
                    <p>Return to the terminal and copy the refresh token into your .env file.</p>
                    <p>You may close this browser tab afterward.</p>
                </main>
            `);
        } catch (error) {
            console.error(
                "YouTube callback error:",
                error.response?.data ?? error
            );

            response
                .status(500)
                .send("YouTube authorization failed.");
        }
    }
);

app.get("/api/dashboard", async (request, response) => {
    try {
        const dashboard = await getDashboard();

        response.set({
            "Cache-Control":
                "no-store, no-cache, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
        });

        response.json(dashboard);
    } catch (error) {
        console.error("Dashboard error:", error);

        response.status(500).json({
            error:
                "Unable to load dashboard information.",
        });
    }
});

app.use((request, response) => {
    response.status(404).json({
        error: "Route not found.",
    });
});

app.listen(PORT, () => {
    console.log(
        `Moore Games API running at http://localhost:${PORT}`
    );
});