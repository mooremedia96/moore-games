import "dotenv/config";
import express from "express";

const app = express();
const PORT = 3001;

const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@mooregames96";

const {
    YOUTUBE_API_KEY,
    YOUTUBE_CHANNEL_ID = "UCMU9AQML1qV7Y1RJpc5lR9Q",
    TWITCH_CLIENT_ID,
    TWITCH_CLIENT_SECRET,
    TWITCH_USERNAME = "mooregames96",
} = process.env;

let twitchToken = null;
let twitchTokenExpiresAt = 0;

function getDefaultTwitchStatus() {
    return {
        live: false,
        platform: "twitch",
        title: "",
        game: "",
        viewers: 0,
        thumbnail: "",
        url: `https://www.twitch.tv/${TWITCH_USERNAME}`,
    };
}

function getDefaultYouTubeLiveStatus() {
    return {
        live: false,
        platform: "youtube",
        title: "",
        videoId: "",
        thumbnail: "",
        url: YOUTUBE_CHANNEL_URL,
    };
}

async function getTwitchToken() {
    console.log("Twitch token loaded successfully");
    const now = Date.now();

    if (twitchToken && now < twitchTokenExpiresAt) {
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
        Date.now() + Math.max(data.expires_in - 300, 60) * 1000;

    return twitchToken;
}

async function getTwitchStatus() {
    const defaultResult = getDefaultTwitchStatus();
    const token = await getTwitchToken();

    if (!token || !TWITCH_CLIENT_ID) {
        return defaultResult;
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
            `Twitch streams request failed: ${response.status}`
        );
    }

    const data = await response.json();
    const stream = data.data?.[0];

    if (!stream) {
        return defaultResult;
    }

    return {
        live: true,
        platform: "twitch",
        title: stream.title || "Moore Games is live on Twitch",
        game: stream.game_name || "",
        viewers: stream.viewer_count || 0,
        thumbnail: stream.thumbnail_url
            ?.replace("{width}", "640")
            .replace("{height}", "360"),
        url: `https://www.twitch.tv/${TWITCH_USERNAME}`,
    };
}

async function getYouTubeLiveStatus() {
    const defaultResult = getDefaultYouTubeLiveStatus();

    if (!YOUTUBE_API_KEY) {
        return defaultResult;
    }

    const parameters = new URLSearchParams({
        part: "snippet",
        channelId: YOUTUBE_CHANNEL_ID,
        eventType: "live",
        type: "video",
        maxResults: "1",
        key: YOUTUBE_API_KEY,
    });

    const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?${parameters}`
    );

    if (!response.ok) {
        throw new Error(
            `YouTube live request failed: ${response.status}`
        );
    }

    const data = await response.json();
    const item = data.items?.[0];
    const videoId = item?.id?.videoId;

    if (!videoId) {
        return defaultResult;
    }

    const thumbnails = item.snippet?.thumbnails ?? {};

    return {
        live: true,
        platform: "youtube",
        title: item.snippet?.title || "Moore Games is live on YouTube",
        videoId,
        thumbnail:
            thumbnails.maxres?.url ??
            thumbnails.standard?.url ??
            thumbnails.high?.url ??
            thumbnails.medium?.url ??
            thumbnails.default?.url ??
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${videoId}`,
    };
}

