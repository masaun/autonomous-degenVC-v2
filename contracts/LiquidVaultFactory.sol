// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;

import { LiquidVault } from "./degen-vc/LiquidVault.sol";

contract LiquidVaultFactory {

    address[] public liquidVaults;

    event LiquidVaultCreated(LiquidVault _liquidVault);

    constructor() public {}

    /**
     * @notice - Create a new Liquid Vault contract for a project
     */
    function createLiquidVault(
        uint32 duration,
        address projectToken,
        address uniswapPair,
        address uniswapRouter,
        address feeDistributor,
        address payable feeReceiver,
        uint8 donationShare,  // LP Token
        uint8 purchaseFee     // ETH
    ) public returns (bool) {
        LiquidVault liquidVault = new LiquidVault();
        liquidVault.seed(duration,
                         projectToken,
                         uniswapPair,
                         uniswapRouter,
                         feeDistributor,
                         feeReceiver,
                         donationShare,   // LP Token
                         purchaseFee);    // ETH
        liquidVaults.push(address(liquidVault));

        emit LiquidVaultCreated(liquidVault);
    }

}
