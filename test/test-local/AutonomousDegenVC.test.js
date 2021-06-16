/// Using local network
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'))

/// Openzeppelin test-helper
const { time, expectRevert } = require('@openzeppelin/test-helpers')

/// Import deployed-addresses
const contractAddressList = require("../../migrations/addressesList/contractAddress/contractAddress.js")
const tokenAddressList = require("../../migrations/addressesList/tokenAddress/tokenAddress.js")

/// Artifact of smart contracts 
const AutonomousDegenVC = artifacts.require("AutonomousDegenVC")
const LiquidVaultFactory = artifacts.require("LiquidVaultFactory")
const FeeDistributorFactory = artifacts.require("FeeDistributorFactory")
const ProjectTokenFactory = artifacts.require("ProjectTokenFactory")
const LiquidVault = artifacts.require("LiquidVault")
const ProjectToken = artifacts.require("ProjectToken")
const MockLpToken = artifacts.require("MockLpToken")
const FeeDistributor = artifacts.require("FeeDistributor")
const IUniswapV2Pair = artifacts.require("IUniswapV2Pair")
const IUniswapV2Factory = artifacts.require("IUniswapV2Factory")

/// Deployed-addresses
//const UNISWAP_V2_PAIR = contractAddressList["Mainnet"]["UniswapV2"]["UniswapV2Pair"]["DGVC-ETH"]  /// UNI-LP Token (DGVC - ETH pair)
const UNISWAP_V2_ROUTER_02 = contractAddressList["Mainnet"]["UniswapV2"]["UniswapV2Router02"]
const UNISWAP_V2_FACTORY = contractAddressList["Mainnet"]["UniswapV2"]["UniswapV2Factory"]
const WETH = tokenAddressList["Mainnet"]["WETH"]  /// Wrappered ETH (ERC20)

/**
 * @notice - This is the test of AutonomousDegenVCV2.sol
 * @notice - [Execution command]: $ truffle test ./test/test-local/AutonomousDegenVCV2.test.js --network local
 */
