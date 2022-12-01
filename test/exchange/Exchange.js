const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Exchange", function () {
  let exchange;
  let testToken;
  let testToken1;
  let testToken2;
  let testToken3;
  let testToken4;
  let testToken5;
  let testToken6;
  let owner;
  let signer1;
  let signer2;
  let signers;

  beforeEach(async function () {
    let exchangeFactory = await ethers.getContractFactory("Exchange");
    let decimal18TokenFactory = await ethers.getContractFactory(
      "ExchangeERC20MockD18"
    );
    let decimal6Token2Factory = await ethers.getContractFactory(
      "ExchangeERC20MockD6"
    );

    [owner, signer1, signer2, ...signers] = await ethers.getSigners();

    testToken = await decimal18TokenFactory.deploy("TestTokenD18", "VOC");
    await testToken.deployed();
    console.log("TestToken deployed to:", testToken.address);

    testToken1 = await decimal6Token2Factory.deploy("TestTokenD6", "USDT");
    await testToken1.deployed();
    console.log("TestToken1 deployed to:", testToken1.address);

    testToken2 = await decimal18TokenFactory.deploy("TestTokenD18", "USDC");
    await testToken2.deployed();
    console.log("TestToken2 deployed to:", testToken2.address);

    testToken3 = await decimal18TokenFactory.deploy("TestTokenD18", "BUSD");
    await testToken3.deployed();
    console.log("TestToken3 deployed to:", testToken3.address);

    testToken4 = await decimal18TokenFactory.deploy("TestTokenD18", "BNB");
    await testToken4.deployed();
    console.log("TestToken4 deployed to:", testToken4.address);

    testToken5 = await decimal18TokenFactory.deploy("TestTokenD18", "wBTC");
    await testToken5.deployed();
    console.log("TestToken5 deployed to:", testToken5.address);

    testToken6 = await decimal18TokenFactory.deploy(
      "TestTokenD18",
      "NewTestToken"
    );
    await testToken6.deployed();
    console.log("testToken6 deployed to:", testToken6.address);

    exchange = await exchangeFactory.deploy(
      testToken.address,
      testToken1.address,
      testToken2.address,
      testToken3.address,
      testToken4.address,
      testToken5.address
    );
    await exchange.deployed();
    console.log("Exchange deployed to:", exchange.address);

    const amount = ethers.utils.parseEther("500000000");
    await testToken.mint(exchange.address, amount);
    console.log("VegasONE mint:", exchange.address, "amount:", amount);
  });

  describe("addERC20Token", function () {
    it("Positive", async function () {
      const contractAddr = testToken6.address;
      const tokenID = await exchange.tokenCount();
      const rate = ethers.utils.parseEther("3");
      const status = true;
      const tx = await exchange.addERC20Token(contractAddr, rate, status);
      await tx.wait();

      // check token details
      const token = await exchange.erc20Token(tokenID);
      expect(token.tokenAddress).to.equal(contractAddr);
      expect(token.tokenExchangeRate).to.equal(rate);
      expect(token.tokenStatus).to.equal(status);
    });
    it("Negative/NotAdmin", async function () {
      const contractAddr = testToken6.address;
      const rate = ethers.utils.parseEther("3");
      const status = true;
      const tx = exchange
        .connect(signer1)
        .addERC20Token(contractAddr, rate, status);
      expect(tx).to.be.revertedWith("Exchange: Only Admin can use.");
    });
  });

  describe("setETHExchangeRate", function () {
    it("Positive", async function () {
      const exchangeRate = 2;
      const tx = await exchange.setETHExchangeRate(exchangeRate);
      await tx.wait();

      // check eth exchange rate
      const rate = await exchange.ethRate();
      expect(rate).to.equal(exchangeRate);
    });
    it("Negative/NotAdmin", async function () {
      const exchangeRate = 2;
      const tx = exchange.connect(signer1).setETHExchangeRate(exchangeRate);
      expect(tx).to.be.revertedWith("Exchange: Only Admin can use.");
    });
  });

  describe("setERC20TokenExchangeRate", function () {
    it("Positive", async function () {
      const tokenID = 1;
      const amount = ethers.utils.parseEther("2");
      const tx = await exchange.setERC20TokenExchangeRate(tokenID, amount);
      await tx.wait();

      // check token exchange rate
      const token = await exchange.erc20Token(tokenID);
      expect(token.tokenExchangeRate).to.equal(amount);
    });
    it("Negative/NotAdmin", async function () {
      const tokenID = 1;
      const amount = ethers.utils.parseEther("2");
      const tx = exchange
        .connect(signer1)
        .setERC20TokenExchangeRate(tokenID, amount);
      expect(tx).to.be.revertedWith("Exchange: Only Admin can use.");
    });
    it("Negative/TokenNotExist", async function () {
      const tokenID = 7;
      const amount = ethers.utils.parseEther("2");
      const tx = exchange
        .connect(signer1)
        .setERC20TokenExchangeRate(tokenID, amount);
      expect(tx).to.be.revertedWith("Exchange: This token does not exist.");
    });
  });

  describe("ethToVegasONE", function () {
    it("Positive", async function () {
      let tx = await exchange.setContractExchangeStatus();
      tx = await exchange.isEnableExchange();
      expect(tx).to.be.equals(true);

      tx = await exchange.ethToVegasONE(signer1.address, {
        value: ethers.utils.parseEther("1"),
      });
      await tx.wait();

      //check contract eth balance
      const balance = await exchange.provider.getBalance(exchange.address);
      expect(balance).to.equal(ethers.utils.parseEther("1"));

      //check user vegasOne balance
      const vbalance = await testToken
        .connect(signer1.address)
        .balanceOf(signer1.address);
      expect(vbalance).to.equal(ethers.utils.parseEther("22857"));
    });
    it("Negative/NotOpenExchange", async function () {
      let tx = exchange.ethToVegasONE(signer1.address, {
        value: ethers.utils.parseEther("1"),
      });
      expect(tx).to.be.revertedWith("Exchange: Cannot exchange now.");
    });
    it("Negative/NotReachMiniumAmount", async function () {
      let tx = await exchange.setContractExchangeStatus();
      tx = exchange.ethToVegasONE(signer1.address, { value: 100 });
      expect(tx).to.be.revertedWith("Exchange: Minimum amount not reached.");
    });
  });

  describe("erc20ToVegasONE", function () {
    it("Positive/decimals_6", async function () {
      let tx = await exchange.setContractExchangeStatus();
      tx = await exchange.isEnableExchange();
      expect(tx).to.be.equals(true);

      const amount = ethers.utils.parseUnits("1", 6);
      const tokenID = 1;
      let mint = await testToken1
        .connect(signer1)
        .mint(signer1.address, amount);
      await mint.wait();
      let approve = await testToken1
        .connect(signer1)
        .approve(exchange.address, amount);
      await approve.wait();

      tx = await exchange.erc20ToVegasONE(signer1.address, tokenID, amount);
      await tx.wait();

      // check contract token balance
      const balance = await testToken1.balanceOf(exchange.address);
      expect(balance).to.equal(amount);

      // check user token balance
      const signerbalance = await testToken.balanceOf(signer1.address);
      const token = await exchange.erc20Token(tokenID);
      const tokenRate = await token.tokenExchangeRate;
      const tokenDecimals = await token.tokenDecimals;
      const decimalsAdjust = 1e18 / tokenDecimals;
      const vamount = amount * (tokenRate / tokenDecimals) * decimalsAdjust;
      expect(ethers.utils.parseUnits(signerbalance.toString())).to.equal(
        ethers.utils.parseUnits(vamount.toString())
      );
    });
    it("Positive/decimals18", async function () {
      let tx = await exchange.setContractExchangeStatus();
      tx = await exchange.isEnableExchange();
      expect(tx).to.be.equals(true);

      const amount = ethers.utils.parseUnits("1", 18);
      const tokenID = 2;

      let mint = await testToken2
        .connect(signer1)
        .mint(signer1.address, amount);
      await mint.wait();
      let approve = await testToken2
        .connect(signer1)
        .approve(exchange.address, amount);
      await approve.wait();

      tx = await exchange.erc20ToVegasONE(signer1.address, tokenID, amount);
      await tx.wait();

      // check contract token balance
      const balance = await testToken2.balanceOf(exchange.address);
      expect(balance).to.equal(amount);

      // check user token balance
      const signerbalance = await testToken.balanceOf(signer1.address);
      const token = await exchange.erc20Token(tokenID);
      const tokenRate = await token.tokenExchangeRate;
      const tokenDecimals = await token.tokenDecimals;
      const decimalsAdjust = 1e18 / tokenDecimals;
      const vamount = amount * (tokenRate / tokenDecimals) * decimalsAdjust;
      expect(ethers.utils.parseUnits(signerbalance.toString())).to.equal(
        ethers.utils.parseUnits(vamount.toString())
      );
    });
    it("Negative/NotOpenExchange", async function () {
      const amount = ethers.utils.parseEther("1");
      const tokenID = 2;
      let tx = exchange.erc20ToVegasONE(signer1.address, tokenID, amount);
      expect(tx).to.be.revertedWith("Exchange: Cannot exchange now.");
    });
    it("Negative/TokenNotExist", async function () {
      const tokenID = 7;
      const amount = ethers.utils.parseEther("2");
      let tx = await exchange.setContractExchangeStatus();
      tx = await exchange.isEnableExchange();
      expect(tx).to.be.equals(true);

      let mint = await testToken2
        .connect(signer1)
        .mint(signer1.address, amount);
      await mint.wait();
      let approve = await testToken2
        .connect(signer1)
        .approve(exchange.address, amount);
      await approve.wait();

      tx = exchange.erc20ToVegasONE(signer1.address, tokenID, amount);
      expect(tx).to.be.revertedWith("Exchange: This token does not exist.");
    });
    it("Negative/TokenCannotExchangeNow", async function () {
      const tokenID = 2;
      const amount = ethers.utils.parseEther("2");
      let tx = await exchange.setContractExchangeStatus();

      let mint = await testToken2
        .connect(signer1)
        .mint(signer1.address, amount);
      await mint.wait();
      let approve = await testToken2
        .connect(signer1)
        .approve(exchange.address, amount);
      await approve.wait();

      tx = await exchange.setTokenExchangeStatus(tokenID);
      tx = exchange.erc20ToVegasONE(signer1.address, tokenID, amount);
      expect(tx).to.be.revertedWith("Exchange: This token can't exchange now.");
    });
    it("Negative/NotReachMiniumAmount", async function () {
      let tx = await exchange.setContractExchangeStatus();
      const tokenID = 2;
      const amount = ethers.utils.parseUnits("1", 2);

      let mint = await testToken2
        .connect(signer1)
        .mint(signer1.address, amount);
      await mint.wait();
      let approve = await testToken2
        .connect(signer1)
        .approve(exchange.address, amount);
      await approve.wait();

      tx = exchange.erc20ToVegasONE(signer1.address, tokenID, amount);
      expect(tx).to.be.revertedWith("Exchange: Minimum amount not reached.");
    });
  });

  describe("setContractExchangeStatus", function () {
    it("Positive", async function () {
      let tx = await exchange.setContractExchangeStatus();
      tx = await exchange.isEnableExchange();
      expect(tx).to.be.equals(true);
    });
    it("Negative/NotAdmin", async function () {
      let tx = exchange.connect(signer1).setContractExchangeStatus();
      expect(tx).to.be.revertedWith("Exchange: Only Admin can use.");
    });
  });

  describe("setTokenExchangeStatus", function () {
    it("Positive/On", async function () {
      const tokenID = 1;
      const token = await exchange.erc20Token(tokenID);
      const tx = await exchange.setTokenExchangeStatus(tokenID);
      await tx.wait();

      // check token exchange status
      expect(token.tokenStatus).to.be.true;
    });
    it("Negative/NotAdmin", async function () {
      const tokenID = 1;
      const tx = exchange.connect(signer1).setTokenExchangeStatus(tokenID);
      expect(tx).to.be.revertedWith("Exchange: Only Admin can use.");
    });
    it("Negative/TokenNotExist", async function () {
      const tokenID = 7;
      const tx = exchange.setTokenExchangeStatus(tokenID);
      expect(tx).to.be.revertedWith("Exchange: This token does not exist.");
    });
  });

  describe("setExchangeMinValue", function () {
    it("Positive", async function () {
      const amount = ethers.utils.parseEther("2");
      const tx = await exchange.setExchangeMinValue(amount);
      await tx.wait();

      // check token exchange rate
      const minValue = await exchange.exchangeMinValue();
      expect(minValue).to.equal(amount);
    });
    it("Negative/NotAdmin", async function () {
      const amount = ethers.utils.parseEther("2");
      const tx = exchange.connect(signer1).setExchangeMinValue(amount);
      expect(tx).to.be.revertedWith("Exchange: Only Admin can use.");
    });
  });

  describe("ethWithdraw", function () {
    it("Positive", async function () {
      await exchange.setContractExchangeStatus();
      const amount = ethers.utils.parseEther("1");
      const tx = await exchange.ethToVegasONE(signer1.address, {
        value: amount,
      });
      await tx.wait();
      const balance = await exchange.provider.getBalance(exchange.address);
      const ubalance = await ethers.provider.getBalance(signer2.address);
      let tx1 = await exchange.ethWithdraw(signer2.address, amount);
      await tx1.wait();

      // check user eth balance
      const ubalance2 = await ethers.provider.getBalance(signer2.address);
      expect(ubalance2).to.equal(ubalance.add(amount));

      // check contract eth balance
      const balance2 = await exchange.provider.getBalance(exchange.address);
      expect(balance2).to.equal(balance.sub(amount));
    });
    it("Negative/NotAdmin", async function () {
      await exchange.setContractExchangeStatus();
      const amount = ethers.utils.parseEther("1");
      let tx = await exchange.ethToVegasONE(signer1.address, { value: amount });
      await tx.wait();
      tx = exchange.connect(signer1).ethWithdraw(signer2.address, amount);
      expect(tx).to.be.revertedWith("Exchange: Only Admin can use.");
    });
    it("Negative/ZeroAddress", async function () {
      await exchange.setContractExchangeStatus();
      const amount = ethers.utils.parseEther("1");
      let tx = await exchange.ethToVegasONE(signer1.address, { value: amount });
      await tx.wait();
      tx = exchange.ethWithdraw(0x0, amount);
      expect(tx).to.be.revertedWith(
        "Exchange: Address can not be a zero address."
      );
    });
  });

  describe("erc20Withdraw", function () {
    it("Positive", async function () {
      const amount = ethers.utils.parseEther("2");
      const tokenID = 1;
      let tx = await testToken1
        .connect(owner)
        .transfer(exchange.address, amount);
      await tx.wait();
      const balance = await testToken1.balanceOf(exchange.address);
      let tx1 = await exchange.erc20Withdraw(tokenID, signer1.address, amount);
      await tx1.wait();

      // check user token balance
      const ubalance = await testToken1.balanceOf(signer1.address);
      expect(ubalance).to.equal(amount);

      // check contract token balance
      const balance2 = await testToken1.balanceOf(exchange.address);
      expect(balance2).to.equal(balance.sub(amount));
    });
    it("Negative/NotAdmin", async function () {
      const amount = ethers.utils.parseEther("2");
      const tokenID = 1;
      let tx = await testToken1
        .connect(owner)
        .transfer(exchange.address, amount);
      await tx.wait();

      tx = exchange
        .connect(signer1)
        .erc20Withdraw(tokenID, signer1.address, amount);
      expect(tx).to.be.revertedWith("Exchange: Only Admin can use.");
    });
    it("Negative/ZeroAddress", async function () {
      const amount = ethers.utils.parseEther("2");
      const tokenID = 1;
      let tx = await testToken1
        .connect(owner)
        .transfer(exchange.address, amount);
      await tx.wait();

      tx = exchange.connect(signer1).erc20Withdraw(tokenID, 0x0, amount);
      expect(tx).to.be.revertedWith(
        "Exchange: Address can not be a zero address."
      );
    });
    it("Negative/TokenNotExist", async function () {
      const amount = ethers.utils.parseEther("2");
      const tokenID = 7;
      let tx = await testToken1
        .connect(owner)
        .transfer(exchange.address, amount);
      await tx.wait();

      tx = exchange.connect(signer1).erc20Withdraw(tokenID, 0x0, amount);
      expect(tx).to.be.revertedWith("Exchange: This token does not exist.");
    });
  });
});
