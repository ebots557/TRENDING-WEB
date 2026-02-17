import React, { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, TrendingUp, ExternalLink, MessageCircle, ArrowUp, Zap, Newspaper } from 'lucide-react';

const CORS_PROXY = "https://api.allorigins.win/get?url=";

export default function App() {
  const [data, setData] = useState({ google: [], reddit: [], hn: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Parallel fetching with error handling for each
      const [googleRes, redditRes, hnIdsRes] = await Promise.allSettled([
        fetch(`${CORS_PROXY}${encodeURIComponent("https://trends.google.com/trends/trendingsearches/daily/rss?geo=IN")}`).then(r => r.json()),
        fetch("https://www.reddit.com/r/popular.json?limit=12").then(r => r.json()),
        fetch("https://hacker-news.firebaseio.com/v0/topstories.json").then(r => r.json())
      ]);

      let googleItems = [];
      if (googleRes.status === 'fulfilled') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(googleRes.value.contents, "text/xml");
        googleItems = Array.from(doc.querySelectorAll("item")).slice(0, 10).map(item => ({
          title: item.querySelector("title")?.textContent || "No Title",
          traffic: item.getElementsByTagName("ht:approx_traffic")[0]?.textContent || "Trending",
          link: item.querySelector("link")?.textContent || "#"
        }));
      }

      let redditItems = [];
      if (redditRes.status === 'fulfilled') {
        redditItems = redditRes.value.data.children.map(post => ({
          title: post.data.title,
          sub: post.data.subreddit_name_prefixed,
          ups: post.data.ups,
          url: `https://reddit.com${post.data.permalink}`,
          thumb: post.data.thumbnail.startsWith('http') ? post.data.thumbnail : null
        }));
      }

      let hnItems = [];
      if (hnIdsRes.status === 'fulfilled') {
        const topIds = hnIdsRes.value.slice(0, 10);
        const details = await Promise.all(topIds.map(id => 
          fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json())
        ));
        hnItems = details.filter(item => item !== null);
      }

      setData({ google: googleItems, reddit: redditItems, hn: hnItems });
    } catch (err) {
      console.error("Critical Error:", err);
      setError("Something went wrong. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return {
      google: data.google.filter(i => i.title.toLowerCase().includes(s)),
      reddit: data.reddit.filter(i => i.title.toLowerCase().includes(s)),
      hn: data.hn.filter(i => i.title?.toLowerCase().includes(s))
    };
  }, [search, data]);

  if (error) return <div className="text-white p-10 text-center">{error}</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-md p-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">HypeRadar</h1>
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 outline-none focus:ring-2 ring-purple-500/50"
              placeholder="Search live trends..."
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button onClick={fetchData} className="p-2 bg-white/5 rounded-lg hover:bg-white/10">
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 space-y-10">
        <Section title="Google Trends India" icon={<TrendingUp className="text-blue-400" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? <Skeleton /> : filtered.google.map((item, i) => (
              <Card key={i} title={item.title} sub={item.traffic} link={item.link} badge="Google" />
            ))}
          </div>
        </Section>

        <Section title="Reddit Popular" icon={<MessageCircle className="text-orange-400" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? <Skeleton /> : filtered.reddit.map((item, i) => (
              <Card key={i} title={item.title} sub={item.sub} link={item.url} badge="Reddit" img={item.thumb} />
            ))}
          </div>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4 text-xl font-bold">{icon} {title}</div>
      {children}
    </div>
  );
}

function Card({ title, sub, link, badge, img }) {
  return (
    <a href={link} target="_blank" rel="noreferrer" className="block bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-all shadow-xl">
      <div className="flex gap-3">
        {img && <img src={img} className="w-12 h-12 rounded-lg object-cover" alt="" />}
        <div>
          <span className="text-[10px] uppercase tracking-widest text-white/40">{badge}</span>
          <p className="font-medium line-clamp-2 text-sm">{title}</p>
          <p className="text-xs text-purple-400 mt-1">{sub}</p>
        </div>
      </div>
    </a>
  );
}

function Skeleton() {
  return [1,2,3].map(i => <div key={i} className="h-24 bg-white/5 animate-pulse rounded-2xl" />);
}
