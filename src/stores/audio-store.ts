import { create } from 'zustand';

interface AudioState {
  isPlaying: boolean;
  volume: number;
  currentTrack: string | null;
  availableTracks: string[];
  audio: HTMLAudioElement | null;
}

interface AudioActions {
  playBGM: (trackUrl?: string) => void;
  pauseBGM: () => void;
  stopBGM: () => void;
  setVolume: (volume: number) => void;
  nextTrack: () => void;
  loadTrack: (trackUrl: string) => void;
}

// デフォルトのBGMトラック（フリー音楽またはサンプル音楽）
const DEFAULT_TRACKS = [
  'https://www.soundjay.com/misc/sounds/magic-chime-02.mp3', // 作業集中用
  // 実際のプロジェクトでは、ローカルファイルやフリー音楽を使用
];

export const useAudioStore = create<AudioState & AudioActions>((set, get) => ({
  // Initial state
  isPlaying: false,
  volume: 0.3,
  currentTrack: null,
  availableTracks: DEFAULT_TRACKS,
  audio: null,

  // Actions
  playBGM: (trackUrl) => {
    const state = get();
    const url = trackUrl || state.availableTracks[0];
    
    if (!url) return;

    try {
      // Stop current audio if playing
      if (state.audio) {
        state.audio.pause();
        state.audio.currentTime = 0;
      }

      // Create new audio instance
      const audio = new Audio(url);
      audio.volume = state.volume;
      audio.loop = true;
      
      // Set up event listeners
      audio.addEventListener('loadstart', () => {
        console.log('BGM loading started');
      });
      
      audio.addEventListener('canplay', () => {
        console.log('BGM ready to play');
      });
      
      audio.addEventListener('error', (e) => {
        console.error('BGM error:', e);
        set({ isPlaying: false, currentTrack: null });
      });

      // Play the audio
      audio.play().then(() => {
        set({
          audio,
          isPlaying: true,
          currentTrack: url,
        });
      }).catch((error) => {
        console.error('Failed to play BGM:', error);
        set({ isPlaying: false, currentTrack: null });
      });

    } catch (error) {
      console.error('Error setting up BGM:', error);
    }
  },

  pauseBGM: () => {
    const { audio } = get();
    if (audio) {
      audio.pause();
      set({ isPlaying: false });
    }
  },

  stopBGM: () => {
    const { audio } = get();
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      set({ 
        isPlaying: false,
        currentTrack: null,
        audio: null,
      });
    }
  },

  setVolume: (volume) => {
    const { audio } = get();
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    if (audio) {
      audio.volume = clampedVolume;
    }
    
    set({ volume: clampedVolume });
  },

  nextTrack: () => {
    const { availableTracks, currentTrack } = get();
    if (availableTracks.length <= 1) return;

    const currentIndex = currentTrack ? availableTracks.indexOf(currentTrack) : -1;
    const nextIndex = (currentIndex + 1) % availableTracks.length;
    const nextTrack = availableTracks[nextIndex];
    
    get().playBGM(nextTrack);
  },

  loadTrack: (trackUrl) => {
    const { availableTracks } = get();
    if (!availableTracks.includes(trackUrl)) {
      set({
        availableTracks: [...availableTracks, trackUrl]
      });
    }
  },
}));
