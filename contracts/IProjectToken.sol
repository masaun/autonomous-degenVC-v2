pragma solidity 0.7.4;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IProjectToken is IERC20 {
    function burn(uint amount) external returns (bool);
}
