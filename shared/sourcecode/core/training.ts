import { isDirection, type Direction, type TrainingItem } from './types';

export type RandomSource = () => number;

export interface ItemStatistics {
  completed: number;
  perfect: number;
  mistakes: number;
  totalDurationMs: number;
  bestDurationMs: number | null;
}

export interface SessionStatistics {
  completed: number;
  perfect: number;
  mistakes: number;
  correctInputs: number;
  streak: number;
  bestStreak: number;
  perStratagem: Record<string, ItemStatistics>;
}

export interface TrainingState {
  pool: readonly TrainingItem[];
  currentId: string | null;
  progress: number;
  bag: string[];
  mistakeQueue: string[];
  phase: 'normal' | 'review';
  attemptMistakes: number;
  attemptStartedAt: number | null;
  stats: SessionStatistics;
}

export interface TrainingOptions {
  rng?: RandomSource;
  nowMs?: number;
  repeatMistakes?: boolean;
}

export interface TrainingResult {
  state: TrainingState;
  event: 'correct' | 'mistake' | 'completed' | 'empty';
  /** The item receiving this input; on completion state already points to the next item. */
  item: TrainingItem | null;
  durationMs?: number;
}

export function emptyStatistics(): SessionStatistics {
  return { completed: 0, perfect: 0, mistakes: 0, correctInputs: 0, streak: 0, bestStreak: 0, perStratagem: {} };
}

function emptyItemStatistics(): ItemStatistics {
  return { completed: 0, perfect: 0, mistakes: 0, totalDurationMs: 0, bestDurationMs: null };
}

/** Fisher–Yates shuffle. The optional RNG makes training deterministic in tests. */
export function createShuffleBag(ids: readonly string[], rng: RandomSource = Math.random, previousId?: string | null): string[] {
  const bag = [...new Set(ids)];
  for (let index = bag.length - 1; index > 0; index -= 1) {
    const random = rng();
    if (!Number.isFinite(random) || random < 0 || random >= 1) throw new Error('The random source must return a number in [0, 1).');
    const target = Math.floor(random * (index + 1));
    [bag[index], bag[target]] = [bag[target]!, bag[index]!];
  }
  if (bag.length > 1 && bag[0] === previousId) [bag[0], bag[1]] = [bag[1]!, bag[0]!];
  return bag;
}

export function createTrainingState(pool: readonly TrainingItem[], rng: RandomSource = Math.random): TrainingState {
  const ids = new Set<string>();
  for (const item of pool) {
    if (!item.qualifiedId || ids.has(item.qualifiedId)) throw new Error('Training item IDs must be nonempty and unique.');
    if (item.sequence.length < 1 || item.sequence.length > 16 || item.sequence.some((direction) => !isDirection(direction))) {
      throw new Error('Training items must contain 1–16 valid directions.');
    }
    ids.add(item.qualifiedId);
  }
  const copiedPool = pool.map((item) => ({ ...item, sequence: [...item.sequence], ...(item.tags ? { tags: [...item.tags] } : {}), ...(item.source ? { source: [...item.source] } : {}) }));
  const bag = createShuffleBag([...ids], rng);
  return {
    pool: copiedPool,
    currentId: bag.shift() ?? null,
    progress: 0,
    bag,
    mistakeQueue: [],
    phase: 'normal',
    attemptMistakes: 0,
    attemptStartedAt: null,
    stats: emptyStatistics(),
  };
}

export function currentItem(state: TrainingState): TrainingItem | null {
  return state.pool.find((item) => item.qualifiedId === state.currentId) ?? null;
}

function advance(state: TrainingState, previousId: string, options: TrainingOptions): TrainingState {
  let bag = [...state.bag];
  let phase = state.phase;
  let mistakeQueue = options.repeatMistakes === false ? [] : [...state.mistakeQueue];
  if (bag.length === 0) {
    if (phase === 'normal' && mistakeQueue.length > 0) {
      // Each missed item gets one extra attempt after the full current bag.
      bag = createShuffleBag(mistakeQueue, options.rng, previousId);
      mistakeQueue = [];
      phase = 'review';
    } else {
      bag = createShuffleBag(state.pool.map((item) => item.qualifiedId), options.rng, previousId);
      phase = 'normal';
    }
  }
  return { ...state, bag: bag.slice(1), currentId: bag[0] ?? null, phase, mistakeQueue, progress: 0, attemptMistakes: 0, attemptStartedAt: null };
}

