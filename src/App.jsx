import React, { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, TrendingUp, Github, ExternalLink, MessageCircle, ArrowUp, Zap, Newspaper, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- HELPERS ---
const CORS_PROXY = "https://api.allorigins.win/get?url=";

const fetchRSS = async (url) => {
  const response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
  const data = await response.json();
  const parser = new DOMParser();
  return parser.parseFromString(data.contents, "text/xml");
};

const Skeleton = () => (
  <div className="animate-pulse bg-white/5 rounded-2xl p-4 h-32 w-full mb-4" />
);

export default function App() {
  const [data, setData] = useState({ google: [], reddit: [], hn: [], news: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Google Trends (India)
      const googleDoc = await fetchRSS("https://trends.google.com/trends/trendingsearches/daily/rss?geo=IN");
      const googleItems = Array.from(googleDoc.querySelectorAll("item")).slice(0, 10).map(item => ({
        title: item.querySelector("title").textContent,
        traffic: item.getElementsByTagName("ht:approx_traffic")[0]?.textContent || "High Vol",
        link: `https://www.google.com/search?q=${encodeURIComponent(item.querySelector("title").textContent)}`
      }));

      // 2. Reddit Popular
      const redditRes = await fetch("https://www.reddit.com/r/popular.json?limit=12");
      const redditJson = await redditRes.json();
      const redditItems = redditJson.data.children.map(post => ({
        title: post.data.title,
        sub: post.data.subreddit_name_prefixed,
        ups: post.data.ups,
        comments: post.data.num_comments,
        url: `https://reddit.com${post.data.permalink}`,
        thumb: post.data.thumbnail.startsWith('http') ? post.data.thumbnail : null
      }));

      // 3. Hacker News
      const hnIdsRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
      const hnIds = await hnIdsRes.json();
      const hnItems = await Promise.all(hnIds.slice(0, 10).map(async id => {
        const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        return itemRes.json();
      }));

      setData({ google: googleItems, reddit: redditItems, hn: hnItems });
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000); // 5 min auto-refresh
    return () => clearInterval(interval);
  }, []);

  const filteredData = useMemo(() => {
    const s = search.toLowerCase();
    return {
      google: data.google.filter(i => i.title.toLowerCase().includes(s)),
      reddit: data.reddit.filter(i => i.title.toLowerCase().includes(s)),
      hn: data.hn.filter(i => i.title?.toLowerCase().includes(s))
    };
  }, [search, data]);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            HypeRadar
          </h1>
          
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Filter trends..." 
              className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 ring-purple-500/50 transition-all"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden md:block text-xs text-white/40">Last Updated: {lastUpdated}</span>
            <button onClick={fetchData} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-12">
        {/* Section: Google Trends */}
        <Section title="Google Trends (India)" icon={<TrendingUp className="text-blue-400" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? [1,2,3].map(i => <Skeleton key={i}/>) : 
              filteredData.google.map((item, i) => (
                <Card key={i} href={item.link}>
                  <p className="text-lg font-semibold mb-2">{item.title}</p>
                  <div className="flex items-center gap-2 text-xs text-blue-400 font-mono">
                    <Zap size={12} /> {item.traffic} searches
                  </div>
                </Card>
              ))}
          </div>
        </Section>

        {/* Section: Reddit */}
        <Section title="Social Buzz (Reddit)" icon={<MessageCircle className="text-orange-400" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? [1,2,3].map(i => <Skeleton key={i}/>) : 
              filteredData.reddit.map((post, i) => (
                <Card key={i} href={post.url}>
                  <div className="flex gap-4">
                    {post.thumb && <img src={post.thumb} className="w-16 h-16 rounded-lg object-cover bg-white/5" alt="" />}
                    <div>
                      <p className="text-sm font-medium line-clamp-2 mb-2">{post.title}</p>
                      <div className="flex items-center gap-3 text-[10px] text-white/50">
                        <span className="text-orange-400 font-bold">{post.sub}</span>
                        <span className="flex items-center gap-1"><ArrowUp size={10}/> {post.ups}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </Section>

        {/* Section: Tech Buzz */}
        <Section title="Tech News (Hacker News)" icon={<Newspaper className="text-emerald-400" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? [1,2,3].map(i => <Skeleton key={i}/>) : 
              filteredData.hn.map((item, i) => (
                <Card key={i} href={item.url}>
                  <p className="text-sm font-medium mb-3">{item.title}</p>
                  <div className="flex items-center justify-between text-[10px] text-white/40">
                    <span>by {item.by}</span>
                    <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">{item.score} points</span>
                  </div>
                </Card>
              ))}
          </div>
        </Section>
      </main>

      <footer className="mt-20 border-t border-white/10 p-10 text-center text-white/30 text-sm">
        <p>Data powered by public RSS feeds & APIs (Google, Reddit, HN)</p>
        <p className="mt-2 text-[10px] max-w-md mx-auto italic">
          Disclaimer: We do not own or modify any content. All data belongs to respective sources.
        </p>
      </footer>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="flex items-center gap-2 mb-6">
        {icon}
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}

function Card({ children, href }) {
  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block group bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 transition-all duration-300 backdrop-blur-sm"
    >
      {children}
      <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <ExternalLink size={14} className="text-white/40" />
      </div>
    </a>
  );
}
