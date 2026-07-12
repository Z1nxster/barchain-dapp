import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { connectWallet } from "./utils/contracts.js";

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  app: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0a0a0f 0%, #1a0a20 50%, #0a0f1a 100%)",
    color: "#f0e6d3",
    fontFamily: "'Segoe UI', sans-serif",
  },
  navbar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 32px",
    background: "rgba(255,255,255,0.03)",
    borderBottom: "1px solid rgba(255,215,0,0.2)",
    backdropFilter: "blur(10px)",
    position: "sticky", top: 0, zIndex: 100,
  },
  logo: { fontSize: "28px", fontWeight: "bold", color: "#FFD700", letterSpacing: "2px" },
  walletBtn: {
    padding: "10px 24px", borderRadius: "8px", border: "1px solid #FFD700",
    background: "rgba(255,215,0,0.1)", color: "#FFD700",
    cursor: "pointer", fontSize: "14px", fontWeight: "600",
    transition: "all 0.2s",
  },
  addressBadge: {
    padding: "8px 16px", borderRadius: "8px",
    background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)",
    color: "#FFD700", fontSize: "13px", fontWeight: "600",
  },
  center: {
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    minHeight: "80vh", gap: "24px", padding: "32px",
  },
  heroTitle: { fontSize: "56px", fontWeight: "bold", color: "#FFD700", textAlign: "center" },
  heroSub: { fontSize: "18px", color: "#a08060", textAlign: "center", maxWidth: "500px" },
  bigBtn: {
    padding: "16px 48px", borderRadius: "12px", fontSize: "18px",
    fontWeight: "bold", cursor: "pointer", border: "none",
    background: "linear-gradient(135deg, #FFD700, #FFA500)",
    color: "#0a0a0f", transition: "transform 0.2s, box-shadow 0.2s",
  },
  tabs: {
    display: "flex", gap: "4px", padding: "16px 32px",
    borderBottom: "1px solid rgba(255,215,0,0.15)",
    background: "rgba(0,0,0,0.2)",
  },
  tab: (active) => ({
    padding: "10px 24px", borderRadius: "8px", cursor: "pointer",
    border: active ? "1px solid #FFD700" : "1px solid transparent",
    background: active ? "rgba(255,215,0,0.15)" : "transparent",
    color: active ? "#FFD700" : "#a08060",
    fontWeight: active ? "700" : "400",
    fontSize: "15px", transition: "all 0.2s",
  }),
  content: { padding: "32px" },
  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,215,0,0.15)",
    borderRadius: "16px", padding: "28px",
    marginBottom: "20px",
  },
  cardTitle: { fontSize: "20px", fontWeight: "bold", color: "#FFD700", marginBottom: "16px" },
  statGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "16px",
  },
  statBox: {
    background: "rgba(0,0,0,0.3)", borderRadius: "12px",
    padding: "20px", textAlign: "center",
    border: "1px solid rgba(255,215,0,0.1)",
  },
  statValue: { fontSize: "28px", fontWeight: "bold", color: "#FFD700" },
  statLabel: { fontSize: "13px", color: "#a08060", marginTop: "6px" },
  input: {
    width: "100%", padding: "12px 16px", borderRadius: "8px",
    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,215,0,0.3)",
    color: "#f0e6d3", fontSize: "15px", outline: "none", marginBottom: "12px",
  },
  gameGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "20px",
  },
  gameCard: {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,215,0,0.15)",
    borderRadius: "16px", padding: "28px", textAlign: "center",
    transition: "border-color 0.2s, transform 0.2s",
  },
  gameName: { fontSize: "18px", fontWeight: "bold", color: "#FFD700", marginBottom: "8px" },
  gameDesc: { fontSize: "14px", color: "#a08060", marginBottom: "20px", lineHeight: "1.5" },
  playBtn: (disabled) => ({
    padding: "12px 32px", borderRadius: "8px", fontSize: "15px",
    fontWeight: "bold", cursor: disabled ? "not-allowed" : "pointer",
    border: "none", width: "100%",
    background: disabled
      ? "rgba(255,215,0,0.2)"
      : "linear-gradient(135deg, #FFD700, #FFA500)",
    color: disabled ? "#a08060" : "#0a0a0f",
    transition: "all 0.2s",
  }),
  result: (won) => ({
    marginTop: "12px", padding: "10px", borderRadius: "8px",
    background: won ? "rgba(0,255,100,0.1)" : "rgba(255,80,80,0.1)",
    border: `1px solid ${won ? "rgba(0,255,100,0.3)" : "rgba(255,80,80,0.3)"}`,
    color: won ? "#00ff64" : "#ff5050", fontSize: "14px", fontWeight: "600",
  }),
  mineBar: {
    height: "12px", borderRadius: "6px", marginTop: "12px",
    background: "rgba(255,255,255,0.1)", overflow: "hidden",
  },
  mineFill: (pct) => ({
    height: "100%", borderRadius: "6px", width: `${pct}%`,
    background: "linear-gradient(90deg, #FFD700, #FFA500)",
    transition: "width 0.1s",
  }),
  recipeCard: {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,215,0,0.15)",
    borderRadius: "12px", padding: "20px",
  },
  rarityBadge: (rarity) => ({
    display: "inline-block", padding: "3px 10px", borderRadius: "999px",
    fontSize: "11px", fontWeight: "bold", marginBottom: "8px",
    background: rarity === "Legendary" ? "rgba(255,100,0,0.3)"
              : rarity === "Rare"       ? "rgba(150,0,255,0.3)"
              :                           "rgba(0,180,255,0.2)",
    color:      rarity === "Legendary" ? "#ff6400"
              : rarity === "Rare"       ? "#c864ff"
              :                           "#00b4ff",
    border: `1px solid ${
      rarity === "Legendary" ? "#ff6400" : rarity === "Rare" ? "#c864ff" : "#00b4ff"
    }`,
  }),
  toast: (show) => ({
    position: "fixed", bottom: "32px", right: "32px",
    background: "rgba(255,215,0,0.9)", color: "#0a0a0f",
    padding: "14px 24px", borderRadius: "10px", fontWeight: "bold",
    fontSize: "15px", zIndex: 999, transition: "all 0.3s",
    opacity: show ? 1 : 0, pointerEvents: "none",
    transform: show ? "translateY(0)" : "translateY(20px)",
  }),
  error: {
    padding: "12px 16px", borderRadius: "8px", marginTop: "12px",
    background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)",
    color: "#ff8080", fontSize: "14px",
  },
};

