// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/ClawdWorks.sol";

contract DeployClawdWorks is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address client = 0xC99F74bC7c065d8c51BD724Da898d44F775a8a19;
        address clawd = 0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07;

        vm.startBroadcast(deployerPrivateKey);
        ClawdWorks marketplace = new ClawdWorks(clawd, client);
        // owner is client from construction — no ownership transfer needed
        vm.stopBroadcast();

        console.log("ClawdWorks deployed at:", address(marketplace));
        console.log("Owner:", marketplace.owner());
    }
}
