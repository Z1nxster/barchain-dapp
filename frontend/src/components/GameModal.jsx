import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";

const SLOT_SYMS    = ["🍋","🍒","🍇","🔔","💎","🍹","⭐","🎰"];
const SCRATCH_SYMS = ["🍹","🍸","🍺","🥂","🍾","⭐"];
const DICE_FACE    = ["","⚀","⚁","⚂","⚃","⚄","⚅"];
const ROULETTE     = ["🌿 Herbs","🍋 Citrus","🍓 Berry","🥃 Spirit","🧊 Ice","🍯 Sweet"];
const CARD_SUITS   = ["♠","♥","♦","♣"];
const CARD_VALS    = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];

const fmt = (wei) => parseFloat(ethers.formatEther(wei || "0")).toFixed(2);
const J   = BigInt("200000000000000000000"); // jackpot threshold
const R   = BigInt("50000000000000000000");  // rare threshold

export default function GameModal({ game, wallet, cooldown, onClose, onResult }) {
    const [phase,    setPhase]    = useState("ready");
    const [result,   setResult]   = useState(null);
    const [errMsg,   setErrMsg]   = useState("");

    // Slot state
    const [reels,    setReels]    = useState(["🎰","🎰","🎰"]);
    // Scratch state
    const [scrSyms,  setScrSyms]  = useState(["?","?","?"]);
    const [scrShown, setScrShown] = useState([false,false,false]);
    // Dice state
    const [dice,     setDice]     = useState([1,1]);
    // Roulette state
    const [rAngle,   setRAngle]   = useState(0);
    const [rSegment, setRSegment] = useState(null);
    // Card state
    const [card,     setCard]     = useState(null);
    const [flipped,  setFlipped]  = useState(false);

    const ticker = useRef(null);
    useEffect(() => () => { if (ticker.current) clearInterval(ticker.current); }, []);

    // ── Animations start ────────────────────────────────────────────────────────
    function animStart() {
        if (game.id === 0)
            ticker.current = setInterval(() =>
                setReels(Array.from({length:3}, () =>
                    SLOT_SYMS[Math.floor(Math.random()*SLOT_SYMS.length)])), 80);
        if (game.id === 1) { setScrShown([false,false,false]); setScrSyms(["?","?","?"]); }
        if (game.id === 2)
            ticker.current = setInterval(() =>
                setDice([Math.ceil(Math.random()*6), Math.ceil(Math.random()*6)]), 100);
        if (game.id === 3) setRAngle(a => a + 720 + Math.random()*360);
        if (game.id === 4) { setFlipped(false); setCard(null); }
    }

    // ── Reveal based on blockchain result ───────────────────────────────────────
    function animReveal(r) {
        if (ticker.current) { clearInterval(ticker.current); ticker.current = null; }
        const isJ = r.reward >= J, isR = r.reward >= R;

        if (game.id === 0) {
            if (isJ)        { setReels(["💎","💎","💎"]); return; }
            if (r.won&&isR) { setReels(["🍹","🍹","🍹"]); return; }
            if (r.won) {
                const s = SLOT_SYMS[Math.floor(Math.random()*4)];
                const d = SLOT_SYMS[(SLOT_SYMS.indexOf(s)+4)%SLOT_SYMS.length];
                const f = [s,s,s]; f[Math.floor(Math.random()*3)] = d; setReels(f); return;
            }
            setReels([...SLOT_SYMS].sort(()=>Math.random()-0.5).slice(0,3));
        }

        if (game.id === 1) {
            let syms;
            if (isJ)        syms = ["💎","💎","💎"];
            else if (r.won&&isR) syms = ["⭐","⭐","⭐"];
            else if (r.won) syms = ["🍹","🍹","🍹"];
            else syms = [...SCRATCH_SYMS].sort(()=>Math.random()-0.5).slice(0,3);
            setScrSyms(syms);
            setTimeout(()=>setScrShown([true,false,false]), 400);
            setTimeout(()=>setScrShown([true,true,false]),  800);
            setTimeout(()=>setScrShown([true,true,true]),  1200);
        }

        if (game.id === 2) {
            if (isJ) { setDice([6,6]); return; }
            if (r.won) { const v=Math.ceil(Math.random()*5); setDice([v,v]); return; }
            let a=Math.ceil(Math.random()*6), b=Math.ceil(Math.random()*6);
            while(a===b) b=b%6+1;
            setDice([a,b]);
        }

        if (game.id === 3)
            setRSegment(ROULETTE[Math.floor(Math.random()*ROULETTE.length)]);

        if (game.id === 4) {
            let val, suit;
            if (isJ)        { val="A";  suit="♠"; }
            else if(r.won&&isR) { val=["J","Q","K"][Math.floor(Math.random()*3)]; suit=CARD_SUITS[Math.floor(Math.random()*4)]; }
            else if(r.won)  { val=["9","10"][Math.floor(Math.random()*2)]; suit=CARD_SUITS[Math.floor(Math.random()*4)]; }
            else            { val=CARD_VALS[Math.floor(Math.random()*7)];  suit=CARD_SUITS[Math.floor(Math.random()*4)]; }
            setCard({ val, suit });
            setTimeout(()=>setFlipped(true), 300);
        }
    }

    // ── Send blockchain tx ───────────────────────────────────────────────────────
    async function handlePlay() {
        if (cooldown > 3) { setErrMsg(`⏳ Cooldown: ${cooldown}s remaining`); return; }
        setPhase("playing"); setErrMsg(""); setResult(null);
        animStart();

        try {
            const tx = await wallet.contracts.gamblingGame.playGame(game.id);
            const receipt = await Promise.race([
                tx.wait(),
                new Promise((_,rej) => setTimeout(()=>rej(new Error("timeout")), 90_000)),
            ]);

            const iface = wallet.contracts.gamblingGame.interface;
            let won=false, reward=0n, recipeWon=false;
            for (const log of receipt.logs) {
                try {
                    const p = iface.parseLog(log);
                    if (p?.name==="GamePlayed") { won=p.args.won; reward=p.args.rewardAmount; recipeWon=p.args.recipeWon; }
                } catch(_) {}
            }

            const r = { won, reward, recipeWon };
            animReveal(r);
            setResult(r);
            setPhase("revealed");
            onResult(r);
        } catch(e) {
            if (ticker.current) { clearInterval(ticker.current); ticker.current=null; }
            setPhase("ready");
            const m = e.message||"";
            if      (m.includes("timeout"))                             setErrMsg("Timed out — try again.");
            else if (m.includes("cooldown"))                            setErrMsg("Cooldown active — wait a moment.");
            else if (!m.includes("rejected")&&!m.includes("denied"))   setErrMsg("Transaction failed — please try again.");
        }
    }

    // ── Game visuals ─────────────────────────────────────────────────────────────
    function renderVisual() {
        const playing = phase === "playing";

        // SLOT MACHINE
        if (game.id === 0) return (
            <div style={{ margin:"20px 0" }}>
                <div style={{
                    background:"rgba(0,0,0,0.5)", borderRadius:"12px",
                    border:"2px solid rgba(255,215,0,0.3)", padding:"16px",
                }}>
                    {/* Reels */}
                    <div style={{ display:"flex", gap:"8px", justifyContent:"center", marginBottom:"10px" }}>
                        {reels.map((sym,i) => (
                            <div key={i} style={{
                                width:"80px", height:"80px", borderRadius:"10px",
                                background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,215,0,0.2)",
                                display:"flex", alignItems:"center", justifyContent:"center",
                                fontSize:"44px", filter: playing ? "blur(2px)" : "none",
                                transition: playing ? "none" : "filter 0.3s",
                            }}>{sym}</div>
                        ))}
                    </div>
                    {/* Payline */}
                    <div style={{ height:"3px", background:"rgba(255,50,50,0.8)", boxShadow:"0 0 8px red" }}/>
                </div>
                <div style={{ textAlign:"center", color:"#a08060", fontSize:"12px", marginTop:"8px" }}>
                    Match all 3 → Jackpot · Match any 2 → Win
                </div>
            </div>
        );

        // SCRATCH CARD
        if (game.id === 1) return (
            <div style={{ margin:"20px 0" }}>
                <div style={{ display:"flex", gap:"12px", justifyContent:"center" }}>
                    {scrSyms.map((sym,i) => (
                        <div key={i} style={{
                            width:"82px", height:"82px", borderRadius:"12px",
                            border:"2px solid rgba(255,215,0,0.3)",
                            display:"flex", alignItems:"center", justifyContent:"center",
                            fontSize:"38px", userSelect:"none",
                            background: scrShown[i]
                                ? "rgba(255,255,255,0.07)"
                                : "linear-gradient(135deg,#8b6914,#FFD700,#8b6914)",
                            transition:"all 0.4s",
                            transform: scrShown[i] ? "scale(1)" : "scale(0.95)",
                            cursor: phase==="revealed" && !scrShown[i] ? "pointer" : "default",
                            boxShadow: scrShown[i] ? "none" : "0 2px 10px rgba(255,215,0,0.3)",
                        }}
                             onClick={() => {
                                 if (phase==="revealed" && !scrShown[i]) {
                                     const n=[...scrShown]; n[i]=true; setScrShown(n);
                                 }
                             }}>
                            {scrShown[i] ? sym : "🔍"}
                        </div>
                    ))}
                </div>
                <div style={{ textAlign:"center", color:"#a08060", fontSize:"12px", marginTop:"10px" }}>
                    {phase==="revealed" && !scrShown.every(Boolean) ? "Click tiles to reveal!" : "Match symbols to win"}
                </div>
            </div>
        );

        // DICE ROLL
        if (game.id === 2) return (
            <div style={{ display:"flex", gap:"24px", justifyContent:"center", margin:"20px 0" }}>
                {dice.map((d,i) => (
                    <div key={i} style={{
                        width:"90px", height:"90px",
                        background:"linear-gradient(135deg,#f5f0e8,#d8cdb4)",
                        borderRadius:"16px", border:"3px solid rgba(255,215,0,0.4)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:"54px", color: "#1a1a1a",
                        boxShadow:"0 6px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.5)",
                        transition: playing ? "none" : "transform 0.3s",
                        transform: playing ? `rotate(${Math.random()*30-15}deg)` : "rotate(0deg)",
                    }}>{DICE_FACE[d]}</div>
                ))}
            </div>
        );

        // COCKTAIL ROULETTE
        if (game.id === 3) return (
            <div style={{ textAlign:"center", margin:"20px 0" }}>
                {/* Pointer */}
                <div style={{
                    width:0, height:0, margin:"0 auto",
                    borderLeft:"12px solid transparent", borderRight:"12px solid transparent",
                    borderBottom:"24px solid #FFD700", filter:"drop-shadow(0 0 6px #FFD700)",
                }}/>
                {/* Wheel */}
                <div style={{
                    width:"160px", height:"160px", borderRadius:"50%", margin:"4px auto 0",
                    background:"conic-gradient(#2a6e4a 0 60deg,#8b1a1a 60deg 120deg,#1a4a8b 120deg 180deg,#d4a020 180deg 240deg,#4a2a6b 240deg 300deg,#1a6b5a 300deg 360deg)",
                    border:"3px solid rgba(255,215,0,0.5)",
                    transform:`rotate(${rAngle}deg)`,
                    transition:`transform ${playing?1.5:0.4}s ease-out`,
                    boxShadow:"0 0 30px rgba(255,215,0,0.15)",
                }}/>
                {rSegment && phase==="revealed" && (
                    <div style={{
                        marginTop:"14px", padding:"10px 20px", borderRadius:"8px",
                        background:"rgba(255,215,0,0.1)", border:"1px solid rgba(255,215,0,0.3)",
                        color:"#FFD700", fontWeight:"bold",
                    }}>
                        Landed on: {rSegment}
                    </div>
                )}
                <div style={{ color:"#a08060", fontSize:"12px", marginTop:"8px" }}>
                    Collect 3 matching fragments → Rare Recipe
                </div>
            </div>
        );

        // CARD DRAW
        if (game.id === 4) return (
            <div style={{ textAlign:"center", margin:"20px 0" }}>
                <div style={{ width:"120px", height:"168px", margin:"0 auto", perspective:"600px" }}>
                    <div style={{
                        width:"100%", height:"100%",
                        transformStyle:"preserve-3d",
                        transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                        transition:"transform 0.5s ease",
                        position:"relative",
                    }}>
                        {/* Back */}
                        <div style={{
                            position:"absolute", inset:0, backfaceVisibility:"hidden",
                            background:"linear-gradient(135deg,#1a0a20,#2a1a40)",
                            borderRadius:"12px", border:"2px solid rgba(255,215,0,0.3)",
                            display:"flex", alignItems:"center", justifyContent:"center", fontSize:"48px",
                        }}>🃏</div>
                        {/* Front */}
                        <div style={{
                            position:"absolute", inset:0, backfaceVisibility:"hidden",
                            transform:"rotateY(180deg)",
                            background:"#f5f0e8", borderRadius:"12px",
                            border:"3px solid rgba(255,215,0,0.5)",
                            display:"flex", flexDirection:"column",
                            alignItems:"center", justifyContent:"center",
                            boxShadow:"0 4px 20px rgba(0,0,0,0.5)",
                        }}>
                            {card && <>
                                <div style={{
                                    fontSize:"40px", fontWeight:"900", lineHeight:1,
                                    color:(card.suit==="♥"||card.suit==="♦") ? "#cc2200" : "#1a1a2a",
                                }}>{card.val}</div>
                                <div style={{
                                    fontSize:"36px", lineHeight:1, marginTop:"6px",
                                    color:(card.suit==="♥"||card.suit==="♦") ? "#cc2200" : "#1a1a2a",
                                }}>{card.suit}</div>
                            </>}
                        </div>
                    </div>
                </div>
                <div style={{ color:"#a08060", fontSize:"12px", marginTop:"10px" }}>
                    9/10 → Win · J/Q/K → Rare · Ace → Jackpot
                </div>
            </div>
        );
    }

    return (
        <div style={{
            position:"fixed", inset:0, zIndex:500,
            background:"rgba(0,0,0,0.85)", backdropFilter:"blur(6px)",
            display:"flex", alignItems:"center", justifyContent:"center",
        }} onClick={phase!=="playing" ? onClose : undefined}>
            <div style={{
                background:"linear-gradient(135deg,#0f0a1a,#1a1020)",
                border:"1px solid rgba(255,215,0,0.3)", borderRadius:"24px",
                padding:"28px", width:"380px", maxWidth:"94vw",
                boxShadow:"0 0 60px rgba(255,215,0,0.1)",
            }} onClick={e=>e.stopPropagation()}>

                {/* Header */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"4px" }}>
                    <div style={{ fontSize:"20px", fontWeight:"bold", color:"#FFD700" }}>
                        {game.emoji} {game.name}
                    </div>
                    {phase!=="playing" && (
                        <button onClick={onClose} style={{
                            background:"none", border:"none", color:"#a08060",
                            fontSize:"18px", cursor:"pointer",
                        }}>✕</button>
                    )}
                </div>
                <div style={{ fontSize:"12px", color:"#a08060", marginBottom:"4px" }}>{game.desc}</div>

                {/* Visual */}
                {renderVisual()}

                {/* Result banner */}
                {phase==="revealed" && result && (
                    <div style={{
                        padding:"12px", borderRadius:"10px", marginBottom:"14px", textAlign:"center",
                        background: result.won ? "rgba(0,255,100,0.08)" : "rgba(255,80,80,0.08)",
                        border:`1px solid ${result.won ? "rgba(0,255,100,0.3)" : "rgba(255,80,80,0.3)"}`,
                    }}>
                        {result.won ? (
                            <>
                                <div style={{ fontSize:"20px", fontWeight:"bold", color:"#00ff64" }}>
                                    🎉 +{fmt(result.reward)} $BAR
                                </div>
                                {result.recipeWon && (
                                    <div style={{ color:"#c864ff", marginTop:"4px", fontSize:"14px", fontWeight:600 }}>
                                        🍹 Recipe NFT unlocked!
                                    </div>
                                )}
                            </>
                        ) : (
                            <div style={{ color:"#ff5050", fontSize:"16px" }}>😔 No luck — try again!</div>
                        )}
                    </div>
                )}

                {/* Error */}
                {errMsg && (
                    <div style={{
                        padding:"10px", borderRadius:"8px", marginBottom:"12px",
                        background:"rgba(255,80,80,0.1)", border:"1px solid rgba(255,80,80,0.3)",
                        color:"#ff8080", fontSize:"13px",
                    }}>{errMsg}</div>
                )}

                {/* Play button */}
                <button onClick={handlePlay}
                        disabled={phase==="playing" || cooldown>3}
                        style={{
                            width:"100%", padding:"14px", borderRadius:"12px",
                            fontSize:"16px", fontWeight:"bold", border:"none",
                            cursor:(phase==="playing"||cooldown>3) ? "not-allowed" : "pointer",
                            background:(phase==="playing"||cooldown>3)
                                ? "rgba(255,215,0,0.2)"
                                : "linear-gradient(135deg,#FFD700,#FFA500)",
                            color:(phase==="playing"||cooldown>3) ? "#a08060" : "#0a0a0f",
                        }}>
                    {phase==="playing" ? "⏳ Confirming on blockchain…"
                        : cooldown>3      ? `⏳ Cooldown: ${cooldown}s`
                            : phase==="revealed" ? "🎲 Play Again"
                                : "🎲 Play"}
                </button>
                {phase!=="playing" && (
                    <div style={{ textAlign:"center", fontSize:"11px", color:"#444", marginTop:"8px" }}>
                        Click outside to close
                    </div>
                )}
            </div>
        </div>
    );
}