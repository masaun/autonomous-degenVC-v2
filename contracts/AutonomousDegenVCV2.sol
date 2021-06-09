// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";

import { MockLpToken } from "./mock/MockLpToken.sol";  /// [Note]: This is a mock UNI-V2 LP token (DGVC-ETH pair)
import { IProjectToken } from "./IProjectToken.sol";
import { LiquidVault } from "./degen-vc/LiquidVault.sol";

import { IUniswapV2Router02 } from "./uniswap-v2/uniswap-v2-periphery/interfaces/IUniswapV2Router02.sol";
import { IUniswapV2Factory } from "./uniswap-v2/uniswap-v2-core/interfaces/IUniswapV2Factory.sol";
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
contract AutonomousDegenVCV2 {
    using SafeMath for uint;

    //address[] public lpHolders;  /// UNI LP token (DGVC-ETH) holders address list

    MockLpToken public lpDgvcEth;         // UNI LP token (DGVC-ETH)
    //IUniswapV2Pair public lpDgvcEth;    // UNI LP token (DGVC-ETH)
    IUniswapV2Router02 public uniswapV2Router02;
    IUniswapV2Factory public uniswapV2Factory;
    IWETH public wETH;

    // Contract address of UNI LP token (DGVC-ETH)
    address UNI_LP_DGVC_ETH;

    // Contract address of UniswapV2Router02.sol
    address UNISWAP_V2_ROUTER_02;
    address UNISWAP_V2_FACTORY;
    address WETH;

    // Define the rate of alphadrop
    uint public alphadroppedRate = 10;   /// 10%

    constructor(MockLpToken _lpDgvcEth, IUniswapV2Router02 _uniswapV2Router02, IUniswapV2Factory _uniswapV2Factory, IWETH _wETH) public {
        lpDgvcEth = _lpDgvcEth;
        uniswapV2Router02 = _uniswapV2Router02;
        uniswapV2Factory = _uniswapV2Factory;
        wETH = _wETH;

        UNI_LP_DGVC_ETH = address(lpDgvcEth);
        UNISWAP_V2_ROUTER_02 = address(uniswapV2Router02);
        UNISWAP_V2_FACTORY = address(uniswapV2Factory);
        WETH = address(wETH);
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
     * @notice - ② A Liquid Vault is capitalized with project tokens to incentivise "early liquidity" 
     */
    function capitalizeWithProjectTokens(LiquidVault liquidVault, IProjectToken projectToken, uint capitalizedAmount) public returns (bool) {
        // [Todo]:
        //IUniswapV2Pair lp;    // UNI LP token (ProjectToken-ETH)

        address LIQUID_VAULT = address(liquidVault);
        projectToken.transfer(LIQUID_VAULT, capitalizedAmount);
    }

    /**
     * @notice - ③ Claim LP for early users.
     */
    function claimEarlyLP(LiquidVault liquidVault, IProjectToken projectToken) public {
        address LIQUID_VAULT = address(liquidVault);

        // [Todo]: Makes LPs for early users (a DGVC-ETH pair holders)
        liquidVault.purchaseLP();  // [Note]: Is this purchase LP method needed?

        // [Todo]: Claim LPs (ProjectToken-ETH pair) in the LiquidVault
        liquidVault.claimLP(); 

        // [Todo]: Check whether msg.sender is early user or not
        address earlyUser = msg.sender;

        address PROJECT_TOKEN = address(projectToken);
        address PAIR = uniswapV2Factory.getPair(PROJECT_TOKEN, WETH);
        IUniswapV2Pair lpProjectTokenEth = IUniswapV2Pair(PAIR);

        uint totalSupplyOfLpProjectTokenEth = lpProjectTokenEth.totalSupply();

        // [Todo]: Check share of LPs (ProjectToken - ETH pair) of a early user who call this method
        uint share;

        // [Todo]: Based on share, how much amount should be transferred into a early user is identified
        uint amount = totalSupplyOfLpProjectTokenEth.mul(share).div(100);

        // [Todo]: Transfer LPs (ProjectToken - ETH pair) into early users
        lpProjectTokenEth.transfer(earlyUser, amount);
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
