# Feature Plan — Job #199

## Changes

### Contract (ClawdWorks.sol)
1. Remove Ownable2Step + all owner machinery (no owner, immutable)
2. Remove `openMarketplace` flag — market always open, anyone can list
3. Remove `onlySeller` modifier — createListing open to all
4. Rename `descriptionIpfsHash` → `description` (plain text OR IPFS hash)
5. Add `cancelJob(uint256 jobId)` — buyer cancels PAID job (refund)
6. Add `refundBuyer(uint256 jobId)` — seller voluntarily refunds PAID/DELIVERED job
7. Remove full dispute system: `disputeJob`, `resolveDispute`, `claimDisputeRefund`, `DISPUTED` status, `disputedAt/disputeReasonIpfsHash/disputeResolutionIpfsHash` job fields
8. Remove `pause/unpause`, `proposeTreasuryChange/executeTreasuryChange`, `pendingTreasury`
9. Add `SellerReview` struct + `submitSellerReview(jobId, stars, hash)` — seller rates buyer on COMPLETED jobs
10. Add `sellerReviewByJob` mapping + `getSellerReview` getter

### Tests (ClawdWorks.t.sol)
- Remove setUp call to setOpenMarketplace (no longer needed)
- Remove owner/dispute/pause/treasury tests
- Add tests: cancelJob, refundBuyer, submitSellerReview

### Frontend
- deployedContracts.ts: regenerate ABI from compile output
- CreateListingForm: "Description" field (not "IPFS hash"), show pros/cons note
- DashboardView: remove owner gate → show to any connected wallet
- BuyerJobCard: remove dispute UI, add "Cancel" button for PAID jobs
- SellerJobCard: add "Refund buyer" button for PAID/DELIVERED, add seller review form for COMPLETED
- JobsView: remove "Disputed" tab (status no longer exists)
- clawdworks.ts: remove JOB_STATUS.DISPUTED
- how-it-works/page.tsx: expand FAQ for new mechanics (open seller, cancel, refund)
