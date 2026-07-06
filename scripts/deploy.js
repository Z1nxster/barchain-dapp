import hre from "hardhat";
import fs from "fs";

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // ── 1. Deploy BarCoin ──────────────────────────────────────────────────────
    console.log("\n[1/5] Deploying BarCoin...");
    const BarCoin = await hre.ethers.getContractFactory("BarCoin");
    const barCoin = await BarCoin.deploy();
    await barCoin.waitForDeployment();
    const barCoinAddress = await barCoin.getAddress();
    console.log("BarCoin deployed to:", barCoinAddress);

    // ── 2. Deploy BarNFT ───────────────────────────────────────────────────────
    console.log("\n[2/5] Deploying BarNFT...");
    const BarNFT = await hre.ethers.getContractFactory("BarNFT");
    const barNFT = await BarNFT.deploy();
    await barNFT.waitForDeployment();
    const barNFTAddress = await barNFT.getAddress();
    console.log("BarNFT deployed to:", barNFTAddress);

    // ── 3. Deploy RecipeNFT ────────────────────────────────────────────────────
    console.log("\n[3/5] Deploying RecipeNFT...");
    const RecipeNFT = await hre.ethers.getContractFactory("RecipeNFT");
    const recipeNFT = await RecipeNFT.deploy();
    await recipeNFT.waitForDeployment();
    const recipeNFTAddress = await recipeNFT.getAddress();
    console.log("RecipeNFT deployed to:", recipeNFTAddress);

    // ── 4. Deploy GamblingGame ─────────────────────────────────────────────────
    console.log("\n[4/5] Deploying GamblingGame...");
    const GamblingGame = await hre.ethers.getContractFactory("GamblingGame");
    const gamblingGame = await GamblingGame.deploy(
        barCoinAddress,
        barNFTAddress,
        recipeNFTAddress
    );
    await gamblingGame.waitForDeployment();
    const gamblingGameAddress = await gamblingGame.getAddress();
    console.log("GamblingGame deployed to:", gamblingGameAddress);

    // ── 5. Deploy RecipeMarketplace ────────────────────────────────────────────
    console.log("\n[5/5] Deploying RecipeMarketplace...");
    const RecipeMarketplace = await hre.ethers.getContractFactory("RecipeMarketplace");
    const recipeMarketplace = await RecipeMarketplace.deploy(
        recipeNFTAddress,
        barCoinAddress
    );
    await recipeMarketplace.waitForDeployment();
    const recipeMarketplaceAddress = await recipeMarketplace.getAddress();
    console.log("RecipeMarketplace deployed to:", recipeMarketplaceAddress);

    // ── 6. Wire up permissions ─────────────────────────────────────────────────
    console.log("\n[Setup] Configuring permissions...");

    // Allow GamblingGame to mint $BAR tokens
    let tx = await barCoin.setMinter(gamblingGameAddress);
    await tx.wait();
    console.log("  ✓ BarCoin minter set to GamblingGame");

    // Allow GamblingGame to update bar stats
    tx = await barNFT.setAuthorizedContract(gamblingGameAddress, true);
    await tx.wait();
    console.log("  ✓ BarNFT authorized GamblingGame");

    // Allow GamblingGame to mint recipes
    tx = await recipeNFT.setAuthorizedContract(gamblingGameAddress, true);
    await tx.wait();
    console.log("  ✓ RecipeNFT authorized GamblingGame");

    // Allow Marketplace to transfer recipes
    tx = await recipeNFT.setAuthorizedContract(recipeMarketplaceAddress, true);
    await tx.wait();
    console.log("  ✓ RecipeNFT authorized RecipeMarketplace");

    // ── 7. Save addresses to file (frontend will read this) ────────────────────
    const addresses = {
        BarCoin:            barCoinAddress,
        BarNFT:             barNFTAddress,
        RecipeNFT:          recipeNFTAddress,
        GamblingGame:       gamblingGameAddress,
        RecipeMarketplace:  recipeMarketplaceAddress,
        deployedAt:         new Date().toISOString(),
        deployer:           deployer.address,
    };

    fs.writeFileSync(
        "frontend/contractAddresses.json",
        JSON.stringify(addresses, null, 2)
    );
    console.log("\nAll contracts deployed and configured!");
    console.log("Addresses saved to frontend/contractAddresses.json");
    console.log("\n── Summary ──────────────────────────────────────────");
    Object.entries(addresses).forEach(([name, value]) => {
        console.log(`  ${name}: ${value}`);
    });
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});