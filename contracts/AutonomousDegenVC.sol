// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;

import { IProjectToken } from "./IProjectToken.sol";
import { LiquidVault } from "./degen-vc/LiquidVault.sol";


/**
 * @notice - This is a smart contract that is automate process of Degen.VC
 *
 * ① A Uniswap market is created for the new project
 * ② Part of the tokens supply is Alphadropped (airdropped) to wallets that hold our $DGVC UNI-V2 LP tokens in proportion to their share of the LP;
 * ③ A Liquid Vault is capitalized with project tokens to incentivise "early liquidity" 
 *
 */
contract AutonomousDegenVC {

    constructor() public {}

    /**
     * @notice - ① A Uniswap market is created for the new project
     */
    function createUniswapMarketForProject() public returns (bool) {}

    /**
     * @notice - Part of the tokens supply is Alphadropped (airdropped) to wallets that hold our $DGVC UNI-V2 LP tokens in proportion to their share of the LP;
     */    
    function alphadropPartOfProjectTokens() public returns (bool) {}

    /**
     * @notice - ③ A Liquid Vault is capitalized with project tokens to incentivise "early liquidity" 
     */
    function capitalizeWithProjectTokens() public returns (bool) {}

}
