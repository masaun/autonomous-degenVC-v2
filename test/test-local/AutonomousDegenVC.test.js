/// Using local network
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'))

/// Artifact of smart contracts 
const AutonomousDegenVC = artifacts.require("AutonomousDegenVC")
const LiquidVaultFactory = artifacts.require("LiquidVaultFactory")
const ProjectTokenFactory = artifacts.require("ProjectTokenFactory")
const ProjectToken = artifacts.require("ProjectToken")

/// Deployed-addresses
const UNISWAP_V2_PAIR = "0x7CDc560CC66126a5Eb721e444abC30EB85408f7A"
const UNISWAP_V2_ROUTER_02 = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"


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
    let projectToken

    /// Global variable for each contract addresses
    let AUTONOMOUS_DEGEN_VC
    let LIQUID_VAULT_FACTORY
    let PROJECT_TOKEN_FACTORY
    let PROJECT_TOKEN

    describe("Setup smart-contracts", () => {
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
    })

    describe("Process", () => {
        it("createProjectToken", async () => {
            const name = "Test Project Token"
            const symbol = "TPT"
            const initialSupply = web3.utils.toWei("100000000", "ether") 

            let txReceipt = await projectTokenFactory.createProjectToken(name, symbol, initialSupply, { from: deployer })
            //PROJECT_TOKEN = projectToken.address
        })

        it("createUniswapMarketForProject", async () => {
            /// [Todo]: Replace assigned-value with exact value
            const amountTokenDesired = 0
            const amountTokenMin = 0
            const amountETHMin = 0
            const to = user1
            const deadline = Date.now() / 1000

            autonomousDegenVC.createUniswapMarketForProject(PROJECT_TOKEN, amountTokenDesired, amountTokenMin, to, deadline, { from: deployer })
        })
    })


})
