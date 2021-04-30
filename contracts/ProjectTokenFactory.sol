// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;

import { ProjectToken } from "./ProjectToken.sol";

contract ProjectTokenFactory {

    address[] public projectTokens;

    constructor() public {}

    /**
     * @notice - Create a Project Token for a project
     */
    function createProjectToken(
        string memory name, 
        string memory symbol, 
        uint256 initialSupply
    ) public returns (bool) {
        ProjectToken projectToken = new ProjectToken(name, symbol, initialSupply);
        projectTokens.push(address(projectToken));
    }

}
