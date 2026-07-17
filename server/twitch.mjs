const {
    TWITCH_CLIENT_ID,
    TWITCH_CLIENT_SECRET,
    TWITCH_USERNAME = "mooregames96",
} = process.env;

let twitchToken = null;
let twitchTokenExpiresAt = 0;

export function getDefaultTwitchStatus() {
    return {
        live: false,
        platform: "twitch",
        title: "",
        game: "",
        viewers: 0,
        startedAt: "",
        thumbnail: "",
        url: `https://www.twitch.tv/${TWITCH_USERNAME}`,
    };
}

async function getTwitchToken() {
    if (
        twitchToken &&
        Date.now() < twitchTokenExpiresAt
    ) {
        return twitchToken;
    }

    if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
        return null;
    }

    const parameters = new URLSearchParams({
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_CLIENT_SECRET,
        grant_type: "client_credentials",
    });

    const response = await fetch(
        `https://id.twitch.tv/oauth2/token?${parameters}`,
        {
            method: "POST",
        }
    );

    if (!response.ok) {
        throw new Error(
            `Twitch token request failed: ${response.status}`
        );
    }

    const data = await response.json();

    twitchToken = data.access_token;

    twitchTokenExpiresAt =
        Date.now() +
        Math.max(data.expires_in - 300, 60) * 1000;

    return twitchToken;
}

export async function getTwitchStatus() {
    const fallback = getDefaultTwitchStatus();
    const token = await getTwitchToken();

    if (!token || !TWITCH_CLIENT_ID) {
        return fallback;
    }

    const parameters = new URLSearchParams({
        user_login: TWITCH_USERNAME,
    });

    const response = await fetch(
        `https://api.twitch.tv/helix/streams?${parameters}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Client-Id": TWITCH_CLIENT_ID,
            },
        }
    );

    if (!response.ok) {
        throw new Error(
            `Twitch stream request failed: ${response.status}`
        );
    }

    const data = await response.json();
    const stream = data.data?.[0];

    if (!stream) {
        return fallback;
    }

    return {
        live: true,
        platform: "twitch",
        title:
            stream.title ??
            "Moore Games is live on Twitch",
        game: stream.game_name ?? "",
        viewers: stream.viewer_count ?? 0,
        startedAt: stream.started_at ?? "",
        thumbnail:
            stream.thumbnail_url
                ?.replace("{width}", "640")
                .replace("{height}", "360") ?? "",
        url: `https://www.twitch.tv/${TWITCH_USERNAME}`,
    };
}