# Autonomous Degen.VC

## 【Introduction of the Autonomous Degen.VC】
- This is a smart contract that enables a project to launch on Degen VC without our permission. 
  - For example, by calling a public function on a smart contract a project could allocate project tokens to a liquid vault (just an address that needs to be defined), a dev wallet (just an address that needs to be defined), and the DGVC LP.
  - When the function is called the DGVC token UNI-V2 LP will consist of a number of wallets with LP token balances. 
  - We want the tokens allocated for distribution to the DGVC LP to become available for LP token hodlers to claim in proportion to their share of the LP.

&nbsp;

***

## 【Workflow】
- Launch a project on Degen.VC with 5 steps:
  - ① Create a Project Token
  - ② Create a Liquid Vault
  - ③ A uniswap market is created for the new project.
  - ④ 
  - ⑤ A Liquid Vault is capitalized (topped up) with project tokens.
  - ⑥ A user purchase LP tokens by sending ETH fee required.
  - ⑦ After some period from purchased LP, a user claim LP tokens + receive some rewards (project tokens)

<br>

- Diagram of workflow  
![【Diagram】Autonomous Degen VC v2](https://user-images.githubusercontent.com/19357502/118577354-39bc1580-b7c5-11eb-9fb8-94bc503f5891.jpg)

&nbsp;

***

## 【Remarks】
- Version for following the `Degen.VC` smart contract
  - Solidity (Solc): v0.7.4
  - Truffle: v5.1.60
  - web3.js: v1.2.9
  - @openzeppelin/contracts: v3.4.1
  - ganache-cli: v6.9.1 (ganache-core: 2.10.2)


&nbsp;

***

## 【Setup】
### ① Install modules
- Install npm modules in the root directory
```
$ npm install
```

<br>

### ② Compile & migrate contracts (on local)
```
$ npm run migrate:local
```

<br>

### ③ Test (Mainnet-fork approach)
- 1: Start ganache-cli with mainnet-fork
```
$ ganache-cli -d --fork https://mainnet.infura.io/v3/{YOUR INFURA KEY}@{BLOCK_NUMBER}
```
(※ `-d` option is the option in order to be able to use same address on Ganache-CLI every time)

<br>

- 2: Execute test of the smart-contracts (on the local)
  - Test for the contract
    `$ npm run test:AutonomousDegenVC`
    ($ truffle test ./test/test-local/AutonomousDegenVC.test.js)

<br>

***

## 【References】
- Degen VC
  - Github: https://github.com/degen-vc
  - 

<br>

- Degen.VC Hackathon on Gitcoin
  - The Smart Contract Infrastructure For An Autonomous Degen VC V2  
    https://gitcoin.co/issue/degen-vc/degen-vc-v2/1/100025593

