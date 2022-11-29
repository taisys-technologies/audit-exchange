const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Exchange", function () {
  let exchange;
  let vegasONE;
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
    let vegasONEFactory = await ethers.getContractFactory("VegasONE");
    let exchangeFactory = await ethers.getContractFactory("Exchange");
    let testTokenFactory = await ethers.getContractFactory("ERC20Mock");

    [owner, signer1, signer2, ...signers] = await ethers.getSigners();

    vegasONE = await vegasONEFactory.deploy(
      "VegasONE",
      "VOC",
      ethers.utils.parseEther("1000000")
    );
    await vegasONE.deployed();
    // console.log("VegasONE deployed to:", vegasONE.address);

    testToken1 = await testTokenFactory.deploy("TestToken1", "TT1");
    await testToken1.deployed();
    // console.log("TestToken1 deployed to:", testToken1.address);

    testToken2 = await testTokenFactory.deploy("TestToken2", "TT2");
    await testToken2.deployed();
    // console.log("TestToken2 deployed to:", testToken2.address);

    testToken3 = await testTokenFactory.deploy("TestToken3", "TT3");
    await testToken3.deployed();
    // console.log("TestToken3 deployed to:", testToken3.address);

    testToken4 = await testTokenFactory.deploy("TestToken4", "TT4");
    await testToken4.deployed();
    // console.log("TestToken4 deployed to:", testToken4.address);

    testToken5 = await testTokenFactory.deploy("TestToken5", "TT5");
    await testToken5.deployed();
    // console.log("TestToken5 deployed to:", testToken5.address);

    testToken6 = await testTokenFactory.deploy("TestToken6", "TT6");
    await testToken6.deployed();
    // console.log("TestToken6 deployed to:", testToken6.address);

    exchange = await exchangeFactory.deploy(
      vegasONE.address,
      testToken1.address,
      testToken2.address,
      testToken3.address,
      testToken4.address,
      testToken5.address
    );
    await exchange.deployed();
    // console.log("Exchange deployed to:", exchange.address);

    const amount = ethers.utils.parseEther("500000");
    await vegasONE.mint(exchange.address, amount);
    // console.log("VegasONE mint:", exchange.address, "amount:", amount);
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
  });

  describe("ethToVegasONE", function () {
    it("Positive", async function () {
      let tx;

      tx = await exchange.setContractExchangeStatus();
      await tx.wait();

      const amount = ethers.utils.parseEther("1");
      tx = await exchange.ethToVegasONE(signer1.address, {
        value: amount,
      });
      await tx.wait();

      //check contract eth balance
      const balance = await ethers.provider.getBalance(exchange.address);
      expect(balance).to.equal(amount);

      //check user vegasONE balance
      const ethRate = await exchange.ethRate();
      const vegasExp = amount.mul(ethRate);
      const vbalance = await vegasONE.balanceOf(signer1.address);
      expect(vbalance).to.equal(vegasExp);
    });
  });

  describe("erc20ToVegasONE", function () {
    it("Positive", async function () {
      await exchange.setContractExchangeStatus();
      const amount = ethers.utils.parseUnits("1", 18);
      const tokenID = 1;
      let mint = await testToken1
        .connect(signer1)
        .mint(signer1.address, amount);
      await mint.wait();
      let approve = await testToken1
        .connect(signer1)
        .approve(exchange.address, amount);
      await approve.wait();
      const tx = await exchange.erc20ToVegasONE(
        signer1.address,
        tokenID,
        amount
      );
      await tx.wait();

      // check contract token balance
      const balance = await testToken1.balanceOf(exchange.address);
      expect(balance).to.equal(amount);

      // check user vegasONE balance
      const signerbalance = await vegasONE.balanceOf(signer1.address);
      const token = await exchange.erc20Token(tokenID);
      const tokenRate = await token.tokenExchangeRate;
      const tokenDecimals = await token.tokenDecimals;
      const vamount = (amount * tokenRate) / tokenDecimals;
      expect(ethers.utils.parseUnits(signerbalance.toString())).to.equal(
        ethers.utils.parseUnits(vamount.toString())
      );
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
  });

  describe("erc20Withdraw", function () {
    it("Positive", async function () {
      const amount = ethers.utils.parseEther("2");
      const tokenID = 1;
      let tx = await testToken1.mint(exchange.address, amount);
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
  });
});
