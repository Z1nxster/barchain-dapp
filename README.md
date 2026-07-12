# 🍹 BarChain DApp

A blockchain-powered virtual bar and gambling DApp built on Ethereum Sepolia testnet. Players own unique Bar NFTs, earn `$BAR` tokens through mini-games and proof-of-play mining, collect cocktail Recipe NFTs, and trade them on an on-chain marketplace.

**Live Demo:** https://barchain-dapp.vercel.app

---

## What is BarChain?

BarChain is a Web3 game where every player owns a virtual bar on the blockchain. Your bar is an NFT — unique, customizable, and permanently recorded on-chain. You earn the platform's ERC20 token (`$BAR`) by playing mini-games and mining, and spend or trade it to collect cocktail Recipe NFTs. Every recipe is a one-of-a-kind NFT with a unique color, rarity tier, and IPFS-stored metadata.

---

## Features

- **Bar NFT** — Each player mints one unique Bar NFT. Metadata stored on IPFS. Bar levels up based on games played and recipes collected (quadratic leveling curve).
- **$BAR Token (ERC20)** — Earned through games and mining. Used to buy recipes in the marketplace.
- **5 Mini-Games** — Slot Machine, Scratch Card, Dice Roll, Cocktail Roulette, Card Draw. Each has an interactive visual and real on-chain outcomes.
- **Proof-of-Play Mining** — Browser-side SHA-256 hash puzzle. When a valid hash is found, submit it on-chain to claim $BAR tokens and a chance at a Recipe NFT.
- **Recipe NFTs (ERC721)** — Three rarity tiers (Common, Rare, Legendary). Each has a unique cocktail glass SVG generated from its token ID. Metadata stored on IPFS.
- **Recipe Marketplace** — List recipes for ETH or $BAR. Buy from other players. 10% royalty auto-routed to original creator on every sale. 2% platform fee.
- **X402 Premium Listings** — Pay 0.001 ETH to pin your listing to the top of the marketplace.
- **IPFS via Pinata** — All NFT metadata (bar info, recipe data) uploaded to IPFS on mint/list.
- **MetaMask Integration** — Full wallet connection, auto Sepolia network switch, account picker for switching wallets.

---

## Smart Contracts (Sepolia Testnet)

| Contract | Address |
|---|---|
| BarCoin (ERC20) | `0x8a8e38316F8484D735085575fb33369C7ABE7171` |
| BarNFT (ERC721) | `0x469B06D10153Ab2f29e0B2E2851b8990938Ac2EB` |
| RecipeNFT (ERC721) | `0x11352B8334e60D0651d3E8323dF920d5E2A0624E` |
| GamblingGame | `0xC0a2ca6256B03CCeDCC99Cd4e43235B97fb721ff` |
| RecipeMarketplace | `0x09735b8336c803e856Ac5F0E679a47313D33dD14` |

