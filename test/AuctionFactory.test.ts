import { expect } from "chai";
import { ethers } from "hardhat";
import {
    deployAuctionFactory,
    deployFirstPriceAuction,
    getTestAccounts,
    DEFAULT_DURATION_MINUTES,
    DEFAULT_MINIMUM_BID,
} from "./helpers";

/**
 * AuctionFactory Tests (FHEVM v0.9) - Comprehensive Coverage
 * 
 * Tests factory functionality for auction request and registration.
 */

describe("AuctionFactory", function () {
    let factory: any;
    let deployer: any;
    let seller: any;
    let seller2: any;
    let admin: any;

    beforeEach(async function () {
        const accounts = await getTestAccounts();
        deployer = accounts.deployer;
        seller = accounts.seller;
        seller2 = accounts.bidder1; // Use as second seller
        admin = accounts.admin;

        factory = await deployAuctionFactory();
    });

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            expect(await factory.getAddress()).to.be.properAddress;
        });

        it("Should set deployer as owner", async function () {
            expect(await factory.owner()).to.equal(deployer.address);
        });

        it("Should start with no deployed auctions", async function () {
            const auctions = await factory.getDeployedAuctions();
            expect(auctions.length).to.equal(0);
        });

        it("Should start with no requests", async function () {
            await expect(factory.requests(0)).to.be.reverted;
        });

        it("Should initialize with empty active auctions", async function () {
            // Try to access first active auction - should revert if empty
            await expect(factory.activeAuctions(0)).to.be.reverted;
        });
    });

    describe("Submit Auction Request", function () {
        it("Should submit auction request successfully", async function () {
            const tx = await factory.connect(seller).submitAuctionRequest(
                "My First Auction",
                "Test auction description",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                ethers.ZeroAddress,
                0
            );

            await expect(tx).to.emit(factory, "AuctionRequested");

            const request = await factory.getRequest(0);
            expect(request.seller).to.equal(seller.address);
            expect(request.title).to.equal("My First Auction");
            expect(request.durationMinutes).to.equal(DEFAULT_DURATION_MINUTES);
            expect(request.minimumBid).to.equal(DEFAULT_MINIMUM_BID);
        });

        it("Should reject request with zero duration", async function () {
            await expect(
                factory.connect(seller).submitAuctionRequest(
                    "Invalid Auction",
                    "Should fail",
                    0,
                    DEFAULT_MINIMUM_BID,
                    ethers.ZeroAddress,
                    0
                )
            ).to.be.revertedWith("Duration required");
        });

        it("Should accept request with zero minimum bid", async function () {
            const tx = await factory.connect(seller).submitAuctionRequest(
                "Valid Auction",
                "No minimum",
                DEFAULT_DURATION_MINUTES,
                0,
                ethers.ZeroAddress,
                0
            );
            await expect(tx).to.emit(factory, "AuctionRequested");
        });

        it("Should track seller requests", async function () {
            await factory.connect(seller).submitAuctionRequest(
                "Auction 1",
                "First",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                ethers.ZeroAddress,
                0
            );

            await factory.connect(seller).submitAuctionRequest(
                "Auction 2",
                "Second",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                ethers.ZeroAddress,
                0
            );

            const sellerRequests = await factory.getRequestsBySeller(seller.address);
            expect(sellerRequests.length).to.equal(2);
        });

        it("Should reject request with empty title", async function () {
            await expect(
                factory.connect(seller).submitAuctionRequest(
                    "",
                    "Description",
                    DEFAULT_DURATION_MINUTES,
                    DEFAULT_MINIMUM_BID,
                    ethers.ZeroAddress,
                    0
                )
            ).to.be.revertedWith("Title required");
        });

        it("Should set request status to PENDING", async function () {
            await factory.connect(seller).submitAuctionRequest(
                "Test",
                "Desc",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                ethers.ZeroAddress,
                0
            );

            const request = await factory.getRequest(0);
            expect(request.status).to.equal(0); // RequestStatus.PENDING
        });

        it("Should set deployedAuction to zero address initially", async function () {
            await factory.connect(seller).submitAuctionRequest(
                "Test",
                "Desc",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                ethers.ZeroAddress,
                0
            );

            const request = await factory.getRequest(0);
            expect(request.deployedAuction).to.equal(ethers.ZeroAddress);
        });

        it("Should record creation timestamp", async function () {
            await factory.connect(seller).submitAuctionRequest(
                "Test",
                "Desc",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                ethers.ZeroAddress,
                0
            );

            const request = await factory.getRequest(0);
            expect(request.createdAt).to.be.greaterThan(0);
        });



        it("Should allow multiple sellers to submit requests", async function () {
            await factory.connect(seller).submitAuctionRequest(
                "Seller 1 Auction",
                "First seller",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                ethers.ZeroAddress,
                0
            );

            await factory.connect(seller2).submitAuctionRequest(
                "Seller 2 Auction",
                "Second seller",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                ethers.ZeroAddress,
                0
            );

            const request0 = await factory.getRequest(0);
            const request1 = await factory.getRequest(1);
            expect(request0.seller).to.equal(seller.address);
            expect(request1.seller).to.equal(seller2.address);
        });
    });

    describe("Register Auction", function () {
        beforeEach(async function () {
            await factory.connect(seller).submitAuctionRequest(
                "Test Auction",
                "Description",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                ethers.ZeroAddress,
                0
            );
        });

        it("Should register externally deployed auction", async function () {
            const auction = await deployFirstPriceAuction(
                "Test Auction",
                "Description",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                seller.address
            );

            const auctionAddress = await auction.getAddress();

            const tx = await factory.connect(admin).registerAuction(0, auctionAddress);
            await expect(tx).to.emit(factory, "AuctionApproved");

            const request = await factory.getRequest(0);
            expect(request.deployedAuction).to.equal(auctionAddress);

            const deployedAuctions = await factory.getDeployedAuctions();
            expect(deployedAuctions).to.include(auctionAddress);
        });

        it("Should reject invalid request ID", async function () {
            await expect(
                factory.connect(admin).registerAuction(999, ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid request ID");
        });

        it("Should allow any admin to register (demo mode)", async function () {
            const auction = await deployFirstPriceAuction(
                "Test",
                "Desc",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                seller.address
            );

            const tx = await factory.connect(seller).registerAuction(0, await auction.getAddress());
            await expect(tx).to.emit(factory, "AuctionApproved");
        });

        it("Should reject zero address", async function () {
            await expect(
                factory.connect(admin).registerAuction(0, ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid auction address");
        });

        it("Should update request status to APPROVED", async function () {
            const auction = await deployFirstPriceAuction(
                "Test",
                "Desc",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                seller.address
            );

            await factory.connect(admin).registerAuction(0, await auction.getAddress());

            const request = await factory.getRequest(0);
            expect(request.status).to.equal(1); // RequestStatus.APPROVED
        });


        it("Should add to active auctions list", async function () {
            const auction = await deployFirstPriceAuction(
                "Test",
                "Desc",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                seller.address
            );

            const auctionAddress = await auction.getAddress();
            await factory.connect(admin).registerAuction(0, auctionAddress);

            const firstActiveAuction = await factory.activeAuctions(0);
            expect(firstActiveAuction).to.equal(auctionAddress);
        });

        it("Should mark as active auction in mapping", async function () {
            const auction = await deployFirstPriceAuction(
                "Test",
                "Desc",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                seller.address
            );

            const auctionAddress = await auction.getAddress();
            await factory.connect(admin).registerAuction(0, auctionAddress);

            expect(await factory.isActiveAuction(auctionAddress)).to.be.true;
        });

        it("Should reject already approved request", async function () {
            const auction = await deployFirstPriceAuction(
                "Test",
                "Desc",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                seller.address
            );

            await factory.connect(admin).registerAuction(0, await auction.getAddress());

            const auction2 = await deployFirstPriceAuction(
                "Test 2",
                "Desc 2",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                seller.address
            );

            await expect(
                factory.connect(admin).registerAuction(0, await auction2.getAddress())
            ).to.be.revertedWith("Not pending");
        });
    });

    describe("Reject Request", function () {
        beforeEach(async function () {
            await factory.connect(seller).submitAuctionRequest(
                "Test Auction",
                "Description",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                ethers.ZeroAddress,
                0
            );
        });

        it("Should reject request successfully", async function () {
            const tx = await factory.connect(admin).rejectRequest(0);
            await expect(tx).to.emit(factory, "AuctionRejected");

            const request = await factory.getRequest(0);
            expect(request.deployedAuction).to.equal(ethers.ZeroAddress);
        });

        it("Should allow any admin to reject (demo mode)", async function () {
            const tx = await factory.connect(seller).rejectRequest(0);
            await expect(tx).to.emit(factory, "AuctionRejected");
        });

        it("Should reject invalid request ID", async function () {
            await expect(
                factory.connect(admin).rejectRequest(999)
            ).to.be.revertedWith("Invalid request ID");
        });

        it("Should update status to REJECTED", async function () {
            await factory.connect(admin).rejectRequest(0);

            const request = await factory.getRequest(0);
            expect(request.status).to.equal(2); // RequestStatus.REJECTED
        });


    });

    describe("View Functions", function () {
        beforeEach(async function () {
            await factory.connect(seller).submitAuctionRequest(
                "Auction 1",
                "First",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                ethers.ZeroAddress,
                0
            );

            await factory.connect(seller).submitAuctionRequest(
                "Auction 2",
                "Second",
                120,
                200n,
                ethers.ZeroAddress,
                0
            );
        });

        it("Should return correct request count", async function () {
            const request0 = await factory.requests(0);
            const request1 = await factory.requests(1);
            expect(request0.seller).to.equal(seller.address);
            expect(request1.seller).to.equal(seller.address);
        });

        it("Should return seller's requests", async function () {
            const sellerRequests = await factory.getRequestsBySeller(seller.address);
            expect(sellerRequests.length).to.equal(2);
        });

        it("Should return correct request details", async function () {
            const request = await factory.getRequest(1);
            expect(request.title).to.equal("Auction 2");
            expect(request.durationMinutes).to.equal(120);
            expect(request.minimumBid).to.equal(200n);
        });

        it("Should access requests by index", async function () {
            const request0 = await factory.requests(0);
            const request1 = await factory.requests(1);
            expect(request0.title).to.equal("Auction 1");
            expect(request1.title).to.equal("Auction 2");
        });

        it("Should return empty array for seller with no requests", async function () {
            const requests = await factory.getRequestsBySeller(seller2.address);
            expect(requests.length).to.equal(0);
        });

        it("Should return correct deployed auctions count", async function () {
            const auctions = await factory.getDeployedAuctions();
            expect(auctions.length).to.equal(0);
        });
    });

    describe("Deployed Auctions Tracking", function () {
        it("Should track deployed auctions", async function () {
            await factory.connect(seller).submitAuctionRequest(
                "Auction 1",
                "First",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                ethers.ZeroAddress,
                0
            );

            const auction1 = await deployFirstPriceAuction(
                "Auction 1",
                "First",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                seller.address
            );

            await factory.connect(admin).registerAuction(0, await auction1.getAddress());

            await factory.connect(seller).submitAuctionRequest(
                "Auction 2",
                "Second",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                ethers.ZeroAddress,
                0
            );

            const auction2 = await deployFirstPriceAuction(
                "Auction 2",
                "Second",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                seller.address
            );

            await factory.connect(admin).registerAuction(1, await auction2.getAddress());

            const deployedAuctions = await factory.getDeployedAuctions();
            expect(deployedAuctions.length).to.equal(2);
            expect(deployedAuctions[0]).to.equal(await auction1.getAddress());
            expect(deployedAuctions[1]).to.equal(await auction2.getAddress());
        });

        it("Should track seller auctions via sellerAuctions mapping", async function () {
            await factory.connect(seller).submitAuctionRequest(
                "Auction 1",
                "First",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                ethers.ZeroAddress,
                0
            );

            const auction = await deployFirstPriceAuction(
                "Auction 1",
                "First",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                seller.address
            );

            await factory.connect(admin).registerAuction(0, await auction.getAddress());

            const firstAuction = await factory.sellerAuctions(seller.address, 0);
            expect(firstAuction).to.equal(await auction.getAddress());
        });

        it("Should track multiple sellers separately", async function () {
            await factory.connect(seller).submitAuctionRequest(
                "Seller 1",
                "First",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                ethers.ZeroAddress,
                0
            );

            await factory.connect(seller2).submitAuctionRequest(
                "Seller 2",
                "Second",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                ethers.ZeroAddress,
                0
            );

            const auction1 = await deployFirstPriceAuction(
                "Seller 1",
                "First",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                seller.address
            );

            const auction2 = await deployFirstPriceAuction(
                "Seller 2",
                "Second",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                seller2.address
            );

            await factory.connect(admin).registerAuction(0, await auction1.getAddress());
            await factory.connect(admin).registerAuction(1, await auction2.getAddress());

            const seller1Auctions = await factory.sellerAuctions(seller.address, 0);
            const seller2Auctions = await factory.sellerAuctions(seller2.address, 0);

            expect(seller1Auctions).to.equal(await auction1.getAddress());
            expect(seller2Auctions).to.equal(await auction2.getAddress());
        });
    });

    describe("Edge Cases", function () {
        it("Should handle very long auction title", async function () {
            const longTitle = "A".repeat(200);
            const tx = await factory.connect(seller).submitAuctionRequest(
                longTitle,
                "Description",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                ethers.ZeroAddress,
                0
            );

            await expect(tx).to.emit(factory, "AuctionRequested");
        });

        it("Should handle very long description", async function () {
            const longDesc = "B".repeat(500);
            const tx = await factory.connect(seller).submitAuctionRequest(
                "Title",
                longDesc,
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                ethers.ZeroAddress,
                0
            );

            await expect(tx).to.emit(factory, "AuctionRequested");
        });

        it("Should handle very large duration", async function () {
            const largeDuration = 525600; // 1 year in minutes
            const tx = await factory.connect(seller).submitAuctionRequest(
                "Long Auction",
                "Very long duration",
                largeDuration,
                DEFAULT_MINIMUM_BID,
                ethers.ZeroAddress,
                0
            );

            await expect(tx).to.emit(factory, "AuctionRequested");
        });

        it("Should handle very large minimum bid", async function () {
            const largeBid = ethers.parseEther("1000000");
            const tx = await factory.connect(seller).submitAuctionRequest(
                "Expensive Auction",
                "High minimum",
                DEFAULT_DURATION_MINUTES,
                largeBid,
                ethers.ZeroAddress,
                0
            );

            await expect(tx).to.emit(factory, "AuctionRequested");
        });
    });

    describe("Request Lifecycle", function () {
        it("Should track full lifecycle: submit -> approve -> deploy", async function () {
            // Submit
            await factory.connect(seller).submitAuctionRequest(
                "Lifecycle Test",
                "Full cycle",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                ethers.ZeroAddress,
                0
            );

            let request = await factory.getRequest(0);
            expect(request.status).to.equal(0); // PENDING

            // Deploy auction
            const auction = await deployFirstPriceAuction(
                "Lifecycle Test",
                "Full cycle",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                seller.address
            );

            // Register
            await factory.connect(admin).registerAuction(0, await auction.getAddress());

            request = await factory.getRequest(0);
            expect(request.status).to.equal(1); // APPROVED
            expect(request.deployedAuction).to.equal(await auction.getAddress());
        });

        it("Should track full lifecycle: submit -> reject", async function () {
            await factory.connect(seller).submitAuctionRequest(
                "Reject Test",
                "Will be rejected",
                DEFAULT_DURATION_MINUTES,
                DEFAULT_MINIMUM_BID,
                ethers.ZeroAddress,
                0
            );

            let request = await factory.getRequest(0);
            expect(request.status).to.equal(0); // PENDING

            await factory.connect(admin).rejectRequest(0);

            request = await factory.getRequest(0);
            expect(request.status).to.equal(2); // REJECTED
        });
    });
});
