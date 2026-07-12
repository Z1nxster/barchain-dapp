# BarChain DApp — Full Presentation Text
### For AI slide generation — use this as the source material

---

## SLIDE 1 — Title Slide

**Title:** BarChain 🍹
**Subtitle:** A Blockchain-Powered Virtual Bar & Gambling DApp
**Details:**
- Built on Ethereum Sepolia Testnet
- Final Project — Blockchain Development Course, Semester B 2026
- Live at: https://barchain-dapp.vercel.app
- GitHub: https://github.com/Z1nxster/barchain-dapp

---

## SLIDE 2 — What is BarChain?

BarChain is a fully decentralized application (DApp) where players own and operate a virtual bar on the Ethereum blockchain. Every element of the game — the bar itself, the currency, the recipes, and the game outcomes — lives permanently on the blockchain.

**Core concept:**
- Each player owns a unique Bar NFT representing their virtual bar
- Players earn $BAR tokens (an ERC20 currency) through gambling mini-games and proof-of-play mining
- Winning games awards Cocktail Recipe NFTs — unique digital collectibles with on-chain history
- Recipes can be traded with other players on the built-in marketplace
- Everything is transparent, verifiable, and permanent on the Sepolia testnet

**Why blockchain?**
Traditional games store data on centralized servers — the company can change or delete it. In BarChain, every token, every recipe, every game result, and every ownership transfer is recorded permanently on Ethereum. No one — including the developer — can alter the history.

---

## SLIDE 3 — Architecture Overview

BarChain is built in three layers:

**Layer 1 — Smart Contracts (Solidity)**
Five contracts deployed on Sepolia testnet handle all game logic, token economics, and NFT ownership:
- BarCoin.sol — ERC20 token
- BarNFT.sol — Player bar NFT
- RecipeNFT.sol — Cocktail recipe NFT
- GamblingGame.sol — All game logic and mining
- RecipeMarketplace.sol — NFT trading

**Layer 2 — IPFS (Pinata)**
All NFT metadata (bar names, recipe data, attributes) is uploaded to the InterPlanetary File System via Pinata. The IPFS content identifier (CID) is stored permanently in the smart contract as the token URI. This ensures metadata cannot be changed or deleted.

**Layer 3 — Frontend (React + ethers.js)**
A React application connects to MetaMask, reads from and writes to the smart contracts, and renders a full game UI including interactive mini-games, a visual bar scene, recipe card gallery, and marketplace.

**Tech Stack:**
- Solidity 0.8.28 with OpenZeppelin v5
- Hardhat v3 (ESM) for compilation and deployment
- React + Vite for the frontend
- ethers.js for blockchain interaction
- Pinata for IPFS storage
- Vercel for hosting

---

## SLIDE 4 — Smart Contract: BarCoin (ERC20)

**Contract:** `BarCoin.sol`
**Address:** `0x8a8e38316F8484D735085575fb33369C7ABE7171`

BarCoin is the in-game currency of BarChain. It is a standard ERC20 token with a maximum supply of 10 million $BAR.

**Key design decisions:**
- Only the GamblingGame contract can mint new tokens — set via `setMinter()` after deployment. This prevents anyone from minting tokens outside of legitimate gameplay.
- Every mint is recorded in a `MintRecord` struct array with recipient, amount, and timestamp — satisfying the course requirement for history accumulation.
- The `firstReceivedDate` mapping records when each address first received tokens — satisfying the on-chain date recording requirement.
- Maximum supply is enforced with a `require` check on every mint.

**Earned by:**
- Winning mini-games (10–200 $BAR depending on game and outcome)
- Successful proof-of-play mining (20–40 $BAR per valid hash)

**Spent on:**
- Buying Recipe NFTs from the marketplace
- Premium marketplace listings (via X402)

---

## SLIDE 5 — Smart Contract: BarNFT (ERC721)

**Contract:** `BarNFT.sol`
**Address:** `0x469B06D10153Ab2f29e0B2E2851b8990938Ac2EB`

Each player owns exactly one Bar NFT — their virtual bar on the blockchain. It is implemented as an ERC721 token with URI storage.

**Key features:**
- One bar per address, enforced by the `hasMinted` mapping
- Bar metadata (name, theme) stored on IPFS; the CID is saved as the token URI on-chain
- Full ownership history stored as a `HistoryRecord[]` array — every mint, transfer, and customization is logged with wallet address, timestamp, and action type
- Quadratic leveling system: the bar levels up based on games played and recipes collected. Level 2 requires 5 games or 2 recipes; Level 3 requires 20 games or 8 recipes; Level 4 requires 45 games or 18 recipes. This makes early progression fast but high levels genuinely hard to achieve.
- **10% royalty on transfer:** The `transferBarWithRoyalty()` function automatically sends 10% of the sale price to the original creator on every resale
- The GamblingGame contract is authorized to call `recordGamePlayed()` and `recordRecipeReceived()` after each game — updating stats and triggering level-up checks