async function getLatestYouTubeVideo() {
    if (!YOUTUBE_API_KEY) {
        return null;
    }

    const channelParameters = new URLSearchParams({
        part: "contentDetails",
        id: YOUTUBE_CHANNEL_ID,
        key: YOUTUBE_API_KEY,
    });

    const channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?${channelParameters}`
    );

    if (!channelResponse.ok) {
        throw new Error(
            `YouTube channel request failed: ${channelResponse.status}`
        );
    }

    const channelData = await channelResponse.json();

    const uploadsPlaylistId =
        channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
        return null;
    }

    const playlistParameters = new URLSearchParams({
        part: "snippet,contentDetails",
        playlistId: uploadsPlaylistId,
        maxResults: "1",
        key: YOUTUBE_API_KEY,
    });

    const playlistResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?${playlistParameters}`
    );

    if (!playlistResponse.ok) {
        throw new Error(
            `YouTube playlist request failed: ${playlistResponse.status}`
        );
    }

    const playlistData = await playlistResponse.json();
    const item = playlistData.items?.[0];

    if (!item) {
        return null;
    }

    const videoId =
        item.contentDetails?.videoId ??
        item.snippet?.resourceId?.videoId;

    if (!videoId) {
        return null;
    }

    const thumbnails = item.snippet?.thumbnails ?? {};

    return {
        videoId,
        platform: "youtube",
        title: item.snippet?.title || "Latest Moore Games video",
        publishedAt:
            item.contentDetails?.videoPublishedAt ??
            item.snippet?.publishedAt ??
            "",
        thumbnail:
            thumbnails.maxres?.url ??
            thumbnails.standard?.url ??
            thumbnails.high?.url ??
            thumbnails.medium?.url ??
            thumbnails.default?.url ??
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${videoId}`,
    };
}

app.get("/api/dashboard", async (request, response) => {
    try {
        const [
            twitchResult,
            youtubeLiveResult,
            latestVideoResult,
        ] = await Promise.allSettled([
            getTwitchStatus(),
            getYouTubeLiveStatus(),
            getLatestYouTubeVideo(),
        ]);

        const twitch =
            twitchResult.status === "fulfilled"
                ? twitchResult.value
                : getDefaultTwitchStatus();

        const youtubeLive =
            youtubeLiveResult.status === "fulfilled"
                ? youtubeLiveResult.value
                : getDefaultYouTubeLiveStatus();

        const latestVideo =
            latestVideoResult.status === "fulfilled"
                ? latestVideoResult.value
                : null;

        let featuredContent = null;

        if (twitch.live) {
            featuredContent = {
                type: "live",
                platform: "twitch",
                title: twitch.title,
                subtitle: twitch.game
                    ? `Playing ${twitch.game}`
                    : "Watch the live stream",
                thumbnail: twitch.thumbnail,
                url: twitch.url,
                viewers: twitch.viewers,
            };
        } else if (youtubeLive.live) {
            featuredContent = {
                type: "live",
                platform: "youtube",
                title: youtubeLive.title,
                subtitle: "Watch the live stream",
                thumbnail: youtubeLive.thumbnail,
                url: youtubeLive.url,
                viewers: null,
            };
        } else if (latestVideo) {
            featuredContent = {
                type: "video",
                platform: "youtube",
                title: latestVideo.title,
                subtitle: "Latest Moore Games video",
                thumbnail: latestVideo.thumbnail,
                url: latestVideo.url,
                publishedAt: latestVideo.publishedAt,
                videoId: latestVideo.videoId,
            };
        } else {
            featuredContent = {
                type: "video",
                platform: "youtube",
                title: "Watch Moore Games on YouTube",
                subtitle: "Gameplay, playthroughs, and more",
                thumbnail: "/banner.jpeg",
                url: YOUTUBE_CHANNEL_URL,
            };
        }

        if (twitchResult.status === "rejected") {
            console.error("Twitch error:", twitchResult.reason);
        }

        if (youtubeLiveResult.status === "rejected") {
            console.error(
                "YouTube live error:",
                youtubeLiveResult.reason
            );
        }

        if (latestVideoResult.status === "rejected") {
            console.error(
                "Latest YouTube video error:",
                latestVideoResult.reason
            );
        }

        response.set(
            "Cache-Control",
            "public, max-age=30, stale-while-revalidate=30"
        );

        response.json({
            featuredContent,
            twitch,
            youtubeLive,
            latestVideo,
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Dashboard error:", error);

        response.status(500).json({
            error: "Unable to load dashboard information.",
        });
    }
});

app.listen(PORT, () => {
    console.log(
        `Moore Games API running at http://localhost:${PORT}`
    );
});