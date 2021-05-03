# Autonomous Degen.VC V2

***
## 【Introduction of the Autonomous Degen.VC V2】
- This is a smart contract that: 


&nbsp;

***

## 【Workflow】
- Diagram of workflow  

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
- 1: Start ganache-cli
```
$ ganache-cli -d
```
(※ `-d` option is the option in order to be able to use same address on Ganache-CLI every time)

<br>

- 2: Execute test of the smart-contracts (on the local)
  - Test for the contract
    `$ npm run test:AutonomousDegenVC`
    ($ truffle test ./test/test-local/AutonomousDegenVC.test.js)

<br>

***

## 【Demo】
- Video demo that execute test


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

