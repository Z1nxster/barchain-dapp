// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BarCoin
 * @dev ERC20 token used as the in-game currency for the BarChain DApp.
 * Players earn $BAR by winning mini-games and can spend it to craft recipes.
 */
contract BarCoin is ERC20, Ownable {
    // Maximum supply: 10 million $BAR
    uint256 public constant MAX_SUPPLY = 10_000_000 * 10 ** 18;

    // Only the GamblingGame contract can mint tokens
    address public minterContract;

    // Track when each address first received tokens
    mapping(address => uint256) public firstReceivedDate;

    // Full mint history: who got how much and when
    struct MintRecord {
        address recipient;
        uint256 amount;
        uint256 timestamp;
    }
    MintRecord[] public mintHistory;

    // Events
    event MinterUpdated(address indexed newMinter);
    event TokensMinted(address indexed to, uint256 amount, uint256 timestamp);

    constructor() ERC20("BarCoin", "BAR") Ownable(msg.sender) {}

    /**
     * @dev Set the GamblingGame contract as the only allowed minter.
     * Called once after GamblingGame is deployed.
     */
    function setMinter(address _minter) external onlyOwner {
        minterContract = _minter;
        emit MinterUpdated(_minter);
    }

    /**
     * @dev Mint $BAR tokens as a game reward.
     * Only callable by the GamblingGame contract.
     */
    function mintReward(address to, uint256 amount) external {
        require(msg.sender == minterContract, "BarCoin: only minter allowed");
        require(totalSupply() + amount <= MAX_SUPPLY, "BarCoin: max supply exceeded");

        // Record the first time this address receives tokens
        if (firstReceivedDate[to] == 0) {
            firstReceivedDate[to] = block.timestamp;
        }

        // Save mint record to history
        mintHistory.push(MintRecord({
            recipient: to,
            amount: amount,
            timestamp: block.timestamp
        }));

        _mint(to, amount);
        emit TokensMinted(to, amount, block.timestamp);
    }

    /**
     * @dev Returns how many mint records exist (for frontend pagination).
     */
    function getMintHistoryLength() external view returns (uint256) {
        return mintHistory.length;
    }
}