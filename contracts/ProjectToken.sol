// contracts/GLDToken.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ProjectToken is ERC20 {
    constructor(
        string memory name, 
        string memory symbol, 
        uint256 initialSupply
    ) public ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
    }

    function burn(uint amount) public returns (bool) {
        _burn(msg.sender, amount);
    }

}
