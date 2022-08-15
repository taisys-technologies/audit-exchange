# audit-exchange

The purpose of this contract is to change ETH or other ERC20 token into VegasONE. In order to achieve the goal, there are various settings in the contract, such as exchange rates, switches, etc.

The following are some explanation for the function or user scenario.

## Function Description

### addERC20Token **onlyAdmin**

This function is provided for administrators to add an erc20 token that can be exchanged for VegasONE. Also, admins set the exchange rate and decide whether to open the exchange through this function.
</br>

### erc20ToVegasONE

Convert the selected erc20 token to VEGASONE according to the exchange rate.
</br>

### erc20Withdraw **onlyAdmin**

This function is for the administrator to withdraw the selected erc20 token within the contract to whoever he wants.
</br>

### ethToVegasONE

Convert ETH to VEGASONE according to the exchange rate.
</br>

### ethWithdraw **onlyAdmin**

This function is for the administrator to withdraw the ETH within the contract to whoever he wants.
</br>

### setContractExchangeStatus **onlyAdmin**

This function is provided for administrators to modify whether the contract is open to exchange VegasONE.
</br>

### setERC20TokenExchangeRate **onlyAdmin**

This function is provided for administrators to modify exchange rates for selected erc20 token.
</br>

### setETHExchangeRate **onlyAdmin**

This function is provided for administrators to modify exchange rates for ETH.
</br>

### setExchangeMinValue **onlyAdmin**

This function is provided for administrators to modify the minimum amount to exchange VegasONE.
</br>

### setTokenExchangeStatus **onlyAdmin**

This function is provided for administrators to modify whether the selected erc20 tokens are open to exchange for VegasONE.
