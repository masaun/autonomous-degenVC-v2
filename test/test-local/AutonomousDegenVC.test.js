/// Using local network
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'))

/// Openzeppelin test-helper
const { time } = require('@openzeppelin/test-helpers')

/// Import deployed-addresses
const contractAddressList = require("../../migrations/addressesList/contractAddress/contractAddress.js")
const tokenAddressList = require("../../migrations/addressesList/tokenAddress/tokenAddress.js")

/// Artifact of smart contracts 
const AutonomousDegenVC = artifacts.require("AutonomousDegenVC")
const LiquidVaultFactory = artifacts.require("LiquidVaultFactory")
const ProjectTokenFactory = artifacts.require("ProjectTokenFactory")
const LiquidVault = artifacts.require("LiquidVault")
const ProjectToken = artifacts.require("ProjectToken")
const MockLpToken = artifacts.require("MockLpToken")
const IUniswapV2Pair = artifacts.require("IUniswapV2Pair")
const IUniswapV2Factory = artifacts.require("IUniswapV2Factory")

/// Deployed-addresses
const UNISWAP_V2_PAIR = "0x7CDc560CC66126a5Eb721e444abC30EB85408f7A"  /// UNI-LP Token (DGVC - ETH pair)
const UNISWAP_V2_ROUTER_02 = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
const UNISWAP_V2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"  /// Wrappered ETH (ERC20)

/**
 * @notice - This is the test of AutonomousDegenVC.sol
 * @notice - [Execution command]: $ truffle test ./test/test-local/AutonomousDegenVC.test.js
 */
