import { ethers } from "ethers";
import addresses from "../../contractAddresses.json";

// ABIs — only the functions the frontend actually calls
const BarCoinABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function getMintHistoryLength() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
];

const BarNFTABI = [
  "function hasMinted(address) view returns (bool)",
  "function addressToTokenId(address) view returns (uint256)",
  "function mintBar(string barName, string ipfsURI) external",
  "function getBarData(uint256 tokenId) view returns (tuple(string name, uint256 level, uint256 mintDate, uint256 recipeCount, uint256 gamesPlayed))",
  "function getHistory(uint256 tokenId) view returns (tuple(address wallet, uint256 timestamp, string action)[])",
  "function updateBarURI(uint256 tokenId, string newURI) external",
  "function tokenURI(uint256 tokenId) view returns (string)",
];

const RecipeNFTABI = [
  "function totalSupply() view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function getRecipeData(uint256 tokenId) view returns (tuple(string name, uint8 rarity, address originalCreator, uint256 mintDate, uint256 barTokenId))",
  "function getRarityName(uint256 tokenId) view returns (string)",
  "function getOwnerHistory(uint256 tokenId) view returns (tuple(address owner, uint256 timestamp, string action)[])",
  "function approve(address to, uint256 tokenId) external",
];

const GamblingGameABI = [
  "function playGame(uint8 gameType) external returns (bool won, uint256 reward)",
  "function submitMiningProof(uint256 nonce) external",
  "function getCooldowns(address player) view returns (uint256 gameSecondsLeft, uint256 mineSecondsLeft)",
  "function getGameHistory(address player) view returns (tuple(uint8 gameType, bool won, uint256 rewardAmount, bool recipeWon, uint256 timestamp)[])",
  "function getFragments(address player) view returns (uint256[6])",
  "function GAME_COOLDOWN() view returns (uint256)",
  "function MINE_COOLDOWN() view returns (uint256)",
  "event GamePlayed(address indexed player, uint8 gameType, bool won, uint256 rewardAmount, bool recipeWon, uint256 timestamp)",
  "event RecipeAwarded(address indexed player, uint256 indexed tokenId, string name, uint8 rarity, uint256 timestamp)",
  "event MiningRewardGiven(address indexed player, uint256 rewardAmount, uint256 timestamp)",
];

const RecipeMarketplaceABI = [
  "function listRecipe(uint256 tokenId, uint256 priceETH, uint256 priceBAR, bool isPremium) external payable",
  "function buyWithETH(uint256 tokenId) external payable",
  "function buyWithBAR(uint256 tokenId) external",
  "function cancelListing(uint256 tokenId) external",
  "function getListing(uint256 tokenId) view returns (tuple(address seller, uint256 tokenId, uint256 priceETH, uint256 priceBAR, bool isPremium, bool active, uint256 listedAt))",
  "function getActiveListings() view returns (uint256[])",
  "function getSaleHistory(uint256 tokenId) view returns (tuple(address seller, address buyer, uint256 priceETH, uint256 priceBAR, uint256 timestamp)[])",
  "function premiumListingFee() view returns (uint256)",
];

export function getContracts(signer) {
  return {
    barCoin:           new ethers.Contract(addresses.BarCoin,           BarCoinABI,           signer),
    barNFT:            new ethers.Contract(addresses.BarNFT,            BarNFTABI,            signer),
    recipeNFT:         new ethers.Contract(addresses.RecipeNFT,         RecipeNFTABI,         signer),
    gamblingGame:      new ethers.Contract(addresses.GamblingGame,      GamblingGameABI,      signer),
    recipeMarketplace: new ethers.Contract(addresses.RecipeMarketplace, RecipeMarketplaceABI, signer),
  };
}

export async function connectWallet() {
  if (!window.ethereum) throw new Error("MetaMask not found");

  const provider = new ethers.BrowserProvider(window.ethereum);

  // Force switch to Sepolia (chainId 0xaa36a7 = 11155111)
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xaa36a7" }],
    });
  } catch (switchError) {
    // If Sepolia isn't added to MetaMask yet, add it automatically
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId:         "0xaa36a7",
          chainName:       "Sepolia Testnet",
          nativeCurrency:  { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
          rpcUrls:         ["https://rpc.sepolia.org"],
          blockExplorerUrls: ["https://sepolia.etherscan.io"],
        }],
      });
    } else {
      throw switchError;
    }
  }

  await provider.send("eth_requestAccounts", []);
  const signer    = await provider.getSigner();
  const address   = await signer.getAddress();
  const contracts = getContracts(signer);
  return { provider, signer, address, contracts };
}

export { addresses };