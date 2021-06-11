// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;

import { LiquidVault } from "./degen-vc/LiquidVault.sol";

contract LiquidVaultFactory {

    address[] public liquidVaults;

    event LiquidVaultCreated(LiquidVault _liquidVault);
    event LiquidVaultSeeded(LiquidVault _liquidVault);

    constructor() public {}

    /**
     * @notice - Create a new Liquid Vault contract for a project
     */
    function createLiquidVault() public returns (bool) {
        LiquidVault liquidVault = new LiquidVault();
        liquidVaults.push(address(liquidVault));

        emit LiquidVaultCreated(liquidVault);
    }

    function injectSeedIntoLiquidVault(
        LiquidVault liquidVault,
        uint32 duration,
        address projectToken,
        address uniswapPair,
        address uniswapRouter,
        address feeDistributor,
        address payable feeReceiver,
        uint8 donationShare,  // LP Token
        uint8 purchaseFee     // ETH
    ) public returns (bool) {
        liquidVault.seed(duration,
                         projectToken,
                         uniswapPair,
                         uniswapRouter,
                         feeDistributor,
                         feeReceiver,
                         donationShare,   // LP Token
                         purchaseFee);    // ETH

        emit LiquidVaultSeeded(liquidVault);
    }

}
