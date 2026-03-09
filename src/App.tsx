import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Film, 
  PlayCircle, 
  ArrowUpCircle, 
  Wallet, 
  Users, 
  Settings, 
  LogOut, 
  Plus, 
  Trash2, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Eye,
  Clock,
  Calendar,
  ChevronRight,
  Search,
  Bell
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type View = 'dashboard' | 'anime' | 'episodes' | 'upgrades' | 'withdrawals' | 'users' | 'settings';

// --- Mock Data (Replace with real Firebase hooks) ---
const MOCK_STATS = {
  totalUsers: 12450,
  activeToday: 1840,
  totalAnime: 450,
  totalEpisodes: 8900,
  adViews: {
    hourly: [
      { name: '00:00', views: 400 }, { name: '04:00', views: 300 }, 
      { name: '08:00', views: 1200 }, { name: '12:00', views: 2500 },
      { name: '16:00', views: 3200 }, { name: '20:00', views: 1800 }
    ],
    daily: [
      { name: 'Mon', views: 12000 }, { name: 'Tue', views: 15000 },
      { name: 'Wed', views: 18000 }, { name: 'Thu', views: 14000 },
      { name: 'Fri', views: 22000 }, { name: 'Sat', views: 28000 },
      { name: 'Sun', views: 25000 }
    ]
  }
};

// --- Components ---

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: any, 
  label: string, 
  active: boolean, 
  onClick: () => void 
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
      active 
        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
        : "text-slate-400 hover:bg-slate-800 hover:text-white"
    )}
  >
    <Icon size={20} className={cn("transition-transform group-hover:scale-110", active ? "text-white" : "text-slate-400")} />
    <span className="font-medium">{label}</span>
    {active && <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
  </button>
);

