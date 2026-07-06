// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BarNFT
 * @dev Each player owns one unique Bar NFT representing their virtual bar.
 * Tracks ownership history, upgrades, and levels on-chain.
 * 10% of any resale goes back to the original creator automatically.
 */
contract BarNFT is ERC721, ERC721URIStorage, Ownable {

    // ── Counter ───────────────────────────────────────────────────────────────
    uint256 private _tokenIdCounter;

    // ── Royalty ───────────────────────────────────────────────────────────────
    uint256 public constant ROYALTY_PERCENT = 10;

    // ── Per-address state ─────────────────────────────────────────────────────
    mapping(address => bool)    public hasMinted;
    mapping(address => uint256) public addressToTokenId;

    // ── Per-token state ───────────────────────────────────────────────────────
    mapping(uint256 => address) public originalCreator;

    struct BarData {
        string  name;
        uint256 level;
        uint256 mintDate;
        uint256 recipeCount;
        uint256 gamesPlayed;
    }
    mapping(uint256 => BarData) public barData;

    // ── Ownership + action history  ─────────────
    struct HistoryRecord {
        address wallet;
        uint256 timestamp;
        string  action;   // "minted" | "transferred" | "customized" | "leveled up"
    }
    mapping(uint256 => HistoryRecord[]) public history;

    // ── Authorized contracts (GamblingGame will call us) ──────────────────────
    mapping(address => bool) public authorizedContracts;

    // ── Events ────────────────────────────────────────────────────────────────
    event BarMinted(address indexed owner, uint256 indexed tokenId,
                    string barName, uint256 timestamp);
    event BarTransferred(uint256 indexed tokenId, address indexed from,
                         address indexed to, uint256 royaltyPaid, uint256 timestamp);
    event BarLevelUp(uint256 indexed tokenId, uint256 newLevel, uint256 timestamp);
    event BarCustomized(uint256 indexed tokenId, string newURI, uint256 timestamp);

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor() ERC721("BarChain Bar", "BARNFT") Ownable(msg.sender) {}

    // ── Admin ─────────────────────────────────────────────────────────────────

    /**
     * @dev Register or revoke a trusted contract (e.g. GamblingGame).
     */
    function setAuthorizedContract(address contractAddress, bool authorized)
        external onlyOwner
    {
        authorizedContracts[contractAddress] = authorized;
    }

    // ── Player actions ────────────────────────────────────────────────────────

    /**
     * @dev Mint your bar NFT. One per address, ever.
     * @param barName  Display name for your bar.
     * @param ipfsURI  IPFS URI pointing to bar metadata JSON.
     */
    function mintBar(string memory barName, string memory ipfsURI) external {
        require(!hasMinted[msg.sender], "BarNFT: you already own a bar");

        uint256 tokenId = _tokenIdCounter++;

        // Bookkeeping
        hasMinted[msg.sender]        = true;
        addressToTokenId[msg.sender] = tokenId;
        originalCreator[tokenId]     = msg.sender;

        // Initialize bar stats
        barData[tokenId] = BarData({
            name:        barName,
            level:       1,
            mintDate:    block.timestamp,
            recipeCount: 0,
            gamesPlayed: 0
        });

        // Record history entry
        history[tokenId].push(HistoryRecord({
            wallet:    msg.sender,
            timestamp: block.timestamp,
            action:    "minted"
        }));

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, ipfsURI);

        emit BarMinted(msg.sender, tokenId, barName, block.timestamp);
    }

    /**
     * @dev Sell your bar to another address.
     * Send ETH with the call — 10% goes to the original creator, rest to you.
     * @param tokenId  The bar to sell.
     * @param to       The buyer's address.
     */
    function transferBarWithRoyalty(uint256 tokenId, address to) external payable {
        require(ownerOf(tokenId) == msg.sender, "BarNFT: you don't own this bar");
        require(!hasMinted[to],                 "BarNFT: buyer already owns a bar");
        require(msg.value > 0,                  "BarNFT: send ETH to cover royalty");

        address creator = originalCreator[tokenId];
        uint256 royalty = (msg.value * ROYALTY_PERCENT) / 100;

        // Pay 10% royalty to original creator
        if (royalty > 0 && creator != msg.sender) {
            payable(creator).transfer(royalty);
        }

        // Update buyer bookkeeping
        hasMinted[to]        = true;
        addressToTokenId[to] = tokenId;

        // Record transfer in history
        history[tokenId].push(HistoryRecord({
            wallet:    to,
            timestamp: block.timestamp,
            action:    "transferred"
        }));

        _transfer(msg.sender, to, tokenId);

        emit BarTransferred(tokenId, msg.sender, to, royalty, block.timestamp);
    }

    /**
     * @dev Update bar metadata when the player customizes their bar.
     * Uploads new JSON to IPFS first, then calls this with the new URI.
     */
    function updateBarURI(uint256 tokenId, string memory newURI) external {
        require(ownerOf(tokenId) == msg.sender, "BarNFT: you don't own this bar");

        _setTokenURI(tokenId, newURI);

        history[tokenId].push(HistoryRecord({
            wallet:    msg.sender,
            timestamp: block.timestamp,
            action:    "customized"
        }));

        emit BarCustomized(tokenId, newURI, block.timestamp);
    }

    // ── Called by GamblingGame ────────────────────────────────────────────────

    /**
     * @dev Called by GamblingGame each time the player completes a game round.
     */
    function recordGamePlayed(address player) external {
        require(authorizedContracts[msg.sender], "BarNFT: caller not authorized");
        require(hasMinted[player],               "BarNFT: player has no bar");

        uint256 tokenId = addressToTokenId[player];
        barData[tokenId].gamesPlayed++;
        _checkLevelUp(tokenId);
    }

    /**
     * @dev Called by GamblingGame each time the player receives a recipe NFT.
     */
    function recordRecipeReceived(address player) external {
        require(authorizedContracts[msg.sender], "BarNFT: caller not authorized");
        require(hasMinted[player],               "BarNFT: player has no bar");

        uint256 tokenId = addressToTokenId[player];
        barData[tokenId].recipeCount++;
        _checkLevelUp(tokenId);
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    /**
     * @dev Level up formula: +1 level per 5 games played, +1 per 3 recipes owned.
     */
    function _checkLevelUp(uint256 tokenId) internal {
        BarData storage bar = barData[tokenId];
        uint256 newLevel = bar.level;

        // Quadratic leveling — each level requires (N^2 * 5) games OR (N^2 * 2) recipes
        // meaning each level is significantly harder than the last.
        for (uint256 i = newLevel; i <= 20; i++) {
            uint256 threshold = i * i;
            if (bar.gamesPlayed >= threshold * 5 || bar.recipeCount >= threshold * 2) {
                newLevel = i + 1;
            } else {
                break;
            }
        }

        if (newLevel > bar.level) {
            bar.level = newLevel;

            history[tokenId].push(HistoryRecord({
                wallet:    ownerOf(tokenId),
                timestamp: block.timestamp,
                action:    "leveled up"
            }));

            emit BarLevelUp(tokenId, newLevel, block.timestamp);
        }
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    function getHistory(uint256 tokenId)
        external view returns (HistoryRecord[] memory)
    {
        return history[tokenId];
    }

    function getBarData(uint256 tokenId)
        external view returns (BarData memory)
    {
        return barData[tokenId];
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