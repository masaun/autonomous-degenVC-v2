// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
//import { IInfinityProtocol } from "./IInfinityProtocol.sol";
import { IProjectToken } from "../IProjectToken.sol";


contract FeeDistributor is Ownable {
    using SafeMath for uint;

    struct FeeRecipient {
        address liquidVault;
        address secondaryAddress;
        uint256 liquidVaultShare; //percentage between 0 and 100
        uint256 burnPercentage;
    }
    
    IProjectToken public projectToken;
    FeeRecipient public recipients;

    bool public initialized;

    uint private constant MINIMUM_AMOUNT = 1e8;

    modifier seeded {
        require(
            initialized,
            "FeeDistributor: Fees cannot be distributed until Distributor seeded."
        );
        _;
    }

    function seed(
        address _projectToken,
        address _vault,
        address _secondaryAddress,
        uint _liquidVaultShare,
        uint _burnPercentage
    ) external onlyOwner {
        require(
            _liquidVaultShare.add(_burnPercentage) <= 100,
            "FeeDistributor: liquidVault + burnPercentage incorrect sets"
        );
        projectToken = IProjectToken(_projectToken);
        recipients.liquidVault = _vault;
        recipients.secondaryAddress = _secondaryAddress;
        recipients.liquidVaultShare = _liquidVaultShare;
        recipients.burnPercentage = _burnPercentage;
        initialized = true;
    }

    function distributeFees() external seeded {
        uint balance = projectToken.balanceOf(address(this));

        if (balance < MINIMUM_AMOUNT) {
            return;
        }

        uint liquidShare;
        uint burningShare;
        uint secondaryShare;

        if (recipients.liquidVaultShare > 0) {
            liquidShare = recipients.liquidVaultShare.mul(balance).div(100);

            require(
                projectToken.transfer(recipients.liquidVault, liquidShare),
                "FeeDistributor: transfer to LiquidVault failed"
            );
        }

        if (recipients.burnPercentage > 0) {
            burningShare = recipients.burnPercentage.mul(balance).div(100);
            projectToken.burn(burningShare);
        }

        secondaryShare = balance.sub(liquidShare).sub(burningShare);
        if (secondaryShare > 0) {
            require(
            projectToken.transfer(recipients.secondaryAddress, secondaryShare),
            "FeeDistributor: transfer to the secondary address failed"
        );
        }
    }
}