/** Pure state transition; a wrong direction resets the entered prefix. */
export function applyDirection(state: TrainingState, direction: Direction, options: TrainingOptions = {}): TrainingResult {
  if (!isDirection(direction)) throw new Error('Expected up, down, left, or right.');
  const item = currentItem(state);
  if (!item) return { state, event: 'empty', item: null };
  const nowMs = options.nowMs ?? Date.now();
  if (!Number.isFinite(nowMs) || nowMs < 0) throw new Error('Input time must be a nonnegative finite number.');
  const attemptStartedAt = state.attemptStartedAt ?? nowMs;
  const itemStats = state.stats.perStratagem[item.qualifiedId] ?? emptyItemStatistics();
  if (direction !== item.sequence[state.progress]) {
    const mistakeQueue = options.repeatMistakes === false ? [] : [...new Set([...state.mistakeQueue, item.qualifiedId])];
    return {
      event: 'mistake',
      item,
      state: {
        ...state,
        progress: 0,
        attemptStartedAt,
        attemptMistakes: state.attemptMistakes + 1,
        mistakeQueue,
        stats: {
          ...state.stats,
          mistakes: state.stats.mistakes + 1,
          streak: 0,
          perStratagem: { ...state.stats.perStratagem, [item.qualifiedId]: { ...itemStats, mistakes: itemStats.mistakes + 1 } },
        },
      },
    };
  }
  const progress = state.progress + 1;
  const stats = { ...state.stats, correctInputs: state.stats.correctInputs + 1 };
  if (progress < item.sequence.length) return { state: { ...state, progress, attemptStartedAt, stats }, event: 'correct', item };

  const durationMs = Math.max(0, nowMs - attemptStartedAt);
  const perfect = state.attemptMistakes === 0;
  const streak = perfect ? stats.streak + 1 : 0;
  const completedStats: SessionStatistics = {
    ...stats,
    completed: stats.completed + 1,
    perfect: stats.perfect + Number(perfect),
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    perStratagem: {
      ...stats.perStratagem,
      [item.qualifiedId]: {
        ...itemStats,
        completed: itemStats.completed + 1,
        perfect: itemStats.perfect + Number(perfect),
        totalDurationMs: itemStats.totalDurationMs + durationMs,
        bestDurationMs: itemStats.bestDurationMs === null ? durationMs : Math.min(itemStats.bestDurationMs, durationMs),
      },
    },
  };
  return { state: advance({ ...state, stats: completedStats }, item.qualifiedId, options), event: 'completed', item, durationMs };
}

export function inputAccuracy(stats: Pick<SessionStatistics, 'correctInputs' | 'mistakes'>): number {
  const attempts = stats.correctInputs + stats.mistakes;
  return attempts === 0 ? 0 : stats.correctInputs / attempts;
}

export function completionAccuracy(stats: Pick<SessionStatistics, 'completed' | 'perfect'>): number {
  return stats.completed === 0 ? 0 : stats.perfect / stats.completed;
}

/** Merge independent sessions for persistent lifetime statistics. */
export function mergeStatistics(left: SessionStatistics, right: SessionStatistics): SessionStatistics {
  const perStratagem: Record<string, ItemStatistics> = {};
  for (const id of new Set([...Object.keys(left.perStratagem), ...Object.keys(right.perStratagem)])) {
    const first = left.perStratagem[id] ?? emptyItemStatistics();
    const second = right.perStratagem[id] ?? emptyItemStatistics();
    const times = [first.bestDurationMs, second.bestDurationMs].filter((value): value is number => value !== null);
    perStratagem[id] = {
      completed: first.completed + second.completed,
      perfect: first.perfect + second.perfect,
      mistakes: first.mistakes + second.mistakes,
      totalDurationMs: first.totalDurationMs + second.totalDurationMs,
      bestDurationMs: times.length === 0 ? null : Math.min(...times),
    };
  }
  return {
    completed: left.completed + right.completed,
    perfect: left.perfect + right.perfect,
    mistakes: left.mistakes + right.mistakes,
    correctInputs: left.correctInputs + right.correctInputs,
    streak: right.streak,
    bestStreak: Math.max(left.bestStreak, right.bestStreak),
    perStratagem,
  };
}
