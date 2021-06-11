/// Using local network
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'))

/// Openzeppelin test-helper
const { time } = require('@openzeppelin/test-helpers')

/// Import deployed-addresses
const contractAddressList = require("../../migrations/addressesList/contractAddress/contractAddress.js")
const tokenAddressList = require("../../migrations/addressesList/tokenAddress/tokenAddress.js")

/// Artifact of smart contracts 
const AutonomousDegenVCV2 = artifacts.require("AutonomousDegenVCV2")
const LiquidVaultFactory = artifacts.require("LiquidVaultFactory")
const FeeDistributorFactory = artifacts.require("FeeDistributorFactory")
const ProjectTokenFactory = artifacts.require("ProjectTokenFactory")
const LiquidVault = artifacts.require("LiquidVault")
const ProjectToken = artifacts.require("ProjectToken")
const MockWETH = artifacts.require("MockWETH")
const MockLpToken = artifacts.require("MockLpToken")
const IUniswapV2Pair = artifacts.require("IUniswapV2Pair")
const IUniswapV2Factory = artifacts.require("IUniswapV2Factory")

/// Deployed-addresses
//const UNISWAP_V2_PAIR = contractAddressList["Mainnet"]["UniswapV2"]["UniswapV2Pair"]["DGVC-ETH"]  /// UNI-LP Token (DGVC - ETH pair)
const UNISWAP_V2_ROUTER_02 = contractAddressList["Mainnet"]["UniswapV2"]["UniswapV2Router02"]
const UNISWAP_V2_FACTORY = contractAddressList["Mainnet"]["UniswapV2"]["UniswapV2Factory"]
//const WETH = tokenAddressList["Mainnet"]["WETH"]  /// Wrappered ETH (ERC20)

/**
 * @notice - This is the test of AutonomousDegenVCV2.sol
 * @notice - [Execution command]: $ truffle test ./test/test-local/AutonomousDegenVCV2.test.js --network local
 */
