import {
    getDefaultTwitchStatus,
    getTwitchStatus,
} from "../services/twitch.mjs";

import {
    getDefaultYouTubeLiveStatus,
    getLatestYouTubeVideo,
    getYouTubeLiveStatus,
} from "../services/youtube.mjs";

const CACHE_DURATION = 45_000;

let dashboardCache = null;
let dashboardCacheTime = 0;
let dashboardRequestPromise = null;

async function buildDashboard() {
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

    if (twitchResult.status === "rejected") {
        console.error(
            "Twitch status error:",
            twitchResult.reason
        );
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

    let featuredContent;

    if (twitch.live) {
        featuredContent = {
            type: "live",
            platform: "twitch",
            title: twitch.title,
            subtitle: twitch.game
                ? `Playing ${twitch.game}`
                : "Streaming live on Twitch",
            game: twitch.game,
            viewers: twitch.viewers,
            startedAt: twitch.startedAt,
            thumbnail: twitch.thumbnail,
            url: twitch.url,
        };
    } else if (youtubeLive.live) {
        featuredContent = {
            type: "live",
            platform: "youtube",
            title: youtubeLive.title,
            subtitle: "Streaming live on YouTube",
            viewers: youtubeLive.viewers,
            startedAt: youtubeLive.startedAt,
            thumbnail: youtubeLive.thumbnail,
            url: youtubeLive.url,
            videoId: youtubeLive.videoId,
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
            thumbnail:
                "https://mooremedia96.github.io/moore-games/banner.webp",
            url: "https://www.youtube.com/@mooregames96",
        };
    }

    return {
        featuredContent,
        twitch,
        youtubeLive,
        latestVideo,
        updatedAt: new Date().toISOString(),
    };
}

export async function getDashboard() {
    const now = Date.now();

    const cacheIsFresh =
        dashboardCache &&
        now - dashboardCacheTime < CACHE_DURATION;

    if (cacheIsFresh) {
        return dashboardCache;
    }

    if (dashboardRequestPromise) {
        return dashboardRequestPromise;
    }

    dashboardRequestPromise = buildDashboard()
        .then((dashboard) => {
            dashboardCache = dashboard;
            dashboardCacheTime = Date.now();

            return dashboard;
        })
        .finally(() => {
            dashboardRequestPromise = null;
        });

    return dashboardRequestPromise;
}