All contracts verified on [Sepolia Etherscan](https://sepolia.etherscan.io).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity 0.8.28, OpenZeppelin v5 |
| Blockchain | Ethereum Sepolia Testnet |
| Development | Hardhat v3, ethers.js |
| Frontend | React, Vite |
| Wallet | MetaMask, ethers.js BrowserProvider |
| Storage | IPFS via Pinata |
| Payments | X402 micropayment protocol |
| Hosting | Vercel |

---

## Project Structure

```
barchain-dapp/
├── contracts/
│   ├── BarCoin.sol           # ERC20 token — $BAR currency
│   ├── BarNFT.sol            # Bar NFT with ownership history + royalties
│   ├── RecipeNFT.sol         # Recipe NFT with royalties + rarity tiers
│   ├── GamblingGame.sol      # Game logic + proof-of-play mining
│   └── RecipeMarketplace.sol # NFT trading with ETH/BAR payments
├── scripts/
│   └── deploy.js             # Deployment script (Hardhat v3 ESM)
├── frontend/
│   ├── index.html
│   └── src/
│       ├── App.jsx           # Main app — wallet, tabs, state
│       ├── utils/
│       │   ├── contracts.js  # ABI definitions + wallet connection
│       │   └── ipfs.js       # Pinata upload helpers
│       └── components/
│           ├── BarCard.jsx       # Visual bar scene SVG
│           ├── RecipeCard.jsx    # Cocktail glass SVG + rarity badge
│           ├── GameModal.jsx     # Interactive game visuals
│           ├── MiningPopup.jsx   # Mining result modal
│           └── Marketplace.jsx   # List, buy, cancel listings
├── hardhat.config.js
├── vite.config.js
└── .env                      # SEPOLIA_URL, PRIVATE_KEY, VITE_PINATA_JWT
```

---

## Getting Started (Local)

### Prerequisites
- Node.js 18+
- MetaMask browser extension
- Sepolia testnet ETH ([Google Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia))

### Install
```bash
git clone https://github.com/Z1nxster/barchain-dapp.git
cd barchain-dapp
npm install
```

### Configure
Create a `.env` file in the project root:
```
SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
PRIVATE_KEY=your_deployer_private_key
VITE_PINATA_JWT=your_pinata_jwt
```

### Run locally
```bash
npm run dev
```
Open http://localhost:5173

### Build for production
```bash
npm run build
```

---

## How It Works

### Bar NFT
Each player mints exactly one Bar NFT on first login. The bar has a name, level, and visual scene (SVG). Its metadata is uploaded to IPFS on mint. The bar levels up quadratically — Level 2 needs 5 games, Level 3 needs 20, Level 4 needs 45, and so on. Transferring a bar automatically sends 10% of the sale price to the original creator.

### Mini-Games
All game outcomes are determined on-chain using `block.prevrandao + block.timestamp + msg.sender + nonce` as a pseudo-random seed. A 30-second cooldown applies between games. Each game has an interactive visual (spinning reels, dice, card flip, roulette wheel, scratch reveal) that plays out before showing the result.

### Proof-of-Play Mining
The browser runs a batch SHA-256 hash search in JavaScript. It looks for a hash of `keccak256(playerAddress + nonce)` with 2 leading zero bytes — the same concept as Bitcoin's Proof-of-Work. When found, the nonce is submitted on-chain. The smart contract verifies the hash and mints $BAR tokens as a reward. A 2-minute cooldown applies between mining claims.

### Recipe NFTs
Won through games or mining. Three rarity tiers: Common (5% chance on wins), Rare (15%), Legendary (30% on jackpots). Each recipe has a unique cocktail glass SVG derived deterministically from its token ID — same token always looks the same. Metadata stored on IPFS. Transferring a recipe sends 10% royalty to the original creator.

### X402 Marketplace
Recipes can be listed for sale in ETH, $BAR, or both. Buyers pay the listing price; 10% goes to the original creator, 2% to the platform, and the rest to the seller. Premium listings (0.001 ETH, the X402 micropayment) appear at the top of the marketplace for all users.

---

## Course Requirements Coverage

| Requirement | Implementation |
|---|---|
| ERC20 Token | `BarCoin.sol` — $BAR token with controlled minting |
| NFT with Ownership History | `BarNFT.sol` + `RecipeNFT.sol` — full history array on-chain |
| 10% Creator Royalty | Enforced in `transferWithRoyalty()` in both NFT contracts |
| Dates in Contracts | `block.timestamp` recorded on every mint, transfer, and game |
| History Accumulation | `HistoryRecord[]` and `GameRecord[]` arrays per token/player |
| IPFS | Bar and recipe metadata uploaded via Pinata on mint/list |
| MetaMask | `BrowserProvider` + `wallet_switchEthereumChain` |
| Complex Contract | `GamblingGame.sol` — 5 games, mining, cross-contract calls |
| Web3.js Frontend | React + ethers.js frontend |
| X402 Payments | Premium marketplace listings with micropayment fee |

---

## Security Notes

- Never commit your `.env` file — it is in `.gitignore`
- Use a dedicated development wallet, never your main wallet
- The `PRIVATE_KEY` in `.env` is only used for deployment, never exposed to the frontend
- Game randomness uses `block.prevrandao` — acceptable for a course project but not suitable for high-value production games
- `ReentrancyGuard` applied to all marketplace buy functions

---

## License

MIT
