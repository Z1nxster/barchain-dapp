import React from "react";

// Derives a unique, attractive color from the token ID
function tokenColor(tokenId) {
    const hue = (Number(tokenId) * 137 + 30) % 360;
    return {
        main:  `hsl(${hue}, 75%, 55%)`,
        light: `hsl(${hue}, 75%, 72%)`,
        dark:  `hsl(${hue}, 75%, 32%)`,
        glow:  `hsla(${hue}, 75%, 55%, 0.45)`,
    };
}

function CocktailGlassSVG({ color, rarity, tokenId }) {
    const uid   = `g${tokenId}`;
    const tid   = Number(tokenId);

    // Deterministic bubbles — same token always looks the same
    const bubbles = Array.from({ length: rarity === "Legendary" ? 9 : rarity === "Rare" ? 5 : 3 },
        (_, i) => ({
            cx: 55 + ((tid * (i + 1) * 37) % 90),
            cy: 88 + ((tid * (i + 1) * 53) % 55),
            r:  1.5 + (i % 3),
        })
    );

    // Sparkle crosses for Rare/Legendary
    const sparkles = rarity === "Common" ? [] :
        Array.from({ length: rarity === "Legendary" ? 6 : 3 }, (_, i) => ({
            x:    25 + ((tid * (i + 3) * 71) % 150),
            y:    5  + ((tid * (i + 3) * 43) % 18),
            size: 3  + (i % 3),
        }));

    return (
        <svg viewBox="0 0 200 235" xmlns="http://www.w3.org/2000/svg"
             style={{ width: "100%", height: "100%" }}>
            <defs>
                <linearGradient id={`liq-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%"   stopColor={color.light} stopOpacity="0.95"/>
                    <stop offset="100%" stopColor={color.dark}  stopOpacity="0.95"/>
                </linearGradient>
                <linearGradient id={`shine-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%"   stopColor="rgba(255,255,255,0.38)"/>
                    <stop offset="45%"  stopColor="rgba(255,255,255,0.04)"/>
                    <stop offset="100%" stopColor="rgba(255,255,255,0.10)"/>
                </linearGradient>
                <radialGradient id={`aura-${uid}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%"   stopColor={color.glow}/>
                    <stop offset="100%" stopColor="transparent"/>
                </radialGradient>
                <filter id={`blur-${uid}`}>
                    <feGaussianBlur stdDeviation="5"/>
                </filter>
                {/* Clip liquid to bowl shape */}
                <clipPath id={`bowl-${uid}`}>
                    <polygon points="15,28 185,28 112,152 88,152"/>
                </clipPath>
            </defs>

            {/* Aura glow for Rare / Legendary */}
            {rarity !== "Common" && (
                <ellipse cx="100" cy="100" rx="92" ry="78"
                         fill={`url(#aura-${uid})`}
                         filter={`url(#blur-${uid})`}
                         opacity={rarity === "Legendary" ? 0.65 : 0.35}/>
            )}

            {/* Liquid fill */}
            <polygon points="47,82 153,82 112,152 88,152"
                     fill={`url(#liq-${uid})`}
                     clipPath={`url(#bowl-${uid})`}/>

            {/* Liquid surface line */}
            <line x1="47" y1="82" x2="153" y2="82"
                  stroke={color.light} strokeWidth="2" opacity="0.85"/>

            {/* Bubbles rising in liquid */}
            {bubbles.map((b, i) => (
                <circle key={i} cx={b.cx} cy={b.cy} r={b.r}
                        fill="rgba(255,255,255,0.7)"
                        clipPath={`url(#bowl-${uid})`}/>
            ))}

            {/* Glass bowl */}
            <polygon points="15,28 185,28 112,152 88,152"
                     fill="rgba(255,255,255,0.04)"
                     stroke="rgba(255,255,255,0.78)"
                     strokeWidth="2.5"/>

            {/* Left-side shine */}
            <polygon points="18,31 58,31 46,92 22,92"
                     fill={`url(#shine-${uid})`}
                     clipPath={`url(#bowl-${uid})`}/>

            {/* Stem */}
            <rect x="96" y="152" width="8" height="52" rx="4"
                  fill="rgba(255,255,255,0.45)"
                  stroke="rgba(255,255,255,0.55)" strokeWidth="1"/>

            {/* Base ellipse */}
            <ellipse cx="100" cy="207" rx="46" ry="8"
                     fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2.5"/>
            <ellipse cx="100" cy="207" rx="46" ry="8"
                     fill={`url(#shine-${uid})`} opacity="0.25"/>

            {/* Sparkles */}
            {sparkles.map((s, i) => (
                <g key={i} transform={`translate(${s.x},${s.y})`} opacity="0.9">
                    <line x1={-s.size} y1="0" x2={s.size} y2="0"
                          stroke={color.light} strokeWidth="1.5"/>
                    <line x1="0" y1={-s.size} x2="0" y2={s.size}
                          stroke={color.light} strokeWidth="1.5"/>
                </g>
            ))}

            {/* Legendary crown */}
            {rarity === "Legendary" && (
                <text x="100" y="22" textAnchor="middle" fontSize="15">👑</text>
            )}
        </svg>
    );
}

export default function RecipeCard({ recipe, onList, isListed }) {
    const color = tokenColor(recipe.tokenId);

    const rc = {
        Legendary: { text: "#ff6400", bg: "rgba(255,100,0,0.12)", border: "#ff6400" },
        Rare:      { text: "#c864ff", bg: "rgba(150,0,255,0.12)", border: "#c864ff" },
        Common:    { text: "#00b4ff", bg: "rgba(0,180,255,0.08)", border: "#00b4ff" },
    }[recipe.rarity] ?? { text: "#00b4ff", bg: "rgba(0,180,255,0.08)", border: "#00b4ff" };

    return (
        <div style={{
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${rc.border}44`,
            borderRadius: "16px", padding: "20px", textAlign: "center",
            boxShadow: `0 0 18px ${rc.border}18`,
            transition: "transform 0.2s, box-shadow 0.2s",
        }}>
            {/* Rarity badge */}
            <div style={{
                display: "inline-block", padding: "3px 12px", borderRadius: "999px",
                fontSize: "11px", fontWeight: "bold", marginBottom: "10px",
                background: rc.bg, color: rc.text, border: `1px solid ${rc.border}`,
            }}>
                {recipe.rarity}
            </div>

            {/* Cocktail glass */}
            <div style={{ width: "110px", height: "132px", margin: "0 auto 10px" }}>
                <CocktailGlassSVG color={color} rarity={recipe.rarity} tokenId={recipe.tokenId}/>
            </div>

            {/* Colour swatch — unique to this recipe */}
            <div style={{
                width: "20px", height: "20px", borderRadius: "50%",
                background: color.main, margin: "0 auto 10px",
                border: "2px solid rgba(255,255,255,0.25)",
                boxShadow: `0 0 8px ${color.glow}`,
            }}/>

            <div style={{ fontSize: "15px", fontWeight: "bold", color: "#f0e6d3", marginBottom: "4px" }}>
                {recipe.name}
            </div>
            <div style={{ fontSize: "12px", color: "#a08060", marginBottom: onList ? "12px" : "0" }}>
                Token #{recipe.tokenId} · {recipe.mintDate}
            </div>

            {/* Optional list button (shown in inventory, not marketplace) */}
            {onList && (
                isListed
                    ? (
                        <div style={{
                            marginTop: "8px", padding: "7px 20px", borderRadius: "8px",
                            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)",
                            color: "#a08060", fontSize: "13px", textAlign: "center",
                        }}>
                            🏪 Listed for Sale
                        </div>
                    ) : (
                        <button onClick={() => onList(recipe)} style={{
                            marginTop: "8px", padding: "7px 20px", borderRadius: "8px",
                            background: "rgba(255,215,0,0.12)", border: "1px solid #FFD700",
                            color: "#FFD700", cursor: "pointer", fontSize: "13px",
                            fontWeight: "600", width: "100%",
                        }}>
                            🏪 List for Sale
                        </button>
                    )
            )}
        </div>
    );
}