---

## SLIDE 6 — Smart Contract: RecipeNFT (ERC721)

**Contract:** `RecipeNFT.sol`
**Address:** `0x11352B8334e60D0651d3E8323dF920d5E2A0624E`

Each cocktail recipe is a unique NFT with three rarity tiers: Common, Rare, and Legendary.

**Key features:**
- Rarity is stored as a Solidity `enum` (Common=0, Rare=1, Legendary=2)
- Each recipe stores: name, rarity, original creator, mint date, and the bar token ID it was won at
- Full ownership history with timestamps and action labels ("minted", "transferred")
- **10% royalty enforced:** `transferWithRoyalty()` automatically routes 10% of every sale to the original creator. This is called by the Marketplace contract, which handles the ETH flow
- Recipe metadata and visual data uploaded to IPFS on listing
- Each recipe has a deterministic unique appearance derived from its token ID — the same token always generates the same cocktail glass color and style

**Rarity chances:**
- Common: 5% chance on any win
- Rare: 15% chance on rare wins, awarded automatically after collecting 3 Roulette fragments
- Legendary: 30% chance on jackpot wins

---

## SLIDE 7 — Smart Contract: GamblingGame

**Contract:** `GamblingGame.sol`
**Address:** `0xC0a2ca6256B03CCeDCC99Cd4e43235B97fb721ff`

The most complex contract — the heart of the game. Handles all five mini-games, proof-of-play mining, and coordinates between BarCoin, BarNFT, and RecipeNFT.

**Mini-games implemented:**
1. **Slot Machine** — Three reels (0–7), all three match = jackpot, any two = win
2. **Scratch Card** — Three symbols (0–5), all three match = rare win, any two = common win
3. **Dice Roll** — Two dice (1–6), double sixes = jackpot, any doubles = rare win
4. **Cocktail Roulette** — Awards a fragment in one of 6 ingredient categories. Collect 3 matching fragments → automatically mints a Rare Recipe NFT
5. **Card Draw** — Ace = jackpot, J/Q/K = rare win, 9/10 = common win

**Randomness:** Uses `keccak256(block.timestamp + block.prevrandao + msg.sender + nonce)` as a pseudo-random seed. Different bits of the hash are used for each reel/die to simulate independent rolls. This is an acceptable approach for a course project game.

**Cooldowns:** 30 seconds between games, 2 minutes between mining claims — prevents spam and token drain.