// ── Game config ───────────────────────────────────────────────────────────────
const GAMES = [
  { id: 0, emoji: "🎰", name: "Slot Machine",     anim: "slotSpin 0.5s ease-in-out",      desc: "Spin three reels. Match all three for a jackpot, any two for a win." },
  { id: 1, emoji: "🎟️", name: "Scratch Card",     anim: "scratchReveal 0.5s ease-in-out", desc: "Reveal three hidden symbols. Two matches win, three matches win big." },
  { id: 2, emoji: "🎲", name: "Dice Roll",         anim: "diceRoll 0.6s ease-in-out",      desc: "Roll two dice. Doubles win, double sixes hit the jackpot." },
  { id: 3, emoji: "🍹", name: "Cocktail Roulette", anim: "rouletteSpin 0.8s ease-out",     desc: "Spin for ingredient fragments. Collect 3 of the same to win a Rare recipe." },
  { id: 4, emoji: "🃏", name: "Card Draw",         anim: "cardFlip 0.5s ease-in-out",      desc: "Draw from the cocktail deck. High cards win — Ace is the jackpot." },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const shortAddr = (a) => a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "";
const fmt       = (wei) => parseFloat(ethers.formatEther(wei)).toFixed(2);

// ── CSS injected once ─────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes slotSpin {
    0%   { transform: translateY(0);    opacity: 1; }
    25%  { transform: translateY(-8px); opacity: 0.6; }
    75%  { transform: translateY(8px);  opacity: 0.6; }
    100% { transform: translateY(0);    opacity: 1; }
  }
  @keyframes scratchReveal {
    0%   { transform: scale(1); }
    40%  { transform: scale(0.92) rotate(-2deg); }
    70%  { transform: scale(1.05) rotate(1deg); }
    100% { transform: scale(1); }
  }
  @keyframes diceRoll {
    0%   { transform: rotate(0deg); }
    25%  { transform: rotate(90deg); }
    50%  { transform: rotate(180deg); }
    75%  { transform: rotate(270deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes rouletteSpin {
    0%   { transform: rotate(0deg); }
    80%  { transform: rotate(700deg); }
    100% { transform: rotate(720deg); }
  }
  @keyframes cardFlip {
    0%   { transform: perspective(400px) rotateY(0deg); }
    50%  { transform: perspective(400px) rotateY(90deg); }
    100% { transform: perspective(400px) rotateY(0deg); }
  }
  @keyframes mineGlow {
    0%, 100% { box-shadow: 0 0 5px #FFD700; }
    50%       { box-shadow: 0 0 20px #FFD700, 0 0 40px #FFA500; }
  }
  @keyframes winPop {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.08); }
    100% { transform: scale(1); }
  }
  .game-card-hover:hover {
    border-color: rgba(255,215,0,0.5) !important;
    transform: translateY(-3px);
  }
`;

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {

  // ── State ── (ALL hooks must be at the top, inside the component) ──────────
  const [wallet,       setWallet]       = useState(null);
  const [tab,          setTab]          = useState("bar");
  const [hasBar,       setHasBar]       = useState(false);
  const [barData,      setBarData]      = useState(null);
  const [barName,      setBarName]      = useState("");
  const [barBal,       setBarBal]       = useState("0");
  const [gameResults,  setGameResults]  = useState({});
  const [loading,      setLoading]      = useState({});
  const [cooldown,     setCooldown]     = useState(0);
  const [animating,    setAnimating]    = useState({});   // ← FIXED: now inside App
  const [mining,       setMining]       = useState(false);
  const [mineProgress, setMineProgress] = useState(0);
  const [mineCooldown, setMineCooldown] = useState(0);
  const [recipes,      setRecipes]      = useState([]);
  const [toast,        setToast]        = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [error,        setError]        = useState("");

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = useCallback((msg) => {
    setToast(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  }, []);

  // ── Connect wallet ─────────────────────────────────────────────────────────
  async function handleConnect() {
    try {
      setError("");
      const w = await connectWallet();
      setWallet(w);
      showToast("Wallet connected!");
      await loadPlayerData(w);
    } catch (e) {
      setError(e.message);
    }
  }

  // ── Load player data ───────────────────────────────────────────────────────
  async function loadPlayerData(w) {
    try {
      const { contracts, address } = w;
      const minted = await contracts.barNFT.hasMinted(address);
      setHasBar(minted);

      const bal = await contracts.barCoin.balanceOf(address);
      setBarBal(fmt(bal));

      if (minted) {
        const tokenId = await contracts.barNFT.addressToTokenId(address);
        const data    = await contracts.barNFT.getBarData(tokenId);
        setBarData({
          name:        data.name,
          level:       Number(data.level),
          mintDate:    new Date(Number(data.mintDate) * 1000).toLocaleDateString(),
          recipeCount: Number(data.recipeCount),
          gamesPlayed: Number(data.gamesPlayed),
          tokenId:     Number(tokenId),
        });

        const [gameSec, mineSec] = await contracts.gamblingGame.getCooldowns(address);
        setCooldown(Number(gameSec));
        setMineCooldown(Number(mineSec));

        await loadRecipes(w, address);
      }
    } catch (e) {
      console.error("loadPlayerData:", e);
    }
  }

  // ── Load recipes ───────────────────────────────────────────────────────────
  async function loadRecipes(w, address) {
    try {
      const total = await w.contracts.recipeNFT.totalSupply();
      const owned = [];
      for (let i = 0; i < Number(total); i++) {
        try {
          const owner = await w.contracts.recipeNFT.ownerOf(i);
          if (owner.toLowerCase() === address.toLowerCase()) {
            const data   = await w.contracts.recipeNFT.getRecipeData(i);
            const rarity = await w.contracts.recipeNFT.getRarityName(i);
            owned.push({
              tokenId:  i,
              name:     data.name,
              rarity,
              mintDate: new Date(Number(data.mintDate) * 1000).toLocaleDateString(),
            });
          }
        } catch (_) {}
      }
      setRecipes(owned);
    } catch (e) {
      console.error("loadRecipes:", e);
    }
  }

  // ── Mint bar ───────────────────────────────────────────────────────────────
  async function handleMintBar() {
    if (!barName.trim()) { setError("Enter a name for your bar!"); return; }
    try {
      setError("");
      setLoading((p) => ({ ...p, mint: true }));
      const tx = await wallet.contracts.barNFT.mintBar(barName.trim(), "ipfs://placeholder");
      showToast("Minting your bar… please wait");
      await tx.wait();
      showToast("🍹 Bar minted!");
      await loadPlayerData(wallet);
    } catch (e) {
      setError(e.reason || e.message);
    } finally {
      setLoading((p) => ({ ...p, mint: false }));
    }
  }

  // ── Play game ──────────────────────────────────────────────────────────────
  async function handlePlay(gameId) {
    if (cooldown > 3) {
      setGameResults((p) => ({ ...p, [gameId]: { won: false, msg: `⏳ Wait ${cooldown}s` } }));
      setTimeout(() => setGameResults((p) => ({ ...p, [gameId]: null })), 3000);
      return;
    }
    try {
      setError("");
      setLoading((p)   => ({ ...p, [gameId]: true }));
      setAnimating((p) => ({ ...p, [gameId]: true }));
      setGameResults((p) => ({ ...p, [gameId]: null }));

      const tx      = await wallet.contracts.gamblingGame.playGame(gameId);
      showToast("Waiting for confirmation...");
      const receipt = await tx.wait();

      const iface = wallet.contracts.gamblingGame.interface;
      let won = false, reward = 0n, recipeWon = false;
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "GamePlayed") {
            won       = parsed.args.won;
            reward    = parsed.args.rewardAmount;
            recipeWon = parsed.args.recipeWon;
          }
        } catch (_) {}
      }

      const msg = won
        ? `🎉 You won ${fmt(reward)} $BAR!${recipeWon ? " 🍹 + Recipe NFT!" : ""}`
        : "😔 No luck this time!";

      setGameResults((p) => ({ ...p, [gameId]: { won, msg } }));
      if (won) showToast(msg);
      setTimeout(() => setGameResults((p) => ({ ...p, [gameId]: null })), 5000);
      await loadPlayerData(wallet);
    } catch (e) {
      const msg = e.reason || e.message || "";
      if (msg.includes("cooldown")) {
        setGameResults((p) => ({ ...p, [gameId]: { won: false, msg: "⏳ Cooldown still active — wait a few more seconds" } }));
        setTimeout(() => setGameResults((p) => ({ ...p, [gameId]: null })), 4000);
      } else {
        setError(msg);
      }
    } finally {
      setLoading((p)   => ({ ...p, [gameId]: false }));
      setTimeout(() => setAnimating((p) => ({ ...p, [gameId]: false })), 700);
    }
  }

  // ── Mining ─────────────────────────────────────────────────────────────────
  function startMining() {
    if (mining || mineCooldown > 0) return;
    setMining(true);
    setMineProgress(0);
    setError("");

    const difficulty = 2;
    let nonce = Math.floor(Math.random() * 1_000_000);
    let attempts = 0;
    const expectedAttempts = Math.pow(256, difficulty);

    const findHash = async () => {
      const BATCH = 500;
      for (let i = 0; i < BATCH; i++) {
        const hash = ethers.solidityPackedKeccak256(
          ["address", "uint256"],
          [wallet.address, BigInt(nonce)]
        );
        let valid = true;
        for (let b = 0; b < difficulty; b++) {
          if (hash.slice(2 + b * 2, 4 + b * 2) !== "00") { valid = false; break; }
        }
        if (valid) {
          setMineProgress(100);
          showToast("⛏️ Valid hash found! Submitting...");
          await submitMiningProof(BigInt(nonce));
          return;
        }
        nonce++;
        attempts++;
      }
      const pct = Math.min(Math.floor((attempts / expectedAttempts) * 100), 99);
      setMineProgress(pct);
      setTimeout(findHash, 0);
    };

    findHash();
  }

  async function submitMiningProof(nonce) {
    try {
      const tx = await wallet.contracts.gamblingGame.submitMiningProof(nonce);
      await tx.wait();
      showToast("⛏️ Mining reward claimed!");
      await loadPlayerData(wallet);
    } catch (e) {
      const msg = e.reason || e.message || "";
      if (msg.includes("cooldown")) {
        showToast("⏳ Mining cooldown still active");
      } else {
        setError(msg);
      }
    } finally {
      setMining(false);
      setMineProgress(0);
    }
  }

  // ── Cooldown countdown ─────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      setCooldown((c)     => (c > 0 ? c - 1 : 0));
      setMineCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // ── Render: not connected ──────────────────────────────────────────────────
  if (!wallet) return (
    <div style={S.app}>
      <style>{GLOBAL_CSS}</style>
      <nav style={S.navbar}>
        <div style={S.logo}>🍹 BarChain</div>
      </nav>
      <div style={S.center}>
        <div style={S.heroTitle}>🍹 BarChain</div>
        <div style={S.heroSub}>
          Own a virtual bar on the blockchain. Play mini-games, mine cocktail recipes, and trade NFTs.
        </div>
        {error && <div style={S.error}>{error}</div>}
        <button style={S.bigBtn} onClick={handleConnect}>Connect MetaMask</button>
      </div>
    </div>
  );

  // ── Render: no bar yet ────────────────────────────────────────────────────
  if (!hasBar) return (
    <div style={S.app}>
      <style>{GLOBAL_CSS}</style>
      <nav style={S.navbar}>
        <div style={S.logo}>🍹 BarChain</div>
        <div style={S.addressBadge}>{shortAddr(wallet.address)}</div>
      </nav>
      <div style={S.center}>
        <div style={{ fontSize: "64px" }}>🏗️</div>
        <div style={{ fontSize: "32px", fontWeight: "bold", color: "#FFD700" }}>Open Your Bar</div>
        <div style={{ color: "#a08060", fontSize: "16px", textAlign: "center", maxWidth: "400px" }}>
          Every player owns one unique bar NFT. Give yours a name to get started.
        </div>
        <div style={{ width: "100%", maxWidth: "400px" }}>
          <input
            style={S.input}
            placeholder="Name your bar (e.g. The Golden Shaker)"
            value={barName}
            onChange={(e) => setBarName(e.target.value)}
          />
          {error && <div style={S.error}>{error}</div>}
          <button style={S.bigBtn} onClick={handleMintBar} disabled={loading.mint}>
            {loading.mint ? "Minting…" : "🍹 Mint My Bar"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Render: main game UI ──────────────────────────────────────────────────
  return (
    <div style={S.app}>
      <style>{GLOBAL_CSS}</style>

      {/* Navbar */}
      <nav style={S.navbar}>
        <div style={S.logo}>🍹 BarChain</div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ color: "#FFD700", fontWeight: "bold" }}>{barBal} $BAR</div>
          <div style={S.addressBadge}>{shortAddr(wallet.address)}</div>
          <button style={S.walletBtn} onClick={() => loadPlayerData(wallet)}>↻ Refresh</button>
        </div>
      </nav>

      {/* Tabs */}
      <div style={S.tabs}>
        {[
          { id: "bar",         label: "🏠 My Bar"     },
          { id: "games",       label: "🎮 Games"       },
          { id: "mine",        label: "⛏️ Mine"        },
          { id: "inventory",   label: "🍹 Recipes"     },
          { id: "marketplace", label: "🏪 Marketplace" },
        ].map(({ id, label }) => (
          <button key={id} style={S.tab(tab === id)} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div style={S.content}>
        {error && <div style={S.error}>{error}</div>}

        {/* ── MY BAR ── */}
        {tab === "bar" && barData && (
          <>
            <div style={S.card}>
              <div style={S.cardTitle}>🏠 {barData.name}</div>
              <div style={S.statGrid}>
                <div style={S.statBox}>
                  <div style={S.statValue}>Lv.{barData.level}</div>
                  <div style={S.statLabel}>Bar Level</div>
                </div>
                <div style={S.statBox}>
                  <div style={S.statValue}>{barBal}</div>
                  <div style={S.statLabel}>$BAR Balance</div>
                </div>
                <div style={S.statBox}>
                  <div style={S.statValue}>{barData.gamesPlayed}</div>
                  <div style={S.statLabel}>Games Played</div>
                </div>
                <div style={S.statBox}>
                  <div style={S.statValue}>{barData.recipeCount}</div>
                  <div style={S.statLabel}>Recipes Collected</div>
                </div>
                <div style={S.statBox}>
                  <div style={S.statValue}>#{barData.tokenId}</div>
                  <div style={S.statLabel}>Token ID</div>
                </div>
                <div style={S.statBox}>
                  {/* FIXED: single style prop, not two */}
                  <div style={{ ...S.statValue, fontSize: "16px" }}>{barData.mintDate}</div>
                  <div style={S.statLabel}>Opened On</div>
                </div>
              </div>
            </div>
            <div style={S.card}>
              <div style={S.cardTitle}>📈 Level Progress</div>
              <div style={{ color: "#a08060", fontSize: "14px", lineHeight: "1.8" }}>
                <div>Level 2: 5 games or 2 recipes</div>
                <div>Level 3: 20 games or 8 recipes</div>
                <div>Level 4: 45 games or 18 recipes</div>
                <div>Level 5: 80 games or 32 recipes</div>
                <div style={{ marginTop: "8px", color: "#FFD700" }}>
                  Current: {barData.gamesPlayed} games, {barData.recipeCount} recipes
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── GAMES ── */}
        {tab === "games" && (
          <>
            {cooldown > 3 && (
              <div style={{ ...S.card, textAlign: "center", color: "#FFD700" }}>
                ⏳ Game cooldown: <strong>{cooldown}s</strong> remaining
              </div>
            )}
            <div style={S.gameGrid}>
              {GAMES.map((g) => (
                <div key={g.id} style={S.gameCard} className="game-card-hover">
                  <div style={{
                    fontSize: "48px", marginBottom: "12px", display: "inline-block",
                    animation: animating[g.id] ? g.anim : "none",
                  }}>
                    {g.emoji}
                  </div>
                  <div style={S.gameName}>{g.name}</div>
                  <div style={S.gameDesc}>{g.desc}</div>
                  <button
                    style={S.playBtn(loading[g.id] || cooldown > 3)}
                    onClick={() => handlePlay(g.id)}
                    disabled={loading[g.id] || cooldown > 3}
                  >
                    {loading[g.id] ? "Playing…" : cooldown > 3 ? `Wait ${cooldown}s` : "▶ Play"}
                  </button>
                  {gameResults[g.id] && (
                    <div style={{
                      ...S.result(gameResults[g.id].won),
                      animation: gameResults[g.id].won ? "winPop 0.4s ease-in-out" : "none",
                    }}>
                      {gameResults[g.id].msg}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── MINE ── */}
        {tab === "mine" && (
          <div style={S.card}>
            <div style={S.cardTitle}>⛏️ Proof-of-Play Mining</div>
            <div style={{ color: "#a08060", lineHeight: "1.8", marginBottom: "20px" }}>
              Your browser solves a real SHA-256 hash puzzle in the background — the same
              concept as Bitcoin mining. When a valid hash is found, submit it to the
              blockchain to claim $BAR tokens and a chance at a Recipe NFT.
              Mining has a 2-minute cooldown between claims.
            </div>
            {mineCooldown > 0 && (
              <div style={{ color: "#FFD700", marginBottom: "16px", fontWeight: "bold" }}>
                ⏳ Mining cooldown: {mineCooldown}s
              </div>
            )}
            {mining && (
              <>
                <div style={{ color: "#a08060", marginBottom: "8px" }}>
                  Searching for valid hash… {mineProgress}%
                </div>
                <div style={S.mineBar}>
                  <div style={{
                    ...S.mineFill(mineProgress),
                    animation: "mineGlow 1s infinite",
                  }} />
                </div>
              </>
            )}
            <button
              style={{
                ...S.bigBtn, marginTop: "20px",
                opacity: (mining || mineCooldown > 0) ? 0.5 : 1,
                cursor:  (mining || mineCooldown > 0) ? "not-allowed" : "pointer",
              }}
              onClick={startMining}
              disabled={mining || mineCooldown > 0}
            >
              {mining ? `⛏️ Mining… ${mineProgress}%` : "⛏️ Start Mining"}
            </button>
          </div>
        )}

        {/* ── RECIPES ── */}
        {tab === "inventory" && (
          <div style={S.card}>
            <div style={S.cardTitle}>🍹 My Recipe Collection ({recipes.length})</div>
            {recipes.length === 0 ? (
              <div style={{ color: "#a08060", textAlign: "center", padding: "40px" }}>
                No recipes yet — play games to win some!
              </div>
            ) : (
              <div style={S.gameGrid}>
                {recipes.map((r) => (
                  <div key={r.tokenId} style={S.recipeCard}>
                    <div style={S.rarityBadge(r.rarity)}>{r.rarity}</div>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: "#f0e6d3", marginBottom: "6px" }}>
                      {r.name}
                    </div>
                    <div style={{ fontSize: "13px", color: "#a08060" }}>
                      Token #{r.tokenId} · Minted {r.mintDate}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MARKETPLACE ── */}
        {tab === "marketplace" && (
          <div style={S.card}>
            <div style={S.cardTitle}>🏪 Recipe Marketplace</div>
            <div style={{ color: "#a08060", textAlign: "center", padding: "40px" }}>
              Marketplace coming soon — list and trade your Recipe NFTs here.
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      <div style={S.toast(toastVisible)}>{toast}</div>
    </div>
  );
}