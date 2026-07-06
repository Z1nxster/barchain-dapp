// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RecipeNFT
 * @dev Each cocktail recipe is a unique NFT.
 * Original creator always receives 10% royalty on every resale.
 * Full ownership history recorded on-chain with timestamps.
 */
contract RecipeNFT is ERC721, ERC721URIStorage, Ownable {

    // ── Counter ───────────────────────────────────────────────────────────────
    uint256 private _tokenIdCounter;

    // ── Royalty ───────────────────────────────────────────────────────────────
    uint256 public constant ROYALTY_PERCENT = 10;

    // ── Rarity tiers ─────────────────────────────────────────────────────────
    enum Rarity { Common, Rare, Legendary }

    // ── Recipe data ───────────────────────────────────────────────────────────
    struct RecipeData {
        string  name;
        Rarity  rarity;
        address originalCreator;
        uint256 mintDate;
        uint256 barTokenId;
    }
    mapping(uint256 => RecipeData) public recipeData;

    // ── Ownership history ────────────────────────────────
    struct OwnerRecord {
        address owner;
        uint256 timestamp;
        string  action;   // "minted" | "transferred" | "crafted"
    }
    mapping(uint256 => OwnerRecord[]) public ownerHistory;

    // ── Authorized contracts (GamblingGame + Marketplace can mint/transfer) ───
    mapping(address => bool) public authorizedContracts;

    // ── Events ────────────────────────────────────────────────────────────────
    event RecipeMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string  name,
        Rarity  rarity,
        uint256 barTokenId,
        uint256 timestamp
    );
    event RecipeTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint256 royaltyPaid,
        uint256 timestamp
    );

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor() ERC721("BarChain Recipe", "RECIPE") Ownable(msg.sender) {}

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setAuthorizedContract(address contractAddress, bool authorized)
        external onlyOwner
    {
        authorizedContracts[contractAddress] = authorized;
    }

    // ── Minting (called by GamblingGame when player wins) ─────────────────────

    /**
     * @dev Mint a new recipe NFT as a game reward.
     * Only callable by GamblingGame or Marketplace contracts.
     * @param to         The player receiving the recipe.
     * @param name       Recipe name (e.g. "Midnight Negroni").
     * @param rarity     0 = Common, 1 = Rare, 2 = Legendary.
     * @param ipfsURI    IPFS link to recipe metadata + artwork.
     * @param barTokenId The player's bar token ID.
     */
    function mintRecipe(
        address to,
        string  memory name,
        Rarity  rarity,
        string  memory ipfsURI,
        uint256 barTokenId
    ) external returns (uint256) {
        require(authorizedContracts[msg.sender], "RecipeNFT: caller not authorized");

        uint256 tokenId = _tokenIdCounter++;

        recipeData[tokenId] = RecipeData({
            name:            name,
            rarity:          rarity,
            originalCreator: to,
            mintDate:        block.timestamp,
            barTokenId:      barTokenId
        });

        ownerHistory[tokenId].push(OwnerRecord({
            owner:     to,
            timestamp: block.timestamp,
            action:    "minted"
        }));

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, ipfsURI);

        emit RecipeMinted(tokenId, to, name, rarity, barTokenId, block.timestamp);

        return tokenId;
    }

    // ── Trading (called by Marketplace) ──────────────────────────────────────

    /**
     * @dev Transfer a recipe NFT from seller to buyer.
     * Royalty (10%) is paid in ETH to the original creator.
     * Called by the Marketplace contract which holds the ETH.
     * @param tokenId  The recipe being sold.
     * @param from     The current owner (seller).
     * @param to       The buyer.
     */
    function transferWithRoyalty(
        uint256 tokenId,
        address from,
        address to
    ) external payable {
        require(authorizedContracts[msg.sender], "RecipeNFT: caller not authorized");
        require(ownerOf(tokenId) == from,        "RecipeNFT: seller doesn't own this");

        address creator = recipeData[tokenId].originalCreator;
        uint256 royalty = (msg.value * ROYALTY_PERCENT) / 100;

        // Pay 10% royalty to original creator
        if (royalty > 0 && creator != from) {
            payable(creator).transfer(royalty);
        }

        ownerHistory[tokenId].push(OwnerRecord({
            owner:     to,
            timestamp: block.timestamp,
            action:    "transferred"
        }));

        _transfer(from, to, tokenId);

        emit RecipeTransferred(tokenId, from, to, royalty, block.timestamp);
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    function getOwnerHistory(uint256 tokenId)
        external view returns (OwnerRecord[] memory)
    {
        return ownerHistory[tokenId];
    }

    function getRecipeData(uint256 tokenId)
        external view returns (RecipeData memory)
    {
        return recipeData[tokenId];
    }

    function getRarityName(uint256 tokenId)
        external view returns (string memory)
    {
        Rarity r = recipeData[tokenId].rarity;
        if (r == Rarity.Legendary) return "Legendary";
        if (r == Rarity.Rare)      return "Rare";
        return "Common";
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    // ── Required overrides ────────────────────────────────────────────────────

    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}