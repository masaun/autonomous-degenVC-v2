// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IUniswapV2Router02 } from "../uniswap-v2/uniswap-v2-periphery/interfaces/IUniswapV2Router02.sol";
import { IWETH } from "../uniswap-v2/uniswap-v2-periphery/interfaces/IWETH.sol";
import { IUniswapV2Pair } from "../uniswap-v2/uniswap-v2-core/interfaces/IUniswapV2Pair.sol";
import { IFeeDistributor } from "./IFeeDistributor.sol";


contract LiquidVault is Ownable {
    using SafeMath for uint;

    uint DISCOUNTED_RATE;                          // The discounted-rate that is set between 0 ~ 100 (%)
    uint REWARD_AMOUNT_PER_SECOND = 1 * 1e15;      // [Default]: 0.001 project token is distributed per second

    uint constant MINIMUM_LOCKED_PERIOD = 1 days;  // 24 hour (60 * 60 * 24 seconds)
    uint constant ONE_HUNDRED_PERCENT = 100;       // 100 (%)

    /** Emitted when purchaseLP() is called to track ETH amounts */
    event EthTransferred(
        address from,
        uint amount,
        uint percentageAmount
    );

    /** Emitted when purchaseLP() is called and LP tokens minted */
    event LPQueued(
        address holder,
        uint amount,
        uint eth,
        uint projectToken,
        uint timestamp
    );

    /** Emitted when claimLP() is called */
    event LPClaimed(
        address holder,
        uint amount,
        uint timestamp,
        uint exitFee,
        bool claimed
    );

    struct LPbatch {
        address holder;
        uint amount;
        uint timestamp;
        bool claimed;
    }

    struct LiquidVaultConfig {
        address projectToken;
        IUniswapV2Router02 uniswapRouter;
        IUniswapV2Pair tokenPair;
        IFeeDistributor feeDistributor;
        address weth;
        address payable feeReceiver;
        uint32 stakeDuration;
        uint8 donationShare; //0-100
        uint8 purchaseFee; //0-100
    }
      
    bool public forceUnlock;
    bool private locked;

    LiquidVaultConfig public config;

    mapping(address => LPbatch[]) public lockedLP;
    mapping(address => uint) public queueCounter;

    modifier lock {
        require(!locked, "LiquidVault: reentrancy violation");
        locked = true;
        _;
        locked = false;
    }

    function seed(
        uint32 duration,
        address projectToken,
        address uniswapPair,
        address uniswapRouter,
        address feeDistributor,
        address payable feeReceiver,
        uint8 donationShare, // LP Token
        uint8 purchaseFee    // ETH
    ) public onlyOwner {
        config.projectToken = projectToken;
        config.uniswapRouter = IUniswapV2Router02(uniswapRouter);
        config.tokenPair = IUniswapV2Pair(uniswapPair);
        config.feeDistributor = IFeeDistributor(feeDistributor);
        config.weth = config.uniswapRouter.WETH();
        setFeeReceiverAddress(feeReceiver);
        setParameters(duration, donationShare, purchaseFee);
    }

    function getStakeDuration() public view returns (uint) {
        return forceUnlock ? 0 : config.stakeDuration;
    }

    // Could not be canceled if activated
    function enableLPForceUnlock() public onlyOwner {
        forceUnlock = true;
    }

    function setFeeReceiverAddress(address payable feeReceiver) public onlyOwner {
        require(
            feeReceiver != address(0),
            "LiquidVault: ETH receiver is zero address"
        );

        config.feeReceiver = feeReceiver;
    }

    function setParameters(uint32 duration, uint8 donationShare, uint8 purchaseFee)
        public
        onlyOwner
    {
        require(
            donationShare <= 100,
            "LiquidVault: donation share % between 0 and 100"
        );
        require(
            purchaseFee <= 100,
            "LiquidVault: purchase fee share % between 0 and 100"
        );

        config.stakeDuration = duration * 1 days;
        config.donationShare = donationShare;
        config.purchaseFee = purchaseFee;
    }

    function purchaseLPFor(address beneficiary) public payable lock {
        config.feeDistributor.distributeFees();
        require(msg.value > 0, "LiquidVault: ETH required to mint LP tokens (which is a ProjectToken-ETH pair)");

        uint feeValue = (config.purchaseFee * msg.value) / 100;
        uint exchangeValue = msg.value - feeValue;

        (uint reserve1, uint reserve2, ) = config.tokenPair.getReserves();

        uint projectTokenRequired;

        if (address(config.projectToken) < address(config.weth)) {
              projectTokenRequired = config.uniswapRouter.quote(
                  exchangeValue,
                  reserve2,
                  reserve1
              );
        } else {
              projectTokenRequired = config.uniswapRouter.quote(
                  exchangeValue,
                  reserve1,
                  reserve2
              );
        }

        uint balance = IERC20(config.projectToken).balanceOf(address(this));
        require(
              balance >= projectTokenRequired,
              "LiquidVault: insufficient ProjectTokens in LiquidVault"
        );

        IWETH(config.weth).deposit{ value: exchangeValue }();  // Convert ETH to WETH
        address tokenPairAddress = address(config.tokenPair);
        IWETH(config.weth).transfer(tokenPairAddress, exchangeValue);
        IERC20(config.projectToken).transfer(
            tokenPairAddress,
            projectTokenRequired
        );

        //@notice - LP tokens (ProjectToken - ETH pair) are minted
        uint liquidityCreated = config.tokenPair.mint(address(this));
        config.feeReceiver.transfer(feeValue);

        lockedLP[beneficiary].push(
            LPbatch({
                holder: beneficiary,
                amount: liquidityCreated,
                timestamp: block.timestamp,
                claimed: false
            })
        );

        emit LPQueued(
            beneficiary,
            liquidityCreated,
            exchangeValue,
            projectTokenRequired,
            block.timestamp
        );

         emit EthTransferred(msg.sender, exchangeValue, feeValue);
    }

    /**
     * @notice - Send ETH to mint LP tokens (ProjectToken - ETH pair) in LiquidVault
     */
    function purchaseLP(uint totalPurchaseAmount) public payable {
        // @notice - Check whether "ETH fee sent" is equal to "ETH fee required"
        uint ethFeeRequired = getEthFeeRequired(totalPurchaseAmount);
        require(msg.value == ethFeeRequired, "LiquidVault: ETH fee sent should be equal to ETH fee required");

        purchaseLPFor(msg.sender);
    }

    /**
     * @notice - Claim project tokens (per second) as staking reward 
     */
    function claimRewards() public {        
        // Identify a LPbatch (Locked-LP)
        address holder;
        uint amount;
        uint timestamp;  // [Note]: Starting timestamp to be locked
        bool claimed;
        (holder, amount, timestamp, claimed) = getLockedLP(msg.sender, 0);

        require(holder == msg.sender, "Holder must be msg.sender");
    
        // Calculate staked-time (unit is "second")
        uint stakedSeconds = block.timestamp.sub(timestamp);  // [Note]: Total staked-time (Unit is "second")

        // Check whether stakedPeriod of user has passed a minimum locked-period (1 day) or not
        _checkMinimumLockedPeriod(msg.sender, stakedSeconds);

        // Distribute reward tokens into a user
        uint rewardAmount = REWARD_AMOUNT_PER_SECOND.mul(stakedSeconds);
        IERC20(config.projectToken).transfer(holder, rewardAmount);
    }

    /**
     * @notice - Claim LP tokens (ProjectToken - ETH pair)
     */
    function claimLP() public {
        // Identify a LPbatch (Locked-LP)
        address holder;
        uint amount;
        uint timestamp;  // [Note]: Starting timestamp to be locked
        bool claimed;
        (holder, amount, timestamp, claimed) = getLockedLP(msg.sender, 0);

        // Check whether msg.sender is holder or not
        require(holder == msg.sender, "Holder must be msg.sender");
    
        // Calculate staked-time (unit is "second")
        uint stakedSeconds = block.timestamp.sub(timestamp);  // [Note]: Total staked-time (Unit is "second")

        // Check whether stakedPeriod of user has passed a minimum locked-period (1 day) or not
        _checkMinimumLockedPeriod(msg.sender, stakedSeconds);

        // Get a discounted-rate
        uint discountedRate = getDiscountedRate();

        uint next = queueCounter[msg.sender];
        require(
            next < lockedLP[msg.sender].length,
            "LiquidVault: nothing to claim."
        );
        LPbatch storage batch = lockedLP[msg.sender][next];
        require(
            block.timestamp - batch.timestamp > getStakeDuration(),
            "LiquidVault: LP still locked."
        );
        next++;
        queueCounter[msg.sender] = next;
        uint donation = (config.donationShare * batch.amount) / 100;
        batch.claimed = true;
        emit LPClaimed(msg.sender, batch.amount, block.timestamp, donation, batch.claimed);
        require(
            config.tokenPair.transfer(address(0), donation),
            "LiquidVault: donation transfer failed in LP claim."
        );
        require(
            config.tokenPair.transfer(batch.holder, batch.amount - donation),
            "LiquidVault: transfer failed in LP claim."
        );

        // Claim project tokens as staking reward
        claimRewards();
    }

    /**
     * @notice - Set a discounted-rate (0% ~ 100%)
     */
    function setDiscountedRate(uint discountedRate, address caller) public returns (bool) {
        //require(caller == owner(), "Caller should be owner");
        DISCOUNTED_RATE = discountedRate;
    }

    /**
     * @notice - get "ETH fee" required
     *           (On the assumption that the exchange rate of "ProjectToken : ETH" is "1 token : 1 ETH")
     *           e.g). In case of the discounted-rate is 50%, ETH fee required is 1.0 ETH
     *           e.g). In case of the discounted-rate is 10%, ETH fee required is 1.8 ETH
     * @param purchaseAmount - Purchase amount for LPs (=purchaseAmountOfProjectToken + purchaseAmountOfETH)
     */
    function getEthFeeRequired(uint purchaseAmount) public view returns (uint _ethFeeRequired) {
        uint discountedRate = getDiscountedRate();

        uint ethFeeRequired = purchaseAmount.mul(ONE_HUNDRED_PERCENT.sub(discountedRate)).div(100);
        return ethFeeRequired;
    }

    /**
     * @notice - a condition in order to adjust the `"discounted-rate" depends on `staking period` (=how many seconds a user staked)
     */
    function getDiscountedRate() public view returns (uint _discountedRate) {
        return DISCOUNTED_RATE;
    }

    /**
     * @notice - Check whether staked-period of user has passed a minimum locked-period (1 day) or not
     * @notice - Depends on staked-period of a user, discounted-rate is differenct. (10% or 50%) 
     */
    function _checkMinimumLockedPeriod(address user, uint stakedSeconds) internal returns (bool) {
        require(stakedSeconds > MINIMUM_LOCKED_PERIOD, "LiquidVault: staked-period has not passed the minimum locked-period yet");
        require(stakedSeconds >= 1 days, "LiquidVault: staked-period must be more than 1 day (24 hours)");
        
        if (stakedSeconds >= 1 days) {          // More than 1 day (24 hour)
            uint _discountedRate = 10;          // 10% is assigned as the discounted-rate
            setDiscountedRate(_discountedRate, msg.sender);
        } else if (stakedSeconds >= 1 weeks) {  // More than 1 week
            uint _discountedRate = 50;          // 50% is assigned as the discounted-rate
            setDiscountedRate(_discountedRate, msg.sender);
        }
    }

    function lockedLPLength(address holder) public view returns (uint) {
        return lockedLP[holder].length;
    }

    function getLockedLP(address holder, uint position)
        public
        view
        returns (
            address,
            uint,
            uint,
            bool
        )
    {
        LPbatch memory batch = lockedLP[holder][position];
        return (batch.holder, batch.amount, batch.timestamp, batch.claimed);
    }
}
