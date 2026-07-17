import React from 'react';
import { createRoot } from 'react-dom/client';
import FeaturedContent from "./FeaturedContent";
import './styles.css';

const links = [
  { name: 'YouTube', text: 'Subscribe for videos & live streams', url: 'https://www.youtube.com/channel/UCMU9AQML1qV7Y1RJpc5lR9Q?sub_confirmation=1', type: 'youtube' },
  { name: 'Twitch', text: 'Catch me live on Twitch', url: 'https://www.twitch.tv/mooregames96', type: 'twitch' },
  { name: 'Discord', text: 'Join the community', url: 'https://discord.com/invite/NKcxKnMBG', type: 'discord' },
  { name: 'Instagram', text: 'Behind the scenes & updates', url: 'https://www.instagram.com/mooregames96/', type: 'instagram' },
  { name: 'Facebook', text: 'Follow for news & updates', url: 'https://www.facebook.com/mooregames96', type: 'facebook' },
];

function Icon({ type }) {
  const icons = {
    youtube: <><rect x="2" y="5" width="20" height="14" rx="4" /><path className="cut" d="M10 9v6l5-3-5-3Z" /></>,
    twitch: <path d="M3 2h19v13l-5 5h-5l-3 3v-3H5V6L3 2Zm4 3v11h4v2l2-2h4l3-3V5H7Zm4 3h2v5h-2V8Zm5 0h2v5h-2V8Z" />,
    discord: <path d="M19.4 5.4A15 15 0 0 0 15.5 4l-.6 1.2a14 14 0 0 0-5.8 0L8.5 4a15 15 0 0 0-3.9 1.4C2.1 9.2 1.4 13 1.7 16.7A16 16 0 0 0 6.5 19l1.2-1.6c-.7-.3-1.3-.6-1.9-1l.5-.4a11 11 0 0 0 11.4 0l.5.4c-.6.4-1.2.7-1.9 1l1.2 1.6a16 16 0 0 0 4.8-2.3c.4-4.3-.7-8-2.9-11.3ZM8.4 14.4c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm7.2 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2.4" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2.4" /><circle cx="17.4" cy="6.7" r="1.3" /></>,
    facebook: <path d="M13.5 22v-8h2.8l.4-3.1h-3.2V8.9c0-.9.3-1.6 1.7-1.6H17V4.5c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.6v1.9H7v3.1h3V22h3.5Z" />,
  };
  return <span className={`brand-icon ${type}`}><svg viewBox="0 0 24 24" aria-hidden="true">{icons[type]}</svg></span>;
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

function App() {
  return (
    <div className="app-bg">
      <main className="site-card">
        <header className="hero">
          <img
            src={`${import.meta.env.BASE_URL}banner.webp`}
            alt="Moore Games space banner"
          />
          <div className="hero-shade" />
        </header>

        <section className="profile">
          <div className="avatar-wrap">
            <img
              src={`${import.meta.env.BASE_URL}logo.svg`}
              alt="Moore Games logo"
            />
            <span className="online-dot" />
          </div>
          <h1>Moore Games</h1>
          <div className="roles">Gamer <span>•</span> Content Creator <span>•</span> Community</div>
          <p>SoCal based variety streamer and content creator. If you like space sims, extraction shooters, fps, and other gameplay; Welcome to Moore Games!</p>
        </section>

        <FeaturedContent />

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
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
