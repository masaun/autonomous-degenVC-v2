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
const UNISWAP_V2_PAIR = contractAddressList["Mainnet"]["UniswapV2"]["UniswapV2Pair"]["DGVC-ETH"]  /// UNI-LP Token (DGVC - ETH pair)
const UNISWAP_V2_ROUTER_02 = contractAddressList["Mainnet"]["UniswapV2"]["UniswapV2Router02"]
const UNISWAP_V2_FACTORY = contractAddressList["Mainnet"]["UniswapV2"]["UniswapV2Factory"]
const WETH = tokenAddressList["Mainnet"]["WETH"]  /// Wrappered ETH (ERC20)

/**
 * @notice - This is the test of AutonomousDegenVC.sol
 * @notice - [Execution command]: $ truffle test ./test/test-local/AutonomousDegenVC.test.js --network local
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
            autonomousDegenVC = await AutonomousDegenVC.new(LP_DGVC_ETH, UNISWAP_V2_ROUTER_02, UNISWAP_V2_FACTORY, WETH, { from: deployer })
            AUTONOMOUS_DEGEN_VC = autonomousDegenVC.address
        })

        it("Create the UniswapV2Factory contract instance", async () => {
            uniswapV2Factory = await IUniswapV2Factory.at(UNISWAP_V2_FACTORY)
        })

        it("[Log]: Deployer-contract addresses", async () => {
            console.log('\n=== LIQUID_VAULT_FACTORY ===', LIQUID_VAULT_FACTORY)
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
            /// [Todo]: Replace assigned-value with exact value
            const duration = 0
            const feeDistributor = deployer
            const feeReceiver = user1
            const donationShare = 1   // LP Token
            const purchaseFee = 1 　　 // ETH
            let txReceipt = await liquidVaultFactory.createLiquidVault(duration, PROJECT_TOKEN, UNISWAP_V2_PAIR, UNISWAP_V2_ROUTER_02, feeDistributor, feeReceiver, donationShare, purchaseFee, { from: deployer })

            let event = await getEvents(liquidVaultFactory, "LiquidVaultCreated")
            LIQUID_VAULT = event._liquidVault
            console.log('\n=== LIQUID_VAULT ===', LIQUID_VAULT)
        })

        it("[Step 3]: A uniswap market is created for the new project", async () => {
            const amountTokenDesired = web3.utils.toWei('5', 'ether')  /// 5 TPT
            const amountTokenMin = web3.utils.toWei('5', 'ether')      /// [Note]: Equal to amountTokenDesired because it's the first time we add liquidity
            const amountETHMin = web3.utils.toWei('0.1', 'ether')      /// 0.1 ETH
            const to = deployer  /// [Note]: your address, because you're the one who gets the fees later
            const deadline = Date.now() + 300   /// Now + 300 seconds
            console.log('\n=== deadline ===', deadline)  /// e.g). 1620193601002

            const ethAmount = amountETHMin   /// Because it's the first time we add liquidity

            let txReceipt1 = await projectToken.approve(AUTONOMOUS_DEGEN_VC, amountTokenDesired, { from: deployer })
            let txReceipt2 = await autonomousDegenVC.createUniswapMarketForProject(PROJECT_TOKEN, amountTokenDesired, amountTokenMin, amountETHMin, to, deadline, { from: deployer, value: ethAmount })
        })

        it("[Step 4]: Part of the tokens supply is Alphadropped (airdropped) to wallets that hold our $DGVC UNI-V2 LP tokens in proportion to their share of the LP \n + [Step 5]: A Liquid Vault is capitalized with project tokens to incentivise early liquidity", async () => {
            const totalAlphadroppedAmount = web3.utils.toWei('3', 'ether')  /// 3 TPT
            const lpDgvcEthHolders = [user1, user2, user3]  // [Note]: Assign UNI-LP token holders (= DGVC-ETH pair)

            /// Create LP token (ProjecToken-ETH pair) instance
            LP = await uniswapV2Factory.getPair(PROJECT_TOKEN, WETH)
            lp = await IUniswapV2Pair.at(LP)
            console.log('\n=== UNI-LP token (ProjecToken-ETH pair) address ===', LP)

            /// Check totalSupply of LPs (ProjecToken-ETH pair)
            //const totalSupplyOfLp = await lp.totalSupply()
            //console.log('=== totalSupply of UNI-LP (ProjecToken-ETH pair) token ===', String(totalSupplyOfLp))

            /// Check totalSupply of ProjectTokens
            const depositProjectTokenAmount = await projectToken.balanceOf(deployer)
            console.log('=== deposited-ProjectToken amount ===', web3.utils.fromWei(String(depositProjectTokenAmount), 'ether'))

            let txReceipt1 = await projectToken.approve(AUTONOMOUS_DEGEN_VC, depositProjectTokenAmount, { from: deployer })
            let txReceipt2 = await autonomousDegenVC.alphadropPartOfProjectTokens(LIQUID_VAULT, 
                                                                                  PROJECT_TOKEN, 
                                                                                  depositProjectTokenAmount, 
                                                                                  lpDgvcEthHolders, 
                                                                                  { from: deployer })

            /// Retrieve alpha dropped-rate (%)
            let _alphadroppedRate = await autonomousDegenVC.alphadroppedRate()
            console.log('=== alpha dropped-rate (%) ===', String(_alphadroppedRate))
        })

        // it("[Step 3]: A Liquid Vault is capitalized with project tokens to incentivise early liquidity", async () => {
        //     /// [Todo]: Replace assigned-value with exact value
        //     const capitalizedAmount = web3.utils.toWei('0.1', 'ether')

        //     const projectTokenBalance = await projectToken.balanceOf(deployer)
        //     console.log('=== projectTokenBalance (of deployer) ===', String(projectTokenBalance))

        //     let txReceipt1 = await projectToken.approve(AUTONOMOUS_DEGEN_VC, capitalizedAmount, { from: deployer })
        //     let txReceipt2 = await autonomousDegenVC.capitalizeWithProjectTokens(LIQUID_VAULT, PROJECT_TOKEN, capitalizedAmount, { from: deployer })
        // })
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
