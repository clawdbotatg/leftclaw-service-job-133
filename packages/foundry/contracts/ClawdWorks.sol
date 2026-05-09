// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ClawdWorks
 * @notice CLAWD-native onchain services marketplace with escrow, disputes,
 *         reviews, and a treasury timelock. Payments split 80/10/10 between
 *         seller / burn / treasury on completion.
 */
contract ClawdWorks is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant SELLER_BPS = 8000; // 80%
    uint256 public constant BURN_BPS = 1000; // 10%
    uint256 public constant TREASURY_BPS = 1000; // 10%
    uint256 public constant BPS_DENOMINATOR = 10_000;

    uint256 public constant DELIVERY_TIMEOUT = 7 days;
    uint256 public constant DISPUTE_AUTO_REFUND = 14 days;
    uint256 public constant TREASURY_TIMELOCK = 7 days;

    uint256 public constant DEFAULT_MAX_ACTIVE_JOBS = 5;

    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    enum JobStatus {
        PAID,
        DELIVERED,
        COMPLETED,
        DISPUTED,
        REFUNDED
    }

    struct Listing {
        uint256 id;
        address seller;
        string title;
        string descriptionIpfsHash;
        uint256 priceCLAWD;
        uint256 deliveryDaysEstimate;
        uint256 maxConcurrentOverride; // 0 => use seller global cap
        address whitelistedBuyer; // address(0) => open
        bool active;
    }

    struct Job {
        uint256 id;
        uint256 listingId;
        address buyer;
        address seller;
        uint256 amountPaid;
        string buyerNoteIpfsHash;
        string deliverableIpfsHash;
        uint256 deliveredAt;
        uint256 disputedAt;
        string disputeReasonIpfsHash;
        string disputeResolutionIpfsHash;
        JobStatus status;
    }

    struct Review {
        uint256 id;
        uint256 jobId;
        uint8 stars; // 1-5
        string reviewIpfsHash;
        string sellerResponseIpfsHash;
        uint256 timestamp;
    }

    struct SellerInterest {
        uint256 id;
        address wallet;
        string pitchIpfsHash;
        uint256 timestamp;
    }

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    IERC20 public immutable clawd;
    address public treasury;

    bool public openMarketplace;
    bool public paused;

    address public pendingTreasury;
    uint256 public pendingTreasuryAt;

    uint256 public listingCount;
    uint256 public jobCount;
    uint256 public reviewCount;
    uint256 public sellerInterestCount;

    mapping(address => uint256[]) public sellerListings;
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Job) public jobs;
    mapping(uint256 => Review) public reviews;
    mapping(uint256 => SellerInterest) public sellerInterestById;

    mapping(uint256 => uint256) public reviewByJob; // jobId => reviewId (0 = none)
    mapping(address => uint256) public activeJobCount;
    mapping(address => uint256) public maxActiveJobs;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event ListingCreated(uint256 indexed id, address indexed seller, string title, uint256 priceCLAWD);
    event ListingUpdated(uint256 indexed id);
    event ListingDeactivated(uint256 indexed id);
    event JobPurchased(
        uint256 indexed jobId, uint256 indexed listingId, address indexed buyer, address seller, uint256 amountPaid
    );
    event JobDelivered(uint256 indexed jobId, string deliverableIpfsHash);
    event JobCompleted(uint256 indexed jobId);
    event JobRefunded(uint256 indexed jobId);
    event JobTimeoutClaimed(uint256 indexed jobId);
    event JobDisputed(uint256 indexed jobId, address buyer, string reasonIpfsHash);
    event JobResolved(uint256 indexed jobId, bool refundedBuyer, string resolutionIpfsHash);
    event JobAutoRefunded(uint256 indexed jobId);
    event ReviewSubmitted(uint256 indexed reviewId, uint256 indexed jobId, uint8 stars);
    event ReviewResponded(uint256 indexed reviewId);
    event SellerInterestExpressed(uint256 indexed id, address indexed wallet);
    event TreasuryChangeProposed(address indexed newTreasury, uint256 executeAt);
    event TreasuryChanged(address indexed newTreasury);
    event MarketplaceOpenChanged(bool open);
    event Paused();
    event Unpaused();
    event MaxActiveJobsSet(address indexed seller, uint256 cap);

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlySeller() {
        if (!openMarketplace) {
            require(msg.sender == owner(), "not operator");
        }
        _;
    }

    modifier onlyListingSeller(uint256 listingId) {
        require(listings[listingId].seller == msg.sender, "not seller");
        _;
    }

    modifier onlyJobSeller(uint256 jobId) {
        require(jobs[jobId].seller == msg.sender, "not seller");
        _;
    }

    modifier onlyJobBuyer(uint256 jobId) {
        require(jobs[jobId].buyer == msg.sender, "not buyer");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "paused");
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address _clawd, address initialOwner) Ownable(initialOwner) {
        require(_clawd != address(0), "clawd zero");
        clawd = IERC20(_clawd);
        treasury = 0x90eF2A9211A3E7CE788561E5af54C76B0Fa3aEd0;
    }

    // -------------------------------------------------------------------------
    // Listing management
    // -------------------------------------------------------------------------

    function createListing(
        string calldata title,
        string calldata descIpfsHash,
        uint256 priceCLAWD,
        uint256 deliveryDays,
        uint256 maxConcurrentOverride,
        address whitelistedBuyer
    ) external onlySeller returns (uint256) {
        require(bytes(title).length > 0, "title empty");
        require(priceCLAWD > 0, "price zero");

        listingCount += 1;
        uint256 id = listingCount;

        listings[id] = Listing({
            id: id,
            seller: msg.sender,
            title: title,
            descriptionIpfsHash: descIpfsHash,
            priceCLAWD: priceCLAWD,
            deliveryDaysEstimate: deliveryDays,
            maxConcurrentOverride: maxConcurrentOverride,
            whitelistedBuyer: whitelistedBuyer,
            active: true
        });

        sellerListings[msg.sender].push(id);

        emit ListingCreated(id, msg.sender, title, priceCLAWD);
        return id;
    }

    function updateListing(
        uint256 id,
        string calldata title,
        string calldata descIpfsHash,
        uint256 priceCLAWD,
        uint256 deliveryDays,
        uint256 maxConcurrentOverride,
        address whitelistedBuyer
    ) external onlyListingSeller(id) {
        require(bytes(title).length > 0, "title empty");
        require(priceCLAWD > 0, "price zero");

        Listing storage l = listings[id];
        l.title = title;
        l.descriptionIpfsHash = descIpfsHash;
        l.priceCLAWD = priceCLAWD;
        l.deliveryDaysEstimate = deliveryDays;
        l.maxConcurrentOverride = maxConcurrentOverride;
        l.whitelistedBuyer = whitelistedBuyer;

        emit ListingUpdated(id);
    }

    function deactivateListing(uint256 id) external onlyListingSeller(id) {
        listings[id].active = false;
        emit ListingDeactivated(id);
    }

    function setMaxActiveJobs(uint256 cap) external {
        require(cap > 0, "cap zero");
        maxActiveJobs[msg.sender] = cap;
        emit MaxActiveJobsSet(msg.sender, cap);
    }

    // -------------------------------------------------------------------------
    // Purchase & escrow
    // -------------------------------------------------------------------------

    function purchase(uint256 listingId, string calldata buyerNoteIpfsHash)
        external
        nonReentrant
        whenNotPaused
        returns (uint256)
    {
        Listing memory l = listings[listingId];
        require(l.id != 0, "no listing");
        require(l.active, "inactive");
        require(l.seller != msg.sender, "self buy");
        if (l.whitelistedBuyer != address(0)) {
            require(msg.sender == l.whitelistedBuyer, "not whitelisted");
        }

        uint256 cap = l.maxConcurrentOverride;
        if (cap == 0) {
            cap = maxActiveJobs[l.seller];
            if (cap == 0) cap = DEFAULT_MAX_ACTIVE_JOBS;
        }
        require(activeJobCount[l.seller] < cap, "queue full");

        // Effects
        jobCount += 1;
        uint256 jobId = jobCount;

        jobs[jobId] = Job({
            id: jobId,
            listingId: listingId,
            buyer: msg.sender,
            seller: l.seller,
            amountPaid: l.priceCLAWD,
            buyerNoteIpfsHash: buyerNoteIpfsHash,
            deliverableIpfsHash: "",
            deliveredAt: 0,
            disputedAt: 0,
            disputeReasonIpfsHash: "",
            disputeResolutionIpfsHash: "",
            status: JobStatus.PAID
        });

        activeJobCount[l.seller] += 1;

        // Interactions
        clawd.safeTransferFrom(msg.sender, address(this), l.priceCLAWD);

        emit JobPurchased(jobId, listingId, msg.sender, l.seller, l.priceCLAWD);
        return jobId;
    }

    function markDelivered(uint256 jobId, string calldata deliverableIpfsHash)
        external
        nonReentrant
        onlyJobSeller(jobId)
    {
        Job storage j = jobs[jobId];
        require(j.status == JobStatus.PAID, "not paid");
        require(bytes(deliverableIpfsHash).length > 0, "hash empty");

        j.deliverableIpfsHash = deliverableIpfsHash;
        j.deliveredAt = block.timestamp;
        j.status = JobStatus.DELIVERED;

        emit JobDelivered(jobId, deliverableIpfsHash);
    }

    function confirmReceipt(uint256 jobId) external nonReentrant onlyJobBuyer(jobId) {
        Job storage j = jobs[jobId];
        require(j.status == JobStatus.DELIVERED, "not delivered");
        _release(jobId);
        emit JobCompleted(jobId);
    }

    function claimTimeout(uint256 jobId) external nonReentrant onlyJobSeller(jobId) {
        Job storage j = jobs[jobId];
        require(j.status == JobStatus.DELIVERED, "not delivered");
        require(j.disputedAt == 0, "active dispute");
        require(block.timestamp >= j.deliveredAt + DELIVERY_TIMEOUT, "too soon");
        _release(jobId);
        emit JobTimeoutClaimed(jobId);
    }

    // -------------------------------------------------------------------------
    // Disputes
    // -------------------------------------------------------------------------

    function disputeJob(uint256 jobId, string calldata reasonIpfsHash) external onlyJobBuyer(jobId) {
        Job storage j = jobs[jobId];
        require(j.status == JobStatus.DELIVERED, "not delivered");
        require(block.timestamp <= j.deliveredAt + DELIVERY_TIMEOUT, "window closed");
        require(bytes(reasonIpfsHash).length > 0, "reason empty");

        j.disputedAt = block.timestamp;
        j.disputeReasonIpfsHash = reasonIpfsHash;
        j.status = JobStatus.DISPUTED;

        emit JobDisputed(jobId, msg.sender, reasonIpfsHash);
    }

    function resolveDispute(uint256 jobId, bool refundBuyer, string calldata resolutionIpfsHash)
        external
        nonReentrant
        onlyOwner
    {
        Job storage j = jobs[jobId];
        require(j.status == JobStatus.DISPUTED, "not disputed");

        j.disputeResolutionIpfsHash = resolutionIpfsHash;

        if (refundBuyer) {
            _refund(jobId);
        } else {
            _release(jobId);
        }

        emit JobResolved(jobId, refundBuyer, resolutionIpfsHash);
    }

    function claimDisputeRefund(uint256 jobId) external nonReentrant onlyJobBuyer(jobId) {
        Job storage j = jobs[jobId];
        require(j.status == JobStatus.DISPUTED, "not disputed");
        require(bytes(j.disputeResolutionIpfsHash).length == 0, "resolved");
        require(block.timestamp >= j.disputedAt + DISPUTE_AUTO_REFUND, "too soon");
        _refund(jobId);
        emit JobAutoRefunded(jobId);
    }

    // -------------------------------------------------------------------------
    // Reviews
    // -------------------------------------------------------------------------

    function submitReview(uint256 jobId, uint8 stars, string calldata reviewIpfsHash)
        external
        onlyJobBuyer(jobId)
        returns (uint256)
    {
        Job storage j = jobs[jobId];
        require(j.status == JobStatus.COMPLETED, "not completed");
        require(reviewByJob[jobId] == 0, "already reviewed");
        require(stars >= 1 && stars <= 5, "stars 1-5");
        require(bytes(reviewIpfsHash).length > 0, "hash empty");

        reviewCount += 1;
        uint256 id = reviewCount;

        reviews[id] = Review({
            id: id,
            jobId: jobId,
            stars: stars,
            reviewIpfsHash: reviewIpfsHash,
            sellerResponseIpfsHash: "",
            timestamp: block.timestamp
        });

        reviewByJob[jobId] = id;

        emit ReviewSubmitted(id, jobId, stars);
        return id;
    }

    function respondToReview(uint256 reviewId, string calldata responseIpfsHash) external {
        Review storage r = reviews[reviewId];
        require(r.id != 0, "no review");
        Job storage j = jobs[r.jobId];
        require(j.seller == msg.sender, "not seller");
        require(bytes(r.sellerResponseIpfsHash).length == 0, "already responded");
        require(bytes(responseIpfsHash).length > 0, "hash empty");

        r.sellerResponseIpfsHash = responseIpfsHash;
        emit ReviewResponded(reviewId);
    }

    // -------------------------------------------------------------------------
    // Seller interest
    // -------------------------------------------------------------------------

    function expressSellerInterest(string calldata pitchIpfsHash) external returns (uint256) {
        require(bytes(pitchIpfsHash).length > 0, "hash empty");

        sellerInterestCount += 1;
        uint256 id = sellerInterestCount;

        sellerInterestById[id] = SellerInterest({
            id: id,
            wallet: msg.sender,
            pitchIpfsHash: pitchIpfsHash,
            timestamp: block.timestamp
        });

        emit SellerInterestExpressed(id, msg.sender);
        return id;
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    function setOpenMarketplace(bool open) external onlyOwner {
        openMarketplace = open;
        emit MarketplaceOpenChanged(open);
    }

    function pause() external onlyOwner {
        paused = true;
        emit Paused();
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused();
    }

    function proposeTreasuryChange(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "zero");
        pendingTreasury = newTreasury;
        pendingTreasuryAt = block.timestamp;
        emit TreasuryChangeProposed(newTreasury, block.timestamp + TREASURY_TIMELOCK);
    }

    function executeTreasuryChange() external onlyOwner {
        require(pendingTreasury != address(0), "no pending");
        require(block.timestamp >= pendingTreasuryAt + TREASURY_TIMELOCK, "timelock");
        treasury = pendingTreasury;
        emit TreasuryChanged(pendingTreasury);
        pendingTreasury = address(0);
        pendingTreasuryAt = 0;
    }

    // -------------------------------------------------------------------------
    // Internal: settlement
    // -------------------------------------------------------------------------

    function _release(uint256 jobId) internal {
        Job storage j = jobs[jobId];
        uint256 amount = j.amountPaid;
        require(amount > 0, "zero amount");
        require(
            j.status == JobStatus.PAID || j.status == JobStatus.DELIVERED || j.status == JobStatus.DISPUTED,
            "bad status"
        );

        // Effects
        j.status = JobStatus.COMPLETED;
        if (activeJobCount[j.seller] > 0) {
            activeJobCount[j.seller] -= 1;
        }

        uint256 sellerAmount = (amount * SELLER_BPS) / BPS_DENOMINATOR;
        uint256 burnAmount = (amount * BURN_BPS) / BPS_DENOMINATOR;
        uint256 treasuryAmount = amount - sellerAmount - burnAmount; // remainder mitigates rounding

        // Interactions
        clawd.safeTransfer(j.seller, sellerAmount);
        clawd.safeTransfer(BURN_ADDRESS, burnAmount);
        clawd.safeTransfer(treasury, treasuryAmount);
    }

    function _refund(uint256 jobId) internal {
        Job storage j = jobs[jobId];
        uint256 amount = j.amountPaid;
        require(amount > 0, "zero amount");
        require(
            j.status == JobStatus.PAID || j.status == JobStatus.DELIVERED || j.status == JobStatus.DISPUTED,
            "bad status"
        );

        // Effects
        j.status = JobStatus.REFUNDED;
        if (activeJobCount[j.seller] > 0) {
            activeJobCount[j.seller] -= 1;
        }

        // Interactions
        clawd.safeTransfer(j.buyer, amount);
        emit JobRefunded(jobId);
    }

    // -------------------------------------------------------------------------
    // Getters
    // -------------------------------------------------------------------------

    function getListing(uint256 id) external view returns (Listing memory) {
        return listings[id];
    }

    function getJob(uint256 id) external view returns (Job memory) {
        return jobs[id];
    }

    function getReview(uint256 id) external view returns (Review memory) {
        return reviews[id];
    }

    function getSellerInterest(uint256 id) external view returns (SellerInterest memory) {
        return sellerInterestById[id];
    }

    function getListingsByIds(uint256[] calldata ids) external view returns (Listing[] memory result) {
        result = new Listing[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = listings[ids[i]];
        }
    }

    function getSellerListingIds(address seller) external view returns (uint256[] memory) {
        return sellerListings[seller];
    }

    function getJobsBySeller(address seller) external view returns (Job[] memory) {
        uint256 total = jobCount;
        uint256 n = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (jobs[i].seller == seller) n++;
        }
        Job[] memory result = new Job[](n);
        uint256 k = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (jobs[i].seller == seller) {
                result[k++] = jobs[i];
            }
        }
        return result;
    }

    function getJobsByBuyer(address buyer) external view returns (Job[] memory) {
        uint256 total = jobCount;
        uint256 n = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (jobs[i].buyer == buyer) n++;
        }
        Job[] memory result = new Job[](n);
        uint256 k = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (jobs[i].buyer == buyer) {
                result[k++] = jobs[i];
            }
        }
        return result;
    }

    function getReviewsByJob(uint256 jobId) external view returns (Review[] memory) {
        uint256 rid = reviewByJob[jobId];
        if (rid == 0) {
            return new Review[](0);
        }
        Review[] memory result = new Review[](1);
        result[0] = reviews[rid];
        return result;
    }

    function getSellerInterests(uint256 from, uint256 count) external view returns (SellerInterest[] memory) {
        uint256 total = sellerInterestCount;
        if (from == 0) from = 1;
        if (from > total) {
            return new SellerInterest[](0);
        }
        uint256 end = from + count - 1;
        if (end > total) end = total;
        uint256 n = end - from + 1;
        SellerInterest[] memory result = new SellerInterest[](n);
        for (uint256 i = 0; i < n; i++) {
            result[i] = sellerInterestById[from + i];
        }
        return result;
    }
}
