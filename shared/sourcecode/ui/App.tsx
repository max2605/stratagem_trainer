import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyDirection,
  buildPool,
  completionAccuracy,
  createTrainingState,
  currentItem,
  DEFAULT_KEY_BINDINGS,
  DIRECTIONS,
  directionForKey,
  emptyStatistics,
  formatKeyCode,
  inputAccuracy,
  mergeStatistics,
  parsePack,
  validateKeyBindings,
  validatePack,
  type Direction,
  type Pack,
  type TrainingState,
} from "../core";
import { builtInPacks } from "../data/catalog";
import de from "../../application/lang/de.json";
import en from "../../application/lang/en.json";
import { downloadPack, errorHaptic, exportJSON, readFile } from "./io";
import {
  DEFAULT_SETTINGS,
  loadProfile,
  PROFILE_KEY,
  validateProfile,
  type Profile,
  type Settings,
} from "./profile";

const ARROWS: Record<Direction, string> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};
const WASD: Record<Direction, string> = {
  up: "W",
  down: "S",
  left: "A",
  right: "D",
};
type Tab = "training" | "library" | "editor" | "stats" | "settings";
type Mode = "random" | "groupMode" | "mistakesMode" | "favoritesMode";
const freshPack = (): Pack => ({
  schemaVersion: 1,
  id: `custom-${Date.now().toString(36)}`,
  name: "",
  kind: "custom",
  stratagems: [],
});
const icons: Record<Tab, string> = {
  training: "⌘",
  library: "▦",
  editor: "＋",
  stats: "◷",
  settings: "⚙",
};
function seconds(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function App() {
  const [profile, setProfile] = useState<Profile>(() =>
    loadProfile(builtInPacks.map((p) => p.id)),
  );
  const [tab, setTab] = useState<Tab>("training");
  const [mode, setMode] = useState<Mode>("random");
  const [groupId, setGroupId] = useState("");
  const [active, setActive] = useState(false);
  const [started, setStarted] = useState(false);
  const [hint, setHint] = useState(profile.settings.showHint);
  const [toast, setToast] = useState("");
  const [feedback, setFeedback] = useState("");
  const [search, setSearch] = useState("");
  const [groupSelection, setGroupSelection] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<Pack>(freshPack);
  const [jsonDraft, setJsonDraft] = useState("");
  const [capture, setCapture] = useState<Direction | null>(null);
  const [confirm, setConfirm] = useState("");
  const [remaining, setRemaining] = useState(profile.settings.timeLimit);
  const timerRunning = useRef(false);
  const sessionBase = useRef(profile.statistics);
  const audioRef = useRef<AudioContext | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLInputElement>(null);
  const clock = useRef({ total: 0, start: 0 });
  const packs = useMemo(
    () => [
      ...builtInPacks,
      ...profile.customPacks.filter(
        (p) => !builtInPacks.some((b) => b.id === p.id),
      ),
    ],
    [profile.customPacks],
  );
  const allItems = useMemo(
    () =>
      buildPool(
        packs,
        packs.map((p) => p.id),
      ),
    [packs],
  );
  const selectedItems = useMemo(
    () =>
      mode === "groupMode"
        ? (profile.groups.find((g) => g.id === groupId)?.items ?? [])
        : mode === "favoritesMode"
          ? profile.favorites
          : mode === "mistakesMode"
            ? Object.keys(profile.statistics.perStratagem).filter(
                (id) => profile.statistics.perStratagem[id].mistakes > 0,
              )
            : undefined,
    [mode, groupId, profile.groups, profile.favorites],
  );
  // Mistake-mode pool is fixed on entering the mode; progressing must not reshuffle it.
  const pool = useMemo(
    () =>
      buildPool(
        packs,
        mode === "random" ? profile.selectedPackIds : packs.map((p) => p.id),
        selectedItems,
      ),
    [packs, profile.selectedPackIds, mode, selectedItems],
  );
  const [training, setTraining] = useState<TrainingState>(() =>
    createTrainingState(pool),
  );
  const trainingRef = useRef(training);
  trainingRef.current = training;
  const dictionary = (profile.settings.language === "de" ? de : en) as Record<
    string,
    string
  >;
  const t = (key: string) => dictionary[key] ?? key;
  const setting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) =>
      setProfile((p) => ({ ...p, settings: { ...p.settings, [key]: value } })),
    [],
  );
  const notify = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    document.documentElement.lang = profile.settings.language;
  }, [profile.settings.language]);
  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      setToast(t("storageFailed"));
    }
  }, [profile]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!confirm) return;
    const timer = setTimeout(() => setConfirm(""), 5000);
    return () => clearTimeout(timer);
  }, [confirm]);
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(""), 1100);
    return () => clearTimeout(timer);
  }, [feedback]);
  const restart = useCallback(() => {
    sessionBase.current = profile.statistics;
    const state = createTrainingState(pool);
    trainingRef.current = state;
    setTraining(state);
    timerRunning.current = false;
    setRemaining(profile.settings.timeLimit);
    setFeedback("");
  }, [pool, profile.settings.timeLimit, profile.statistics]);
  useEffect(() => {
    sessionBase.current = profile.statistics;
    const state = createTrainingState(pool);
    trainingRef.current = state;
    setTraining(state);
    setActive(false);
    setStarted(false);
    timerRunning.current = false;
    setRemaining(profile.settings.timeLimit);
  }, [pool]);
  useEffect(() => {
    const visible = () => {
      if (document.hidden) setActive(false);
    };
    document.addEventListener("visibilitychange", visible);
    return () => document.removeEventListener("visibilitychange", visible);
  }, []);
  useEffect(() => {
    if (!active) return;
    clock.current.start = performance.now();
    return () => {
      clock.current.total += performance.now() - clock.current.start;
      clock.current.start = 0;
    };
  }, [active]);
  function beep(wrong: boolean) {
    if (!profile.settings.sound) return;
    try {
      const context =
        audioRef.current ?? (audioRef.current = new AudioContext());
      void context.resume();
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.frequency.value = wrong ? 160 : 620;
      gain.gain.setValueAtTime(0.04, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start();
      osc.stop(context.currentTime + 0.08);
    } catch {}
  }
  const submit = useCallback(
    (direction: Direction, timeout = false) => {
      if (!active || tab !== "training") return;
      const previous = trainingRef.current;
      const result = applyDirection(previous, direction, {
        repeatMistakes: profile.settings.repeatMistakes,
        nowMs:
          clock.current.total +
          (clock.current.start ? performance.now() - clock.current.start : 0),
      });
      if (result.event === "empty") return;
      trainingRef.current = result.state;
      setTraining(result.state);
      setProfile((p) => ({
        ...p,
        statistics: mergeStatistics(sessionBase.current, result.state.stats),
      }));
      if (result.event === "mistake") {
        setFeedback(timeout ? "timedOut" : "wrong");
        beep(true);
        if (profile.settings.haptics) errorHaptic();
        timerRunning.current = false;
        setRemaining(profile.settings.timeLimit);
      } else {
        beep(false);
        if (result.event === "completed") {
          setFeedback("correct");
          timerRunning.current = false;
          setRemaining(profile.settings.timeLimit);
        } else timerRunning.current = true;
      }
    },
    [active, tab, profile.settings],
  );
  useEffect(() => {
    if (!active || !profile.settings.timeLimit) return;
    const timer = setInterval(() => {
      if (timerRunning.current)
        setRemaining((value) => Math.max(0, value - 0.1));
    }, 100);
    return () => clearInterval(timer);
  }, [active, profile.settings.timeLimit]);
  useEffect(() => {
    if (remaining > 0 || !active || !timerRunning.current) return;
    const state = trainingRef.current;
    const item = currentItem(state);
    if (item)
      submit(
        DIRECTIONS.find((d) => d !== item.sequence[state.progress])!,
        true,
      );
  }, [remaining, active, submit]);
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat)
        return;
      if (capture) {
        event.preventDefault();
        if (event.code === "Escape") {
          setCapture(null);
          return;
        }
        try {
          const keys = {
            ...profile.settings.keys,
            [capture]: [
              event.code,
              ...DEFAULT_KEY_BINDINGS[capture].filter(
                (k) => k.startsWith("Arrow") && k !== event.code,
              ),
            ],
          };
          setting("keys", validateKeyBindings(keys));
          setCapture(null);
        } catch {
          notify(t("keyDuplicate"));
        }
        return;
      }
      if (
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName))
      )
        return;
      if (tab !== "training") return;
      const direction = directionForKey(event.code, profile.settings.keys);
      if (direction) {
        event.preventDefault();
        submit(direction);
        return;
      }
      if (event.code === "Escape") {
        event.preventDefault();
        if (started) setActive((value) => !value);
      }
      if (event.code === "KeyR") {
        event.preventDefault();
        setTraining((state) => {
          const next = { ...state, progress: 0 };
          trainingRef.current = next;
          return next;
        });
      }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [capture, profile.settings.keys, tab, started, submit, setting, notify]);
  const item = currentItem(training);
  const label = (direction: Direction) =>
    profile.settings.display === "arrows"
      ? ARROWS[direction]
      : profile.settings.display === "wasd"
        ? WASD[direction]
        : profile.settings.labels[direction];
  function togglePack(id: string) {
    setProfile((p) => ({
      ...p,
      selectedPackIds: p.selectedPackIds.includes(id)
        ? p.selectedPackIds.filter((i) => i !== id)
        : [...p.selectedPackIds, id],
    }));
  }
  function toggleFavorite(id: string) {
    setProfile((p) => ({
      ...p,
      favorites: p.favorites.includes(id)
        ? p.favorites.filter((i) => i !== id)
        : [...p.favorites, id],
    }));
  }
  function putPack(pack: Pack) {
    const validated = validatePack(pack);
    if (builtInPacks.some((b) => b.id === validated.id))
      validated.id = `custom-${validated.id}`;
    setProfile((p) => ({
      ...p,
      customPacks: [
        ...p.customPacks.filter((b) => b.id !== validated.id),
        validated,
      ],
      selectedPackIds: [...new Set([...p.selectedPackIds, validated.id])],
    }));
    setDraft(validated);
    notify(t("saved"));
  }
  function handleError(error: unknown) {
    const e = error as { message?: string; code?: string; path?: string };
    notify(
      e.code?.startsWith("pack.")
        ? `${t("invalidPack")}: ${e.code.replace("pack.", "")} (${e.path ?? ""})`
        : e.message && dictionary[e.message]
          ? t(e.message)
          : `${t("downloadError")} ${e.message ?? ""}`,
    );
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      putPack(parsePack(await readFile(file)));
      notify(t("imported"));
      setTab("library");
    } catch (error) {
      handleError(error);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }
  async function importURL() {
    setLoading(true);
    try {
      putPack(await downloadPack(url));
      notify(t("imported"));
      setUrl("");
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }
  function editPack(pack: Pack) {
    const copy = structuredClone(pack);
    if (builtInPacks.some((b) => b.id === copy.id)) {
      copy.id = `custom-${copy.id}`;
      copy.kind = "custom";
    }
    setDraft(copy);
    setJsonDraft("");
    setTab("editor");
  }
  function deletePack(id: string) {
    if (confirm !== id) {
      setConfirm(id);
      return;
    }
    setProfile((p) => ({
      ...p,
      customPacks: p.customPacks.filter((b) => b.id !== id),
      selectedPackIds: p.selectedPackIds.filter((i) => i !== id),
    }));
    setConfirm("");
  }
  function changeEntry(
    index: number,
    update: Partial<Pack["stratagems"][number]>,
  ) {
    setDraft((p) => ({
      ...p,
      stratagems: p.stratagems.map((s, i) =>
        i === index ? { ...s, ...update } : s,
      ),
    }));
  }
  const doExport = (filename: string, data: unknown) =>
    exportJSON(filename, data).catch(handleError);
  async function restore(file?: File) {
    if (!file) return;
    try {
      const data = JSON.parse(await readFile(file, 32 * 1024 * 1024));
      if (data.format !== "stratagem-trainer-backup" || data.version !== 1)
        throw new Error("invalidBackup");
      const restored = validateProfile(
        data.profile,
        builtInPacks.map((p) => p.id),
      );
      setActive(false);
      sessionBase.current = restored.statistics;
      setProfile((p) => ({
        ...restored,
        customPacks: [
          ...p.customPacks.filter(
            (c) => !restored.customPacks.some((r) => r.id === c.id),
          ),
          ...restored.customPacks,
        ],
      }));
      notify(t("restored"));
    } catch (error) {
      handleError(error);
    } finally {
      if (restoreRef.current) restoreRef.current.value = "";
    }
  }
  const totals = profile.statistics;
  const filtered = packs.filter((p) =>
    `${p.name} ${p.stratagems.map((s) => s.name).join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div
      className={`app ${profile.settings.reducedMotion ? "reduced-motion" : ""} ${profile.settings.leftHand ? "left-hand" : ""} ${tab === "training" && started ? "in-session" : ""} ${tab === "training" && active ? "is-running" : ""}`}
    >
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("training");
          }}
        >
          <span className="brand-mark">↑</span>
          <span>
            STRATAGEM<strong>TRAINER</strong>
          </span>
        </a>
        <div className="side-label">SUPER EARTH / TRAINING</div>
        <nav>
          {(
            ["training", "library", "editor", "stats", "settings"] as Tab[]
          ).map((key) => (
            <button
              key={key}
              aria-label={t(key)}
              className={tab === key ? "nav-item active" : "nav-item"}
              onClick={() => {
                setTab(key);
                if (key !== "training") setActive(false);
              }}
            >
              <span>{icons[key]}</span>
              {t(key)}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <span className="status-dot" />
          {t("installReady")}
          <p>v1.0.0 · DE / EN</p>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">HELLDIVERS 2</span>
            <p>{t("tagline")}</p>
          </div>
          <select
            aria-label={t("language")}
            value={profile.settings.language}
            onChange={(e) => setting("language", e.target.value as "de" | "en")}
          >
            <option value="de">DE</option>
            <option value="en">EN</option>
          </select>
        </header>
        <main>
          {tab === "training" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">01 / {t("training")}</span>
                  <h1>{t("session")}</h1>
                </div>
                <button className="secondary" onClick={() => setTab("library")}>
                  ▦ {t("choosePacks")}
                </button>
              </div>
              <div className="training-options">
                <select
                  aria-label={t("session")}
                  value={mode}
                  onChange={(e) => setMode(e.target.value as Mode)}
                >
                  {(
                    [
                      "random",
                      "groupMode",
                      "mistakesMode",
                      "favoritesMode",
                    ] as Mode[]
                  ).map((m) => (
                    <option key={m} value={m}>
                      {t(m)}
                    </option>
                  ))}
                </select>
                {mode === "groupMode" && (
                  <select
                    aria-label={t("selectGroup")}
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                  >
                    <option value="">{t("selectGroup")}</option>
                    {profile.groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                )}
                <span className="pool-count">
                  {pool.length} {t("activePool")}
                </span>
              </div>
              <div className="session-metrics">
                <div>
                  <small>{t("completed")}</small>
                  <strong>
                    {training.stats.completed.toString().padStart(2, "0")}
                  </strong>
                </div>
                <div>
                  <small>{t("accuracy")}</small>
                  <strong>
                    {Math.round(inputAccuracy(training.stats) * 100)}
                    <em>%</em>
                  </strong>
                </div>
                <div>
                  <small>{t("streak")}</small>
                  <strong>
                    {training.stats.streak.toString().padStart(2, "0")}
                  </strong>
                </div>
                <div>
                  <small>{t("bestStreak")}</small>
                  <strong>
                    {training.stats.bestStreak.toString().padStart(2, "0")}
                  </strong>
                </div>
              </div>
              <div className="practice-layout">
                <section
                  className={`command-card ${feedback === "wrong" || feedback === "timedOut" ? "has-error" : ""}`}
                >
                  <div className="command-top">
                    <span className="eyebrow">
                      {training.phase === "review"
                        ? t("mistakesMode")
                        : t("ready")}
                    </span>
                    <span className="badge">{item?.packName ?? "—"}</span>
                  </div>
                  <div className="command-emblem">↟</div>
                  <h2 data-testid="current-name">
                    {item?.name ?? t("pressStart")}
                  </h2>
                  {item && (
                    <p className="command-category">
                    {item.category ? t(`category_${item.category}`) : item.packName}
                    </p>
                  )}
                  <div
                    className="sequence"
                    aria-label={t("sequence")}
                    data-testid="sequence"
                  >
                    {item?.sequence.map((direction, i) => (
                      <span
                        key={i}
                        className={`sequence-key ${i < training.progress ? "entered" : ""} ${i === training.progress && active ? "current" : ""}`}
                        data-direction={direction}
                      >
                        {hint || i < training.progress
                          ? ARROWS[direction]
                          : "·"}
                      </span>
                    ))}
                  </div>
                  <div className="progress-track">
                    <div
                      style={{
                        width: `${item ? (training.progress / item.sequence.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="feedback" role="status">
                    {feedback
                      ? t(feedback)
                      : started && !active
                        ? t("paused")
                        : pool.length
                          ? `${training.progress} / ${item?.sequence.length ?? 0}`
                          : t("emptyPool")}
                  </div>
                  {profile.settings.timeLimit > 0 && (
                    <p className="timer">
                      {remaining.toFixed(1)} {t("remaining")}
                    </p>
                  )}
                  <div className="command-actions">
                    <button
                      className="primary"
                      disabled={!pool.length}
                      onClick={() => {
                        if (!started) {
                          restart();
                          setStarted(true);
                          setHint(profile.settings.showHint);
                        }
                        setActive((value) => !value);
                      }}
                    >
                      {!started
                        ? `▶ ${t("start")}`
                        : active
                          ? `Ⅱ ${t("pause")}`
                          : `▶ ${t("resume")}`}
                    </button>
                    <button
                      className="icon-button"
                      aria-label={t("restart")}
                      title={t("restart")}
                      onClick={restart}
                    >
                      ↻
                    </button>
                    <button
                      className="icon-button"
                      aria-label={t(hint ? "hideHint" : "showHint")}
                      title={t("hintHelp")}
                      onClick={() => setHint((h) => !h)}
                    >
                      {hint ? "◉" : "◎"}
                    </button>
                  </div>
                </section>
                <section className="input-pad">
                  <div className="pad-heading">
                    <span className="eyebrow">{t("controls")}</span>
                    <span>
                      {profile.settings.display === "wasd"
                        ? "WASD"
                        : t(
                            profile.settings.display === "custom"
                              ? "customDisplay"
                              : "arrows",
                          )}
                    </span>
                  </div>
                  <div className="dpad">
                    {(["up", "left", "down", "right"] as Direction[]).map(
                      (direction) => (
                        <button
                          key={direction}
                          className={`pad-key pad-${direction}`}
                          aria-label={t(direction)}
                          data-testid={`pad-${direction}`}
                          disabled={!active}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            submit(direction);
                          }}
                          onClick={(e) => {
                            if (e.detail === 0) submit(direction);
                          }}
                        >
                          <span>{label(direction)}</span>
                          <small>
                            {formatKeyCode(profile.settings.keys[direction][0])}
                          </small>
                        </button>
                      ),
                    )}
                  </div>
                  <p className="keyboard-help">{t("keyboardHelp")}</p>
                </section>
              </div>
              {mode === "groupMode" && !pool.length && (
                <p className="help">{t("noGroups")}</p>
              )}
              {mode === "favoritesMode" && !pool.length && (
                <p className="help">{t("noFavorites")}</p>
              )}
              {mode === "mistakesMode" && !pool.length && (
                <p className="help">{t("noMistakes")}</p>
              )}
              <p className="training-footer">
                {t("selectedPacks")}: {profile.selectedPackIds.length}{" "}
                <span>JSON · OFFLINE · {t("repeatMistakes")}</span>
              </p>
            </>
          )}
          {tab === "library" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">02 / {t("library")}</span>
                  <h1>{t("choosePacks")}</h1>
                </div>
                <button
                  className="primary"
                  onClick={() => inputRef.current?.click()}
                >
                  ＋ {t("importFile")}
                </button>
              </div>
              <div className="panel import-panel">
                <label>
                  {t("urlLabel")}
                  <div className="inline">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://…/warbond.json"
                    />
                    <button
                      className="secondary"
                      onClick={importURL}
                      disabled={!url || loading}
                    >
                      {loading ? t("loading") : t("download")}
                    </button>
                  </div>
                </label>
                <p className="help">{t("downloadHint")}</p>
              </div>
              <div className="library-toolbar">
                <input
                  aria-label={t("search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`⌕ ${t("search")}`}
                />
                <button
                  className="subtle"
                  onClick={() =>
                    setProfile((p) => ({
                      ...p,
                      selectedPackIds: packs.map((p) => p.id),
                    }))
                  }
                >
                  {t("all")}
                </button>
                <button
                  className="subtle"
                  onClick={() =>
                    setProfile((p) => ({ ...p, selectedPackIds: [] }))
                  }
                >
                  {t("none")}
                </button>
              </div>
              <div className="group-builder">
                <span>
                  {groupSelection.length} {t("selected")}
                </span>
                <input
                  aria-label={t("groupName")}
                  placeholder={t("groupName")}
                  value={groupName}
                  maxLength={100}
                  onChange={(e) => setGroupName(e.target.value)}
                />
                <button
                  className="secondary"
                  disabled={!groupSelection.length || !groupName.trim()}
                  onClick={() => {
                    const id = `group-${Date.now().toString(36)}`;
                    setProfile((p) => ({
                      ...p,
                      groups: [
                        ...p.groups,
                        { id, name: groupName.trim(), items: groupSelection },
                      ],
                    }));
                    setGroupSelection([]);
                    setGroupName("");
                    setGroupId(id);
                    notify(t("saved"));
                  }}
                >
                  {t("createGroup")}
                </button>
              </div>
              {profile.groups.length > 0 && (
                <div className="group-chips">
                  {profile.groups.map((g) => (
                    <span className="chip" key={g.id}>
                      <button
                        onClick={() => {
                          setGroupId(g.id);
                          setMode("groupMode");
                          setTab("training");
                        }}
                      >
                        {g.name} ({g.items.length})
                      </button>
                      <button
                        aria-label={`${t("deleteGroup")} ${g.name}`}
                        onClick={() =>
                          setProfile((p) => ({
                            ...p,
                            groups: p.groups.filter(
                              (group) => group.id !== g.id,
                            ),
                          }))
                        }
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="pack-grid">
                {filtered.map((pack) => (
                  <details
                    className={`pack-card ${profile.selectedPackIds.includes(pack.id) ? "selected-pack" : ""}`}
                    key={pack.id}
                    open={!!search}
                  >
                    <summary>
                      <input
                        type="checkbox"
                        aria-label={pack.name}
                        checked={profile.selectedPackIds.includes(pack.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => togglePack(pack.id)}
                      />
                      <div>
                        <span className="eyebrow">{t(pack.kind)}</span>
                        <h3>{pack.name}</h3>
                        <p>
                          {pack.stratagems.length
                            ? `${pack.stratagems.length} ${t("entries")}`
                            : t("emptyPack")}
                        </p>
                      </div>
                      <span className="expand">＋</span>
                    </summary>
                    <p className="pack-description">{pack.description}</p>
                    <div className="pack-actions">
                      <button className="subtle" onClick={() => editPack(pack)}>
                        {t("copyPack")}
                      </button>
                      <button
                        className="subtle"
                        onClick={() => doExport(`${pack.id}.json`, pack)}
                      >
                        {t("export")}
                      </button>
                      {profile.customPacks.some((p) => p.id === pack.id) && (
                        <button
                          className="subtle danger"
                          onClick={() => deletePack(pack.id)}
                        >
                          {t(confirm === pack.id ? "deleteConfirm" : "delete")}
                        </button>
                      )}
                    </div>
                    {pack.stratagems
                      .filter(
                        (s) =>
                          !search ||
                          `${pack.name} ${s.name}`
                            .toLowerCase()
                            .includes(search.toLowerCase()),
                      )
                      .map((s) => {
                        const id = `${pack.id}:${s.id}`;
                        return (
                          <div className="library-entry" key={id}>
                            <input
                              type="checkbox"
                              aria-label={`${t("group")} ${s.name}`}
                              checked={groupSelection.includes(id)}
                              onChange={() =>
                                setGroupSelection((ids) =>
                                  ids.includes(id)
                                    ? ids.filter((i) => i !== id)
                                    : [...ids, id],
                                )
                              }
                            />
                            <div>
                              <strong>{s.name}</strong>
                              <span>
                                {s.sequence.map((d) => ARROWS[d]).join(" ")}
                              </span>
                            </div>
                            <button
                              className={`star ${profile.favorites.includes(id) ? "favorited" : ""}`}
                              aria-label={`${t("favorite")} ${s.name}`}
                              onClick={() => toggleFavorite(id)}
                            >
                              ★
                            </button>
                          </div>
                        );
                      })}
                  </details>
                ))}
              </div>
            </>
          )}
          {tab === "editor" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">03 / {t("editor")}</span>
                  <h1>{t("custom")}</h1>
                </div>
                <button
                  className="secondary"
                  onClick={() => {
                    setDraft(freshPack());
                    setJsonDraft("");
                  }}
                >
                  {t("newPack")}
                </button>
              </div>
              <div className="panel editor-meta">
                <label>
                  {t("packName")}
                  <input
                    value={draft.name}
                    maxLength={200}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                </label>
                <label>
                  {t("packId")}
                  <input
                    value={draft.id}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, id: e.target.value }))
                    }
                  />
                </label>
                <label className="full">
                  {t("description")}
                  <input
                    value={draft.description ?? ""}
                    maxLength={4000}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        description: e.target.value || undefined,
                      }))
                    }
                  />
                </label>
              </div>
              <div className="editor-entries">
                {draft.stratagems.map((s, index) => (
                  <div className="panel editor-entry" key={index}>
                    <div className="entry-head">
                      <span className="eyebrow">
                        #{(index + 1).toString().padStart(2, "0")}
                      </span>
                      <button
                        className="subtle danger"
                        aria-label={`${t("delete")} ${s.name}`}
                        onClick={() =>
                          setDraft((p) => ({
                            ...p,
                            stratagems: p.stratagems.filter(
                              (_, i) => i !== index,
                            ),
                          }))
                        }
                      >
                        × {t("delete")}
                      </button>
                    </div>
                    <div className="entry-fields">
                      <label>
                        {t("entryName")}
                        <input
                          value={s.name}
                          maxLength={200}
                          onChange={(e) =>
                            changeEntry(index, { name: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        {t("entryId")}
                        <input
                          value={s.id}
                          onChange={(e) =>
                            changeEntry(index, { id: e.target.value })
                          }
                        />
                      </label>
                    </div>
                    <div className="editor-sequence" aria-label={t("sequence")}>
                      {s.sequence.length
                        ? s.sequence.map((d) => ARROWS[d]).join(" ")
                        : t("entryEmpty")}
                    </div>
                    <div className="inline">
                      {DIRECTIONS.map((d) => (
                        <button
                          className="direction-button"
                          key={d}
                          disabled={s.sequence.length >= 16}
                          aria-label={`${t("addEntry")} ${t(d)}`}
                          onClick={() =>
                            changeEntry(index, { sequence: [...s.sequence, d] })
                          }
                        >
                          {ARROWS[d]}
                        </button>
                      ))}
                      <button
                        className="subtle"
                        onClick={() =>
                          changeEntry(index, {
                            sequence: s.sequence.slice(0, -1),
                          })
                        }
                      >
                        {t("undo")}
                      </button>
                      <button
                        className="subtle"
                        onClick={() => changeEntry(index, { sequence: [] })}
                      >
                        {t("clear")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="editor-actions">
                <button
                  className="secondary"
                  aria-label={t("addEntry")}
                  disabled={draft.stratagems.length >= 500}
                  onClick={() =>
                    setDraft((p) => ({
                      ...p,
                      stratagems: [
                        ...p.stratagems,
                        {
                          id: `stratagem-${Date.now().toString(36)}`,
                          name: "",
                          sequence: [],
                        },
                      ],
                    }))
                  }
                >
                  ＋ {t("addEntry")}
                </button>
                <button
                  className="primary"
                  onClick={() => {
                    try {
                      putPack(draft);
                    } catch (error) {
                      handleError(error);
                    }
                  }}
                >
                  {t("save")}
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    try {
                      doExport(`${draft.id}.json`, validatePack(draft));
                    } catch (error) {
                      handleError(error);
                    }
                  }}
                >
                  {t("export")}
                </button>
              </div>
              <details className="panel json-editor">
                <summary
                  onClick={() => {
                    if (!jsonDraft)
                      setJsonDraft(JSON.stringify(draft, null, 2));
                  }}
                >
                  {t("jsonView")}
                </summary>
                <textarea
                  aria-label={t("jsonView")}
                  rows={14}
                  value={jsonDraft}
                  spellCheck={false}
                  onChange={(e) => setJsonDraft(e.target.value)}
                />
                <button
                  className="secondary"
                  onClick={() => {
                    try {
                      setDraft(parsePack(jsonDraft));
                      notify(t("saved"));
                    } catch (error) {
                      handleError(error);
                    }
                  }}
                >
                  {t("applyJson")}
                </button>
              </details>
            </>
          )}
          {tab === "stats" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">04 / {t("stats")}</span>
                  <h1>{t("stats")}</h1>
                </div>
                <button
                  className="secondary"
                  onClick={() => {
                    setMode("mistakesMode");
                    setTab("training");
                  }}
                >
                  {t("mistakesMode")}
                </button>
              </div>
              <div className="session-metrics">
                <div>
                  <small>{t("calls")}</small>
                  <strong>{totals.completed}</strong>
                </div>
                <div>
                  <small>{t("perfect")}</small>
                  <strong>
                    {Math.round(completionAccuracy(totals) * 100)}
                    <em>%</em>
                  </strong>
                </div>
                <div>
                  <small>{t("errors")}</small>
                  <strong>{totals.mistakes}</strong>
                </div>
                <div>
                  <small>{t("bestStreak")}</small>
                  <strong>{totals.bestStreak}</strong>
                </div>
              </div>
              <div className="panel stats-table">
                {Object.keys(totals.perStratagem).length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>{t("entries")}</th>
                        <th>{t("calls")}</th>
                        <th>{t("errors")}</th>
                        <th>{t("bestTime")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(totals.perStratagem)
                        .sort((a, b) => b[1].mistakes - a[1].mistakes)
                        .map(([id, stat]) => (
                          <tr key={id}>
                            <td>
                              {allItems.find((i) => i.qualifiedId === id)
                                ?.name ?? id}
                            </td>
                            <td>{stat.completed}</td>
                            <td>{stat.mistakes}</td>
                            <td>
                              {stat.bestDurationMs === null
                                ? "—"
                                : seconds(stat.bestDurationMs)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="help">{t("noStats")}</p>
                )}
              </div>
            </>
          )}
          {tab === "settings" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">05 / {t("settings")}</span>
                  <h1>{t("settings")}</h1>
                </div>
              </div>
              <div className="settings-grid">
                <section className="panel">
                  <h2>{t("controls")}</h2>
                  <label>
                    {t("inputDisplay")}
                    <select
                      value={profile.settings.display}
                      onChange={(e) =>
                        setting(
                          "display",
                          e.target.value as Settings["display"],
                        )
                      }
                    >
                      <option value="arrows">{t("arrows")}</option>
                      <option value="wasd">WASD</option>
                      <option value="custom">{t("customDisplay")}</option>
                    </select>
                  </label>
                  {profile.settings.display === "custom" && (
                    <div className="label-grid">
                      {DIRECTIONS.map((d) => (
                        <label key={d}>
                          {t(d)}
                          <input
                            value={profile.settings.labels[d]}
                            maxLength={12}
                            onChange={(e) =>
                              setting("labels", {
                                ...profile.settings.labels,
                                [d]: e.target.value,
                              })
                            }
                          />
                        </label>
                      ))}
                    </div>
                  )}
                  <h3>{t("keyBindings")}</h3>
                  <p className="help">{t("keyHint")}</p>
                  <div className="key-bindings">
                    {DIRECTIONS.map((d) => (
                      <button
                        className="secondary"
                        key={d}
                        onClick={() => setCapture(d)}
                      >
                        {ARROWS[d]}{" "}
                        {capture === d
                          ? t("capture")
                          : profile.settings.keys[d]
                              .map(formatKeyCode)
                              .join(" / ")}
                      </button>
                    ))}
                  </div>
                  <button
                    className="subtle"
                    onClick={() =>
                      setting("keys", structuredClone(DEFAULT_KEY_BINDINGS))
                    }
                  >
                    WASD + ↑ ↓ ← →
                  </button>
                </section>
                <section className="panel">
                  <h2>{t("training")}</h2>
                  {(
                    [
                      "repeatMistakes",
                      "showHint",
                      "sound",
                      "haptics",
                      "leftHand",
                      "reducedMotion",
                    ] as const
                  ).map((key) => (
                    <label className="toggle-row" key={key}>
                      <span>{t(key === "showHint" ? "autoHint" : key)}</span>
                      <input
                        type="checkbox"
                        checked={profile.settings[key]}
                        onChange={(e) => setting(key, e.target.checked)}
                      />
                    </label>
                  ))}
                  <label className="time-setting">
                    {t("timeLimit")}
                    <select
                      value={profile.settings.timeLimit}
                      onChange={(e) => {
                        setting("timeLimit", Number(e.target.value));
                        setRemaining(Number(e.target.value));
                        timerRunning.current = false;
                      }}
                    >
                      {[0, 3, 5, 10, 15, 30].map((s) => (
                        <option key={s} value={s}>
                          {s ? `${s} ${t("seconds")}` : t("unlimited")}
                        </option>
                      ))}
                    </select>
                  </label>
                </section>
                <section className="panel full">
                  <h2>JSON · {t("backup")}</h2>
                  <p className="help">{t("backupHint")}</p>
                  <div className="inline">
                    <button
                      className="secondary"
                      onClick={() =>
                        doExport("stratagem-backup.json", {
                          format: "stratagem-trainer-backup",
                          version: 1,
                          profile,
                        })
                      }
                    >
                      {t("backup")}
                    </button>
                    <button
                      className="secondary"
                      onClick={() => restoreRef.current?.click()}
                    >
                      {t("restore")}
                    </button>
                    <button
                      className="subtle danger"
                      onClick={() => {
                        if (confirm !== "stats") {
                          setConfirm("stats");
                          return;
                        }
                        sessionBase.current = emptyStatistics();
                        setTraining((s) => ({
                          ...s,
                          stats: emptyStatistics(),
                        }));
                        setProfile((p) => ({
                          ...p,
                          statistics: emptyStatistics(),
                        }));
                        setConfirm("");
                      }}
                    >
                      {t(confirm === "stats" ? "resetConfirm" : "resetStats")}
                    </button>
                  </div>
                  <p className="help">{t("restoreHint")}</p>
                  <p className="help">{t("iphoneInstall")}</p>
                </section>
              </div>
              <p className="legal">{t("about")}</p>
            </>
          )}
        </main>
      </div>
      <input
        ref={inputRef}
        className="file-input"
        type="file"
        accept=".json,application/json"
        onChange={(e) => void importFile(e.target.files?.[0])}
      />
      <input
        ref={restoreRef}
        className="file-input"
        type="file"
        accept=".json,application/json"
        onChange={(e) => void restore(e.target.files?.[0])}
      />
      {toast && (
        <div className="toast" role="alert">
          {toast}
          <button aria-label={t("clear")} onClick={() => setToast("")}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
