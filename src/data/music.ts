// 배경음악 (직접 작곡한 짧은 루프).
// 음표: 음이름+옥타브.길이 (길이 단위 = 8분음표). r = 쉼표, k/s/h = 킥/스네어/하이햇. | 는 마디 구분용.
export interface Track {
  wave: 'pulse' | 'square' | 'triangle' | 'sawtooth' | 'sine';
  vol: number;
  notes: string;
}
export interface Song {
  bpm: number;
  loop: boolean;
  tracks: Track[];
}

const lead = (notes: string, vol = 0.12): Track => ({ wave: 'pulse', vol, notes });
const bass = (notes: string, vol = 0.22): Track => ({ wave: 'triangle', vol, notes });
const drum = (notes: string, vol = 0.12): Track => ({ wave: 'square', vol, notes });
const rep = (s: string, n: number) => Array(n).fill(s).join(' | ');

export const SONGS: Record<string, Song> = {
  title: {
    bpm: 116,
    loop: true,
    tracks: [
      lead('C5.2 E5.2 G5.2 E5.2 | F5.2 A5.2 G5.4 | E5.2 G5.2 C6.2 B5.2 | A5.2 G5.2 E5.4 | F5.2 E5.2 D5.2 C5.2 | D5.2 E5.2 F5.4 | E5.2 D5.2 G4.2 B4.2 | C5.6 r.2'),
      bass('C3.4 G3.4 | F3.4 C3.4 | A2.4 E3.4 | F3.4 C3.4 | D3.4 A3.4 | G3.4 D3.4 | C3.4 G2.4 | C3.8'),
      drum(rep('k.2 h.2 s.2 h.2', 8)),
    ],
  },
  town: {
    bpm: 100,
    loop: true,
    tracks: [
      lead('A4.2 C5.2 F5.3 E5.1 | D5.2 C5.2 A4.4 | A#4.2 D5.2 F5.3 E5.1 | C5.6 r.2 | A4.2 C5.2 F5.3 G5.1 | A5.2 G5.2 F5.4 | G5.2 F5.2 E5.2 D5.2 | F5.6 r.2', 0.1),
      bass('F3.4 C3.4 | A#2.4 F3.4 | A#2.4 F3.4 | C3.4 C3.4 | F3.4 A3.4 | D3.4 A#2.4 | C3.4 C3.4 | F3.8'),
      drum(rep('k.2 r.2 h.2 r.2', 8), 0.08),
    ],
  },
  route: {
    bpm: 132,
    loop: true,
    tracks: [
      lead('D5.1 D5.1 G5.2 F#5.2 E5.2 | D5.2 B4.2 D5.4 | C5.2 E5.2 A5.2 G5.2 | F#5.2 E5.2 D5.4 | B4.2 D5.2 G5.2 B5.2 | A5.2 G5.2 E5.4 | F#5.2 A5.2 D6.2 C6.2 | B5.6 r.2'),
      bass('G2.2 D3.2 G3.2 D3.2 | G2.2 D3.2 G3.2 D3.2 | C3.2 G3.2 C3.2 G3.2 | D3.2 A3.2 D3.2 A3.2 | E3.2 B3.2 E3.2 B3.2 | C3.2 G3.2 C3.2 G3.2 | D3.2 A3.2 D3.2 F#3.2 | G2.2 D3.2 G3.4'),
      drum(rep('k.2 h.2 s.2 h.2', 8)),
    ],
  },
  // 숲, 동굴
  dungeon: {
    bpm: 112,
    loop: true,
    tracks: [
      lead('A4.2 C5.2 E5.2 D5.2 | C5.2 B4.2 A4.4 | G4.2 B4.2 D5.2 C5.2 | B4.4 E4.4 | A4.2 C5.2 E5.2 A5.2 | G#5.2 E5.2 B4.4 | C5.2 D5.2 E5.2 F5.2 | E5.6 r.2', 0.1),
      bass('A2.4 E3.4 | F2.4 C3.4 | G2.4 D3.4 | E2.4 B2.4 | A2.4 E3.4 | E2.4 G#2.4 | F2.4 D2.4 | E2.4 E2.4'),
      drum(rep('k.2 r.2 h.2 r.2', 8), 0.07),
    ],
  },
  center: {
    bpm: 92,
    loop: true,
    tracks: [
      lead('E5.2 G5.2 C6.4 | B5.2 G5.2 E5.4 | F5.2 A5.2 D6.4 | C6.6 r.2', 0.09),
      bass('C3.4 E3.4 | G2.4 G3.4 | F2.4 A2.4 | C3.8'),
    ],
  },
  gym: {
    bpm: 138,
    loop: true,
    tracks: [
      lead('E5.2 G5.2 B5.2 E6.2 | D6.2 B5.2 A5.4 | C6.2 B5.2 A5.2 G5.2 | F#5.4 B4.4 | E5.2 G5.2 B5.2 E6.2 | F#6.2 E6.2 D6.4 | C6.2 D6.2 E6.2 F#6.2 | E6.6 r.2'),
      bass('E2.2 B2.2 E3.2 B2.2 | D2.2 A2.2 D3.2 A2.2 | C2.2 G2.2 C3.2 G2.2 | B1.2 F#2.2 B2.2 F#2.2 | E2.2 B2.2 E3.2 B2.2 | D2.2 A2.2 D3.2 A2.2 | C2.2 G2.2 A2.2 B2.2 | E2.4 E2.4'),
      drum(rep('k.2 h.2 s.2 h.1 k.1', 8)),
    ],
  },
  battleWild: {
    bpm: 156,
    loop: true,
    tracks: [
      lead('E5.2 A5.2 C6.2 B5.1 A5.1 | G5.2 E5.2 D5.4 | F5.2 A5.2 C6.2 D6.2 | C6.2 B5.2 A5.4 | G5.2 B5.2 D6.2 C6.1 B5.1 | A5.2 G5.2 E5.4 | G#5.2 B5.2 E6.2 D6.2 | B5.4 G#5.4'),
      bass([rep('A2.1 A3.1', 4), rep('A2.1 A3.1', 4), rep('F2.1 F3.1', 4), rep('F2.1 F3.1', 4), rep('G2.1 G3.1', 4), rep('G2.1 G3.1', 4), rep('E2.1 E3.1', 4), rep('E2.1 E3.1', 4)].join(' | ')),
      drum(rep('k.1 r.1 h.1 r.1 s.1 r.1 h.1 h.1', 8)),
    ],
  },
  battleTrainer: {
    bpm: 164,
    loop: true,
    tracks: [
      lead('D5.1 F5.1 A5.2 D6.2 C6.1 A5.1 | A#5.2 A5.2 F5.4 | F5.1 A#5.1 D6.2 F6.2 E6.1 D6.1 | C6.2 A#5.2 A5.4 | E5.1 G5.1 C6.2 E6.2 D6.1 C6.1 | A#5.2 A5.2 G5.4 | C#5.2 E5.2 A5.2 C#6.2 | E6.4 A5.4'),
      bass([rep('D2.1 D3.1', 4), rep('D2.1 D3.1', 4), rep('A#1.1 A#2.1', 4), rep('A#1.1 A#2.1', 4), rep('C2.1 C3.1', 4), rep('C2.1 C3.1', 4), rep('A1.1 A2.1', 4), rep('A1.1 A2.1', 4)].join(' | ')),
      drum(rep('k.1 h.1 s.1 h.1 k.1 k.1 s.1 h.1', 8)),
    ],
  },
  // 엔딩 크레딧: 천천히, 부드럽게. 앞 여덟 마디는 혼자, 뒤 여덟 마디는 화음이 따라온다
  ending: {
    bpm: 72,
    loop: true,
    tracks: [
      { wave: 'triangle', vol: 0.16, notes: 'E5.4 D5.2 C5.2 | D5.4 E5.2 G5.2 | A5.4 G5.2 E5.2 | D5.6 r.2 | C5.4 D5.2 E5.2 | F5.4 E5.2 D5.2 | E5.4 C5.2 A4.2 | G4.6 r.2 | A4.2 C5.2 F5.4 | E5.2 D5.2 C5.4 | D5.2 E5.2 A5.4 | G5.6 r.2 | F5.2 E5.2 D5.4 | E5.2 G5.2 C6.4 | B5.2 A5.2 G5.2 D5.2 | C5.8' },
      { wave: 'sine', vol: 0.07, notes: 'r.8 | r.8 | r.8 | r.8 | r.8 | r.8 | r.8 | r.8 | F4.4 A4.4 | G4.4 E4.4 | F4.4 C5.4 | B4.6 r.2 | A4.4 F4.4 | G4.4 E5.4 | D5.4 B4.4 | E4.8' },
      bass('C3.4 G3.4 | G2.4 D3.4 | A2.4 E3.4 | G2.4 B2.4 | A2.4 E3.4 | F2.4 C3.4 | C3.4 A2.4 | G2.8 | F2.4 C3.4 | C3.4 G2.4 | D3.4 A2.4 | G2.4 D3.4 | D3.4 A2.4 | C3.4 G2.4 | G2.4 G2.4 | C3.8', 0.16),
    ],
  },
  victory: {
    bpm: 140,
    loop: false,
    tracks: [
      lead('G4.1 C5.1 E5.1 G5.3 E5.1 G5.1 | C6.6 r.2 | E5.2 D5.2 C5.2 G4.2 | A4.2 B4.2 C5.4 | F5.2 E5.2 D5.2 C5.2 | D5.2 G5.2 C6.4'),
      bass('C3.2 G2.2 C3.4 | C3.8 | C3.4 E3.4 | F3.4 G3.4 | F3.4 A3.4 | G3.4 C3.4'),
    ],
  },
};
