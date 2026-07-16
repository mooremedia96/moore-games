import { useEffect, useState } from "react";

const TWITCH_URL = "https://www.twitch.tv/mooregames96";
const REFRESH_INTERVAL = 60_000;
const FORCE_LIVE = false;

function StreamStatus() {
    const [status, setStatus] = useState({
        loading: true,
        live: false,
        platform: "Twitch",
        title: "",
        url: TWITCH_URL,
        error: false,
    });

    useEffect(() => {
        if (FORCE_LIVE) {
            setStatus({
                loading: false,
                live: true,
                platform: "Twitch",
                title: "Moore Games is live right now!",
                url: TWITCH_URL,
                error: false,
            });

            return;
        }

        let isMounted = true;

        async function getLiveStatus() {
            try {
                const response = await fetch("/api/live-status");

                if (!response.ok) {
                    throw new Error(
                        `Live-status request failed: ${response.status}`
                    );
                }

                const data = await response.json();

                if (!isMounted) {
                    return;
                }

                setStatus({
                    loading: false,
                    live: Boolean(data.live),
                    platform: data.platform || "Twitch",
                    title: data.title || "",
                    url: data.url || TWITCH_URL,
                    error: false,
                });
            } catch (error) {
                console.error("Unable to check live status:", error);

                if (!isMounted) {
                    return;
                }

                setStatus({
                    loading: false,
                    live: false,
                    platform: "Twitch",
                    title: "",
                    url: TWITCH_URL,
                    error: true,
                });
            }
        }

        getLiveStatus();

        const intervalId = window.setInterval(
            getLiveStatus,
            REFRESH_INTERVAL
        );

        return () => {
            isMounted = false;
            window.clearInterval(intervalId);
        };
    }, []);

    let statusText = "OFFLINE";
    let description = "Follow on Twitch to catch me live!";

    if (status.loading) {
        statusText = "CHECKING...";
        description = "Checking the Moore Games stream status.";
    } else if (status.live) {
        statusText = `LIVE ON ${status.platform.toUpperCase()}`;
        description = status.title || "Watch the live stream now!";
    } else if (status.error) {
        statusText = "OFFLINE";
        description = "Follow on Twitch to catch the next stream!";
    }

    return (
        <a
            className={`stream-status ${status.live ? "is-live" : "is-offline"
                }`}
            href={status.url}
            target="_blank"
            rel="noreferrer"
            aria-live="polite"
        >
            <div className="status-title">LIVE STREAM STATUS</div>

            <div className="status-value">
                <span className="status-dot" />
                {statusText}
            </div>

            <p>{description}</p>
        </a>
    );
}

export default StreamStatus;