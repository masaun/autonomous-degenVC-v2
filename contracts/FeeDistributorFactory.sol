// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;

import { FeeDistributor } from "./degen-vc/FeeDistributor.sol";

contract FeeDistributorFactory {

    address[] public feeDistributors;

    event FeeDistributorCreated(FeeDistributor _feeDistributor);
    event FeeDistributorSeeded(FeeDistributor _feeDistributor);

    constructor() public {}

    /**
     * @notice - Create a new FeeDistributor contract for a project
     */
    function createFeeDistributor() public returns (bool) {
        FeeDistributor feeDistributor = new FeeDistributor();
        //feeDistributor.seed(projectToken, vault, secondaryAddress, liquidVaultShare, burnPercentage);
        feeDistributors.push(address(feeDistributor));

        emit FeeDistributorCreated(feeDistributor);
    }

    function injectSeedIntoFeeDistributor(
        FeeDistributor feeDistributor,
        address projectToken,
        address vault,
        address secondaryAddress,
        uint liquidVaultShare,
        uint burnPercentage
    ) public returns (bool) {
        feeDistributor.seed(projectToken, vault, secondaryAddress, liquidVaultShare, burnPercentage);

        emit FeeDistributorSeeded(feeDistributor);
    }

}
