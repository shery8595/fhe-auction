import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import {
    deployFirstPriceAuction,
    getTestAccounts,
    advanceTimeByMinutes,
    advanceTime,
    createEncryptedBid,
    DEFAULT_DURATION_MINUTES,
    DEFAULT_MINIMUM_BID,
} from "./helpers";

/**
 * FirstPriceAuction Tests (FHEVM v0.9) - Comprehensive Coverage
 * 
 * Tests basic auction functionality without decryption.
 * Decryption tests are excluded as they require KMS processing.
 */

describe("FirstPriceAuction", function () {
    let auction: any;
    let seller: any;
    let bidder1: any;
    let bidder2: any;
    let bidder3: any;
    let admin: any;

    beforeEach(async function () {
        const accounts = await getTestAccounts();
        seller = accounts.seller;
        bidder1 = accounts.bidder1;
        bidder2 = accounts.bidder2;
        bidder3 = accounts.bidder3;
        admin = accounts.admin;

        auction = await deployFirstPriceAuction(
            "Test First Price Auction",
            "A sealed-bid auction where highest bidder wins",
            DEFAULT_DURATION_MINUTES,
            DEFAULT_MINIMUM_BID,
            seller.address
        );
    });

    describe("Deployment", function () {
        it("Should deploy with correct seller", async function () {
            expect(await auction.seller()).to.equal(seller.address);
        });

        it("Should deploy with correct minimum bid", async function () {
            expect(await auction.minimumBid()).to.equal(DEFAULT_MINIMUM_BID);
        });

        it("Should start with zero bidders", async function () {
            await expect(auction.bidders(0)).to.be.reverted;
        });

        it("Should not be ended initially", async function () {
            expect(await auction.auctionEnded()).to.be.false;
        });

        it("Should set correct auction title", async function () {
            expect(await auction.auctionTitle()).to.equal("Test First Price Auction");
        });

        it("Should set correct auction description", async function () {
            expect(await auction.auctionDescription()).to.equal("A sealed-bid auction where highest bidder wins");
        });

        it("Should initialize winner as zero address", async function () {
            expect(await auction.winner()).to.equal(ethers.ZeroAddress);
        });

        it("Should not have winner revealed initially", async function () {
            expect(await auction.winnerRevealed()).to.be.false;
        });
    });

    describe("Auction State", function () {
        it("Should report active status correctly", async function () {
            expect(await auction.isActive()).to.be.true;
        });

        it("Should have valid end time", async function () {
            const endTime = await auction.auctionEndTime();
            const startTime = await auction.auctionStartTime();
            expect(endTime).to.be.greaterThan(startTime);
        });

        it("Should report not ended initially", async function () {
            expect(await auction.auctionEnded()).to.be.false;
        });

        it("Should become inactive after time expires", async function () {
            await advanceTimeByMinutes(DEFAULT_DURATION_MINUTES + 1);
            expect(await auction.isActive()).to.be.false;
        });

    });

    describe("Bidding", function () {
        it("Should reject bid below minimum escrow", async function () {
            const lowValue = DEFAULT_MINIMUM_BID - 1n;

            const encryptedBid = await createEncryptedBid(
                await auction.getAddress(),
                bidder1.address,
                200
            );

            await expect(
                auction.connect(bidder1).placeBid(
                    encryptedBid.handle,
                    encryptedBid.proof,
                    { value: lowValue }
                )
            ).to.be.revertedWith("Escrow must meet minimum bid");
        });

        it("Should accept valid bid with sufficient escrow", async function () {
            const bidValue = DEFAULT_MINIMUM_BID;

            const encryptedBid = await createEncryptedBid(
                await auction.getAddress(),
                bidder1.address,
                200
            );

            const tx = await auction.connect(bidder1).placeBid(
                encryptedBid.handle,
                encryptedBid.proof,
                { value: bidValue }
            );

            await expect(tx).to.emit(auction, "BidPlaced");
        });

        it("Should record bidder after placing bid", async function () {
            const encryptedBid = await createEncryptedBid(
                await auction.getAddress(),
                bidder1.address,
                200
            );

            await auction.connect(bidder1).placeBid(
                encryptedBid.handle,
                encryptedBid.proof,
                { value: DEFAULT_MINIMUM_BID }
            );

            const firstBidder = await auction.bidders(0);
            expect(firstBidder).to.equal(bidder1.address);
        });

        it("Should reject bid after auction expires", async function () {
            await advanceTimeByMinutes(DEFAULT_DURATION_MINUTES + 1);

            const encryptedBid = await createEncryptedBid(
                await auction.getAddress(),
                bidder2.address,
                200
            );

            await expect(
                auction.connect(bidder2).placeBid(
                    encryptedBid.handle,
                    encryptedBid.proof,
                    { value: DEFAULT_MINIMUM_BID }
                )
            ).to.be.revertedWith("Auction time expired");
        });

        it("Should allow multiple bidders", async function () {
            const encryptedBid1 = await createEncryptedBid(
                await auction.getAddress(),
                bidder1.address,
                200
            );
            const encryptedBid2 = await createEncryptedBid(
                await auction.getAddress(),
                bidder2.address,
                300
            );

            await auction.connect(bidder1).placeBid(encryptedBid1.handle, encryptedBid1.proof, { value: DEFAULT_MINIMUM_BID });
            await auction.connect(bidder2).placeBid(encryptedBid2.handle, encryptedBid2.proof, { value: DEFAULT_MINIMUM_BID });

            const firstBidder = await auction.bidders(0);
            const secondBidder = await auction.bidders(1);
            expect(firstBidder).to.equal(bidder1.address);
            expect(secondBidder).to.equal(bidder2.address);
        });

        it("Should allow bid updates", async function () {
            const encryptedBid1 = await createEncryptedBid(
                await auction.getAddress(),
                bidder1.address,
                200
            );

            await auction.connect(bidder1).placeBid(
                encryptedBid1.handle,
                encryptedBid1.proof,
                { value: DEFAULT_MINIMUM_BID }
            );

            const encryptedBid2 = await createEncryptedBid(
                await auction.getAddress(),
                bidder1.address,
                300
            );

            await auction.connect(bidder1).placeBid(
                encryptedBid2.handle,
                encryptedBid2.proof,
                { value: DEFAULT_MINIMUM_BID * 2n }
            );

            const firstBidder = await auction.bidders(0);
            expect(firstBidder).to.equal(bidder1.address);
            await expect(auction.bidders(1)).to.be.reverted;
        });

        it("Should accept bid with escrow higher than minimum", async function () {
            const encryptedBid = await createEncryptedBid(
                await auction.getAddress(),
                bidder1.address,
                200
            );

            const tx = await auction.connect(bidder1).placeBid(
                encryptedBid.handle,
                encryptedBid.proof,
                { value: DEFAULT_MINIMUM_BID * 5n }
            );

            await expect(tx).to.emit(auction, "BidPlaced");
        });

        it("Should store escrow amount correctly", async function () {
            const escrowAmount = DEFAULT_MINIMUM_BID * 3n;
            const encryptedBid = await createEncryptedBid(
                await auction.getAddress(),
                bidder1.address,
                200
            );

            await auction.connect(bidder1).placeBid(
                encryptedBid.handle,
                encryptedBid.proof,
                { value: escrowAmount }
            );

            const bid = await auction.bids(bidder1.address);
            expect(bid.escrowAmount).to.equal(escrowAmount);
        });

        it("Should mark bid as existing", async function () {
            const encryptedBid = await createEncryptedBid(
                await auction.getAddress(),
                bidder1.address,
                200
            );

            await auction.connect(bidder1).placeBid(
                encryptedBid.handle,
                encryptedBid.proof,
                { value: DEFAULT_MINIMUM_BID }
            );

            const bid = await auction.bids(bidder1.address);
            expect(bid.exists).to.be.true;
        });

        it("Should allow three different bidders", async function () {
            const bid1 = await createEncryptedBid(await auction.getAddress(), bidder1.address, 200);
            const bid2 = await createEncryptedBid(await auction.getAddress(), bidder2.address, 300);
            const bid3 = await createEncryptedBid(await auction.getAddress(), bidder3.address, 400);

            await auction.connect(bidder1).placeBid(bid1.handle, bid1.proof, { value: DEFAULT_MINIMUM_BID });
            await auction.connect(bidder2).placeBid(bid2.handle, bid2.proof, { value: DEFAULT_MINIMUM_BID });
            await auction.connect(bidder3).placeBid(bid3.handle, bid3.proof, { value: DEFAULT_MINIMUM_BID });

            expect(await auction.bidders(0)).to.equal(bidder1.address);
            expect(await auction.bidders(1)).to.equal(bidder2.address);
            expect(await auction.bidders(2)).to.equal(bidder3.address);
        });

        it("Should refund old escrow when updating bid", async function () {
            const encryptedBid1 = await createEncryptedBid(
                await auction.getAddress(),
                bidder1.address,
                200
            );

            await auction.connect(bidder1).placeBid(
                encryptedBid1.handle,
                encryptedBid1.proof,
                { value: DEFAULT_MINIMUM_BID }
            );

            const balanceBefore = await ethers.provider.getBalance(bidder1.address);

            const encryptedBid2 = await createEncryptedBid(
                await auction.getAddress(),
                bidder1.address,
                300
            );

            const tx = await auction.connect(bidder1).placeBid(
                encryptedBid2.handle,
                encryptedBid2.proof,
                { value: DEFAULT_MINIMUM_BID * 2n }
            );

            const receipt = await tx.wait();
            const gasUsed = BigInt(receipt.gasUsed) * BigInt(receipt.gasPrice);
            const balanceAfter = await ethers.provider.getBalance(bidder1.address);

            // Should have received refund minus new escrow and gas
            expect(balanceAfter).to.be.greaterThan(balanceBefore - (DEFAULT_MINIMUM_BID * 2n) - gasUsed);
        });
    });

    describe("End Auction", function () {
        it("Should not end auction before time expires", async function () {
            await expect(auction.endAuction()).to.be.revertedWith("Auction still active");
        });

        it("Should end auction after time expires with bids", async function () {
            const encryptedBid = await createEncryptedBid(
                await auction.getAddress(),
                bidder1.address,
                200
            );

            await auction.connect(bidder1).placeBid(
                encryptedBid.handle,
                encryptedBid.proof,
                { value: DEFAULT_MINIMUM_BID }
            );

            await advanceTimeByMinutes(DEFAULT_DURATION_MINUTES + 1);

            const tx = await auction.endAuction();
            await expect(tx).to.emit(auction, "AuctionEnded");

            expect(await auction.auctionEnded()).to.be.true;
        });

        it("Should not allow ending twice", async function () {
            const encryptedBid = await createEncryptedBid(
                await auction.getAddress(),
                bidder1.address,
                200
            );

            await auction.connect(bidder1).placeBid(encryptedBid.handle, encryptedBid.proof, { value: DEFAULT_MINIMUM_BID });

            await advanceTimeByMinutes(DEFAULT_DURATION_MINUTES + 1);
            await auction.endAuction();

            await expect(auction.endAuction()).to.be.revertedWith("Already ended");
        });

        it("Should handle auction with no bids", async function () {
            await advanceTimeByMinutes(DEFAULT_DURATION_MINUTES + 1);

            const tx = await auction.endAuction();
            await expect(tx).to.emit(auction, "AuctionEnded");
        });

        it("Should be callable by anyone after time expires", async function () {
            const encryptedBid = await createEncryptedBid(
                await auction.getAddress(),
                bidder1.address,
                200
            );

            await auction.connect(bidder1).placeBid(encryptedBid.handle, encryptedBid.proof, { value: DEFAULT_MINIMUM_BID });
            await advanceTimeByMinutes(DEFAULT_DURATION_MINUTES + 1);

            const tx = await auction.connect(bidder2).endAuction();
            await expect(tx).to.emit(auction, "AuctionEnded");
        });

        it("Should set auctionEnded flag", async function () {
            await advanceTimeByMinutes(DEFAULT_DURATION_MINUTES + 1);
            await auction.endAuction();

            expect(await auction.auctionEnded()).to.be.true;
        });

    });

    describe("View Functions", function () {
        it("Should return correct bidder list", async function () {
            const encryptedBid1 = await createEncryptedBid(
                await auction.getAddress(),
                bidder1.address,
                200
            );
            const encryptedBid2 = await createEncryptedBid(
                await auction.getAddress(),
                bidder2.address,
                300
            );

            await auction.connect(bidder1).placeBid(encryptedBid1.handle, encryptedBid1.proof, { value: DEFAULT_MINIMUM_BID });
            await auction.connect(bidder2).placeBid(encryptedBid2.handle, encryptedBid2.proof, { value: DEFAULT_MINIMUM_BID });

            const firstBidder = await auction.bidders(0);
            const secondBidder = await auction.bidders(1);
            expect(firstBidder).to.equal(bidder1.address);
            expect(secondBidder).to.equal(bidder2.address);
        });

        it("Should check if address has bid", async function () {
            const encryptedBid = await createEncryptedBid(
                await auction.getAddress(),
                bidder1.address,
                200
            );

            await auction.connect(bidder1).placeBid(
                encryptedBid.handle,
                encryptedBid.proof,
                { value: DEFAULT_MINIMUM_BID }
            );

            const bid1 = await auction.bids(bidder1.address);
            expect(bid1.exists).to.be.true;

            const bid2 = await auction.bids(bidder2.address);
            expect(bid2.exists).to.be.false;
        });

        it("Should return zero escrow for non-bidder", async function () {
            const bid = await auction.bids(bidder1.address);
            expect(bid.escrowAmount).to.equal(0);
        });

        it("Should return correct escrow amount for bidder", async function () {
            const escrowAmount = DEFAULT_MINIMUM_BID * 2n;
            const encryptedBid = await createEncryptedBid(
                await auction.getAddress(),
                bidder1.address,
                200
            );

            await auction.connect(bidder1).placeBid(
                encryptedBid.handle,
                encryptedBid.proof,
                { value: escrowAmount }
            );

            const bid = await auction.bids(bidder1.address);
            expect(bid.escrowAmount).to.equal(escrowAmount);
        });
    });

    describe("NFT Support", function () {
        it("Should deploy without NFT", async function () {
            expect(await auction.nftContract()).to.equal(ethers.ZeroAddress);
            expect(await auction.nftTokenId()).to.equal(0);
        });

        it("Should deploy with NFT details", async function () {
            const mockNFT = "0x1234567890123456789012345678901234567890";
            const tokenId = 42n;

            const nftAuction = await deployFirstPriceAuction(
                "NFT Auction",
                "Auction with NFT",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                seller.address,
                mockNFT,
                tokenId
            );

            expect(await nftAuction.nftContract()).to.equal(mockNFT);
            expect(await nftAuction.nftTokenId()).to.equal(tokenId);
        });

        it("Should set hasNFT flag correctly when NFT provided", async function () {
            const mockNFT = "0x1234567890123456789012345678901234567890";
            const tokenId = 42n;

            const nftAuction = await deployFirstPriceAuction(
                "NFT Auction",
                "Auction with NFT",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                seller.address,
                mockNFT,
                tokenId
            );

            expect(await nftAuction.hasNFT()).to.be.true;
        });

        it("Should not set hasNFT flag when no NFT", async function () {
            expect(await auction.hasNFT()).to.be.false;
        });

        it("Should initialize nftClaimed as false", async function () {
            expect(await auction.nftClaimed()).to.be.false;
        });

        it("Should initialize nftDeposited as false", async function () {
            expect(await auction.nftDeposited()).to.be.false;
        });
    });

    describe("Edge Cases", function () {
        it("Should handle exactly minimum bid escrow", async function () {
            const encryptedBid = await createEncryptedBid(
                await auction.getAddress(),
                bidder1.address,
                200
            );

            const tx = await auction.connect(bidder1).placeBid(
                encryptedBid.handle,
                encryptedBid.proof,
                { value: DEFAULT_MINIMUM_BID }
            );

            await expect(tx).to.emit(auction, "BidPlaced");
        });

        it("Should handle auction ending exactly at expiry time", async function () {
            await advanceTimeByMinutes(DEFAULT_DURATION_MINUTES);

            const tx = await auction.endAuction();
            await expect(tx).to.emit(auction, "AuctionEnded");
        });

        it("Should handle very large escrow amounts", async function () {
            const largeEscrow = ethers.parseEther("100");
            const encryptedBid = await createEncryptedBid(
                await auction.getAddress(),
                bidder1.address,
                200
            );

            const tx = await auction.connect(bidder1).placeBid(
                encryptedBid.handle,
                encryptedBid.proof,
                { value: largeEscrow }
            );

            await expect(tx).to.emit(auction, "BidPlaced");
        });

        it("Should handle seller as bidder", async function () {
            const encryptedBid = await createEncryptedBid(
                await auction.getAddress(),
                seller.address,
                200
            );

            // Seller can bid on their own auction (not restricted)
            const tx = await auction.connect(seller).placeBid(
                encryptedBid.handle,
                encryptedBid.proof,
                { value: DEFAULT_MINIMUM_BID }
            );

            await expect(tx).to.emit(auction, "BidPlaced");
        });
    });

    describe("Gas and Performance", function () {
        it("Should handle 10 bidders efficiently", async function () {
            const signers = await ethers.getSigners();

            for (let i = 0; i < 10; i++) {
                const encryptedBid = await createEncryptedBid(
                    await auction.getAddress(),
                    signers[i].address,
                    200 + i * 10
                );

                await auction.connect(signers[i]).placeBid(
                    encryptedBid.handle,
                    encryptedBid.proof,
                    { value: DEFAULT_MINIMUM_BID }
                );
            }

            expect(await auction.bidders(9)).to.equal(signers[9].address);
        });
    });
});