**Proof-of-Play Mining:**
Players submit a `nonce` found by the browser-side hash puzzle. The contract verifies that `keccak256(playerAddress + nonce)` has 2 leading zero bytes (the same concept as Bitcoin's Proof-of-Work difficulty). If valid, $BAR tokens are minted and there's a 10% chance of a Recipe NFT award.

**Cross-contract calls:** After every game, GamblingGame calls `barNFT.recordGamePlayed()` and potentially `barNFT.recordRecipeReceived()` — updating the player's bar stats and triggering level-up logic automatically.

---

## SLIDE 8 — Smart Contract: RecipeMarketplace

**Contract:** `RecipeMarketplace.sol`
**Address:** `0x09735b8336c803e856Ac5F0E679a47313D33dD14`

A fully on-chain NFT marketplace for trading Recipe NFTs. Supports payment in both ETH and $BAR tokens.

**Key features:**
- Sellers list recipes with an ETH price, $BAR price, or both
- Buyers can choose which currency to pay with
- **10% royalty** to original creator handled on every sale via `RecipeNFT.transferWithRoyalty()`
- **2% platform fee** accumulated in the contract, withdrawable by the owner
- Cancel cooldown: a recipe cannot be relisted within 2 days of being cancelled — prevents listing spam
- Full sale history per token stored on-chain with seller, buyer, price, and timestamp
- Premium listings appear at the top for all users

**X402 Integration:**
Premium listings require a 0.001 ETH fee paid upfront — this is the on-chain implementation of the HTTP 402 Payment Required micropayment protocol. The frontend detects the premium fee requirement and includes it automatically in the MetaMask transaction, completing the payment without any page navigation.

**Security:**
- `ReentrancyGuard` on all buy functions — prevents re-entrancy attacks
- Checks-Effects-Interactions pattern: listing is deactivated before any ETH transfers occur
- Swap-and-pop array removal for gas efficiency

---

## SLIDE 9 — IPFS Integration

**Provider:** Pinata (free tier)
**Standard:** IPFS (InterPlanetary File System)

Every NFT in BarChain has its metadata stored on IPFS — not on a centralized server. This means the data is permanent, decentralized, and cannot be taken down.

**What gets uploaded:**
- **Bar NFT metadata** — uploaded when the player mints their bar. Includes bar name, description, level attributes, creation timestamp, and platform tag.
- **Recipe NFT metadata** — uploaded when a recipe is listed on the marketplace. Includes recipe name, rarity, token ID, attributes, and listing timestamp.

**How it works:**
1. Player mints bar or lists recipe
2. Frontend calls Pinata's `pinJSONToIPFS` API with the metadata JSON
3. Pinata returns an IPFS Content Identifier (CID) — a unique hash of the content
4. The CID is formatted as `ipfs://CID` and stored in the smart contract as the token URI
5. Anyone can retrieve the metadata by fetching from any IPFS gateway

**Why this matters:**
If NFT metadata is stored on a regular server, the company can change it or take it down. IPFS content is addressed by its hash — if you change the content, the CID changes. The CID stored on-chain is permanent proof of the original metadata.

---

## SLIDE 10 — Frontend: Game UI

The frontend is a React single-page application served from Vercel. It connects to MetaMask and communicates with all five smart contracts through ethers.js.

**Wallet connection flow:**
1. Player clicks "Connect MetaMask"
2. App requests `wallet_requestPermissions` — always shows the account picker (allows switching wallets)
3. App calls `wallet_switchEthereumChain` to switch to Sepolia automatically
4. On page reload, `eth_accounts` is called silently — reconnects without a popup if already authorized

**Five interactive mini-games:**
Each game opens in a modal with real animations that play while the blockchain transaction confirms:
- **Slot Machine** — Three reels spin rapidly (updating every 80ms) then lock on the result
- **Scratch Card** — Three gold tiles reveal one by one after confirmation
- **Dice Roll** — Two dice tumble then settle on the result
- **Cocktail Roulette** — A color wheel spins with a CSS rotation animation
- **Card Draw** — A 3D card flip reveals the drawn card

All animations are purely visual — the actual result is determined on-chain and the animations are set to match after the transaction confirms.

**Visual NFTs:**
- **Bar NFT** — Rendered as an SVG bar scene with bottles on a shelf, neon sign, and cocktail glasses. The color and level indicator dots update as the bar levels up.
- **Recipe NFTs** — Each rendered as a cocktail glass SVG. The liquid color, bubble count, and sparkles are derived deterministically from the token ID — so every recipe looks unique and always the same.

---

## SLIDE 11 — Proof-of-Play Mining

BarChain implements a browser-side Proof-of-Work system inspired by Bitcoin mining.

**How it works:**
1. Player clicks "Start Mining"
2. A JavaScript loop runs in the browser, testing nonces one by one
3. For each nonce, it computes `keccak256(playerAddress + nonce)` using ethers.js
4. It checks if the first 2 bytes of the hash are `0x00 0x00` (2 leading zero bytes)
5. On average this takes ~65,536 attempts (256² = 65,536)
6. When found, the valid nonce is submitted to `GamblingGame.submitMiningProof(nonce)`
7. The smart contract verifies the hash using the same algorithm
8. If valid: $BAR tokens are minted, with a 10% chance of a Recipe NFT

**Why this is meaningful:**
This demonstrates the core concept of Proof-of-Work consensus — finding a hash that satisfies a difficulty target. The browser is doing real computational work. The contract cannot be fooled with a random nonce — it verifies the math independently.

**Result popup:**
When mining succeeds, a modal appears showing exactly how many $BAR were earned and whether a Recipe NFT was unlocked.

---

## SLIDE 12 — X402 Payment Protocol

X402 is based on the HTTP 402 Payment Required status code — a standard that was reserved for future micropayment systems and is now being implemented in Web3.

**In BarChain:**
Premium marketplace listings use X402 micropayments. When a seller enables "Premium Listing," a 0.001 ETH fee is required upfront. The frontend:
1. Detects the fee requirement from `premiumListingFee()`
2. Includes the ETH value automatically in the `listRecipe()` transaction
3. MetaMask prompts the user once — the payment and listing happen in a single transaction
4. The premium recipe is pinned to the top of the marketplace for all users

**What this demonstrates:**
The X402 pattern allows applications to gate features behind automatic micropayments — no checkout flow, no subscription page. The user's wallet handles it in one click. This is the on-chain equivalent of an API that returns 402 and triggers a payment before granting access.

---

## SLIDE 13 — On-Chain History & Dates

The course required that dates be recorded in contracts and history be accumulated. BarChain implements this comprehensively across all contracts.

**Dates recorded:**
- Bar mint date (`block.timestamp` in `BarData.mintDate`)
- Bar transfer dates (in `HistoryRecord.timestamp`)
- Recipe mint date (`RecipeData.mintDate`)
- Recipe transfer dates (`OwnerRecord.timestamp`)
- Every game played (`GameRecord.timestamp`)
- Every $BAR mint (`MintRecord.timestamp`)
- Every marketplace listing (`Listing.listedAt`)
- Every marketplace sale (`SaleRecord.timestamp`)

**History accumulated:**
- `HistoryRecord[]` per bar token — mint, transfers, customizations, level-ups
- `OwnerRecord[]` per recipe token — every owner with timestamp and action
- `GameRecord[]` per player — every game played with outcome and reward
- `MintRecord[]` global — every $BAR minting event
- `SaleRecord[]` per recipe token — complete price history

All of this is publicly readable on-chain and visible on Sepolia Etherscan.

---

## SLIDE 14 — Deployment & Live Demo

**Smart Contracts — Sepolia Testnet:**

| Contract | Address |
|---|---|
| BarCoin | 0x8a8e38316F8484D735085575fb33369C7ABE7171 |
| BarNFT | 0x469B06D10153Ab2f29e0B2E2851b8990938Ac2EB |
| RecipeNFT | 0x11352B8334e60D0651d3E8323dF920d5E2A0624E |
| GamblingGame | 0xC0a2ca6256B03CCeDCC99Cd4e43235B97fb721ff |
| RecipeMarketplace | 0x09735b8336c803e856Ac5F0E679a47313D33dD14 |

**Frontend:** https://barchain-dapp.vercel.app
Auto-deploys from GitHub on every push via Vercel CI/CD.

**To use the live demo:**
1. Install MetaMask browser extension
2. Get free Sepolia ETH from Google's faucet
3. Visit https://barchain-dapp.vercel.app
4. Click Connect MetaMask — automatically switches to Sepolia
5. Mint your bar, play games, mine, collect recipes, trade on the marketplace

---

## SLIDE 15 — Original Ideas & Bonus Features

Beyond the course requirements, BarChain includes several original concepts:

**Proof-of-Play Mining:**
A genuine browser-side hash puzzle that mirrors Bitcoin's Proof-of-Work. The browser performs real computational work, and the smart contract independently verifies the result. This is a novel game mechanic that teaches blockchain consensus while being fun to interact with.

**Cocktail Roulette Fragment System:**
Instead of a simple win/lose, the roulette game awards ingredient fragments across 6 categories. Collecting 3 matching fragments automatically assembles and mints a Rare Recipe NFT — creating a long-term collection mechanic within the game.

**Deterministic NFT Visuals:**
Recipe NFT appearance is derived mathematically from the token ID — no external image hosting required. The same token always renders identically, the visuals are fully on-chain verifiable, and every recipe looks unique.

**Quadratic Leveling:**
Bar levels follow a quadratic curve (Level N requires N² × 5 games or N² × 2 recipes) — making early progression rewarding while keeping high levels genuinely challenging.

**Dual-Currency Marketplace:**
Recipes can be priced in ETH, $BAR, or both simultaneously, giving buyers the choice of payment method. The royalty split (10% creator, 2% platform, remainder to seller) is enforced on-chain for both currencies.

---

## SLIDE 16 — Summary

BarChain is a complete, deployed, and live Web3 application that demonstrates:

- **ERC20 token economics** with controlled minting and supply limits
- **ERC721 NFTs** with on-chain history, royalties, and IPFS metadata
- **Complex smart contract interaction** across 5 interdependent contracts
- **Proof-of-Work concepts** implemented as a browser-side game mechanic
- **Decentralized storage** with IPFS via Pinata
- **X402 micropayments** for marketplace features
- **MetaMask integration** with automatic network switching
- **Full-stack DApp** from Solidity contracts to a deployed React frontend

Every feature is live, every transaction is verifiable on Sepolia Etherscan, and the full source code is available on GitHub.

**Live:** https://barchain-dapp.vercel.app
**GitHub:** https://github.com/Z1nxster/barchain-dapp
