// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";

import { MockLpToken } from "./mock/MockLpToken.sol";  /// [Note]: This is a mock UNI-V2 LP token (DGVC-ETH pair)
import { IProjectToken } from "./IProjectToken.sol";
import { LiquidVault } from "./degen-vc/LiquidVault.sol";
import { FeeDistributor } from "./degen-vc/FeeDistributor.sol";

import { IUniswapV2Router02 } from "./uniswap-v2/uniswap-v2-periphery/interfaces/IUniswapV2Router02.sol";
import { IUniswapV2Factory } from "./uniswap-v2/uniswap-v2-core/interfaces/IUniswapV2Factory.sol";
import { IUniswapV2Pair } from "./uniswap-v2/uniswap-v2-core/interfaces/IUniswapV2Pair.sol";
import { IWETH } from "./uniswap-v2/uniswap-v2-periphery/interfaces/IWETH.sol";

/**
 * @notice - This is a smart contract that automate process of Degen.VC
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
    //uint public alphadroppedRate = 10;   /// 10%

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
     * @notice - ① A Liquid Vault is capitalized with project tokens to incentivise "early liquidity" 
     *             (A Liquid Vault is topped up with project tokens)
     */
    function capitalizeWithProjectTokens(
        LiquidVault liquidVault, 
        IProjectToken projectToken, 
        uint capitalizedAmount
    ) public payable returns (bool) {
        projectToken.transferFrom(msg.sender, address(this), capitalizedAmount);

        // @notice - Initial top up a Liquid Vault with project token
        address LIQUID_VAULT = address(liquidVault);
        projectToken.transfer(LIQUID_VAULT, capitalizedAmount);
    }

    /**
     * @notice - Set a discounted-rate (0% ~ 100%)
     */
    //function setDiscountedRate(LiquidVault liquidVault, uint discountedRate, address caller) public returns (bool) {
    //    _setDiscountedRate(liquidVault, discountedRate, caller);
    //}

    /**
     * @notice - ② A user send ETH into a Liquid Vault and swap ETH sent for LPs
     *             (Then, LPs swapped will be locked in the LiquidVault)
     */
    function purchaseLP(
        LiquidVault liquidVault,
        uint totalPurchaseAmount
    ) payable public {
        // @notice - Check whether "ETH fee sent" is equal to "ETH fee required"
        uint ethFeeRequired = liquidVault.getEthFeeRequired(totalPurchaseAmount);
        require(msg.value == ethFeeRequired, "LiquidVault: ETH fee sent should be equal to ETH fee required");

        // @notice - Send ETH from msg.sender
        // @notice - Swap ETH sent for LPs. (Then, LPs swapped will be locked in the LiquidVault)
        liquidVault.purchaseLP{ value: msg.value }(totalPurchaseAmount);
    } 

    /**
     * @notice - ③ A user claim LP.
     */
    function claimLP(LiquidVault liquidVault, IProjectToken projectToken) public {
        address LIQUID_VAULT = address(liquidVault);

        // Claim LPs (ProjectToken-ETH pair) in the LiquidVault
        _claimLP(liquidVault);
    }



    //----------------------------------------------
    // Inherited-methods from the LiquidVault.sol
    //----------------------------------------------

    // @notice - Claim LPs (ProjectToken-ETH pair) in the LiquidVault
    function _claimLP(LiquidVault liquidVault) internal returns (bool) {
        liquidVault.claimLP(); 
    }

    // @notice - Send ETH to match with the ProjectTokens in LiquidVault
    //function _purchaseLP(LiquidVault liquidVault) internal returns (bool) {
    //    liquidVault.purchaseLP{ value: msg.value }();
    //}

    // @notice - Set a discounted-rate (0% ~ 100%)
    //function _setDiscountedRate(LiquidVault liquidVault, uint discountedRate, address caller) internal returns (bool) {
    //    liquidVault.setDiscountedRate(discountedRate, caller);
    //}

    // @notice - Get a locked-LP 
    function getLockedLP(LiquidVault liquidVault, address holder_, uint position) 
        public
        view 
        returns (address _holder, uint _amount, uint _timestamp, bool _claimed) 
    {
        address holder;
        uint amount;
        uint timestamp;
        bool claimed;
        (holder, amount, timestamp, claimed) = liquidVault.getLockedLP(holder_, position);

        return (holder, amount, timestamp, claimed);
    }

    function getPair(address token0, address token1) public view returns (address pair) {
        return uniswapV2Factory.getPair(token0, token1);
    }


    //----------------
    // Getter methods
    //----------------
    /**
     * @notice - [Todo]: Identify UNI-LP token holders (= DGVC-ETH pair)
     */
    // function getLpHolders() public view returns (address[] memory _lpHolders) {
    //     return lpHolders;
    // }
    
}
