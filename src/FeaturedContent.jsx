import { useEffect, useRef, useState } from "react";

const REFRESH_INTERVAL = 60_000;
const FALLBACK_IMAGE = `${import.meta.env.BASE_URL}banner.jpeg`;

const FALLBACK_CONTENT = {
    type: "video",
    platform: "youtube",
    title: "Watch Moore Games on YouTube",
    subtitle: "Gameplay, playthroughs, and more",
    thumbnail: `${import.meta.env.BASE_URL}banner.jpeg`,
    url: "https://www.youtube.com/@mooregames96",
    publishedAt: "",
    startedAt: "",
    viewers: 0,
    game: "",
};

function parseVideoTitle(title = "") {
    const normalizedTitle = title.trim();

    const partMatch = normalizedTitle.match(
        /(?:\||-|–|—)?\s*PART\s+([A-Z0-9]+)/i
    );

    if (!partMatch) {
        return {
            series: normalizedTitle,
            part: "",
        };
    }

    const partStart = partMatch.index ?? normalizedTitle.length;

    const series =
        normalizedTitle
            .slice(0, partStart)
            .replace(/[|–—-]\s*$/, "")
            .trim() || normalizedTitle;

    return {
        series,
        part: `Part ${partMatch[1]}`,
    };
}

function formatPublishedDate(value) {
    if (!value) {
        return "";
    }

    const publishedDate = new Date(value);

    if (Number.isNaN(publishedDate.getTime())) {
        return "";
    }

    const elapsedSeconds = Math.max(
        0,
        Math.floor((Date.now() - publishedDate.getTime()) / 1000)
    );

    if (elapsedSeconds < 60) {
        return "Uploaded moments ago";
    }

    const minutes = Math.floor(elapsedSeconds / 60);

    if (minutes < 60) {
        return `Uploaded ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `Uploaded ${hours} hour${hours === 1 ? "" : "s"} ago`;
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
        return `Uploaded ${days} day${days === 1 ? "" : "s"} ago`;
    }

    return `Uploaded ${new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(publishedDate)}`;
}

function formatUptime(value) {
    if (!value) {
        return "";
    }

    const startedAt = new Date(value);

    if (Number.isNaN(startedAt.getTime())) {
        return "";
    }

    const totalMinutes = Math.max(
        0,
        Math.floor((Date.now() - startedAt.getTime()) / 60_000)
    );

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
        return `Live for ${hours}h ${minutes}m`;
    }

    return `Live for ${minutes}m`;
}

function createContentSignature(content) {
    return JSON.stringify({
        type: content?.type || "",
        platform: content?.platform || "",
        title: content?.title || "",
        subtitle: content?.subtitle || "",
        thumbnail: content?.thumbnail || "",
        url: content?.url || "",
        game: content?.game || "",
        viewers: content?.viewers || 0,
        startedAt: content?.startedAt || "",
        publishedAt: content?.publishedAt || "",
        videoId: content?.videoId || "",
    });
}

function EyeIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="viewer-icon"
        >
            <path d="M12 5c-5.5 0-9.5 5.2-9.7 5.4a2.6 2.6 0 0 0 0 3.2C2.5 13.8 6.5 19 12 19s9.5-5.2 9.7-5.4a2.6 2.6 0 0 0 0-3.2C21.5 10.2 17.5 5 12 5Zm0 11.5A4.5 4.5 0 1 1 12 7a4.5 4.5 0 0 1 0 9.5Zm0-2.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" />
        </svg>
    );
}

function FeaturedContent() {
    const [content, setContent] = useState(FALLBACK_CONTENT);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [cardVisible, setCardVisible] = useState(true);

    const contentSignatureRef = useRef("");
    const transitionTimerRef = useRef(null);

    useEffect(() => {
        const controller = new AbortController();
        let isMounted = true;

        async function loadFeaturedContent() {
            try {
                const apiUrl = import.meta.env.PROD
                    ? import.meta.env.VITE_API_URL?.replace(/\/$/, "")
                    : "";

                const response = await fetch(`${apiUrl}/api/dashboard`, {
                    cache: "no-store",
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error(
                        `Dashboard request failed with status ${response.status}`
                    );
                }

                const data = await response.json();
                const nextContent = data.featuredContent;

                if (!isMounted || !nextContent) {
                    return;
                }

                const nextSignature = createContentSignature(nextContent);

                if (nextSignature !== contentSignatureRef.current) {
                    contentSignatureRef.current = nextSignature;
                    setContent(nextContent);
                }

                setError("");
            } catch (requestError) {
                if (requestError.name === "AbortError") {
                    return;
                }

                console.error(
                    "Unable to load featured content:",
                    requestError
                );

                if (isMounted) {
                    setError("Unable to refresh featured content.");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        loadFeaturedContent();

        const intervalId = window.setInterval(
            loadFeaturedContent,
            REFRESH_INTERVAL
        );

        return () => {
            isMounted = false;
            controller.abort();
            window.clearInterval(intervalId);
        };
    }, []);

    if (loading) {
        return (
            <section className="featured-content">
                <div className="featured-heading">
                    <span>FEATURED CONTENT</span>
                </div>

                <div className="featured-card featured-skeleton">
                    <div className="featured-skeleton-thumbnail" />

                    <div className="featured-skeleton-copy">
                        <span className="skeleton-line skeleton-small" />
                        <span className="skeleton-line skeleton-large" />
                        <span className="skeleton-line skeleton-medium" />
                        <span className="skeleton-line skeleton-button" />
                    </div>
                </div>
            </section>
        );
    }

    const isLive = content.type === "live";
    const isTwitch = content.platform === "twitch";

    const parsedVideo = parseVideoTitle(content.title);

    const heading = isLive
        ? isTwitch
            ? "LIVE ON TWITCH"
            : "LIVE ON YOUTUBE"
        : "LATEST VIDEO";

    const categoryLabel = isLive
        ? content.game ||
        (isTwitch ? "TWITCH STREAM" : "YOUTUBE LIVE")
        : "CURRENT PLAYTHROUGH";

    const primaryTitle =
        !isLive && parsedVideo.series
            ? parsedVideo.series
            : content.title;

    const secondaryTitle =
        !isLive && parsedVideo.part
            ? parsedVideo.part
            : "";

    const publishedText = !isLive
        ? formatPublishedDate(content.publishedAt)
        : "";

    const uptimeText = isLive
        ? formatUptime(content.startedAt)
        : "";

    const actionText = isLive
        ? isTwitch
            ? "Watch Live on Twitch"
            : "Join Live on YouTube"
        : "Watch on YouTube";

    const cardKey = [
        content.type,
        content.platform,
        content.url,
    ].join("-");

    return (
        <section
            className={[
                "featured-content",
                isLive ? "featured-live" : "featured-video",
                isTwitch ? "featured-twitch" : "featured-youtube",
                cardVisible ? "featured-visible" : "featured-hidden",
            ].join(" ")}
        >
            <div className="featured-heading">
                <span>{heading}</span>

                {isLive && (
                    <span className="featured-live-label">
                        <span className="featured-live-dot" />
                        Live
                    </span>
                )}
            </div>

            <a
                key={cardKey}
                className="featured-card"
                href={content.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`${actionText}: ${content.title}`}
            >
                <div className="featured-thumbnail">
                    <img
                        src={content.thumbnail || FALLBACK_CONTENT.thumbnail}
                        alt={content.title}
                        onError={(event) => {
                            const image = event.currentTarget;

                            image.onerror = null;
                            image.src = `${import.meta.env.BASE_URL}banner.jpeg`;
                        }}
                    />

                    <div className="featured-overlay" />

                    {isLive ? (
                        <div className="featured-live-center">
                            <span className="featured-live-center-dot" />
                            Live
                        </div>
                    ) : (
                        <div
                            className="featured-play is-youtube"
                            aria-hidden="true"
                        >
                            <span />
                        </div>
                    )}

                    {isLive && (
                        <div className="featured-live-badge">
                            Live Now
                        </div>
                    )}
                </div>

                <div className="featured-copy">
                    <div className="featured-copy-main">
                        <span className="featured-category">
                            {categoryLabel}
                        </span>

                        <strong>{primaryTitle}</strong>

                        {secondaryTitle && (
                            <span className="featured-part">
                                {secondaryTitle}
                            </span>
                        )}

                        {isLive && content.subtitle && (
                            <p>{content.subtitle}</p>
                        )}

                        <div className="featured-meta">
                            {isLive &&
                                Number(content.viewers) > 0 && (
                                    <span>
                                        <EyeIcon />
                                        {Number(
                                            content.viewers
                                        ).toLocaleString()}{" "}
                                        watching
                                    </span>
                                )}

                            {uptimeText && <span>{uptimeText}</span>}

                            {publishedText && <span>{publishedText}</span>}
                        </div>

                        {error && (
                            <small className="featured-refresh-error">
                                {error}
                            </small>
                        )}

                        <span className="featured-action">
                            {actionText}
                            <span aria-hidden="true"> →</span>
                        </span>
                    </div>

                    <span
                        className="featured-arrow"
                        aria-hidden="true"
                    >
                        ›
                    </span>
                </div>
            </a>
        </section>
    );
}

export default FeaturedContent;