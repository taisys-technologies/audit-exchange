// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ExchangeERC20MockD6 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 100 * 1e18);
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function decimals() public virtual view override returns(uint8){
        return 6;
    }
}