// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./BarCoin.sol";
import "./BarNFT.sol";
import "./RecipeNFT.sol";

/**
 * @title GamblingGame
 * @dev Core game contract. Handles all mini-games, proof-of-play mining,
 * recipe minting, and reward distribution.
 */
contract GamblingGame is Ownable {

    // ── Contract references ───────────────────────────────────────────────────
    BarCoin   public barCoin;
    BarNFT    public barNFT;
    RecipeNFT public recipeNFT;

    // ── Game types ────────────────────────────────────────────────────────────
    enum GameType { SlotMachine, ScratchCard, DiceRoll, CocktailRoulette, CardDraw }

    // ── Cooldowns ─────────────────────────────────────────────────────────────
    uint256 public constant GAME_COOLDOWN = 30;   // seconds between games
    uint256 public constant MINE_COOLDOWN = 120;  // seconds between mining claims

    // ── Reward amounts (in $BAR, 18 decimals) ─────────────────────────────────
    uint256 public constant COMMON_WIN_REWARD  =  1 * 10 ** 18;
    uint256 public constant RARE_WIN_REWARD    =  5 * 10 ** 18;
    uint256 public constant JACKPOT_WIN_REWARD = 20 * 10 ** 18;
    uint256 public constant MINE_BASE_REWARD   =  2 * 10 ** 18;

    // ── Mining difficulty ─────────────────────────────────────────────────────
    // Number of leading zero bytes required in the submitted hash
    uint256 public miningDifficulty = 2;

    // ── Per-player state ──────────────────────────────────────────────────────
    mapping(address => uint256) public lastGameTime;
    mapping(address => uint256) public lastMineTime;
    mapping(address => uint256) public playerNonce;

    // Fragment system for Cocktail Roulette
    // player => ingredient category (0–5) => fragment count
    mapping(address => mapping(uint8 => uint256)) public fragments;

    // ── Game history (on-chain) ─────────────────
    struct GameRecord {
        GameType gameType;
        bool     won;
        uint256  rewardAmount;
        bool     recipeWon;
        uint256  timestamp;
    }
    mapping(address => GameRecord[]) public gameHistory;

    // ── Recipe name pool (randomly selected on win) ───────────────────────────
    string[] private recipeNames;

    // Placeholder URI — frontend will upload real IPFS metadata and update this
    string public defaultRecipeURI = "ipfs://QmPlaceholder";

    // ── Events ────────────────────────────────────────────────────────────────
    event GamePlayed(
        address  indexed player,
        GameType         gameType,
        bool             won,
        uint256          rewardAmount,
        bool             recipeWon,
        uint256          timestamp
    );
    event RecipeAwarded(
        address          indexed player,
        uint256          indexed tokenId,
        string                   name,
        RecipeNFT.Rarity         rarity,
        uint256                  timestamp
    );
    event MiningRewardGiven(
        address indexed player,
        uint256         rewardAmount,
        uint256         timestamp
    );
    event FragmentCollected(
        address indexed player,
        uint8           category,
        uint256         newCount,
        uint256         timestamp
    );

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(
        address _barCoin,
        address _barNFT,
        address _recipeNFT
    ) Ownable(msg.sender) {
        barCoin   = BarCoin(_barCoin);
        barNFT    = BarNFT(_barNFT);
        recipeNFT = RecipeNFT(_recipeNFT);

        // Pre-load recipe name pool
        recipeNames.push("Midnight Negroni");
        recipeNames.push("Sunset Margarita");
        recipeNames.push("Blue Lagoon Dream");
        recipeNames.push("Golden Old Fashioned");
        recipeNames.push("Crimson Mojito");
        recipeNames.push("Silver Moon Martini");
        recipeNames.push("Tropical Thunder");
        recipeNames.push("Velvet Underground");
        recipeNames.push("Emerald Isle");
        recipeNames.push("Phantom Sour");
        recipeNames.push("Blazing Sunset");
        recipeNames.push("Arctic Fox");
        recipeNames.push("Desert Rose");
        recipeNames.push("Midnight Bloom");
        recipeNames.push("Golden Dragon");
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setDefaultRecipeURI(string memory uri) external onlyOwner {
        defaultRecipeURI = uri;
    }

    function setMiningDifficulty(uint256 difficulty) external onlyOwner {
        miningDifficulty = difficulty;
    }

    // ── Play game ─────────────────────────────────────────────────────────────

    /**
     * @dev Play any mini-game. Player must own a bar NFT.
     * Enforces cooldown. Records result on-chain.
     */
    function playGame(GameType gameType)
        external
        returns (bool won, uint256 reward)
    {
        require(barNFT.hasMinted(msg.sender), "GamblingGame: mint your bar first");
        require(
            block.timestamp >= lastGameTime[msg.sender] + GAME_COOLDOWN,
            "GamblingGame: game cooldown active"
        );

        lastGameTime[msg.sender] = block.timestamp;
        playerNonce[msg.sender]++;
        uint256 rand = _random(playerNonce[msg.sender]);

        if      (gameType == GameType.SlotMachine)     (won, reward) = _playSlotMachine(rand);
        else if (gameType == GameType.ScratchCard)     (won, reward) = _playScratchCard(rand);
        else if (gameType == GameType.DiceRoll)        (won, reward) = _playDiceRoll(rand);
        else if (gameType == GameType.CocktailRoulette)(won, reward) = _playCocktailRoulette(rand);
        else if (gameType == GameType.CardDraw)        (won, reward) = _playCardDraw(rand);

        bool recipeWon = false;

        if (won) {
            if (reward > 0) {
                barCoin.mintReward(msg.sender, reward);
            }
            recipeWon = _tryMintRecipe(rand, reward);
        }

        // Notify BarNFT so it can update gamesPlayed and level
        barNFT.recordGamePlayed(msg.sender);

        gameHistory[msg.sender].push(GameRecord({
            gameType:     gameType,
            won:          won,
            rewardAmount: reward,
            recipeWon:    recipeWon,
            timestamp:    block.timestamp
        }));

        emit GamePlayed(msg.sender, gameType, won, reward, recipeWon, block.timestamp);
    }

    // ── Proof-of-play mining ──────────────────────────────────────────────────

    /**
     * @dev Player submits a nonce found by the client-side miner.
     * The contract verifies on-chain that keccak256(player + nonce)
     * has miningDifficulty leading zero bytes.
     */
    function submitMiningProof(uint256 nonce) external {
        require(barNFT.hasMinted(msg.sender), "GamblingGame: mint your bar first");
        require(
            block.timestamp >= lastMineTime[msg.sender] + MINE_COOLDOWN,
            "GamblingGame: mining cooldown active"
        );

        bytes32 hash = keccak256(abi.encodePacked(msg.sender, nonce));
        require(_checkDifficulty(hash), "GamblingGame: invalid mining proof");

        lastMineTime[msg.sender] = block.timestamp;

        uint256 rand   = _random(nonce);
        uint256 reward = MINE_BASE_REWARD;

        // 20% chance of double reward
        if (rand % 5 == 0) reward *= 2;

        barCoin.mintReward(msg.sender, reward);

        // 10% chance of recipe on successful mine
        _tryMintRecipe(rand, JACKPOT_WIN_REWARD);

        emit MiningRewardGiven(msg.sender, reward, block.timestamp);
    }

    // ── Mini-game implementations ─────────────────────────────────────────────

    function _playSlotMachine(uint256 rand)
        internal pure returns (bool won, uint256 reward)
    {
        uint256 r1 = rand         % 8;
        uint256 r2 = (rand >>  8) % 8;
        uint256 r3 = (rand >> 16) % 8;

        if (r1 == r2 && r2 == r3)               return (true, JACKPOT_WIN_REWARD);
        if (r1 == r2 || r2 == r3 || r1 == r3)   return (true, COMMON_WIN_REWARD);
        return (false, 0);
    }

    function _playScratchCard(uint256 rand)
        internal pure returns (bool won, uint256 reward)
    {
        uint256 s1 = rand         % 6;
        uint256 s2 = (rand >>  8) % 6;
        uint256 s3 = (rand >> 16) % 6;

        if (s1 == s2 && s2 == s3)             return (true, RARE_WIN_REWARD);
        if (s1 == s2 || s2 == s3 || s1 == s3) return (true, COMMON_WIN_REWARD);
        return (false, 0);
    }

    function _playDiceRoll(uint256 rand)
        internal pure returns (bool won, uint256 reward)
    {
        uint256 d1 = (rand       % 6) + 1;
        uint256 d2 = ((rand >> 8)% 6) + 1;

        if (d1 == 6 && d2 == 6) return (true, JACKPOT_WIN_REWARD);
        if (d1 == d2)            return (true, RARE_WIN_REWARD);
        return (false, 0);
    }

    function _playCocktailRoulette(uint256 rand)
        internal returns (bool won, uint256 reward)
    {
        uint8 category = uint8(rand % 6);
        fragments[msg.sender][category]++;

        emit FragmentCollected(
            msg.sender,
            category,
            fragments[msg.sender][category],
            block.timestamp
        );

        // Collect 3 fragments of same type → recipe awarded automatically
        if (fragments[msg.sender][category] >= 3) {
            fragments[msg.sender][category] = 0;
            _mintRecipeForPlayer(rand, RecipeNFT.Rarity.Rare);
            return (true, RARE_WIN_REWARD);
        }

        // Still a win — player gets a fragment + small BAR
        return (true, COMMON_WIN_REWARD / 2);
    }

    function _playCardDraw(uint256 rand)
        internal pure returns (bool won, uint256 reward)
    {
        // Card value 0–12 (0=2, 8=10, 9=J, 10=Q, 11=K, 12=A)
        uint256 value = rand % 13;

        if (value == 12)      return (true, JACKPOT_WIN_REWARD); // Ace
        if (value >= 9)       return (true, RARE_WIN_REWARD);    // J, Q, K
        if (value >= 7)       return (true, COMMON_WIN_REWARD);  // 9, 10
        return (false, 0);
    }

    // ── Recipe minting helpers ────────────────────────────────────────────────

    /**
     * @dev Roll for recipe based on reward size.
     * Jackpot win = 30% chance, Rare win = 15%, Common win = 5%.
     */
    function _tryMintRecipe(uint256 rand, uint256 reward)
        internal returns (bool)
    {
        uint256 roll = (rand >> 32) % 100;
        RecipeNFT.Rarity rarity;

        if (reward >= JACKPOT_WIN_REWARD) {
            if (roll >= 30) return false;
            rarity = RecipeNFT.Rarity.Legendary;
        } else if (reward >= RARE_WIN_REWARD) {
            if (roll >= 15) return false;
            rarity = RecipeNFT.Rarity.Rare;
        } else {
            if (roll >= 5)  return false;
            rarity = RecipeNFT.Rarity.Common;
        }

        _mintRecipeForPlayer(rand, rarity);
        return true;
    }

    function _mintRecipeForPlayer(uint256 rand, RecipeNFT.Rarity rarity) internal {
        string memory name     = recipeNames[(rand >> 40) % recipeNames.length];
        uint256       barId    = barNFT.addressToTokenId(msg.sender);

        uint256 tokenId = recipeNFT.mintRecipe(
            msg.sender,
            name,
            rarity,
            defaultRecipeURI,
            barId
        );

        barNFT.recordRecipeReceived(msg.sender);

        emit RecipeAwarded(msg.sender, tokenId, name, rarity, block.timestamp);
    }

    // ── Randomness ────────────────────────────────────────────────────────────

    function _random(uint256 nonce) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            nonce
        )));
    }

    function _checkDifficulty(bytes32 hash) internal view returns (bool) {
        for (uint256 i = 0; i < miningDifficulty; i++) {
            if (hash[i] != 0x00) return false;
        }
        return true;
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    function getGameHistory(address player)
        external view returns (GameRecord[] memory)
    {
        return gameHistory[player];
    }

    function getFragments(address player)
        external view returns (uint256[6] memory)
    {
        uint256[6] memory result;
        for (uint8 i = 0; i < 6; i++) {
            result[i] = fragments[player][i];
        }
        return result;
    }

    function getCooldowns(address player)
        external view
        returns (uint256 gameSecondsLeft, uint256 mineSecondsLeft)
    {
        uint256 gameReady = lastGameTime[player] + GAME_COOLDOWN;
        uint256 mineReady = lastMineTime[player] + MINE_COOLDOWN;

        gameSecondsLeft = block.timestamp >= gameReady ? 0 : gameReady - block.timestamp;
        mineSecondsLeft = block.timestamp >= mineReady ? 0 : mineReady - block.timestamp;
    }
}