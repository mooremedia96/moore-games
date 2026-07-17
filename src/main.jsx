import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import FeaturedContent from "./FeaturedContent";
import "./styles.css";

const REFRESH_INTERVAL = 60_000;
const PULL_THRESHOLD = 72;
const MAX_PULL_DISTANCE = 108;
const TRANSITION_DURATION = 180;

const FALLBACK_CONTENT = {
  type: "video",
  platform: "youtube",
  title: "Watch Moore Games on YouTube",
  subtitle: "Gameplay, playthroughs, and more",
  thumbnail: `${import.meta.env.BASE_URL}banner-800.webp`,
  url: "https://www.youtube.com/@mooregames96",
  publishedAt: "",
  startedAt: "",
  viewers: 0,
  game: "",
};

const links = [
  { name: "YouTube", text: "Subscribe for videos & live streams", url: "https://www.youtube.com/channel/UCMU9AQML1qV7Y1RJpc5lR9Q?sub_confirmation=1", type: "youtube" },
  { name: "Twitch", text: "Catch me live on Twitch", url: "https://www.twitch.tv/mooregames96", type: "twitch" },
  { name: "Discord", text: "Join the community", url: "https://discord.com/invite/NKcxKnMBG", type: "discord" },
  { name: "Instagram", text: "Behind the scenes & updates", url: "https://www.instagram.com/mooregames96/", type: "instagram" },
  { name: "Facebook", text: "Follow for news & updates", url: "https://www.facebook.com/mooregames96", type: "facebook" },
];

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