contract("AutonomousDegenVCV2", function(accounts) {
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
    let weth
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
    let WETH
    let LP              /// UniswapV2Pair (ProjectToken-ETH pair)
    let LP_DGVC_ETH     /// UniswapV2Pair (DGVC-ETH pair)

    /// Global variables (for injecting "seed" of the LiquidVault and the FeeDistributor contracts)
    const stakeDuration = 1
    const donationShare = 10
    const purchaseFee = 30
    const liquidVaultShare = 80
    const burnPercentage = 10


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
        it("Deploy the WETH token contract instance", async () => {
            weth = await MockWETH.new({ from: deployer })
            WETH = weth.address
        })

        it("Deploy the UNI-V2 LP Token (DGVC-ETH pair) contract instance", async () => {
            lpDgvcEth = await MockLpToken.new({ from: deployer })
            LP_DGVC_ETH = lpDgvcEth.address
        })

        it("Transfer the UNI-V2 LP Tokens (DGVC-ETH pair) into 3 users in order to set up LP token holders", async () => {
            const amount1 = web3.utils.toWei("1000", "ether")
            const amount2 = web3.utils.toWei("2000", "ether")
            const amount3 = web3.utils.toWei("3000", "ether")

            let txReceipt1 = await lpDgvcEth.transfer(user1, amount1, { from: deployer })
            let txReceipt2 = await lpDgvcEth.transfer(user2, amount2, { from: deployer })
            let txReceipt3 = await lpDgvcEth.transfer(user3, amount3, { from: deployer })
        })

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

        it("Deploy the AutonomousDegenVC (V2) contract instance", async () => {
            autonomousDegenVC = await AutonomousDegenVCV2.new(LP_DGVC_ETH, UNISWAP_V2_ROUTER_02, UNISWAP_V2_FACTORY, WETH, { from: deployer })
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

        it("[Log]: the UNI-V2 LP Token (DGVC-ETH pair) balance of 3 users", async () => {
            const _totalSupply = await lpDgvcEth.totalSupply()
            const balance1 = await lpDgvcEth.balanceOf(user1)
            const balance2 = await lpDgvcEth.balanceOf(user2)
            const balance3 = await lpDgvcEth.balanceOf(user3)
            console.log('\n=== UNI-V2 LP Tokens (DGVC-ETH pair): totalSupply ===', web3.utils.fromWei(String(_totalSupply), 'ether'))
            console.log('=== UNI-V2 LP Tokens (DGVC-ETH pair): balance of user1 ===', web3.utils.fromWei(String(balance1), 'ether'))
            console.log('=== UNI-V2 LP Tokens (DGVC-ETH pair): balance of user2 ===', web3.utils.fromWei(String(balance2), 'ether'))
            console.log('=== UNI-V2 LP Tokens (DGVC-ETH pair): balance of user3 ===', web3.utils.fromWei(String(balance3), 'ether'))
        })
    })

    describe("\n Workflow of the AutonomousDegenVC contract", () => {
        it("[Step 1]: Create a ProjectToken", async () => {
            const name = "Test Project Token"
            const symbol = "TPT"
            const initialSupply = web3.utils.toWei("100000000", "ether") 
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
            console.log('\n=== LIQUID_VAULT ===', LIQUID_VAULT)
        })

        it("[Step 3]: Create a FeeDistributor", async () => {
            let txReceipt = await feeDistributorFactory.createFeeDistributor({ from: deployer })

            let event = await getEvents(feeDistributorFactory, "FeeDistributorCreated")
            FEE_DISTRIBUTOR = event._feeDistributor
            console.log('\n=== FEE_DISTRIBUTOR ===', FEE_DISTRIBUTOR)
        })

        it("[Step 6]: A uniswap market is created for the new project", async () => {
            const amountTokenDesired = web3.utils.toWei('10000', 'ether')    /// 10,000 TPT (ProjectTokens)
            const amountTokenMin = web3.utils.toWei('0', 'ether')  /// [Note]: When initial addLiquidity(), this is 0
            const amountETHMin = web3.utils.toWei('0', 'ether')    /// [Note]: When initial addLiquidity(), this is 0
            const to = deployer  /// [Note]: your address, because you're the one who gets the fees later
            const deadline = Date.now() + 3000   /// Now + 3000 seconds
            console.log('\n=== deadline ===', deadline)  /// e.g). 1620193601002

            const initialLiquidityEthAmount = web3.utils.toWei('10', 'ether')  /// 10 ETH

            let txReceipt1 = await projectToken.approve(AUTONOMOUS_DEGEN_VC, amountTokenDesired, { from: deployer })
            let txReceipt2 = await autonomousDegenVC.createUniswapMarketForProject(PROJECT_TOKEN, amountTokenDesired, amountTokenMin, amountETHMin, to, deadline, { from: deployer, value: initialLiquidityEthAmount })  
        })

        it("Should assign LP address (ProjectToken-ETH pair)", async () => {
            LP = await autonomousDegenVC.getPair(PROJECT_TOKEN, WETH)
            console.log('\n=== LP (ProjectToken-ETH pair) ===', LP)      
        })

        it("[Step 4]: Inject Seed into a LiquidVault", async () => {
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
            LIQUID_VAULT = event._liquidVault
            console.log('\n=== LIQUID_VAULT (Seeded) ===', LIQUID_VAULT)
        })

        it("[Step 5]: Inject Seed into a FeeDistributor", async () => {
            const secondaryAddress = feeReceiver
            let txReceipt = await feeDistributorFactory.injectSeedIntoFeeDistributor(FEE_DISTRIBUTOR, PROJECT_TOKEN, LIQUID_VAULT, secondaryAddress, liquidVaultShare, burnPercentage, { from: deployer })

            let event = await getEvents(feeDistributorFactory, "FeeDistributorSeeded")
            FEE_DISTRIBUTOR = event._feeDistributor
            console.log('\n=== FEE_DISTRIBUTOR (Seeded) ===', FEE_DISTRIBUTOR)
        })

        it("[Step 7]: A Liquid Vault is capitalized with project tokens to incentivise early liquidity", async () => {
            const capitalizedAmount = web3.utils.toWei('20000', 'ether')  // 20,000 Project Token that is topped up into the Liquid Vault

            const projectTokenBalance = await projectToken.balanceOf(deployer)
            console.log('=== projectTokenBalance (of deployer) ===', String(projectTokenBalance))

            let txReceipt1 = await projectToken.approve(AUTONOMOUS_DEGEN_VC, capitalizedAmount, { from: deployer })
            let txReceipt2 = await autonomousDegenVC.capitalizeWithProjectTokens(LIQUID_VAULT, PROJECT_TOKEN, capitalizedAmount, { from: deployer })
        })

        it("[Step 4]: A user purchase LP tokens by sending 1 ETH", async () => {
            const ethAmount = web3.utils.toWei('1', 'ether')  /// 1 ETH

            //liquidValut = await LiquidVault.at(LIQUID_VAULT)
            //let txReceipt = await liquidValut.purchaseLP({ from: deployer, value: ethAmount })
            let txReceipt = await autonomousDegenVC.purchaseLP(LIQUID_VAULT, { from: deployer, value: ethAmount })
        })

        it("[Step 5]: A user claim LP tokens", async () => {
            let txReceipt = await autonomousDegenVC.claimLP(LIQUID_VAULT, PROJECT_TOKEN, { from: deployer })
        })

    })

    describe("\n Check final result", () => {
        it("ProjectTokens should be distributed into all UNI-LP token (DGVC-ETH) holders", async () => {
            const lpHolder1 = user1
            const lpHolder2 = user2
            const lpHolder3 = user3

            let projectTokenBalance1 = await projectToken.balanceOf(lpHolder1)
            let projectTokenBalance2 = await projectToken.balanceOf(lpHolder2)
            let projectTokenBalance3 = await projectToken.balanceOf(lpHolder3)            

            console.log('\n=== projectTokenBalance (of UNI-LP Token Holder1) ===', web3.utils.fromWei(String(projectTokenBalance1), 'ether'))
            console.log('=== projectTokenBalance (of UNI-LP Token Holder2) ===', web3.utils.fromWei(String(projectTokenBalance2), 'ether'))
            console.log('=== projectTokenBalance (of UNI-LP Token Holder3) ===', web3.utils.fromWei(String(projectTokenBalance3), 'ether'))
        })  

        it("Remained-ProjectTokens should be transferred into the LiquidVault", async () => {
            let projectTokenBalance = await projectToken.balanceOf(LIQUID_VAULT)
            console.log('\n=== projectTokenBalance (of the LiquidVault) ===', web3.utils.fromWei(String(projectTokenBalance), 'ether'))
        })
    })

})