contract("AutonomousDegenVC", function(accounts) {
    /// Acccounts
    let deployer = accounts[0]
    let user1 = accounts[1]
    let user2 = accounts[2]
    let user3 = accounts[3]

    /// Global contract instance
    let autonomousDegenVC
    let liquidVaultFactory
    let projectTokenFactory
    let liquidVault
    let projectToken
    let lp          /// UniswapV2Pair (ProjectToken-ETH pair)
    let lpDgvcEth   /// UniswapV2Pair (DGVC-ETH pair)
    let uniswapV2Factory

    /// Global variable for each contract addresses
    let AUTONOMOUS_DEGEN_VC
    let LIQUID_VAULT_FACTORY
    let PROJECT_TOKEN_FACTORY
    let LIQUID_VAULT
    let PROJECT_TOKEN
    let LP              /// UniswapV2Pair (ProjectToken-ETH pair)
    let LP_DGVC_ETH     /// UniswapV2Pair (DGVC-ETH pair)

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

        it("Deploy the ProjectTokenFactory contract instance", async () => {
            projectTokenFactory = await ProjectTokenFactory.new({ from: deployer })
            PROJECT_TOKEN_FACTORY = projectTokenFactory.address
        })

        it("Deploy the AutonomousDegenVC contract instance", async () => {
            autonomousDegenVC = await AutonomousDegenVC.new(UNISWAP_V2_PAIR, UNISWAP_V2_ROUTER_02, { from: deployer })
            AUTONOMOUS_DEGEN_VC = autonomousDegenVC.address
        })

        it("Create the UniswapV2Factory contract instance", async () => {
            uniswapV2Factory = await IUniswapV2Factory.at(UNISWAP_V2_FACTORY)
        })

        it("[Log]: Deployer-contract addresses", async () => {
            console.log('=== LIQUID_VAULT_FACTORY ===', LIQUID_VAULT_FACTORY)
            console.log('=== PROJECT_TOKEN_FACTORY ===', PROJECT_TOKEN_FACTORY)
            console.log('=== AUTONOMOUS_DEGEN_VC ===', AUTONOMOUS_DEGEN_VC)
            console.log('=== UNISWAP_V2_FACTORY ===', UNISWAP_V2_FACTORY)
        })

        it("[Log]: the UNI-V2 LP Token (DGVC-ETH pair) balance of 3 users", async () => {
            const balance1 = await lpDgvcEth.balanceOf(user1)
            const balance2 = await lpDgvcEth.balanceOf(user2)
            const balance3 = await lpDgvcEth.balanceOf(user3)
            console.log('=== UNI-V2 LP Tokens (DGVC-ETH pair) balance of user1 ===', String(balance1))
            console.log('=== UNI-V2 LP Tokens (DGVC-ETH pair) balance of user2 ===', String(balance2))
            console.log('=== UNI-V2 LP Tokens (DGVC-ETH pair) balance of user3 ===', String(balance3))
        })
    })

    describe("Workflow of the AutonomousDegenVC contract", () => {
        it("createProjectToken", async () => {
            const name = "Test Project Token"
            const symbol = "TPT"
            const initialSupply = web3.utils.toWei("100000000", "ether") 
            let txReceipt = await projectTokenFactory.createProjectToken(name, symbol, initialSupply, { from: deployer })

            let event = await getEvents(projectTokenFactory, "ProjectTokenCreated")
            PROJECT_TOKEN = event._projectToken
            projectToken = await ProjectToken.at(PROJECT_TOKEN)
            console.log('=== PROJECT_TOKEN ===', PROJECT_TOKEN)
        })

        it("createLiquidVault", async () => {
            /// [Todo]: Replace assigned-value with exact value
            const duration = 0
            const feeDistributor = deployer
            const feeReceiver = user1
            const donationShare = 1   // LP Token
            const purchaseFee = 1 　　 // ETH
            let txReceipt = await liquidVaultFactory.createLiquidVault(duration, PROJECT_TOKEN, UNISWAP_V2_PAIR, UNISWAP_V2_ROUTER_02, feeDistributor, feeReceiver, donationShare, purchaseFee, { from: deployer })

            let event = await getEvents(liquidVaultFactory, "LiquidVaultCreated")
            LIQUID_VAULT = event._liquidVault
            console.log('=== LIQUID_VAULT ===', LIQUID_VAULT)
        })

        it("[Step 1]: A uniswap market is created for the new project", async () => {
            const amountTokenDesired = web3.utils.toWei('5', 'ether')  /// 5 TPT
            const amountTokenMin = web3.utils.toWei('5', 'ether')      /// [Note]: Equal to amountTokenDesired because it's the first time we add liquidity
            const amountETHMin = web3.utils.toWei('0.1', 'ether')      /// 0.1 ETH
            const to = deployer  /// [Note]: your address, because you're the one who gets the fees later
            const deadline = Date.now() + 300   /// Now + 300 seconds
            console.log('=== deadline ===', deadline)  /// e.g). 1620193601002

            const ethAmount = amountETHMin   /// Because it's the first time we add liquidity

            let txReceipt1 = await projectToken.approve(AUTONOMOUS_DEGEN_VC, amountTokenDesired, { from: deployer })
            let txReceipt2 = await autonomousDegenVC.createUniswapMarketForProject(PROJECT_TOKEN, amountTokenDesired, amountTokenMin, amountETHMin, to, deadline, { from: deployer, value: ethAmount })
        })

        it("[Step 2]: Part of the tokens supply is Alphadropped (airdropped) to wallets that hold our $DGVC UNI-V2 LP tokens in proportion to their share of the LP", async () => {
            const totalAlphadroppedAmount = web3.utils.toWei('3', 'ether')  /// 3 TPT
            const lpHolders = [user1, user2, user3]

            /// Create LP token (ProjecToken-ETH pair) instance
            LP = await uniswapV2Factory.getPair(PROJECT_TOKEN, WETH)
            lp = await IUniswapV2Pair.at(LP)
            console.log('=== UNI-LP token (ProjecToken-ETH pair) address ===', LP)

            /// Check totalSupply of LPs (ProjecToken-ETH pair)
            const totalSupplyOfLp = await lp.totalSupply()
            console.log('=== totalSupply of UNI-LP (ProjecToken-ETH pair) token ===', String(totalSupplyOfLp))

            /// [Todo]: Check share of LPs

            let txReceipt = await autonomousDegenVC.alphadropPartOfProjectTokens(PROJECT_TOKEN, totalSupplyOfLp, lpHolders, { from: deployer })
        })

        it("[Step 3]: A Liquid Vault is capitalized with project tokens to incentivise early liquidity", async () => {
            /// [Todo]: Replace assigned-value with exact value
            const capitalizedAmount = web3.utils.toWei('0.1', 'ether')

            const projectTokenBalance = await projectToken.balanceOf(deployer)
            console.log('=== projectTokenBalance (of deployer) ===', String(projectTokenBalance))

            let txReceipt1 = await projectToken.approve(AUTONOMOUS_DEGEN_VC, capitalizedAmount, { from: deployer })
            let txReceipt2 = await autonomousDegenVC.capitalizeWithProjectTokens(LIQUID_VAULT, PROJECT_TOKEN, capitalizedAmount, { from: deployer })
        })
    })

    describe("Check final result", () => {
        it("ProjectTokens should be distributed into all UNI-LP token (DGVC-ETH) holders", async () => {
            const lpHolder1 = user1
            const lpHolder2 = user2
            const lpHolder3 = user3

            let projectTokenBalance1 = await projectToken.balanceOf(lpHolder1)
            let projectTokenBalance2 = await projectToken.balanceOf(lpHolder2)
            let projectTokenBalance3 = await projectToken.balanceOf(lpHolder3)            

            console.log('=== projectTokenBalance (of UNI-LP Token Holder1) ===', String(projectTokenBalance1))
            console.log('=== projectTokenBalance (of UNI-LP Token Holder2) ===', String(projectTokenBalance2))
            console.log('=== projectTokenBalance (of UNI-LP Token Holder3) ===', String(projectTokenBalance3))
        })        
    })

})
