// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/ClawdWorks.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockCLAWD is IERC20 {
    string public name = "Mock CLAWD";
    string public symbol = "CLAWD";
    uint8 public constant decimals = 18;

    uint256 public override totalSupply;
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        uint256 a = allowance[from][msg.sender];
        require(a >= amount, "allowance");
        if (a != type(uint256).max) {
            allowance[from][msg.sender] = a - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}

contract ClawdWorksTest is Test {
    ClawdWorks internal market;
    MockCLAWD internal clawd;

    address internal seller = address(0x5E);
    address internal buyer = address(0xB1);
    address internal stranger = address(0x57);

    address internal constant TREASURY = 0x90eF2A9211A3E7CE788561E5af54C76B0Fa3aEd0;
    address internal constant BURN = 0x000000000000000000000000000000000000dEaD;

    uint256 internal constant PRICE = 1000e18;

    function setUp() public {
        clawd = new MockCLAWD();
        market = new ClawdWorks(address(clawd));

        clawd.mint(buyer, 1_000_000e18);

        vm.prank(buyer);
        clawd.approve(address(market), type(uint256).max);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    function _createListing() internal returns (uint256 id) {
        vm.prank(seller);
        id = market.createListing("design", "A design service", PRICE, 5, 0, address(0));
    }

    function _purchase(uint256 listingId) internal returns (uint256 jobId) {
        vm.prank(buyer);
        jobId = market.purchase(listingId, "ipfs://note");
    }

    // ------------------------------------------------------------------
    // Tests
    // ------------------------------------------------------------------

    function test_Deploy_Ownerless() public view {
        assertEq(address(market.clawd()), address(clawd));
        assertEq(market.TREASURY(), TREASURY);
    }

    function test_AnyoneCanCreateListing() public {
        // stranger (not owner) can list
        vm.prank(stranger);
        uint256 id = market.createListing("gig", "plain text desc", PRICE, 3, 0, address(0));
        assertEq(market.getListing(id).seller, stranger);
    }

    function test_CreateListing_FlexibleDescription() public {
        vm.prank(seller);
        uint256 id = market.createListing("svc", "Plain text description here", PRICE, 5, 0, address(0));
        ClawdWorks.Listing memory l = market.getListing(id);
        assertEq(l.description, "Plain text description here");
    }

    function test_PurchaseTransfersCLAWDToEscrow() public {
        uint256 listingId = _createListing();
        uint256 buyerBefore = clawd.balanceOf(buyer);

        uint256 jobId = _purchase(listingId);

        assertEq(clawd.balanceOf(buyer), buyerBefore - PRICE);
        assertEq(clawd.balanceOf(address(market)), PRICE);

        ClawdWorks.Job memory j = market.getJob(jobId);
        assertEq(uint256(j.status), uint256(ClawdWorks.JobStatus.PAID));
        assertEq(j.buyer, buyer);
        assertEq(j.seller, seller);
        assertEq(j.amountPaid, PRICE);
    }

    function test_FullFlow_DeliverConfirm_Splits_80_10_10() public {
        uint256 listingId = _createListing();
        uint256 jobId = _purchase(listingId);

        vm.prank(seller);
        market.markDelivered(jobId, "ipfs://deliverable");

        ClawdWorks.Job memory delivered = market.getJob(jobId);
        assertEq(uint256(delivered.status), uint256(ClawdWorks.JobStatus.DELIVERED));
        assertGt(delivered.deliveredAt, 0);

        uint256 sellerBefore = clawd.balanceOf(seller);
        uint256 burnBefore = clawd.balanceOf(BURN);
        uint256 treasuryBefore = clawd.balanceOf(TREASURY);

        vm.prank(buyer);
        market.confirmReceipt(jobId);

        assertEq(clawd.balanceOf(seller) - sellerBefore, (PRICE * 8000) / 10_000);
        assertEq(clawd.balanceOf(BURN) - burnBefore, (PRICE * 1000) / 10_000);
        assertEq(clawd.balanceOf(TREASURY) - treasuryBefore, (PRICE * 1000) / 10_000);
        assertEq(clawd.balanceOf(address(market)), 0);

        ClawdWorks.Job memory done = market.getJob(jobId);
        assertEq(uint256(done.status), uint256(ClawdWorks.JobStatus.COMPLETED));
        assertEq(market.activeJobCount(seller), 0);
    }

    function test_BuyerCancelPaidJob() public {
        uint256 listingId = _createListing();
        uint256 jobId = _purchase(listingId);

        uint256 buyerBefore = clawd.balanceOf(buyer);

        vm.prank(buyer);
        market.cancelJob(jobId);

        assertEq(clawd.balanceOf(buyer) - buyerBefore, PRICE);
        assertEq(uint256(market.getJob(jobId).status), uint256(ClawdWorks.JobStatus.REFUNDED));
        assertEq(market.activeJobCount(seller), 0);
    }

    function test_BuyerCannotCancelDeliveredJob() public {
        uint256 listingId = _createListing();
        uint256 jobId = _purchase(listingId);

        vm.prank(seller);
        market.markDelivered(jobId, "ipfs://deliverable");

        vm.prank(buyer);
        vm.expectRevert(bytes("not cancellable"));
        market.cancelJob(jobId);
    }

    function test_SellerRefundBuyer_PaidStatus() public {
        uint256 listingId = _createListing();
        uint256 jobId = _purchase(listingId);

        uint256 buyerBefore = clawd.balanceOf(buyer);

        vm.prank(seller);
        market.refundBuyer(jobId);

        assertEq(clawd.balanceOf(buyer) - buyerBefore, PRICE);
        assertEq(uint256(market.getJob(jobId).status), uint256(ClawdWorks.JobStatus.REFUNDED));
        assertEq(market.activeJobCount(seller), 0);
    }

    function test_SellerRefundBuyer_DeliveredStatus() public {
        uint256 listingId = _createListing();
        uint256 jobId = _purchase(listingId);

        vm.prank(seller);
        market.markDelivered(jobId, "ipfs://deliverable");

        uint256 buyerBefore = clawd.balanceOf(buyer);

        vm.prank(seller);
        market.refundBuyer(jobId);

        assertEq(clawd.balanceOf(buyer) - buyerBefore, PRICE);
        assertEq(uint256(market.getJob(jobId).status), uint256(ClawdWorks.JobStatus.REFUNDED));
    }

    function test_TimeoutClaimAfter7Days() public {
        uint256 listingId = _createListing();
        uint256 jobId = _purchase(listingId);

        vm.prank(seller);
        market.markDelivered(jobId, "ipfs://deliverable");

        vm.prank(seller);
        vm.expectRevert(bytes("too soon"));
        market.claimTimeout(jobId);

        vm.warp(block.timestamp + 7 days + 1);

        uint256 sellerBefore = clawd.balanceOf(seller);
        vm.prank(seller);
        market.claimTimeout(jobId);

        assertEq(clawd.balanceOf(seller) - sellerBefore, (PRICE * 8000) / 10_000);
        assertEq(uint256(market.getJob(jobId).status), uint256(ClawdWorks.JobStatus.COMPLETED));
    }

    function test_QueueLimitEnforced_Default5() public {
        uint256 listingId = _createListing();
        for (uint256 i = 0; i < 5; i++) {
            _purchase(listingId);
        }

        vm.prank(buyer);
        vm.expectRevert(bytes("queue full"));
        market.purchase(listingId, "ipfs://note");

        vm.prank(seller);
        market.setMaxActiveJobs(10);

        _purchase(listingId);
        assertEq(market.activeJobCount(seller), 6);
    }

    function test_ReviewSubmissionAndResponse() public {
        uint256 listingId = _createListing();
        uint256 jobId = _purchase(listingId);

        vm.prank(seller);
        market.markDelivered(jobId, "ipfs://deliverable");

        vm.prank(buyer);
        market.confirmReceipt(jobId);

        vm.prank(buyer);
        uint256 reviewId = market.submitReview(jobId, 5, "ipfs://review");

        ClawdWorks.Review memory r = market.getReview(reviewId);
        assertEq(r.stars, 5);
        assertEq(r.jobId, jobId);

        vm.prank(buyer);
        vm.expectRevert(bytes("already reviewed"));
        market.submitReview(jobId, 4, "ipfs://review2");

        vm.prank(seller);
        market.respondToReview(reviewId, "ipfs://response");

        ClawdWorks.Review memory r2 = market.getReview(reviewId);
        assertEq(r2.sellerResponseIpfsHash, "ipfs://response");

        vm.prank(seller);
        vm.expectRevert(bytes("already responded"));
        market.respondToReview(reviewId, "ipfs://response2");
    }

    function test_SellerReviewBuyer() public {
        uint256 listingId = _createListing();
        uint256 jobId = _purchase(listingId);

        vm.prank(seller);
        market.markDelivered(jobId, "ipfs://deliverable");

        vm.prank(buyer);
        market.confirmReceipt(jobId);

        vm.prank(seller);
        uint256 srId = market.submitSellerReview(jobId, 4, "ipfs://seller-review");

        ClawdWorks.SellerReview memory sr = market.getSellerReview(srId);
        assertEq(sr.stars, 4);
        assertEq(sr.jobId, jobId);
        assertEq(market.sellerReviewByJob(jobId), srId);

        vm.prank(seller);
        vm.expectRevert(bytes("already reviewed"));
        market.submitSellerReview(jobId, 5, "ipfs://seller-review2");
    }

    function test_SellerReviewRequiresCompleted() public {
        uint256 listingId = _createListing();
        uint256 jobId = _purchase(listingId);

        vm.prank(seller);
        vm.expectRevert(bytes("not completed"));
        market.submitSellerReview(jobId, 5, "ipfs://review");
    }

    function test_WhitelistedBuyerOnlyAllowsThem() public {
        vm.prank(seller);
        uint256 listingId = market.createListing("private", "Private service", PRICE, 5, 0, buyer);

        clawd.mint(stranger, PRICE);
        vm.prank(stranger);
        clawd.approve(address(market), PRICE);

        vm.prank(stranger);
        vm.expectRevert(bytes("not whitelisted"));
        market.purchase(listingId, "ipfs://note");

        _purchase(listingId);
    }

    function test_ExpressSellerInterest() public {
        vm.prank(stranger);
        uint256 id = market.expressSellerInterest("ipfs://pitch");
        ClawdWorks.SellerInterest memory si = market.getSellerInterest(id);
        assertEq(si.wallet, stranger);
        assertEq(si.pitchIpfsHash, "ipfs://pitch");
        assertEq(market.sellerInterestCount(), 1);
    }
}
