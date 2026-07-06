// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./RecipeNFT.sol";
import "./BarCoin.sol";

/**
 * @title RecipeMarketplace
 * @dev Players can list, buy, and cancel Recipe NFT sales.
 * Supports payment in ETH or $BAR tokens.
 * 10% royalty to original creator handled by RecipeNFT on every sale.
 * Premium listings use X402 micropayment fee.
 */
contract RecipeMarketplace is Ownable, ReentrancyGuard {

    // ── Contract references ───────────────────────────────────────────────────
    RecipeNFT public recipeNFT;
    BarCoin   public barCoin;

    // ── Fees ──────────────────────────────────────────────────────────────────
    uint256 public constant PLATFORM_FEE    = 2;          // 2% to platform
    uint256 public          premiumListingFee = 0.001 ether; // X402 fee

    // ── Listing data ──────────────────────────────────────────────────────────
    struct Listing {
        address seller;
        uint256 tokenId;
        uint256 priceETH;   // price in ETH (wei), 0 if not selling in ETH
        uint256 priceBAR;   // price in $BAR, 0 if not selling in $BAR
        bool    isPremium;  // paid X402 premium listing
        bool    active;
        uint256 listedAt;
    }

    // ── Sale history per token (satisfies course requirement) ─────────────────
    struct SaleRecord {
        address seller;
        address buyer;
        uint256 priceETH;
        uint256 priceBAR;
        uint256 timestamp;
    }

    mapping(uint256 => Listing)      public listings;
    mapping(uint256 => SaleRecord[]) public saleHistory;
    mapping(uint256 => uint256)      public lastCancelTime;
    uint256[] public activeListingIds;

    // ── Events ────────────────────────────────────────────────────────────────
    event RecipeListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 priceETH,
        uint256 priceBAR,
        bool    isPremium,
        uint256 timestamp
    );
    event RecipeSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 priceETH,
        uint256 priceBAR,
        uint256 timestamp
    );
    event ListingCancelled(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 timestamp
    );

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(address _recipeNFT, address _barCoin) Ownable(msg.sender) {
        recipeNFT = RecipeNFT(_recipeNFT);
        barCoin   = BarCoin(_barCoin);
    }

    // ── List a recipe ─────────────────────────────────────────────────────────

    /**
     * @dev List a Recipe NFT for sale in ETH, $BAR, or both.
     * For premium listings, send 0.001 ETH with the call (X402 fee).
     * Seller must first approve this contract in RecipeNFT.
     */
    function listRecipe(
        uint256 tokenId,
        uint256 priceETH,
        uint256 priceBAR,
        bool    isPremium
    ) external payable {
        require(recipeNFT.ownerOf(tokenId) == msg.sender, "Marketplace: you don't own this recipe");
        require(!listings[tokenId].active,                "Marketplace: already listed");
        require(priceETH > 0 || priceBAR > 0,            "Marketplace: set at least one price");
        require(
            lastCancelTime[tokenId] == 0 ||
            block.timestamp >= lastCancelTime[tokenId] + 2 days,
            "Marketplace: wait 2 days after cancelling before relisting"
        );
        if (isPremium) {
            require(msg.value >= premiumListingFee, "Marketplace: premium fee required (X402)");
        }

        listings[tokenId] = Listing({
            seller:    msg.sender,
            tokenId:   tokenId,
            priceETH:  priceETH,
            priceBAR:  priceBAR,
            isPremium: isPremium,
            active:    true,
            listedAt:  block.timestamp
        });

        activeListingIds.push(tokenId);

        emit RecipeListed(tokenId, msg.sender, priceETH, priceBAR, isPremium, block.timestamp);
    }

    // ── Buy with ETH ──────────────────────────────────────────────────────────

    /**
     * @dev Purchase a listed recipe by paying in ETH.
     * 10% royalty → original creator (handled inside RecipeNFT).
     * 2%  platform fee → this contract (owner can withdraw).
     * Remainder → seller.
     */
    function buyWithETH(uint256 tokenId) external payable nonReentrant {
        Listing storage listing = listings[tokenId];
        require(listing.active,         "Marketplace: not listed");
        require(listing.priceETH > 0,   "Marketplace: not priced in ETH");
        require(msg.value >= listing.priceETH, "Marketplace: insufficient ETH");

        address seller = listing.seller;
        uint256 price  = listing.priceETH;

        // Calculate splits
        uint256 royalty      = (price * 10) / 100;  // 10% to creator
        uint256 platformCut  = (price * PLATFORM_FEE) / 100;
        uint256 sellerAmount = price - royalty - platformCut;

        // Deactivate listing before transfers (reentrancy protection)
        listing.active = false;
        _removeFromActive(tokenId);

        // Record sale history
        saleHistory[tokenId].push(SaleRecord({
            seller:    seller,
            buyer:     msg.sender,
            priceETH:  price,
            priceBAR:  0,
            timestamp: block.timestamp
        }));

        // Transfer NFT and pay 10% royalty to creator inside RecipeNFT
        recipeNFT.transferWithRoyalty{value: royalty}(tokenId, seller, msg.sender);

        // Pay seller remainder
        payable(seller).transfer(sellerAmount);

        // Platform cut stays in contract (owner withdraws via withdrawFees)

        emit RecipeSold(tokenId, seller, msg.sender, price, 0, block.timestamp);
    }

    // ── Buy with $BAR ─────────────────────────────────────────────────────────

    /**
     * @dev Purchase a listed recipe by paying in $BAR tokens.
     * Buyer must first approve this contract in BarCoin for the full amount.
     * Royalty (10%) paid in $BAR to original creator.
     */
    function buyWithBAR(uint256 tokenId) external nonReentrant {
        Listing storage listing = listings[tokenId];
        require(listing.active,       "Marketplace: not listed");
        require(listing.priceBAR > 0, "Marketplace: not priced in $BAR");

        uint256 price = listing.priceBAR;
        require(barCoin.balanceOf(msg.sender) >= price, "Marketplace: insufficient $BAR");

        address seller  = listing.seller;
        address creator = recipeNFT.getRecipeData(tokenId).originalCreator;

        uint256 royalty      = (price * 10) / 100;
        uint256 platformCut  = (price * PLATFORM_FEE) / 100;
        uint256 sellerAmount = price - royalty - platformCut;

        listing.active = false;
        _removeFromActive(tokenId);

        saleHistory[tokenId].push(SaleRecord({
            seller:    seller,
            buyer:     msg.sender,
            priceETH:  0,
            priceBAR:  price,
            timestamp: block.timestamp
        }));

        // Transfer $BAR splits (buyer must have approved this contract)
        barCoin.transferFrom(msg.sender, creator, royalty);
        barCoin.transferFrom(msg.sender, seller,  sellerAmount);
        barCoin.transferFrom(msg.sender, address(this), platformCut);

        // Transfer NFT (no ETH royalty — already paid in $BAR above)
        recipeNFT.transferWithRoyalty{value: 0}(tokenId, seller, msg.sender);

        emit RecipeSold(tokenId, seller, msg.sender, 0, price, block.timestamp);
    }

    // ── Cancel listing ────────────────────────────────────────────────────────

    function cancelListing(uint256 tokenId) external {
        Listing storage listing = listings[tokenId];
        require(listing.active,                                          "Marketplace: not listed");
        require(listing.seller == msg.sender || msg.sender == owner(),   "Marketplace: not your listing");

        listing.active = false;
        lastCancelTime[tokenId] = block.timestamp;
        _removeFromActive(tokenId);

        emit ListingCancelled(tokenId, msg.sender, block.timestamp);
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    function getListing(uint256 tokenId)
        external view returns (Listing memory)
    {
        return listings[tokenId];
    }

    function getSaleHistory(uint256 tokenId)
        external view returns (SaleRecord[] memory)
    {
        return saleHistory[tokenId];
    }

    function getActiveListings()
        external view returns (uint256[] memory)
    {
        return activeListingIds;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setPremiumListingFee(uint256 fee) external onlyOwner {
        premiumListingFee = fee;
    }

    /**
     * @dev Withdraw accumulated platform fees (ETH + $BAR).
     */
    function withdrawFees() external onlyOwner {
        uint256 barBalance = barCoin.balanceOf(address(this));
        if (barBalance > 0) {
            barCoin.transfer(owner(), barBalance);
        }
        if (address(this).balance > 0) {
            payable(owner()).transfer(address(this).balance);
        }
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    function _removeFromActive(uint256 tokenId) internal {
        for (uint256 i = 0; i < activeListingIds.length; i++) {
            if (activeListingIds[i] == tokenId) {
                activeListingIds[i] = activeListingIds[activeListingIds.length - 1];
                activeListingIds.pop();
                break;
            }
        }
    }
}