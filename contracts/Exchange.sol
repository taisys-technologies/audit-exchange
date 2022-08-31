// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Exchange is AccessControlEnumerable, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    struct ERC20TOKEN {
        uint256 tokenID;
        string tokenSymbol;
        ERC20 tokenAddress;
        uint256 tokenExchangeRate;
        uint256 tokenDecimals;
        bool tokenStatus;
    }

    mapping(uint256 => ERC20TOKEN) public erc20Token;
    
    uint256 public ethRate;
    uint256 public exchangeMinValue;
    uint256 public tokenCount;
    bool internal enableExchange;

    event addERC20TokenEvent(
        address indexed account,
        uint256 indexed tokenID,
        string tokenSymbol,
        address indexed tokenAddress,
        uint256 tokenExchangeRate,
        uint256 tokenDecimals,
        bool tokenStatus
    );
    event EthExchangeEvnet(address indexed from, uint256 ethAmount, uint256 vegasONEAmount);
    event ERC20TokenExchangeEvnet(
        ERC20 indexed tokenAddress,
        address indexed from,
        uint256 tokenAmount,
        uint256 vegasONEAmount
    );
    event SetEthRateEvent(uint256 rate);
    event SetERC20ExchangeRateEvent(address indexed tokenAddress, uint256 rate);
    event SetContractExchangeStatusEvent(bool);
    event setERC20ExchangeStatusEvent(address indexed tokenAddress, bool);
    event setExchangeMinValueEvent(uint256 amount);
    event EthDrawEvent(address indexed to, uint256 amount);
    event ERC20DrawEvent(address indexed tokenAddress, address indexed to, uint256 amount);

    constructor(
        ERC20 VegasONEAddress,
        ERC20 USDTAddress,
        ERC20 BUSDAddress,
        ERC20 USDCAddress,
        ERC20 BNBAddress,
        ERC20 wBTCAddress
    ){
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(ADMIN_ROLE, _msgSender());
        _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);

        //VegasONE
        erc20Token[0] = ERC20TOKEN(
            0,
            VegasONEAddress.symbol(),
            VegasONEAddress,
            1 * 1e18,
            10 ** VegasONEAddress.decimals(),
            false
        );
        //USDT 0xdAC17F958D2ee523a2206206994597C13D831ec7
        erc20Token[1] = ERC20TOKEN(
            1,
            USDTAddress.symbol(),
            USDTAddress,
            5 * 1e6,
            10 ** USDTAddress.decimals(),
            true
        );
        //BUSD 0x4Fabb145d64652a948d72533023f6E7A623C7C53
        erc20Token[2] = ERC20TOKEN(
            2,
            BUSDAddress.symbol(),
            BUSDAddress,
            5 * 1e18,
            10 ** BUSDAddress.decimals(),
            true
        );
        //USDC 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
        erc20Token[3] = ERC20TOKEN(
            3,
            USDCAddress.symbol(),
            USDCAddress,
            5 * 1e6,
            10 ** USDCAddress.decimals(),
            true
        );
        //BNB 0xB8c77482e45F1F44dE1745F52C74426C631bDD52
        erc20Token[4] = ERC20TOKEN(
            4,
            BNBAddress.symbol(),
            BNBAddress,
            14750 * 1e18,
            10 ** BNBAddress.decimals(),
            true
        );
        //wBTC 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599
        erc20Token[5] = ERC20TOKEN(
            5,
            wBTCAddress.symbol(),
            wBTCAddress,
            1 * 1e8,
            10 ** wBTCAddress.decimals(),
            true
        );

        exchangeMinValue = 1e18;
        ethRate = 1;
        tokenCount = 6;
    }

    modifier checkAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Exchange: Only Admin can use.");
        _;
	}

    modifier checkIsEnableChange() {
        require(enableExchange, "Exchange: Cannot exchange now.");
        _;
    }

    modifier checkTokenIDExist(uint256 tokenID) {
        require(address(erc20Token[tokenID].tokenAddress) != address(0), "Exchange: This token does not exist.");
        _;
    }

    function addERC20Token(
        ERC20 tokenAddress,
        uint256 tokenExchangeRate,
        bool tokenStatus
    ) external checkAdmin {
        erc20Token[tokenCount] = ERC20TOKEN(
            tokenCount,
            tokenAddress.symbol(),
            tokenAddress,
            tokenExchangeRate,
            10 ** tokenAddress.decimals(),
            tokenStatus
        );
        emit addERC20TokenEvent(
            msg.sender,
            tokenCount,
            tokenAddress.symbol(),
            address(tokenAddress),
            tokenExchangeRate,
            10 ** tokenAddress.decimals(),
            tokenStatus
        );
        tokenCount++;
    }

    function ethToVegasONE(address walletAddress) external checkIsEnableChange nonReentrant payable {
        uint256 amount = msg.value * ethRate;
        require(amount >= exchangeMinValue, "Exchange: Minimum amount not reached.");
        require(erc20Token[0].tokenAddress.transfer(walletAddress, amount));
        emit EthExchangeEvnet(walletAddress, msg.value, amount);
    }

    function erc20ToVegasONE(
        address walletAddress,
        uint256 tokenID,
        uint256 amount
    ) external checkIsEnableChange nonReentrant checkTokenIDExist(tokenID) {
        ERC20TOKEN memory token = erc20Token[tokenID];
        require(token.tokenStatus, "Exchange: This token can't exchange now.");
        uint256 decimalsAdjust = (erc20Token[0].tokenDecimals / token.tokenDecimals);
        uint256 vegasONEAmount = (amount * token.tokenExchangeRate / token.tokenDecimals) * decimalsAdjust;
        require(vegasONEAmount >= exchangeMinValue, "Exchange: Minimum amount not reached.");
        require(token.tokenAddress.transferFrom(walletAddress, address(this), amount));
        require(erc20Token[0].tokenAddress.transfer(walletAddress, vegasONEAmount));
        emit ERC20TokenExchangeEvnet(
            token.tokenAddress,
            walletAddress,
            amount,
            vegasONEAmount
        );
    }

    function ethWithdraw(address to, uint256 amount) external checkAdmin nonReentrant {
        payable(to).transfer(amount);
        emit EthDrawEvent(to , amount);
    }

    function erc20Withdraw(
        uint256 tokenID,
        address to,
        uint256 amount
    ) external checkAdmin nonReentrant checkTokenIDExist(tokenID) {
        require(erc20Token[tokenID].tokenAddress.transfer(to, amount));
        emit ERC20DrawEvent(address(erc20Token[tokenID].tokenAddress), to, amount);
    }

    function setETHExchangeRate(uint256 rate) external checkAdmin {
        ethRate = rate;
        emit SetEthRateEvent(ethRate);
    }

    function setERC20TokenExchangeRate(uint256 tokenID, uint256 rate) external checkAdmin {
        erc20Token[tokenID].tokenExchangeRate = rate;
        emit SetERC20ExchangeRateEvent(address(erc20Token[tokenID].tokenAddress), rate);
    }

    function setContractExchangeStatus() external checkAdmin {
        enableExchange = !enableExchange;
        emit SetContractExchangeStatusEvent(enableExchange);
    }

    function setTokenExchangeStatus(uint256 tokenID) external checkAdmin checkTokenIDExist(tokenID) {
        erc20Token[tokenID].tokenStatus = !erc20Token[tokenID].tokenStatus;
        emit setERC20ExchangeStatusEvent(
            address(erc20Token[tokenID].tokenAddress),
            erc20Token[tokenID].tokenStatus
        );
    }

    function setExchangeMinValue(uint256 amount) external checkAdmin {
        exchangeMinValue = amount;
        emit setExchangeMinValueEvent(exchangeMinValue);
    }

    function isEnableExchange() public view returns (bool) {
        return enableExchange;
    }
}