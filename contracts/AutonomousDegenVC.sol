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
contract AutonomousDegenVC {
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
     * @notice - Part of the tokens supply is Alphadropped (airdropped) to wallets that hold our $DGVC UNI-V2 LP tokens in proportion to their share of the LP;
     */    
    function alphadropPartOfProjectTokens(
        LiquidVault liquidVault,
        IProjectToken projectToken, 
        uint depositProjectTokenAmount,
        //uint totalAlphadroppedAmount, 
        address[] memory lpDgvcEthHolders  // [Note]: Assign UNI-LP token holders (= DGVC-ETH pair) from front-end
    ) public returns (bool) {
        // Deposit ProjectTokens into this contract
        projectToken.transferFrom(msg.sender, address(this), depositProjectTokenAmount);

        // TotalSupply of ProjectTokens
        uint totalSupplyOfProjectToken = projectToken.totalSupply();

        // Calculate total alphadropped-amount of the ProjectTokens
        uint totalAlphadroppedAmount = totalSupplyOfProjectToken.mul(alphadroppedRate).div(100);

        // The ProjectTokens are alphadropped into each UNI-LP token holders
        for (uint i=0; i < lpDgvcEthHolders.length; i++) {
            address lpDgvcEthHolder = lpDgvcEthHolders[i];
            uint lpDgvcEthBalance = lpDgvcEth.balanceOf(lpDgvcEthHolder);
            uint lpDgvcEthTotalSupply = lpDgvcEth.totalSupply();

            // Identify share of the LPs
            // [Note]: To avoid round at first decimal point, "1e18" is multiplied (and then it is divided by 1e18)
            uint shareOfLpDgvcEth = lpDgvcEthBalance.mul(1e18).div(lpDgvcEthTotalSupply);
            uint alphadroppedAmount = totalAlphadroppedAmount.mul(shareOfLpDgvcEth).div(1e18);
            projectToken.transfer(lpDgvcEthHolder, alphadroppedAmount);
        }

        // Capitalize with remained-ProjectTokens (Transfer remained-ProjectTokens into the LiquidVault)
        uint capitalizedAmount = projectToken.balanceOf(address(this));
        //uint capitalizedAmount = depositProjectTokenAmount.sub(totalAlphadroppedAmount);
        capitalizeWithProjectTokens(liquidVault, projectToken, capitalizedAmount);
    }

    /**
     * @notice - ③ A Liquid Vault is capitalized with project tokens to incentivise "early liquidity" 
     */
    function capitalizeWithProjectTokens(LiquidVault liquidVault, IProjectToken projectToken, uint capitalizedAmount) public returns (bool) {
        // [Todo]:
        //IUniswapV2Pair lp;    // UNI LP token (ProjectToken-ETH)

        address LIQUID_VAULT = address(liquidVault);
        projectToken.transfer(LIQUID_VAULT, capitalizedAmount);
    }

    /**
     * @notice - ④ Claim LP for early users.
     */
    function claimEarlyLP(IProjectToken projectToken) public {
        // [Todo]: Check whether msg.sender is early user or not
        address earlyUser = msg.sender;

        address PROJECT_TOKEN = address(projectToken);
        address PAIR = uniswapV2Factory.getPair(PROJECT_TOKEN, WETH);
        IUniswapV2Pair lpProjectTokenEth = IUniswapV2Pair(PAIR);

        uint totalSupplyOfLpProjectTokenEth = lpProjectTokenEth.totalSupply();

        // [Todo]: Check share of LPs (ProjectToken - ETH pair) of a early user who call this method
        uint share;

        // [Todo]: Identify how much amount is transferred into a early user
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
