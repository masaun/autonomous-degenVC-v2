// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockLpToken is ERC20 {

    constructor() public ERC20("Uniswap V2 Mock LP Token (DGVC-ETH)", "UNI-V2") {
        uint256 initialSupply = 1e8 * 1e18;
        _mint(msg.sender, initialSupply);
    }

}
