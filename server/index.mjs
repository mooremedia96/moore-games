import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import {
    ipKeyGenerator,
    rateLimit,
} from "express-rate-limit";

import { getDashboard } from "./routes/dashboard.mjs";
import { submitContact } from "./routes/contact.mjs";

import {
    exchangeYouTubeAuthorizationCode,
    getYouTubeAuthorizationUrl,
} from "./services/youtube.mjs";

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const API_HOST =
    process.env.API_HOST || "127.0.0.1";

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:4173",
    "https://mooremedia96.github.io",
];

const localHostnames = new Set([
    "localhost",
    "127.0.0.1",
    "::1",
    "[::1]",
]);

function rateLimitKey(request) {
    const cloudflareIp =
        request.get("cf-connecting-ip");

    return ipKeyGenerator(
        cloudflareIp || request.ip
    );
}

function requireLocalRequest(
    request,
    response,
    next
) {
    const hostname =
        request.hostname?.toLowerCase() || "";

    if (!localHostnames.has(hostname)) {
        return response.status(404).json({
            error: "Route not found.",
        });
    }

    return next();
}

const apiRateLimiter = rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: rateLimitKey,
    message: {
        error:
            "Too many requests. Please try again shortly.",
    },
});

const authorizationRateLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: rateLimitKey,
    message: {
        error:
            "Too many authorization attempts. Please try again later.",
    },
});

const contactRateLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: rateLimitKey,
    message: {
        error:
            "Too many contact attempts. Please try again later.",
    },
});

app.disable("x-powered-by");
app.use(helmet());
app.use(
    express.json({
        limit: "12kb",
        type: "application/json",
    })
);

app.use(
    cors({
        origin(origin, callback) {
            // Allow server-to-server requests and approved browser origins
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            console.warn(`Blocked CORS origin: ${origin}`);
            return callback(new Error("Not allowed by CORS"));
        },
        methods: ["GET", "POST", "OPTIONS"],
        credentials: false,
        maxAge: 86_400,
    })
);

app.use("/api", apiRateLimiter);
app.use(
    "/auth",
    requireLocalRequest,
    authorizationRateLimiter
);

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

        response
            .status(500)
            .send(
                "YouTube authorization is not available."
            );
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
                        "Google authorization was cancelled or denied."
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
            console.log("YouTube authorization successful.");

            if (tokens.refresh_token) {
                console.log(
                    "A new refresh token was received. Update your .env if you intend to replace the existing token."
                );
            } else {
                console.log(
                    "Authorization completed using the existing refresh token."
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
                    <p>Authorization is complete.</p>
                    <p>You may close this browser tab.</p>
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

app.post(
    "/api/contact",
    contactRateLimiter,
    submitContact
);

app.use((request, response) => {
    response.status(404).json({
        error: "Route not found.",
    });
});

app.use((error, request, response, next) => {
    if (error?.message === "Not allowed by CORS") {
        return response.status(403).json({
            error: "Origin not allowed.",
        });
    }

    if (error?.type === "entity.too.large") {
        return response.status(413).json({
            error: "Request body is too large.",
        });
    }

    if (
        error instanceof SyntaxError &&
        error?.status === 400 &&
        "body" in error
    ) {
        return response.status(400).json({
            error: "Invalid JSON request.",
        });
    }

    console.error("Unhandled API error:", error);

    return response.status(500).json({
        error: "Internal server error.",
    });
});

app.listen(PORT, API_HOST, () => {
    console.log(
        `Moore Games API running at http://${API_HOST}:${PORT}`
    );
});
