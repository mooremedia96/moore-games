import { useEffect, useState } from "react";

const FALLBACK_VIDEO = {
    videoId: "YOUR_VIDEO_ID",
    title: "Where Winds Meet — Part 1",
    publishedAt: "",
    thumbnail: "https://i.ytimg.com/vi/YOUR_VIDEO_ID/maxresdefault.jpg",
    url: "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
};

function LatestVideo() {
    const [video, setVideo] = useState(FALLBACK_VIDEO);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        async function loadLatestVideo() {
            try {
                const response = await fetch("/api/latest-video");

                if (!response.ok) {
                    throw new Error(
                        `Latest-video request failed: ${response.status}`
                    );
                }

                const data = await response.json();

                if (!isMounted || !data.videoId) {
                    return;
                }

                setVideo({
                    videoId: data.videoId,
                    title: data.title,
                    publishedAt: data.publishedAt || "",
                    thumbnail:
                        data.thumbnail ||
                        `https://i.ytimg.com/vi/${data.videoId}/maxresdefault.jpg`,
                    url:
                        data.url ||
                        `https://www.youtube.com/watch?v=${data.videoId}`,
                });
            } catch (error) {
                console.warn(
                    "Using the fallback latest video:",
                    error
                );
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        loadLatestVideo();

        return () => {
            isMounted = false;
        };
    }, []);

    const formattedDate = video.publishedAt
        ? new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
          }).format(new Date(video.publishedAt))
        : "";

    return (
        <section className="latest-video-section">
            <div className="latest-video-heading">
                <span>FEATURED</span>
                <h2>Latest Video</h2>
            </div>

            <a
                className="latest-video-card"
                href={video.url}
                target="_blank"
                rel="noreferrer"
            >
                <div className="latest-video-thumbnail">
                    <img
                        src={video.thumbnail}
                        alt={`Thumbnail for ${video.title}`}
                        onError={(event) => {
                            event.currentTarget.src =
                                `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;
                        }}
                    />

                    <div className="latest-video-overlay" />

                    <div className="latest-video-play" aria-hidden="true">
                        <span />
                    </div>

                    <div className="latest-video-badge">
                        Latest Upload
                    </div>
                </div>

                <div className="latest-video-copy">
                    <div>
                        <strong>
                            {loading ? "Loading latest video..." : video.title}
                        </strong>

                        <p>
                            {formattedDate
                                ? `Published ${formattedDate}`
                                : "Watch now on YouTube"}
                        </p>
                    </div>

                    <span className="latest-video-arrow">›</span>
                </div>
            </a>
        </section>
    );
}

export default LatestVideo;