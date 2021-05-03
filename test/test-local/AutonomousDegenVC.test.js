/// Using local network
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'))

/// Artifact of smart contracts 
const AutonomousDegenVC = artifacts.require("AutonomousDegenVC")
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
    let projectToken

    /// Global variable for each contract addresses
    let AUTONOMOUS_DEGEN_VC
    let PROJECT_TOKEN

    describe("Setup smart-contracts", () => {
        it("Deploy the ProjectToken contract instance", async () => {
            const name = "Test Project Token"
            const symbol = "TPT"
            const initialSupply = web3.utils.toWei("100000000", "ether") 

            projectToken = await ProjectToken.new(name, symbol, initialSupply, { from: deployer })
            PROJECT_TOKEN = projectToken.address
        })

        it("Deploy the AutonomousDegenVC contract instance", async () => {
            autonomousDegenVC = await AutonomousDegenVC.new(UNISWAP_V2_PAIR, UNISWAP_V2_ROUTER_02, { from: deployer })
            AUTONOMOUS_DEGEN_VC = autonomousDegenVC.address
        })
    })

    describe("Process", () => {
        it("createUniswapMarketForProject()", async () => {
            const amountTokenDesired = 0
            const amountTokenMin = 0
            const amountETHMin = 0
            const to = user1
            const deadline = Date.now() / 1000

            autonomousDegenVC.createUniswapMarketForProject(PROJECT_TOKEN, amountTokenDesired, amountTokenMin, to, deadline, { from: deployer })
        })
    })


})
