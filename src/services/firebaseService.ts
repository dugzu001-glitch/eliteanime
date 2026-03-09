import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  where, 
  orderBy,
  limit,
  Timestamp,
  increment
} from 'firebase/firestore';
import { db } from '../firebase';

// --- Types ---
export interface Anime {
  id: string;
  title: string;
  genre: string;
  releaseYear: number;
  cover: string;
  description: string;
  status: string;
  totalEpisodes: number;
}

export interface Episode {
  id: string;
  animeId: string;
  episodeNumber: number;
  title: string;
  videoUrl: string;
  thumbnail: string;
  createdAt: number;
}

export interface Request {
  id: string;
  userId: string;
  email: string;
  amount?: number;
  plan?: string;
  method: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  account?: string;
  createdAt: number;
}

export interface User {
  id: string;
  email: string;
  balance: number;
  tier: string;
  createdAt: number;
}

// --- Anime Services ---
export const subscribeToAnime = (callback: (anime: Anime[]) => void) => {
  return onSnapshot(collection(db, 'anime'), (snapshot) => {
    const anime = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anime));
    callback(anime);
  });
};

export const addAnime = async (anime: Omit<Anime, 'id' | 'totalEpisodes'>) => {
  const slug = anime.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  await setDoc(doc(db, 'anime', slug), {
    ...anime,
    totalEpisodes: 0,
    status: 'Ongoing'
  });
};

export const removeAnime = async (id: string) => {
  await deleteDoc(doc(db, 'anime', id));
};

// --- Episode Services ---
export const addEpisode = async (episode: Omit<Episode, 'id' | 'createdAt'>) => {
  const id = `${episode.animeId}-ep${episode.episodeNumber}`;
  await setDoc(doc(db, 'episodes', id), {
    ...episode,
    createdAt: Date.now()
  });
  // Increment total episodes count in anime doc
  await updateDoc(doc(db, 'anime', episode.animeId), {
    totalEpisodes: increment(1)
  });
};

// --- Request Services ---
export const subscribeToUpgrades = (callback: (requests: Request[]) => void) => {
  const q = query(collection(db, 'upgrade_requests'), where('status', '==', 'pending'));
  return onSnapshot(q, (snapshot) => {
    const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Request));
    callback(reqs);
  });
};

export const subscribeToWithdrawals = (callback: (requests: Request[]) => void) => {
  const q = query(collection(db, 'withdraw_requests'), where('status', '==', 'pending'));
  return onSnapshot(q, (snapshot) => {
    const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Request));
    callback(reqs);
  });
};

export const approveUpgrade = async (reqId: string, userId: string, tier: string) => {
  await updateDoc(doc(db, 'upgrade_requests', reqId), { status: 'approved' });
  await updateDoc(doc(db, 'users', userId), { tier });
};

export const approveWithdrawal = async (reqId: string) => {
  await updateDoc(doc(db, 'withdraw_requests', reqId), { status: 'paid' });
};

// --- User Services ---
export const subscribeToUsers = (callback: (users: User[]) => void) => {
  return onSnapshot(collection(db, 'users'), (snapshot) => {
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    callback(users);
  });
};

// --- Stats Services ---
export const subscribeToAdStats = (range: string, callback: (data: any[]) => void) => {
  const collectionName = `stats_ads_${range.toLowerCase()}`;
  const q = query(collection(db, collectionName), orderBy('timestamp', 'desc'), limit(30));
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ 
      name: doc.id, 
      views: doc.data().count || 0,
      timestamp: doc.data().timestamp 
    })).reverse();
    callback(data);
  });
};

export const getDashboardStats = async () => {
  try {
    const users = await getDocs(collection(db, 'users'));
    const anime = await getDocs(collection(db, 'anime'));
    const episodes = await getDocs(collection(db, 'episodes'));
    
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    return {
      totalUsers: users.size,
      totalAnime: anime.size,
      totalEpisodes: episodes.size,
      activeToday: users.docs.filter(d => (d.data().lastActive || 0) > now - oneDay).length
    };
  } catch (e) {
    console.error("Stats fetch error:", e);
    return { totalUsers: 0, totalAnime: 0, totalEpisodes: 0, activeToday: 0 };
  }
};