contract("AutonomousDegenVC", function(accounts) {
    /// Acccounts
    let deployer = accounts[0]
    let user1 = accounts[1]
    let user2 = accounts[2]
    let user3 = accounts[3]
    let feeReceiver = accounts[4]

    /// Global contract instance
    let autonomousDegenVC
    let liquidVaultFactory
    let feeDistributorFactory
    let projectTokenFactory
    let liquidVault
    let feeDistributor
    let projectToken
    let lp          /// UniswapV2Pair (ProjectToken-ETH pair)
    let lpDgvcEth   /// UniswapV2Pair (DGVC-ETH pair)
    let uniswapV2Factory

    /// Global variable for each contract addresses
    let AUTONOMOUS_DEGEN_VC
    let LIQUID_VAULT_FACTORY
    let FEE_DISTRIBUTOR_FACTORY
    let PROJECT_TOKEN_FACTORY
    let LIQUID_VAULT
    let FEE_DISTRIBUTOR
    let PROJECT_TOKEN
    let LP              /// UniswapV2Pair (ProjectToken-ETH pair)
    let LP_DGVC_ETH     /// UniswapV2Pair (DGVC-ETH pair)

    /// Global variables (for injecting "seed" of the LiquidVault and the FeeDistributor contracts)
    const stakeDuration = 1
    const donationShare = 10
    const purchaseFee = 30
    const liquidVaultShare = 80
    const burnPercentage = 10

    function toWei(amount) {
        return web3.utils.toWei(`${ amount }`, 'ether')
    }

    function fromWei(amount) {
        return web3.utils.fromWei(`${ amount }`, 'ether')
    }

    async function getEvents(contractInstance, eventName) {
        const _latestBlock = await time.latestBlock()
        const LATEST_BLOCK = Number(String(_latestBlock))

        /// [Note]: Retrieve an event log of eventName (via web3.js v1.0.0)
        let events = await contractInstance.getPastEvents(eventName, {
            filter: {},
            fromBlock: LATEST_BLOCK,  /// [Note]: The latest block on Mainnet
            //fromBlock: 0,
            toBlock: 'latest'
        })
        //console.log(`\n=== [Event log]: ${ eventName } ===`, events[0].returnValues)
        return events[0].returnValues
    } 

    describe("Setup smart-contracts", () => {
        it("Deploy the UNI-V2 LP Token (DGVC-ETH pair) contract instance", async () => {
            lpDgvcEth = await MockLpToken.new({ from: deployer })
            LP_DGVC_ETH = lpDgvcEth.address
        })

        // it("Transfer the UNI-V2 LP Tokens (DGVC-ETH pair) into 3 users in order to set up LP token holders", async () => {
        //     const amount1 = toWei("1000")
        //     const amount2 = toWei("2000")
        //     const amount3 = toWei("3000")

        //     let txReceipt1 = await lpDgvcEth.transfer(user1, amount1, { from: deployer })
        //     let txReceipt2 = await lpDgvcEth.transfer(user2, amount2, { from: deployer })
        //     let txReceipt3 = await lpDgvcEth.transfer(user3, amount3, { from: deployer })
        // })

        it("Deploy the LiquidVaultFactory contract instance", async () => {
            liquidVaultFactory = await LiquidVaultFactory.new({ from: deployer })
            LIQUID_VAULT_FACTORY = liquidVaultFactory.address
        })

        it("Deploy the FeeDistributorFactory contract instance", async () => {
            feeDistributorFactory = await FeeDistributorFactory.new({ from: deployer })
            FEE_DISTRIBUTOR_FACTORY = feeDistributorFactory.address
        })

        it("Deploy the ProjectTokenFactory contract instance", async () => {
            projectTokenFactory = await ProjectTokenFactory.new({ from: deployer })
            PROJECT_TOKEN_FACTORY = projectTokenFactory.address
        })

        it("Deploy the AutonomousDegenVC contract instance", async () => {
            autonomousDegenVC = await AutonomousDegenVC.new(LP_DGVC_ETH, UNISWAP_V2_ROUTER_02, UNISWAP_V2_FACTORY, WETH, { from: deployer })
            AUTONOMOUS_DEGEN_VC = autonomousDegenVC.address
        })

        it("Create the UniswapV2Factory contract instance", async () => {
            uniswapV2Factory = await IUniswapV2Factory.at(UNISWAP_V2_FACTORY)
        })

        it("[Log]: Deployer-contract addresses", async () => {
            console.log('\n=== LIQUID_VAULT_FACTORY ===', LIQUID_VAULT_FACTORY)
            console.log('=== FEE_DISTRIBUTOR_FACTORY ===', FEE_DISTRIBUTOR_FACTORY)
            console.log('=== PROJECT_TOKEN_FACTORY ===', PROJECT_TOKEN_FACTORY)
            console.log('=== AUTONOMOUS_DEGEN_VC ===', AUTONOMOUS_DEGEN_VC)
            console.log('=== UNISWAP_V2_FACTORY ===', UNISWAP_V2_FACTORY)
        })

        // it("[Log]: the UNI-V2 LP Token (DGVC-ETH pair) balance of 3 users", async () => {
        //     const _totalSupply = await lpDgvcEth.totalSupply()
        //     const balance1 = await lpDgvcEth.balanceOf(user1)
        //     const balance2 = await lpDgvcEth.balanceOf(user2)
        //     const balance3 = await lpDgvcEth.balanceOf(user3)
        //     console.log('\n=== UNI-V2 LP Tokens (DGVC-ETH pair): totalSupply ===', fromWei(String(_totalSupply)))
        //     console.log('=== UNI-V2 LP Tokens (DGVC-ETH pair): balance of user1 ===', fromWei(String(balance1)))
        //     console.log('=== UNI-V2 LP Tokens (DGVC-ETH pair): balance of user2 ===', fromWei(String(balance2)))
        //     console.log('=== UNI-V2 LP Tokens (DGVC-ETH pair): balance of user3 ===', fromWei(String(balance3)))
        // })
    })

    describe("\n Workflow of the AutonomousDegenVC contract", () => {
        it("[Step 1]: Create a ProjectToken", async () => {
            const name = "Test Project Token"
            const symbol = "TPT"
            const initialSupply = toWei("100000000") 
            let txReceipt = await projectTokenFactory.createProjectToken(name, symbol, initialSupply, { from: deployer })

            let event = await getEvents(projectTokenFactory, "ProjectTokenCreated")
            PROJECT_TOKEN = event._projectToken
            projectToken = await ProjectToken.at(PROJECT_TOKEN)
            console.log('\n=== PROJECT_TOKEN ===', PROJECT_TOKEN)
        })

        it("[Step 2]: Create a Liquid Vault", async () => {
            let txReceipt = await liquidVaultFactory.createLiquidVault({ from: deployer })

            let event = await getEvents(liquidVaultFactory, "LiquidVaultCreated")
            LIQUID_VAULT = event._liquidVault
            liquidValut = await LiquidVault.at(LIQUID_VAULT)
            console.log('\n=== LIQUID_VAULT ===', LIQUID_VAULT)
        })

        it("[Step 3]: Create a FeeDistributor", async () => {
            let txReceipt = await feeDistributorFactory.createFeeDistributor({ from: deployer })

            let event = await getEvents(feeDistributorFactory, "FeeDistributorCreated")
            FEE_DISTRIBUTOR = event._feeDistributor
            feeDistributor = await FeeDistributor.at(FEE_DISTRIBUTOR)
            console.log('\n=== FEE_DISTRIBUTOR ===', FEE_DISTRIBUTOR)
        })

        it("[Step 4]: A uniswap market is created for the new project", async () => {
            const amountTokenDesired = toWei('10000')    /// 10,000 TPT (ProjectTokens)
            const amountTokenMin = toWei('0')            /// [Note]: When initial addLiquidity(), this is 0
            const amountETHMin = toWei('0')              /// [Note]: When initial addLiquidity(), this is 0
            const to = deployer                          /// [Note]: Receiver address
            const deadline = Date.now() + 3000           /// Now + 3000 seconds
            //console.log('\n=== deadline ===', deadline)  /// e.g). 1620193601002

            const ethAmountForInitialLiquidity = toWei('10')  /// 10 ETH

            let txReceipt1 = await projectToken.approve(AUTONOMOUS_DEGEN_VC, amountTokenDesired, { from: deployer })
            let txReceipt2 = await autonomousDegenVC.createUniswapMarketForProject(PROJECT_TOKEN, amountTokenDesired, amountTokenMin, amountETHMin, to, deadline, { from: deployer, value: ethAmountForInitialLiquidity })  
        })

        it("Create the LP token (ProjectToken-ETH pair) instance", async () => {
            LP = await autonomousDegenVC.getPair(PROJECT_TOKEN, WETH)
            console.log('\n=== LP (ProjectToken-ETH pair) ===', LP)

            lp = await IUniswapV2Pair.at(LP)
        })

        it("[Step 5]: Inject 'Seed' into a LiquidVault", async () => {
            let txReceipt = await liquidVaultFactory.injectSeedIntoLiquidVault(LIQUID_VAULT, 
                                                                               stakeDuration, 
                                                                               PROJECT_TOKEN, 
                                                                               LP,  // [Note]: UNI-V2 LP token (ProjectToken - ETH pair) 
                                                                               UNISWAP_V2_ROUTER_02, 
                                                                               FEE_DISTRIBUTOR, 
                                                                               feeReceiver, 
                                                                               donationShare, 
                                                                               purchaseFee, 
                                                                               { from: deployer })

            let event = await getEvents(liquidVaultFactory, "LiquidVaultSeeded")
            // LIQUID_VAULT = event._liquidVault
            // liquidValut = await LiquidVault.at(LIQUID_VAULT)
            // console.log('\n=== LIQUID_VAULT (Seeded) ===', LIQUID_VAULT)
        })

        it("[Step 6]: Inject 'Seed' into a FeeDistributor", async () => {
            const secondaryAddress = feeReceiver
            let txReceipt = await feeDistributorFactory.injectSeedIntoFeeDistributor(FEE_DISTRIBUTOR, PROJECT_TOKEN, LIQUID_VAULT, secondaryAddress, liquidVaultShare, burnPercentage, { from: deployer })

            let event = await getEvents(feeDistributorFactory, "FeeDistributorSeeded")
            // FEE_DISTRIBUTOR = event._feeDistributor
            // console.log('\n=== FEE_DISTRIBUTOR (Seeded) ===', FEE_DISTRIBUTOR)
        })

        it("[Step 7]: Set a discounted-rate (10%)", async () => {
            const discountedRate = 10  /// 10%
            const caller = deployer;

            let txReceipt = await liquidValut.setDiscountedRate(discountedRate, caller, { from: deployer })
        })

        it("[Step 8]: A Liquid Vault is capitalized with (topped up with) project tokens", async () => {
            const capitalizedAmount = toWei('20000')  // 20,000 Project Token that is topped up into the Liquid Vault

            const projectTokenBalance = await projectToken.balanceOf(deployer)
            console.log('\n=== ProjectToken balance (of deployer) ===', fromWei(String(projectTokenBalance)))

            let txReceipt1 = await projectToken.approve(AUTONOMOUS_DEGEN_VC, capitalizedAmount, { from: deployer })
            let txReceipt2 = await autonomousDegenVC.capitalizeWithProjectTokens(LIQUID_VAULT, PROJECT_TOKEN, capitalizedAmount, { from: deployer })
        })

        it("[Step 9]: User1 purchase LP tokens by sending ETH fee required", async () => {
            /// [Note]: On the assumption that the exchange rate of "ProjectToken:ETH" is "1:1"
            /// [Note]: Based on "ethFeeRequired", a sending ETH amount will be determined.
            const purchaseAmountOfProjectToken = 1  /// 1 ProjectToken
            const purchaseAmountOfETH = 1           /// 1 ETH
            const totalPurchaseAmount = toWei(`${ purchaseAmountOfProjectToken + purchaseAmountOfETH }`)
            let ethFeeRequired = await liquidValut.getEthFeeRequired(totalPurchaseAmount)
            console.log('\n=== ETH fee required (unit: ETH) ===', fromWei(String(ethFeeRequired)))  /// [Result]: eg). 1.8 ETH

            /// [Note]: msg.sender will send "ETH fee required"
            let txReceipt = await liquidValut.purchaseLP(totalPurchaseAmount, { from: user1, value: ethFeeRequired })
        })

        it('[Step 10]: Should revert to claim LP if user1 claim within the minimum staking period (24 hours)', async () => {
            await expectRevert(
                liquidValut.claimLP({ from: user1 }),
                "LiquidVault: staked-period has not passed the minimum locked-period yet"
            )
        })

        it("[Step 10]: Should be successful to claim LP if user1 claim LP after 1 weeks => As a result, user1 should receive LP tokens (50% discounted) + some rewards (project tokens)", async () => {
            /// [Note]: "block.timestamp - batch.timestamp" must be greater than "stakeDuration"
            /// [Note]: Increase time (to 1 week ahead)
            const duration = 60 * 60 * 24 * 7  /// 1 week
            await time.increase(duration)

            /// Claim LP
            let txReceipt = await liquidValut.claimLP({ from: user1 })
        })

    })

    describe("\n Check final result", () => {
        it("User1 should has some amount of distributed LPs (ProjectToken-ETH pair) + Rewards (project tokens)", async () => {
            let lpBalance1 = await lp.balanceOf(user1)
            let lpBalance2 = await lp.balanceOf(user2)
            let lpBalance3 = await lp.balanceOf(user3)
            console.log('\n=== LP token (ProjectToken-ETH pair) balance of user1 ===', fromWei(String(lpBalance1)))
            console.log('=== LP token (ProjectToken-ETH pair) balance of user2 ===', fromWei(String(lpBalance2)))
            console.log('=== LP token (ProjectToken-ETH pair) balance of user3 ===', fromWei(String(lpBalance3)))

            let projectTokenBalance1 = await projectToken.balanceOf(user1)
            let projectTokenBalance2 = await projectToken.balanceOf(user2)
            let projectTokenBalance3 = await projectToken.balanceOf(user3)                        
            console.log('=== Rewards (ProjectToken) balance of user1 ===', fromWei(String(projectTokenBalance1)))
            console.log('=== Rewards (ProjectToken) balance of user2 ===', fromWei(String(projectTokenBalance2)))
            console.log('=== Rewards (ProjectToken) balance of user3 ===', fromWei(String(projectTokenBalance3)))
        })  

        it("Remained-ProjectTokens should be transferred into the LiquidVault", async () => {
            let projectTokenBalance = await projectToken.balanceOf(LIQUID_VAULT)
            console.log('\n=== ProjectToken balance (of the LiquidVault) ===', fromWei(String(projectTokenBalance)))
        })
    })

})