function Icon({ type }) {
  const icons = {
    youtube: <><rect x="2" y="5" width="20" height="14" rx="4" /><path className="cut" d="M10 9v6l5-3-5-3Z" /></>,
    twitch: <path d="M3 2h19v13l-5 5h-5l-3 3v-3H5V6L3 2Zm4 3v11h4v2l2-2h4l3-3V5H7Zm4 3h2v5h-2V8Zm5 0h2v5h-2V8Z" />,
    discord: <path d="M19.4 5.4A15 15 0 0 0 15.5 4l-.6 1.2a14 14 0 0 0-5.8 0L8.5 4a15 15 0 0 0-3.9 1.4C2.1 9.2 1.4 13 1.7 16.7A16 16 0 0 0 6.5 19l1.2-1.6c-.7-.3-1.3-.6-1.9-1l.5-.4a11 11 0 0 0 11.4 0l.5.4c-.6.4-1.2.7-1.9 1l1.2 1.6a16 16 0 0 0 4.8-2.3c.4-4.3-.7-8-2.9-11.3ZM8.4 14.4c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm7.2 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2.4" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2.4" /><circle cx="17.4" cy="6.7" r="1.3" /></>,
    facebook: <path d="M13.8 22v-8h2.9l.4-3.1h-3.3V8.9c0-.9.3-1.6 1.8-1.6H17V4.5c-.3 0-1.4-.1-2.6-.1-2.6 0-4.6 1.6-4.6 4.6v1.9H7v3.1h3V22h3.6Z" />,
  };

  return (
    <span className={`brand-icon ${type}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true">{icons[type]}</svg>
    </span>
  );
}

function LinkCard({ item }) {
  return (
    <a className="link-card" href={item.url} target="_blank" rel="noreferrer">
      <Icon type={item.type} />
      <span className="link-copy"><strong>{item.name}</strong><small>{item.text}</small></span>
      <span className="chevron" aria-hidden="true">›</span>
    </a>
  );
}

function InitialPageSkeleton() {
  return (
    <main className="site-card page-skeleton" aria-label="Loading Moore Games">
      <div className="page-skeleton-hero" />
      <section className="page-skeleton-profile">
        <span className="page-skeleton-avatar" />
        <span className="skeleton-line page-skeleton-name" />
        <span className="skeleton-line page-skeleton-role" />
        <span className="skeleton-line page-skeleton-bio" />
      </section>
      <section className="featured-content">
        <div className="featured-heading"><span>FEATURED CONTENT</span></div>
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
      <section className="links-panel page-skeleton-links">
        {links.map((item) => <span className="page-skeleton-link" key={item.name} />)}
      </section>
      <div className="page-skeleton-socials">
        {links.map((item) => <span key={item.name} />)}
      </div>
    </main>
  );
}

function PullToRefreshIndicator({ state, distance }) {
  const labels = {
    pulling: "Pull to refresh",
    ready: "Release to refresh",
    refreshing: "Checking for updates…",
    success: "Updated",
    unchanged: "Already up to date",
    error: "Could not refresh",
  };

  const visible = state !== "idle";

  return (
    <div
      className={`pull-refresh pull-refresh-${state}`}
      style={{ "--pull-progress": Math.min(distance / PULL_THRESHOLD, 1) }}
      aria-live="polite"
      aria-hidden={!visible}
    >
      <span className="pull-refresh-icon" aria-hidden="true">
        {state === "success" || state === "unchanged" ? "✓" : state === "error" ? "!" : "↻"}
      </span>
      <span>{labels[state] || ""}</span>
    </div>
  );
}

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshError, setRefreshError] = useState("");
  const [contentTransitioning, setContentTransitioning] = useState(false);
  const [pullState, setPullState] = useState("idle");
  const [pullDistance, setPullDistance] = useState(0);

  const appRef = useRef(null);
  const dashboardRef = useRef(null);
  const requestRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const pullResetTimerRef = useRef(null);
  const touchStartYRef = useRef(null);
  const pullActiveRef = useRef(false);
  const pullDistanceRef = useRef(0);

  const applyDashboard = useCallback((nextDashboard) => {
    const currentDashboard = dashboardRef.current;
    const currentSignature = createContentSignature(currentDashboard?.featuredContent);
    const nextSignature = createContentSignature(nextDashboard?.featuredContent);
    const changed = currentSignature !== nextSignature;

    if (!currentDashboard || !changed) {
      dashboardRef.current = nextDashboard;
      setDashboard(nextDashboard);
      return changed;
    }

    window.clearTimeout(transitionTimerRef.current);
    setContentTransitioning(true);

    transitionTimerRef.current = window.setTimeout(() => {
      dashboardRef.current = nextDashboard;
      setDashboard(nextDashboard);
      window.requestAnimationFrame(() => setContentTransitioning(false));
    }, TRANSITION_DURATION);

    return changed;
  }, []);

  const loadDashboard = useCallback(async ({ manual = false } = {}) => {
    if (requestRef.current) {
      return requestRef.current;
    }

    const apiUrl = import.meta.env.PROD
      ? import.meta.env.VITE_API_URL?.replace(/\/$/, "")
      : "";

    const request = fetch(`${apiUrl}/api/dashboard`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Dashboard request failed with status ${response.status}`);
        }

        const nextDashboard = await response.json();

        if (!nextDashboard.featuredContent) {
          throw new Error("Dashboard response did not include featured content.");
        }

        const changed = applyDashboard(nextDashboard);
        setRefreshError("");
        return changed;
      })
      .catch((error) => {
        console.error("Unable to load dashboard:", error);
        setRefreshError("Unable to refresh featured content.");

        if (!dashboardRef.current) {
          const fallbackDashboard = { featuredContent: FALLBACK_CONTENT };
          dashboardRef.current = fallbackDashboard;
          setDashboard(fallbackDashboard);
        }

        if (manual) {
          throw error;
        }

        return false;
      })
      .finally(() => {
        setInitialLoading(false);
        requestRef.current = null;
      });

    requestRef.current = request;
    return request;
  }, [applyDashboard]);

  useEffect(() => {
    loadDashboard();
    const intervalId = window.setInterval(() => loadDashboard(), REFRESH_INTERVAL);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(transitionTimerRef.current);
      window.clearTimeout(pullResetTimerRef.current);
    };
  }, [loadDashboard]);

  const finishPullRefresh = useCallback((state) => {
    setPullState(state);
    setPullDistance(0);
    pullDistanceRef.current = 0;
    window.clearTimeout(pullResetTimerRef.current);
    pullResetTimerRef.current = window.setTimeout(() => setPullState("idle"), 1200);
  }, []);

  const refreshFromPull = useCallback(async () => {
    setPullState("refreshing");
    setPullDistance(PULL_THRESHOLD);
    pullDistanceRef.current = PULL_THRESHOLD;

    try {
      const changed = await loadDashboard({ manual: true });
      finishPullRefresh(changed ? "success" : "unchanged");
    } catch {
      finishPullRefresh("error");
    }
  }, [finishPullRefresh, loadDashboard]);

  useEffect(() => {
    const appElement = appRef.current;

    if (!appElement) {
      return undefined;
    }

    function pageIsAtTop() {
      const scrollTop =
        document.scrollingElement?.scrollTop ??
        document.documentElement.scrollTop ??
        window.scrollY;

      return scrollTop <= 1;
    }

    function handleTouchStart(event) {
      if (
        event.touches.length !== 1 ||
        !pageIsAtTop() ||
        requestRef.current ||
        !window.matchMedia("(max-width: 700px)").matches
      ) {
        return;
      }

      touchStartYRef.current = event.touches[0].clientY;
      pullActiveRef.current = true;
      pullDistanceRef.current = 0;
    }

    function resetPull() {
      pullActiveRef.current = false;
      touchStartYRef.current = null;
      pullDistanceRef.current = 0;
      setPullDistance(0);
      setPullState("idle");
    }

    function handleTouchMove(event) {
      if (
        !pullActiveRef.current ||
        touchStartYRef.current === null ||
        event.touches.length !== 1
      ) {
        return;
      }

      if (!pageIsAtTop()) {
        resetPull();
        return;
      }

      const rawDistance =
        event.touches[0].clientY - touchStartYRef.current;

      if (rawDistance <= 0) {
        resetPull();
        return;
      }

      if (event.cancelable) {
  event.preventDefault();
}

      const resistedDistance = Math.min(
        MAX_PULL_DISTANCE,
        rawDistance * 0.48
      );

      pullDistanceRef.current = resistedDistance;
      setPullDistance(resistedDistance);
      setPullState(
        resistedDistance >= PULL_THRESHOLD ? "ready" : "pulling"
      );
    }

    function handleTouchEnd() {
      if (!pullActiveRef.current) {
        return;
      }

      const shouldRefresh =
        pullDistanceRef.current >= PULL_THRESHOLD;

      pullActiveRef.current = false;
      touchStartYRef.current = null;

      if (shouldRefresh) {
        refreshFromPull();
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        setPullState("idle");
      }
    }

    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
      capture: true,
    });

    document.addEventListener("touchmove", handleTouchMove, {
      passive: false,
      capture: true,
    });

    document.addEventListener("touchend", handleTouchEnd, {
      capture: true,
    });

    document.addEventListener("touchcancel", handleTouchEnd, {
      capture: true,
    });

    return () => {
      document.removeEventListener(
        "touchstart",
        handleTouchStart,
        true
      );

      document.removeEventListener(
        "touchmove",
        handleTouchMove,
        true
      );

      document.removeEventListener(
        "touchend",
        handleTouchEnd,
        true
      );

      document.removeEventListener(
        "touchcancel",
        handleTouchEnd,
        true
      );
    };
  }, [refreshFromPull]);

  return (
    <div
      ref={appRef}
      className={`app-bg ${pullState !== "idle" ? "pull-active" : ""}`}
      style={{ "--pull-distance": `${pullDistance}px` }}
    >
      <PullToRefreshIndicator state={pullState} distance={pullDistance} />

      {initialLoading ? (
        <InitialPageSkeleton />
      ) : (
        <main className="site-card site-card-loaded">
          <header className="hero">
            <img
              src={`${import.meta.env.BASE_URL}banner-800.webp`}
              srcSet={[
                `${import.meta.env.BASE_URL}banner-800.webp 800w`,
                `${import.meta.env.BASE_URL}banner-1600.webp 1600w`,
              ].join(", ")}
              sizes="(max-width: 700px) 100vw, 760px"
              width="1600"
              height="696"
              fetchPriority="high"
              decoding="async"
              alt="Moore Games space banner"
            />
            <div className="hero-shade" />
          </header>

          <section className="profile">
            <div className="avatar-wrap">
              <img src={`${import.meta.env.BASE_URL}logo.webp`} alt="Moore Games logo" />
              <span className="online-dot" />
            </div>
            <h1>Moore Games</h1>
            <div className="roles">Gamer <span>•</span> Content Creator <span>•</span> Community</div>
            <p>SoCal based variety streamer and content creator. If you like space sims, extraction shooters, fps, and other gameplay; Welcome to Moore Games!</p>
          </section>

          <FeaturedContent
            content={dashboard?.featuredContent || FALLBACK_CONTENT}
            error={refreshError}
            transitioning={contentTransitioning}
          />

          <section className="links-panel">
            {links.map((item) => <LinkCard key={item.name} item={item} />)}
          </section>

          <nav className="social-row" aria-label="Social media links">
            {links.map((item) => (
              <a href={item.url} key={item.name} target="_blank" rel="noreferrer" aria-label={item.name}>
                <Icon type={item.type} />
              </a>
            ))}
          </nav>

          <footer>© {new Date().getFullYear()} Moore Games. All Rights Reserved.</footer>
        </main>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
