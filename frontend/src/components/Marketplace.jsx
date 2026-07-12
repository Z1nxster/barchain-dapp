import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { addresses } from "../utils/contracts.js";
import RecipeCard from "./RecipeCard.jsx";
import { uploadMetadata } from "../utils/ipfs.js";

const fmt    = (wei) => parseFloat(ethers.formatEther(wei || "0")).toFixed(4);
const short  = (a)   => `${a.slice(0,6)}...${a.slice(-4)}`;

export default function Marketplace({ wallet, recipes, onRefresh }) {
    const [listings,   setListings]   = useState([]);
    const [fetching,   setFetching]   = useState(true);
    const [txBusy,     setTxBusy]     = useState(false);
    const [listModal,  setListModal]  = useState(null);
    const [priceETH,   setPriceETH]   = useState("");
    const [priceBAR,   setPriceBAR]   = useState("");
    const [isPremium,  setIsPremium]  = useState(false);
    const [notice,     setNotice]     = useState("");
    const [noticeType, setNoticeType] = useState("info"); // "info" | "error"

    function flash(msg, type = "info") {
        setNotice(msg); setNoticeType(type);
        setTimeout(() => setNotice(""), 4000);
    }

    // ── Load all active listings ───────────────────────────────────────────────
    async function loadListings() {
        try {
            setFetching(true);
            const ids   = await wallet.contracts.recipeMarketplace.getActiveListings();
            const items = await Promise.all(
                ids.map(async (id) => {
                    try {
                        const [listing, recipe, rarity] = await Promise.all([
                            wallet.contracts.recipeMarketplace.getListing(id),
                            wallet.contracts.recipeNFT.getRecipeData(id),
                            wallet.contracts.recipeNFT.getRarityName(id),
                        ]);
                        return {
                            tokenId:   Number(id),
                            seller:    listing.seller,
                            priceETH:  listing.priceETH,
                            priceBAR:  listing.priceBAR,
                            isPremium: listing.isPremium,
                            listedAt:  new Date(Number(listing.listedAt) * 1000).toLocaleDateString(),
                            name:      recipe.name,
                            rarity,
                            mintDate:  new Date(Number(recipe.mintDate) * 1000).toLocaleDateString(),
                        };
                    } catch (_) { return null; }
                })
            );
            // Premium listings first
            setListings(
                items
                    .filter(Boolean)
                    .sort((a, b) => (b.isPremium ? 1 : 0) - (a.isPremium ? 1 : 0))
            );
        } catch (e) {
            flash("Failed to load listings.", "error");
        } finally {
            setFetching(false);
        }
    }

    useEffect(() => { loadListings(); }, []);

    // ── List a recipe ──────────────────────────────────────────────────────────
    async function handleList() {
        if (!priceETH && !priceBAR) { flash("Set at least one price.", "error"); return; }
        try {
            setTxBusy(true);
            const tokenId  = listModal.tokenId;
            const ethPrice = priceETH ? ethers.parseEther(priceETH) : 0n;
            const barPrice = priceBAR ? ethers.parseEther(priceBAR) : 0n;
            const fee      = isPremium
                ? await wallet.contracts.recipeMarketplace.premiumListingFee()
                : 0n;

            // Upload recipe metadata to IPFS
            flash("Uploading recipe to IPFS...");
            const recipeMetadata = {
                name:        listModal.name,
                description: `${listModal.name} — a cocktail recipe NFT on BarChain`,
                rarity:      listModal.rarity,
                tokenId:     listModal.tokenId,
                attributes: [
                    { trait_type: "Rarity",   value: listModal.rarity   },
                    { trait_type: "Platform", value: "BarChain"          },
                ],
                listedAt: new Date().toISOString(),
            };
            await uploadMetadata(`recipe-${listModal.tokenId}`, recipeMetadata);

            // Step 1 — approve marketplace to transfer this NFT
            flash("Step 1/2 — Approving marketplace...");
            const approveTx = await wallet.contracts.recipeNFT.approve(
                addresses.RecipeMarketplace, tokenId
            );
            await approveTx.wait();

            // Step 2 — list it
            flash("Step 2/2 — Listing recipe...");
            const tx = await wallet.contracts.recipeMarketplace.listRecipe(
                tokenId, ethPrice, barPrice, isPremium, { value: fee }
            );
            await tx.wait();

            flash("🏪 Recipe listed successfully!");
            setListModal(null); setPriceETH(""); setPriceBAR(""); setIsPremium(false);
            await loadListings();
            onRefresh();
        } catch (e) {
            flash("Transaction failed — please try again.", "error");
        } finally {
            setTxBusy(false);
        }
    }
    useEffect(() => {
        const handler = (e) => setListModal(e.detail);
        document.addEventListener("openListModal", handler);
        return () => document.removeEventListener("openListModal", handler);
    }, []);

    // ── Buy with ETH ──────────────────────────────────────────────────────────
    async function handleBuyETH(listing) {
        try {
            setTxBusy(true);
            flash("Sending purchase transaction...");
            const tx = await wallet.contracts.recipeMarketplace.buyWithETH(
                listing.tokenId, { value: listing.priceETH }
            );
            await tx.wait();
            flash("🎉 Recipe purchased!");
            await loadListings(); onRefresh();
        } catch (e) {
            flash("Transaction failed — please try again.", "error");
        } finally { setTxBusy(false); }
    }

    // ── Buy with $BAR ─────────────────────────────────────────────────────────
    async function handleBuyBAR(listing) {
        try {
            setTxBusy(true);
            flash("Step 1/2 — Approving $BAR spend...");
            const approveTx = await wallet.contracts.barCoin.approve(
                addresses.RecipeMarketplace, listing.priceBAR
            );
            await approveTx.wait();
            flash("Step 2/2 — Buying recipe...");
            const tx = await wallet.contracts.recipeMarketplace.buyWithBAR(listing.tokenId);
            await tx.wait();
            flash("🎉 Recipe purchased!");
            await loadListings(); onRefresh();
        } catch (e) {
            flash("Transaction failed — please try again.", "error");
        } finally { setTxBusy(false); }
    }

    // ── Cancel listing ─────────────────────────────────────────────────────────
    async function handleCancel(tokenId) {
        try {
            setTxBusy(true);
            flash("Cancelling listing...");
            const tx = await wallet.contracts.recipeMarketplace.cancelListing(tokenId);
            await tx.wait();
            flash("Listing cancelled.");
            await loadListings();
        } catch (e) {
            flash("Transaction failed — please try again.", "error");
        } finally { setTxBusy(false); }
    }

    const isOwn = (seller) =>
        seller?.toLowerCase() === wallet.address.toLowerCase();

    // ── Styles ─────────────────────────────────────────────────────────────────
    const noticeStyle = {
        padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px",
        ...(noticeType === "error"
            ? { background: "rgba(255,80,80,0.1)",   border: "1px solid rgba(255,80,80,0.3)",   color: "#ff8080" }
            : { background: "rgba(255,215,0,0.08)",  border: "1px solid rgba(255,215,0,0.3)",   color: "#FFD700" }),
    };

    const btnBase = {
        padding: "9px 12px", borderRadius: "8px", cursor: txBusy ? "not-allowed" : "pointer",
        fontSize: "13px", fontWeight: "600", border: "none", width: "100%",
        opacity: txBusy ? 0.6 : 1,
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div>
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#FFD700" }}>
                    🏪 Marketplace {!fetching && `(${listings.length} listings)`}
                </div>
                <button onClick={loadListings} style={{
                    padding: "8px 18px", borderRadius: "8px", cursor: "pointer",
                    background: "rgba(255,215,0,0.1)", border: "1px solid #FFD700",
                    color: "#FFD700", fontSize: "13px",
                }}>↻ Refresh</button>
            </div>

            {notice && <div style={noticeStyle}>{notice}</div>}

            {/* Listings */}
            {fetching ? (
                <div style={{ textAlign: "center", color: "#a08060", padding: "48px" }}>
                    Loading listings…
                </div>
            ) : listings.length === 0 ? (
                <div style={{
                    textAlign: "center", color: "#a08060", padding: "60px",
                    border: "1px dashed rgba(255,215,0,0.2)", borderRadius: "16px",
                }}>
                    No recipes listed yet — go to your Recipes tab and list one!
                </div>
            ) : (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: "20px", marginBottom: "24px",
                }}>
                    {listings.map((l) => (
                        <div key={l.tokenId} style={{
                            background: "rgba(255,255,255,0.04)",
                            border: l.isPremium
                                ? "1px solid rgba(255,215,0,0.55)"
                                : "1px solid rgba(255,215,0,0.15)",
                            borderRadius: "16px", padding: "16px", textAlign: "center",
                            boxShadow: l.isPremium ? "0 0 22px rgba(255,215,0,0.12)" : "none",
                        }}>
                            {l.isPremium && (
                                <div style={{ fontSize: "11px", fontWeight: "bold", color: "#FFD700",
                                    marginBottom: "8px", letterSpacing: "1px" }}>⭐ PREMIUM
                                </div>
                            )}

                            <RecipeCard recipe={l} />

                            <div style={{ fontSize: "11px", color: "#a08060", margin: "8px 0" }}>
                                by {short(l.seller)} · {l.listedAt}
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px" }}>
                                {isOwn(l.seller) ? (
                                    <button onClick={() => handleCancel(l.tokenId)} disabled={txBusy}
                                            style={{ ...btnBase, background: "rgba(255,80,80,0.15)",
                                                border: "1px solid rgba(255,80,80,0.4)", color: "#ff8080" }}>
                                        ✕ Cancel Listing
                                    </button>
                                ) : (
                                    <>
                                        {l.priceETH > 0n && (
                                            <button onClick={() => handleBuyETH(l)} disabled={txBusy}
                                                    style={{ ...btnBase, background: "rgba(100,200,255,0.12)",
                                                        border: "1px solid rgba(100,200,255,0.4)", color: "#64c8ff" }}>
                                                Buy {fmt(l.priceETH)} ETH
                                            </button>
                                        )}
                                        {l.priceBAR > 0n && (
                                            <button onClick={() => handleBuyBAR(l)} disabled={txBusy}
                                                    style={{ ...btnBase, background: "rgba(255,215,0,0.1)",
                                                        border: "1px solid rgba(255,215,0,0.3)", color: "#FFD700" }}>
                                                Buy {fmt(l.priceBAR)} $BAR
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* List modal */}
            {listModal && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 1000,
                    background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }} onClick={() => !txBusy && setListModal(null)}>
                    <div style={{
                        background: "#1a1020", border: "1px solid rgba(255,215,0,0.3)",
                        borderRadius: "20px", padding: "32px", width: "340px",
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: "18px", fontWeight: "bold", color: "#FFD700", marginBottom: "6px" }}>
                            🏪 List for Sale
                        </div>
                        <div style={{ color: "#a08060", fontSize: "13px", marginBottom: "20px" }}>
                            "{listModal.name}" · {listModal.rarity}
                        </div>

                        {[
                            { label: "Price in ETH", val: priceETH, set: setPriceETH, step: "0.001", ph: "e.g. 0.01" },
                            { label: "Price in $BAR", val: priceBAR, set: setPriceBAR, step: "1", ph: "e.g. 100" },
                        ].map(({ label, val, set, step, ph }) => (
                            <div key={label}>
                                <div style={{ color: "#a08060", fontSize: "12px", marginBottom: "4px" }}>{label}</div>
                                <input type="number" step={step} placeholder={ph} value={val}
                                       onChange={e => set(e.target.value)}
                                       style={{
                                           width: "100%", padding: "10px 14px", borderRadius: "8px",
                                           marginBottom: "14px", background: "rgba(255,255,255,0.07)",
                                           border: "1px solid rgba(255,215,0,0.3)", color: "#f0e6d3",
                                           fontSize: "15px", outline: "none", boxSizing: "border-box",
                                       }}
                                />
                            </div>
                        ))}

                        <label style={{ display: "flex", alignItems: "center", gap: "10px",
                            color: "#a08060", fontSize: "13px", marginBottom: "20px", cursor: "pointer" }}>
                            <input type="checkbox" checked={isPremium}
                                   onChange={e => setIsPremium(e.target.checked)}/>
                            ⭐ X402 Premium listing (0.001 ETH) — pinned to top, shown first to all users
                        </label>

                        {notice && <div style={{ ...noticeStyle, marginBottom: "14px" }}>{notice}</div>}

                        <div style={{ display: "flex", gap: "10px" }}>
                            <button onClick={() => !txBusy && setListModal(null)} style={{
                                flex: 1, padding: "12px", borderRadius: "8px", cursor: "pointer",
                                background: "transparent", border: "1px solid rgba(255,255,255,0.2)",
                                color: "#a08060", fontSize: "14px",
                            }}>Cancel</button>
                            <button onClick={handleList} disabled={txBusy} style={{
                                flex: 2, padding: "12px", borderRadius: "8px",
                                cursor: txBusy ? "not-allowed" : "pointer",
                                background: "linear-gradient(135deg, #FFD700, #FFA500)",
                                border: "none", color: "#0a0a0f", fontSize: "14px",
                                fontWeight: "bold", opacity: txBusy ? 0.7 : 1,
                            }}>
                                {txBusy ? "Processing…" : "List Recipe"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}