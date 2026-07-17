import { google } from "googleapis";

const {
    YOUTUBE_API_KEY,
    YOUTUBE_CHANNEL_ID = "UCMU9AQML1qV7Y1RJpc5lR9Q",
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI =
    "http://localhost:3001/auth/youtube/callback",
    YOUTUBE_REFRESH_TOKEN,
} = process.env;

const YOUTUBE_CHANNEL_URL =
    "https://www.youtube.com/@mooregames96";

const youtubeOAuth = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
);

if (YOUTUBE_REFRESH_TOKEN) {
    youtubeOAuth.setCredentials({
        refresh_token: YOUTUBE_REFRESH_TOKEN,
    });
}

export function getYouTubeAuthorizationUrl() {
    if (
        !GOOGLE_CLIENT_ID ||
        !GOOGLE_CLIENT_SECRET ||
        !GOOGLE_REDIRECT_URI
    ) {
        throw new Error(
            "Google OAuth credentials are missing from .env."
        );
    }

    return youtubeOAuth.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: true,
        scope: [
            "https://www.googleapis.com/auth/youtube.readonly",
        ],
    });
}

export async function exchangeYouTubeAuthorizationCode(code) {
    const { tokens } = await youtubeOAuth.getToken(code);

    youtubeOAuth.setCredentials(tokens);

    return tokens;
}

export function getDefaultYouTubeLiveStatus() {
    return {
        live: false,
        platform: "youtube",
        title: "",
        videoId: "",
        startedAt: "",
        viewers: 0,
        thumbnail: "",
        url: YOUTUBE_CHANNEL_URL,
    };
}

export async function getYouTubeLiveStatus() {
    const fallback = getDefaultYouTubeLiveStatus();

    if (
        !GOOGLE_CLIENT_ID ||
        !GOOGLE_CLIENT_SECRET ||
        !YOUTUBE_REFRESH_TOKEN
    ) {
        return fallback;
    }

    try {
        youtubeOAuth.setCredentials({
            refresh_token: YOUTUBE_REFRESH_TOKEN,
        });

        const youtube = google.youtube({
            version: "v3",
            auth: youtubeOAuth,
        });

        const broadcastResponse =
            await youtube.liveBroadcasts.list({
                part: ["id", "snippet", "status"],
                mine: true,
                broadcastType: "all",
                maxResults: 50,
            });

        const broadcast =
            broadcastResponse.data.items?.find(
                (item) =>
                    item.status?.lifeCycleStatus === "live"
            );

        if (!broadcast?.id) {
            return fallback;
        }

        const videoId = broadcast.id;

        const videoResponse = await youtube.videos.list({
            part: ["snippet", "liveStreamingDetails"],
            id: [videoId],
        });

        const video = videoResponse.data.items?.[0];
        const thumbnails =
            video?.snippet?.thumbnails ??
            broadcast.snippet?.thumbnails ??
            {};

        return {
            live: true,
            platform: "youtube",
            title:
                video?.snippet?.title ??
                broadcast.snippet?.title ??
                "Moore Games is live on YouTube",
            videoId,
            startedAt:
                video?.liveStreamingDetails?.actualStartTime ??
                broadcast.snippet?.actualStartTime ??
                "",
            viewers: Number(
                video?.liveStreamingDetails?.concurrentViewers ??
                0
            ),
            thumbnail:
                thumbnails.standard?.url ??
                thumbnails.high?.url ??
                thumbnails.medium?.url ??
                thumbnails.default?.url ??
                `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${videoId}`,
        };
    } catch (error) {
        console.error(
            "Authenticated YouTube live check failed:",
            error.response?.data ?? error
        );

        return fallback;
    }
}

export async function getLatestYouTubeVideo() {
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
        channelData.items?.[0]
            ?.contentDetails
            ?.relatedPlaylists
            ?.uploads;

    if (!uploadsPlaylistId) {
        return null;
    }

    const playlistParameters = new URLSearchParams({
        part: "snippet,contentDetails",
        playlistId: uploadsPlaylistId,
        maxResults: "10",
        key: YOUTUBE_API_KEY,
    });

    const playlistResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?${playlistParameters}`
    );

    if (!playlistResponse.ok) {
        throw new Error(
            `YouTube uploads request failed: ${playlistResponse.status}`
        );
    }

    const playlistData = await playlistResponse.json();
    const playlistItems = playlistData.items ?? [];

    const videoIds = playlistItems
        .map(
            (item) =>
                item.contentDetails?.videoId ??
                item.snippet?.resourceId?.videoId
        )
        .filter(Boolean);

    if (videoIds.length === 0) {
        return null;
    }

    const videoParameters = new URLSearchParams({
        part: "snippet,status,liveStreamingDetails",
        id: videoIds.join(","),
        key: YOUTUBE_API_KEY,
    });

    const videoResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?${videoParameters}`
    );

    if (!videoResponse.ok) {
        throw new Error(
            `YouTube video-details request failed: ${videoResponse.status}`
        );
    }

    const videoData = await videoResponse.json();
    const videos = videoData.items ?? [];

    const latestRegularVideo = videoIds
        .map((videoId) =>
            videos.find((video) => video.id === videoId)
        )
        .find((video) => {
            if (!video) {
                return false;
            }

            const wasLivestream = Boolean(
                video.liveStreamingDetails?.actualStartTime
            );

            const isLiveOrUpcoming =
                video.snippet?.liveBroadcastContent === "live" ||
                video.snippet?.liveBroadcastContent ===
                "upcoming";

            const isPublic =
                video.status?.privacyStatus === "public";

            return (
                !wasLivestream &&
                !isLiveOrUpcoming &&
                isPublic
            );
        });

    if (!latestRegularVideo) {
        return null;
    }

    const videoId = latestRegularVideo.id;
    const thumbnails =
        latestRegularVideo.snippet?.thumbnails ?? {};

    return {
        videoId,
        platform: "youtube",
        title:
            latestRegularVideo.snippet?.title ??
            "Latest Moore Games video",
        publishedAt:
            latestRegularVideo.snippet?.publishedAt ?? "",
        thumbnail:
            thumbnails.standard?.url ??
            thumbnails.high?.url ??
            thumbnails.medium?.url ??
            thumbnails.default?.url ??
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${videoId}`,
    };
}