// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @notice - This is a mock WETH token
 */
contract MockWETH is ERC20 {

    constructor() public ERC20("Wrappered ETH Token", "WETH") {
        uint256 initialSupply = 1e8 * 1e18;
        _mint(msg.sender, initialSupply);
    }

}
