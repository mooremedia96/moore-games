import { useEffect, useState } from "react";

const REFRESH_INTERVAL = 60_000;

const FALLBACK_CONTENT = {
    type: "video",
    platform: "youtube",
    title: "Watch Moore Games on YouTube",
    subtitle: "Gameplay, playthroughs, and more",
    thumbnail: "/banner.jpeg",
    url: "https://www.youtube.com/@mooregames96",
};

function FeaturedContent() {
    const [content, setContent] = useState(FALLBACK_CONTENT);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        async function loadFeaturedContent() {
            try {
                const response = await fetch("/api/dashboard");

                if (!response.ok) {
                    throw new Error(
                        `Dashboard request failed: ${response.status}`
                    );
                }

                const data = await response.json();

                if (!isMounted) {
                    return;
                }

                if (data.featuredContent) {
                    setContent(data.featuredContent);
                }
            } catch (error) {
                console.error(
                    "Unable to load featured content:",
                    error
                );
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
            window.clearInterval(intervalId);
        };
    }, []);

    const isLive = content.type === "live";
    const isTwitch = content.platform === "twitch";
    const isYouTube = content.platform === "youtube";

    let heading = "LATEST VIDEO";

    if (isLive && isTwitch) {
        heading = "LIVE ON TWITCH";
    } else if (isLive && isYouTube) {
        heading = "LIVE ON YOUTUBE";
    }

    const description = loading
        ? "Loading Moore Games content..."
        : content.subtitle || "Watch now";

    return (
        <section
            className={`featured-content ${
                isLive ? "featured-live" : "featured-video"
            } ${
                isTwitch
                    ? "featured-twitch"
                    : "featured-youtube"
            }`}
        >
            <div className="featured-heading">
                <span>{heading}</span>

                {isLive && (
                    <span className="featured-live-label">
                        <span className="featured-live-dot" />
                        LIVE
                    </span>
                )}
            </div>

            <a
                className="featured-card"
                href={content.url}
                target="_blank"
                rel="noreferrer"
            >
                <div className="featured-thumbnail">
                    <img
                        src={content.thumbnail || "/banner.jpeg"}
                        alt={content.title || "Moore Games featured content"}
                        onError={(event) => {
                            event.currentTarget.src = "/banner.jpeg";
                        }}
                    />

                    <div className="featured-overlay" />

                    <div
                        className={`featured-play ${
                            isTwitch ? "is-twitch" : "is-youtube"
                        }`}
                        aria-hidden="true"
                    >
                        <span />
                    </div>

                    {isLive && (
                        <div className="featured-live-badge">
                            Live Now
                        </div>
                    )}
                </div>

                <div className="featured-copy">
                    <div>
                        <strong>
                            {loading
                                ? "Loading featured content..."
                                : content.title}
                        </strong>

                        <p>{description}</p>

                        {isLive &&
                            Number(content.viewers) > 0 && (
                                <small>
                                    {Number(
                                        content.viewers
                                    ).toLocaleString()}{" "}
                                    watching
                                </small>
                            )}
                    </div>

                    <span className="featured-arrow">›</span>
                </div>
            </a>
        </section>
    );
}

export default FeaturedContent;