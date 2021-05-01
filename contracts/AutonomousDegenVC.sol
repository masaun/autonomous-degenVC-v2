// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";

import { IProjectToken } from "./IProjectToken.sol";
import { LiquidVault } from "./degen-vc/LiquidVault.sol";

import { IUniswapV2Router02 } from "./uniswap-v2/uniswap-v2-periphery/interfaces/IUniswapV2Router02.sol";
import { IUniswapV2Pair } from "./uniswap-v2/uniswap-v2-core/interfaces/IUniswapV2Pair.sol";
import { IWETH } from "./uniswap-v2/uniswap-v2-periphery/interfaces/IWETH.sol";

/**
 * @notice - This is a smart contract that is automate process of Degen.VC
 *
 * ① A Uniswap market is created for the new project
 * ② Part of the tokens supply is Alphadropped (airdropped) to wallets that hold our $DGVC UNI-V2 LP tokens in proportion to their share of the LP;
 * ③ A Liquid Vault is capitalized with project tokens to incentivise "early liquidity" 
 *
 */
contract AutonomousDegenVC {
    using SafeMath for uint;

    address[] public lpHolders;  /// UNI LP token (DGVC-ETH) holders address list

    IUniswapV2Pair public lp;    /// UNI LP token (DGVC-ETH)
    IUniswapV2Router02 public uniswapV2Router02;

    constructor(IUniswapV2Pair _lp, IUniswapV2Router02 _uniswapV2Router02) public {
        lp = _lp;
        uniswapV2Router02 = _uniswapV2Router02;
    }

    /**
     * @notice - ① A Uniswap market is created for the new project
     */
    function createUniswapMarketForProject(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) public returns (bool) {
        uniswapV2Router02.addLiquidityETH(token, amountTokenDesired, amountTokenMin, amountETHMin, to, deadline);
    }

    /**
     * @notice - Part of the tokens supply is Alphadropped (airdropped) to wallets that hold our $DGVC UNI-V2 LP tokens in proportion to their share of the LP;
     */    
    function alphadropPartOfProjectTokens(IProjectToken projectToken, uint totalAlphadroppedAmount) public returns (bool) {
        /// [Todo]: Identify share of the LPs
        address[] memory lpHolders = getLpHolders();

        /// [Todo]: Alphadrop the ProjectTokens into each LP holders
        for (uint i=0; i < lpHolders.length; i++) {
            address lpHolder = lpHolders[i];
            uint lpBalance = lp.balanceOf(lpHolder);
            uint lpTotalSupply = lp.totalSupply();
            uint shareOfLp = lpBalance.div(lpTotalSupply);

            uint alphadroppedAmount = totalAlphadroppedAmount.mul(shareOfLp).div(100);

            projectToken.transfer(lpHolder, alphadroppedAmount);
        }
    }

    /**
     * @notice - ③ A Liquid Vault is capitalized with project tokens to incentivise "early liquidity" 
     */
    function capitalizeWithProjectTokens() public returns (bool) {}


    ///----------------
    /// Getter methods
    ///----------------
    function getLpHolders() public view returns (address[] memory _lpHolders) {
        return lpHolders;
    }
    
}
