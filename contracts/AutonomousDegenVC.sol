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

    //address[] public lpHolders;  /// UNI LP token (DGVC-ETH) holders address list

    IUniswapV2Pair public lp;    // UNI LP token (DGVC-ETH)
    IUniswapV2Router02 public uniswapV2Router02;

    // Contract address of UNI LP token (DGVC-ETH)
    address UNI_LP_TOKEN;

    // Contract address of UniswapV2Router02.sol
    address UNISWAP_V2_ROUTER_02;

    // Define the rate of alphadrop
    uint alphadroppedRate = 10;   /// 10%

    constructor(IUniswapV2Pair _lp, IUniswapV2Router02 _uniswapV2Router02) public {
        lp = _lp;
        uniswapV2Router02 = _uniswapV2Router02;

        UNI_LP_TOKEN = address(lp);
        UNISWAP_V2_ROUTER_02 = address(uniswapV2Router02);
    }

    /**
     * @notice - ① A Uniswap market is created for the new project
     */
    function createUniswapMarketForProject(
        IProjectToken projectToken,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) public payable returns (bool) {
        require(msg.value >= amountETHMin, "msg.value should be more than amountETHMin");
        /// [Note]: In advance, "amountTokenDesired" should be approved in FE
        projectToken.transferFrom(msg.sender, address(this), amountTokenDesired);

        /// [Note]: Approve ProjectToken for addLiquidity
        projectToken.approve(UNISWAP_V2_ROUTER_02, amountTokenDesired);  /// [Note]: Approve ProjectToken for addLiquidity

        /// Add ProjectToken/WETH liquidity
        /// [Note]: This contract itself has to transfer ETH into UniswapV2Router02 contract
        uniswapV2Router02.addLiquidityETH{ value: msg.value }(address(projectToken), amountTokenDesired, amountTokenMin, amountETHMin, to, deadline);
    }

    /**
     * @notice - Part of the tokens supply is Alphadropped (airdropped) to wallets that hold our $DGVC UNI-V2 LP tokens in proportion to their share of the LP;
     */    
    function alphadropPartOfProjectTokens(
        IProjectToken projectToken, 
        uint totalSupplyOfLp,
        //uint totalAlphadroppedAmount, 
        address[] memory lpHolders  // [Note]: Assign UNI-LP token holders (= DGVC-ETH pair) from front-end
    ) public returns (bool) {
        // [Todo]: Identify UNI-LP token holders (= DGVC-ETH pair)
        //address[] memory lpHolders = getLpHolders();

        // Calculate total alphadropped-amount of the ProjectTokens
        uint totalAlphadroppedAmount = totalSupplyOfLp.mul(alphadroppedRate).div(100);

        // The ProjectTokens are alphadropped into each UNI-LP token holders
        for (uint i=0; i < lpHolders.length; i++) {
            address lpHolder = lpHolders[i];
            uint lpBalance = lp.balanceOf(lpHolder);
            uint lpTotalSupply = lp.totalSupply();

            // Identify share of the LPs
            uint shareOfLp = lpBalance.div(lpTotalSupply).mul(100);

            uint alphadroppedAmount = totalAlphadroppedAmount.mul(shareOfLp).div(100);

            projectToken.transfer(lpHolder, alphadroppedAmount);
        }
    }

    /**
     * @notice - ③ A Liquid Vault is capitalized with project tokens to incentivise "early liquidity" 
     */
    function capitalizeWithProjectTokens(LiquidVault liquidVault, IProjectToken projectToken, uint capitalizedAmount) public returns (bool) {
        address LIQUID_VAULT = address(liquidVault);

        projectToken.transferFrom(msg.sender, address(this), capitalizedAmount);
        projectToken.transfer(LIQUID_VAULT, capitalizedAmount);
    }


    ///----------------
    /// Getter methods
    ///----------------
    /**
     * @notice - [Todo]: Identify UNI-LP token holders (= DGVC-ETH pair)
     */
    // function getLpHolders() public view returns (address[] memory _lpHolders) {
    //     return lpHolders;
    // }
    
}