const StatCard = ({ label, value, icon: Icon, trend, color }: { label: string, value: string | number, icon: any, trend?: string, color: string }) => (
  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
    <div className={cn("absolute top-0 left-0 w-1 h-full", color)} />
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">{label}</p>
        <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
        {trend && (
          <p className="text-emerald-400 text-xs font-medium mt-2 flex items-center gap-1">
            <TrendingUp size={12} /> {trend}
          </p>
        )}
      </div>
      <div className={cn("p-3 rounded-xl bg-slate-800 text-white group-hover:scale-110 transition-transform")}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  type User as FirebaseUser 
} from 'firebase/auth';
import { auth } from './firebase';
import { 
  subscribeToAnime, 
  subscribeToUpgrades, 
  subscribeToWithdrawals, 
  subscribeToUsers,
  subscribeToAdStats,
  addAnime,
  addEpisode,
  approveUpgrade,
  approveWithdrawal,
  removeAnime,
  getDashboardStats,
  type Anime,
  type Episode,
  type Request,
  type User
} from './services/firebaseService';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [view, setView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Data States
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [upgradeRequests, setUpgradeRequests] = useState<Request[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<Request[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, activeToday: 0, totalAnime: 0, totalEpisodes: 0 });
  const [timeRange, setTimeRange] = useState<'Hourly' | 'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const [adStats, setAdStats] = useState<any[]>([]);

  // Form States
  const [animeForm, setAnimeForm] = useState({ title: '', genre: '', year: 2024, cover: '', desc: '' });
  const [episodeForm, setEpisodeForm] = useState({ animeId: '', num: 1, title: '', video: '', thumb: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u && u.email === 'dugzu001@gmail.com') {
        setUser(u);
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // Subscriptions - Only run if user is authenticated
  useEffect(() => {
    if (!user) return;

    const unsubAnime = subscribeToAnime(setAnimeList);
    const unsubUpgrades = subscribeToUpgrades(setUpgradeRequests);
    const unsubWithdrawals = subscribeToWithdrawals(setWithdrawalRequests);
    const unsubUsers = subscribeToUsers(setUsers);
    const unsubAdStats = subscribeToAdStats(timeRange, setAdStats);

    const fetchStats = async () => {
      const s = await getDashboardStats();
      setStats(s);
    };
    fetchStats();

    return () => {
      unsubAnime();
      unsubUpgrades();
      unsubWithdrawals();
      unsubUsers();
      unsubAdStats();
    };
  }, [user, timeRange]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const userCred = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      if (userCred.user.email !== 'dugzu001@gmail.com') {
        await signOut(auth);
        setLoginError('Access Denied: Not an admin account.');
      }
    } catch (err: any) {
      setLoginError('Invalid credentials.');
    }
  };

  const handleLogout = () => signOut(auth);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl"
        >
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/20">
              <Film className="text-white" size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white text-center mb-2">Admin Portal</h2>
          <p className="text-slate-400 text-center mb-8">Please sign in to continue</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email Address</label>
              <input 
                type="email" 
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm outline-none focus:border-blue-500"
                placeholder="admin@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Password</label>
              <input 
                type="password" 
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm outline-none focus:border-blue-500"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>
            {loginError && <p className="text-red-500 text-xs font-medium">{loginError}</p>}
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98]"
            >
              Access Dashboard
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Handlers
  const handleAddAnime = async () => {
    if (!animeForm.title || !animeForm.cover) return alert('Title and Cover are required');
    setIsSubmitting(true);
    try {
      await addAnime({
        title: animeForm.title,
        genre: animeForm.genre,
        releaseYear: animeForm.year,
        cover: animeForm.cover,
        description: animeForm.desc,
        status: 'Ongoing'
      });
      setAnimeForm({ title: '', genre: '', year: 2024, cover: '', desc: '' });
      alert('Anime published successfully!');
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddEpisode = async () => {
    if (!episodeForm.animeId || !episodeForm.video) return alert('Select Anime and provide Video URL');
    setIsSubmitting(true);
    try {
      await addEpisode({
        animeId: episodeForm.animeId,
        episodeNumber: episodeForm.num,
        title: episodeForm.title || `Episode ${episodeForm.num}`,
        videoUrl: episodeForm.video,
        thumbnail: episodeForm.thumb,
      });
      setEpisodeForm({ animeId: '', num: episodeForm.num + 1, title: '', video: '', thumb: '' });
      alert('Episode uploaded successfully!');
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveUpgrade = async (req: Request) => {
    if (!confirm(`Approve ${req.plan} for ${req.email}?`)) return;
    try {
      await approveUpgrade(req.id, req.userId, req.plan || 'Tier 2');
      alert('Upgrade approved!');
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const handleApproveWithdrawal = async (req: Request) => {
    if (!confirm(`Mark ${req.amount} KES as paid for ${req.email}?`)) return;
    try {
      await approveWithdrawal(req.id);
      alert('Withdrawal marked as paid!');
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const filteredAnime = animeList.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.genre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full bg-slate-950 border-r border-slate-800 z-50 transition-all duration-300",
        isSidebarOpen ? "w-72" : "w-20"
      )}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Film className="text-white" size={24} />
          </div>
          {isSidebarOpen && (
            <span className="text-xl font-bold text-white tracking-tight">EliteAdmin</span>
          )}
        </div>

        <nav className="p-4 space-y-2 mt-4">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <SidebarItem icon={Film} label="Anime Manager" active={view === 'anime'} onClick={() => setView('anime')} />
          <SidebarItem icon={PlayCircle} label="Episodes" active={view === 'episodes'} onClick={() => setView('episodes')} />
          <div className="my-4 border-t border-slate-800 mx-2" />
          <SidebarItem icon={ArrowUpCircle} label="Upgrades" active={view === 'upgrades'} onClick={() => setView('upgrades')} />
          <SidebarItem icon={Wallet} label="Withdrawals" active={view === 'withdrawals'} onClick={() => setView('withdrawals')} />
          <SidebarItem icon={Users} label="Users" active={view === 'users'} onClick={() => setView('users')} />
          <div className="my-4 border-t border-slate-800 mx-2" />
          <SidebarItem icon={Settings} label="Settings" active={view === 'settings'} onClick={() => setView('settings')} />
        </nav>

        <div className="absolute bottom-0 left-0 w-full p-4">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "transition-all duration-300 min-h-screen",
        isSidebarOpen ? "pl-72" : "pl-20"
      )}>
        {/* Header */}
        <header className="h-20 border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-40 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative text-slate-400 hover:text-white transition-colors">
              <Bell size={22} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-950">3</span>
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-800">
              <div className="text-right">
                <p className="text-sm font-bold text-white">Admin User</p>
                <p className="text-xs text-slate-500">Super Admin</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Avatar" />
              </div>
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            {view === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">System Overview</h1>
                    <p className="text-slate-400 mt-1">Real-time analytics and performance metrics.</p>
                  </div>
                  <div className="flex gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    {(['Hourly', 'Daily', 'Weekly', 'Monthly'] as const).map((t) => (
                      <button 
                        key={t} 
                        onClick={() => setTimeRange(t)}
                        className={cn(
                          "px-4 py-1.5 text-xs font-bold rounded-lg transition-colors",
                          timeRange === t ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-400"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard label="Total Users" value={stats.totalUsers.toLocaleString()} icon={Users} trend="+12% from last month" color="bg-blue-500" />
                  <StatCard label="Active Today" value={stats.activeToday.toLocaleString()} icon={Clock} trend="+5% from yesterday" color="bg-emerald-500" />
                  <StatCard label="Total Anime" value={stats.totalAnime} icon={Film} color="bg-purple-500" />
                  <StatCard label="Total Episodes" value={stats.totalEpisodes.toLocaleString()} icon={PlayCircle} color="bg-red-500" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Ad Views Chart */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Eye size={20} className="text-blue-500" /> Ad Views Statistics
                      </h3>
                      <select className="bg-slate-800 border-none text-xs font-bold rounded-lg px-3 py-1.5 outline-none">
                        <option>This Week</option>
                        <option>Last Week</option>
                      </select>
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={adStats.length > 0 ? adStats : MOCK_STATS.adViews.daily}>
                          <defs>
                            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                            itemStyle={{ color: '#fff' }}
                          />
                          <Area type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Active Users Chart */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Users size={20} className="text-emerald-500" /> User Activity
                      </h3>
                      <select className="bg-slate-800 border-none text-xs font-bold rounded-lg px-3 py-1.5 outline-none">
                        <option>Hourly</option>
                        <option>Daily</option>
                      </select>
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={MOCK_STATS.adViews.hourly}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip 
                            cursor={{ fill: '#1e293b' }}
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                          />
                          <Bar dataKey="views" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'anime' && (
              <motion.div
                key="anime"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Anime Manager</h1>
                    <p className="text-slate-400 mt-1">Publish and manage your anime catalog.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Upload Form */}
                  <div className="lg:col-span-1 bg-slate-900 border border-slate-800 p-6 rounded-2xl h-fit sticky top-28">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                      <Plus size={20} className="text-blue-500" /> Add New Anime
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Title</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:border-blue-500 outline-none"
                          placeholder="e.g. Solo Leveling"
                          value={animeForm.title}
                          onChange={(e) => setAnimeForm({...animeForm, title: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Genre</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:border-blue-500 outline-none"
                            placeholder="Action, Fantasy"
                            value={animeForm.genre}
                            onChange={(e) => setAnimeForm({...animeForm, genre: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Year</label>
                          <input 
                            type="number" 
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:border-blue-500 outline-none"
                            value={animeForm.year}
                            onChange={(e) => setAnimeForm({...animeForm, year: parseInt(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Cover URL</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:border-blue-500 outline-none"
                          placeholder="https://..."
                          value={animeForm.cover}
                          onChange={(e) => setAnimeForm({...animeForm, cover: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Description</label>
                        <textarea 
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:border-blue-500 outline-none h-32 resize-none"
                          placeholder="Plot summary..."
                          value={animeForm.desc}
                          onChange={(e) => setAnimeForm({...animeForm, desc: e.target.value})}
                        />
                      </div>
                      <button 
                        disabled={isSubmitting}
                        onClick={handleAddAnime}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                      >
                        {isSubmitting ? 'Publishing...' : 'Publish Anime'}
                      </button>
                    </div>
                  </div>

                  {/* Anime List */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-white">Catalog</h3>
                      <span className="text-xs text-slate-500 font-medium">Showing 0 anime</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredAnime.map(anime => (
                        <div key={anime.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex gap-4 group">
                          <div className="w-24 h-32 bg-slate-800 rounded-xl overflow-hidden flex-shrink-0">
                            <img src={anime.cover} className="w-full h-full object-cover" alt={anime.title} />
                          </div>
                          <div className="flex-1 flex flex-col justify-between py-1">
                            <div>
                              <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors truncate">{anime.title}</h4>
                              <p className="text-xs text-slate-500 mt-1 truncate">{anime.genre} • {anime.releaseYear}</p>
                              <p className="text-[10px] text-slate-600 mt-1">{anime.totalEpisodes} Episodes</p>
                            </div>
                            <div className="flex gap-2">
                              <button className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"><Settings size={16} /></button>
                              <button 
                                onClick={() => removeAnime(anime.id)}
                                className="p-2 rounded-lg bg-slate-800 text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'episodes' && (
              <motion.div
                key="episodes"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                <div className="text-center">
                  <h1 className="text-3xl font-bold text-white tracking-tight">Episode Uploader</h1>
                  <p className="text-slate-400 mt-2">Add new content to your existing anime series.</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Anime</label>
                        <select 
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm focus:border-blue-500 outline-none appearance-none cursor-pointer"
                          value={episodeForm.animeId}
                          onChange={(e) => setEpisodeForm({...episodeForm, animeId: e.target.value})}
                        >
                          <option value="">Select from database...</option>
                          {animeList.map(a => (
                            <option key={a.id} value={a.id}>{a.title}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Episode Number</label>
                        <input 
                          type="number" 
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm focus:border-blue-500 outline-none"
                          placeholder="e.g. 1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Episode Title</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm focus:border-blue-500 outline-none"
                          placeholder="e.g. The Beginning"
                        />
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Video Source (Embed/MP4)</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm focus:border-blue-500 outline-none text-blue-400"
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Thumbnail URL</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm focus:border-blue-500 outline-none"
                          placeholder="https://..."
                        />
                      </div>
                      <div className="pt-8">
                        <button 
                          disabled={isSubmitting}
                          onClick={handleAddEpisode}
                          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                          <PlayCircle size={20} /> {isSubmitting ? 'Uploading...' : 'Upload Episode'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {(view === 'upgrades' || view === 'withdrawals') && (
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight capitalize">{view} Requests</h1>
                    <p className="text-slate-400 mt-1">Review and process financial transactions.</p>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/50 border-b border-slate-800">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Method</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(view === 'upgrades' ? upgradeRequests : withdrawalRequests).map(req => (
                        <tr key={req.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-white">{req.email}</p>
                            <p className="text-xs text-slate-500">ID: {req.userId}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-bold",
                              view === 'upgrades' ? "bg-yellow-500/10 text-yellow-500" : "bg-green-500/10 text-green-500"
                            )}>
                              {view === 'upgrades' ? (req.plan || 'Tier Upgrade') : `${req.amount?.toFixed(2)} KES`}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-400 font-medium">{req.method}</td>
                          <td className="px-6 py-4 text-xs text-slate-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => view === 'upgrades' ? handleApproveUpgrade(req) : handleApproveWithdrawal(req)}
                                className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"
                              >
                                <CheckCircle size={18} />
                              </button>
                              <button className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"><XCircle size={18} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(view === 'upgrades' ? upgradeRequests : withdrawalRequests).length === 0 && (
                    <div className="p-8 text-center border-t border-slate-800">
                      <p className="text-slate-500 text-sm italic">No pending {view} found.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {view === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">User Directory</h1>
                    <p className="text-slate-400 mt-1">Manage your community and user tiers.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {users.map(user => (
                    <div key={user.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-blue-500/50 transition-all group">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt="" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white truncate">{user.email}</h4>
                          <p className="text-xs text-slate-500">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Balance</p>
                          <p className="text-lg font-bold text-emerald-400">{(user.balance || 0).toFixed(2)} KES</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Tier</p>
                          <span className="text-xs font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-md">{user.tier || 'Tier 1'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {view === 'settings' && (
              <motion.div
                key="settings"
                className="max-w-2xl mx-auto space-y-8"
              >
                <h1 className="text-3xl font-bold text-white tracking-tight text-center">System Settings</h1>
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Paypal Email</label>
                    <input type="email" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm outline-none focus:border-blue-500" placeholder="admin@paypal.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">M-Pesa Number</label>
                    <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm outline-none focus:border-blue-500" placeholder="0712345678" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Faucetpay Wallet</label>
                    <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm outline-none focus:border-blue-500" placeholder="Wallet address..." />
                  </div>
                  <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-blue-600/20">
                    Save Global Settings
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
