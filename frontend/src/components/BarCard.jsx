import React from "react";

function BarSceneSVG({ level, recipeCount, color }) {
    const bottleColors = ["#2a6e4a","#8b1a1a","#1a4a8b","#6b4a2a","#4a2a6b","#d4a020","#1a6b5a","#8b3a1a"];
    const bottles = [
        { x:32,  h:42, w:14 }, { x:58,  h:32, w:13 }, { x:82,  h:38, w:15 },
        { x:108, h:36, w:12 }, { x:132, h:40, w:14 }, { x:158, h:30, w:13 },
        { x:182, h:44, w:16 }, { x:210, h:34, w:13 },
    ];

    return (
        <svg viewBox="0 0 280 180" xmlns="http://www.w3.org/2000/svg"
             style={{ width: "100%", borderRadius: "12px" }}>
            {/* Background */}
            <rect width="280" height="180" fill="#12060f" rx="12"/>

            {/* Back wall texture */}
            <rect width="280" height="110" fill="#1e0e1a" rx="0"/>
            {[0,1,2,3,4,5,6].map(i => (
                <line key={i} x1={i*46} y1="0" x2={i*46} y2="110"
                      stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
            ))}

            {/* Shelf board */}
            <rect x="10" y="68" width="260" height="7" fill="#5c3a1e" rx="2"/>
            <rect x="10" y="68" width="260" height="2" fill="rgba(255,255,255,0.1)" rx="2"/>

            {/* Bottles */}
            {bottles.map((b, i) => (
                <g key={i}>
                    <rect x={b.x} y={72 - b.h} width={b.w} height={b.h}
                          fill={bottleColors[i]} rx="3" opacity="0.9"/>
                    <rect x={b.x + b.w*0.25} y={72 - b.h - 8} width={b.w*0.5} height="9"
                          fill={bottleColors[i]} rx="2"/>
                    {/* Label */}
                    <rect x={b.x+2} y={72 - b.h + 8} width={b.w-4} height={b.h*0.35}
                          fill="rgba(255,255,255,0.12)" rx="1"/>
                    {/* Shine */}
                    <rect x={b.x+1} y={72 - b.h} width="3" height={b.h}
                          fill="rgba(255,255,255,0.15)" rx="1"/>
                </g>
            ))}

            {/* Neon sign */}
            <rect x="90" y="12" width="100" height="28" rx="8"
                  fill="none" stroke={color} strokeWidth="1.5" opacity="0.7"/>
            <text x="140" y="30" textAnchor="middle" fontSize="11"
                  fontWeight="bold" fill={color} opacity="0.9" fontFamily="Arial">
                ✦ OPEN ✦
            </text>

            {/* Counter */}
            <rect x="0" y="130" width="280" height="50" fill="#2a1508" rx="0"/>
            <rect x="0" y="126" width="280" height="8" fill="#5c3a1e" rx="0"/>
            <rect x="0" y="126" width="280" height="2" fill="rgba(255,255,255,0.12)"/>

            {/* Glasses on counter */}
            {/* Martini glass */}
            <polygon points="42,90 70,90 56,124"
                     fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5"/>
            <line x1="56" y1="124" x2="56" y2="130"
                  stroke="rgba(255,255,255,0.45)" strokeWidth="1.5"/>
            <line x1="49" y1="130" x2="63" y2="130"
                  stroke="rgba(255,255,255,0.45)" strokeWidth="1.5"/>

            {/* Highball */}
            <rect x="118" y="100" width="18" height="30"
                  fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" rx="1"/>
            <rect x="121" y="112" width="5" height="5" fill="rgba(200,240,255,0.5)" rx="1"/>
            <rect x="128" y="108" width="5" height="5" fill="rgba(200,240,255,0.5)" rx="1"/>

            {/* Cocktail with player's color */}
            <polygon points="175,93 205,93 190,122"
                     fill={color + "55"} stroke="rgba(255,255,255,0.45)" strokeWidth="1.5"/>
            <polygon points="177,96 203,96 190,120" fill={color + "40"}/>
            <line x1="190" y1="122" x2="190" y2="130"
                  stroke="rgba(255,255,255,0.45)" strokeWidth="1.5"/>
            <line x1="183" y1="130" x2="197" y2="130"
                  stroke="rgba(255,255,255,0.45)" strokeWidth="1.5"/>

            {/* Level indicator dots at bottom */}
            {Array.from({ length: Math.min(level, 10) }).map((_, i) => (
                <circle key={i} cx={20 + i * 24} cy="162" r="5"
                        fill={color} opacity="0.85"/>
            ))}
            {Array.from({ length: Math.max(0, 10 - level) }).map((_, i) => (
                <circle key={i} cx={20 + (level + i) * 24} cy="162" r="5"
                        fill="rgba(255,255,255,0.1)" opacity="0.5"/>
            ))}
        </svg>
    );
}

export default function BarCard({ barData, barBal }) {
    // Color based on bar level
    const hue = (barData.level * 40 + 200) % 360;
    const color = `hsl(${hue}, 70%, 55%)`;

    return (
        <div style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,215,0,0.2)",
            borderRadius: "20px", overflow: "hidden",
            boxShadow: "0 0 30px rgba(255,215,0,0.06)",
        }}>
            {/* Bar scene — constrained height */}
            <div style={{ width: "100%", maxWidth: "560px", margin: "0 auto" }}>
                <BarSceneSVG level={barData.level} recipeCount={barData.recipeCount} color={color}/>
            </div>

            {/* Info panel */}
            <div style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div style={{ fontSize: "22px", fontWeight: "bold", color: "#FFD700" }}>
                        {barData.name}
                    </div>
                    <div style={{
                        padding: "4px 14px", borderRadius: "999px",
                        background: `${color}22`, border: `1px solid ${color}`,
                        color, fontWeight: "bold", fontSize: "14px",
                    }}>
                        Level {barData.level}
                    </div>
                </div>

                <div style={{
                    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px",
                }}>
                    {[
                        { v: barBal,              l: "$BAR Balance"      },
                        { v: barData.gamesPlayed, l: "Games Played"      },
                        { v: barData.recipeCount, l: "Recipes"           },
                        { v: `#${barData.tokenId}`, l: "Token ID"        },
                    ].map(({ v, l }) => (
                        <div key={l} style={{
                            background: "rgba(0,0,0,0.25)", borderRadius: "10px",
                            padding: "14px 8px", textAlign: "center",
                            border: "1px solid rgba(255,215,0,0.08)",
                        }}>
                            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#FFD700" }}>{v}</div>
                            <div style={{ fontSize: "11px", color: "#a08060", marginTop: "4px" }}>{l}</div>
                        </div>
                    ))}
                </div>

                <div style={{
                    marginTop: "14px", padding: "12px 16px", borderRadius: "10px",
                    background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,215,0,0.08)",
                    fontSize: "13px", color: "#a08060",
                }}>
                    📅 Opened on {barData.mintDate}
                    <span style={{ float: "right", color: "#FFD700" }}>
            Next level: {barData.level ** 2 * 5} games or {barData.level ** 2 * 2} recipes
          </span>
                </div>
            </div>
        </div>
    );
}