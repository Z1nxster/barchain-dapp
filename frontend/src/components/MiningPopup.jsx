import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

export default function MiningPopup({ result, onClose }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (result) {
            setVisible(true);
            const t = setTimeout(() => { setVisible(false); setTimeout(onClose, 400); }, 6000);
            return () => clearTimeout(t);
        }
    }, [result, onClose]);

    if (!result) return null;

    const fmt = (wei) => parseFloat(ethers.formatEther(wei || "0")).toFixed(2);

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: visible ? 1 : 0, transition: "opacity 0.4s",
        }} onClick={() => { setVisible(false); setTimeout(onClose, 400); }}>
            <div style={{
                background: "linear-gradient(135deg, #1a1a0f, #2a200a)",
                border: "1px solid rgba(255,215,0,0.4)",
                borderRadius: "24px", padding: "40px 48px", textAlign: "center",
                maxWidth: "380px", width: "90%",
                boxShadow: "0 0 60px rgba(255,215,0,0.2)",
                transform: visible ? "scale(1)" : "scale(0.9)",
                transition: "transform 0.4s",
            }} onClick={(e) => e.stopPropagation()}>

                {/* Icon */}
                <div style={{ fontSize: "56px", marginBottom: "12px" }}>⛏️</div>

                {/* Title */}
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#FFD700", marginBottom: "8px" }}>
                    Mining Complete!
                </div>
                <div style={{ fontSize: "14px", color: "#a08060", marginBottom: "28px" }}>
                    Your proof-of-play was accepted by the blockchain
                </div>

                {/* BAR reward */}
                <div style={{
                    background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)",
                    borderRadius: "14px", padding: "20px", marginBottom: "16px",
                }}>
                    <div style={{ fontSize: "36px", fontWeight: "bold", color: "#FFD700" }}>
                        +{fmt(result.barAmount)} $BAR
                    </div>
                    <div style={{ fontSize: "13px", color: "#a08060", marginTop: "4px" }}>
                        Added to your wallet
                    </div>
                </div>

                {/* Recipe NFT if won */}
                {result.recipe && (
                    <div style={{
                        background: "rgba(200,100,255,0.1)", border: "1px solid rgba(200,100,255,0.4)",
                        borderRadius: "14px", padding: "16px", marginBottom: "20px",
                    }}>
                        <div style={{ fontSize: "24px", marginBottom: "6px" }}>🍹</div>
                        <div style={{ fontWeight: "bold", color: "#c864ff", fontSize: "16px" }}>
                            Recipe NFT Unlocked!
                        </div>
                        <div style={{ color: "#a08060", fontSize: "13px", marginTop: "4px" }}>
                            {result.recipe.name} · {result.recipe.rarity}
                        </div>
                    </div>
                )}

                <button onClick={() => { setVisible(false); setTimeout(onClose, 400); }} style={{
                    padding: "12px 40px", borderRadius: "10px", fontSize: "15px",
                    fontWeight: "bold", cursor: "pointer", border: "none",
                    background: "linear-gradient(135deg, #FFD700, #FFA500)",
                    color: "#0a0a0f", width: "100%",
                }}>
                    Collect ✓
                </button>

                <div style={{ fontSize: "12px", color: "#666", marginTop: "12px" }}>
                    Click anywhere to dismiss
                </div>
            </div>
        </div>
    );
}