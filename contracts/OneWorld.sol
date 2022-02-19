// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import './GenerativeNFT.sol';

import "hardhat/console.sol";

/**
@title NFT token for tokenized world
@author Umar Luqman
@dev Ownable because all NFTs are pre-minted
 */

contract Token is ERC721, Ownable {
  using Counters for Counters.Counter;
  Counters.Counter private _tokenIds;
  address contractAddress;
  
  /// @param marketplaceAddress address that have the permission to transfer the token on behalf of the owner
  constructor(address marketplaceAddress) ERC721("ONE World", "WORLD") {
    contractAddress = marketplaceAddress;
  }

  /// @param tokenURI store name, description, longitude and latitude
  function createToken(string memory tokenURI) public onlyOwner returns (uint)  {
    _tokenIds.increment();
    uint newItemId = _tokenIds.current();
    _safeMint(msg.sender, newItemId);
    _setTokenURI(newItemId, tokenURI);
    setApprovalForAll(contractAddress, true);
    return newItemId;
  }

  function getSVG(uint256 tokenId, string memory latitude, string memory longitude, string memory name) public view returns (string memory) {
    return NFTDescriptor.constructTokenURI(
      NFTDescriptor.URIParams({
        tokenId: tokenId,
        blockNumber: block.number,
        latitude: latitude,
        longitude: longitude,
        name:name
      })
    );
  } 
}

contract Marketplace is ReentrancyGuard {
  using Counters for Counters.Counter;
  Counters.Counter private _itemIds; // to keep track of all items in marketplace
  Counters.Counter private _itemsSold;

  address payable owner;

  constructor() {
    owner = payable(msg.sender); // deployer of the marketplace contract
  }

  struct MarketItem {
    uint itemId;
    address nftContract;
    uint256 tokenId;
    address payable seller;
    address payable owner;
    uint256 price;
    bool sold;
  }

  mapping(uint256 => MarketItem) private idToMarketItem;

  event MarketItemCreated (
    uint indexed itemId,
    address indexed nftContract,
    uint256 indexed tokenId,
    address seller,
    address owner,
    uint price,
    bool sold
  );

  function fivePercentOf(uint256 _value) public pure returns (uint256)  {
    require((_value/10000) * 10000 == _value, 'Value is too small');
    return _value * 500/10000;
  }

  function getListingPrice(uint price) public pure returns (uint) {
    return fivePercentOf(price);
  }

  /// @param nftContract address for the NFT to sell
  /// @param tokenId NFT id
  /// @param price NFT price
  function createMarketItem(
    address nftContract,
    uint tokenId,
    uint price
  ) public payable nonReentrant {
    
    require(price > 0, "Price must be at least 1 wei");
    require(msg.value == fivePercentOf(price), "Price must be equal to the 5 percent of the price.");

    _itemIds.increment();
    uint itemId = _itemIds.current();

    idToMarketItem[itemId] = MarketItem(
      itemId, 
      nftContract,
      tokenId,
      payable(msg.sender),
      payable(address(0)), // pass as empty address
      price,
      false
    );    

    console.log("from address", msg.sender);   

    // transfer the nftContract from the sender address to the address of the marketplace contract;
    IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

    emit MarketItemCreated(
      itemId, 
      nftContract, 
      tokenId, 
      msg.sender, 
      address(0), 
      price, false
    );   
  }

/* Creates the sale of a marketplace item */
  /* Transfers ownership of the item, as well as funds between parties */
  function createMarketSale(
    address nftContract,
    uint itemId
  ) public payable nonReentrant {

    uint price = idToMarketItem[itemId].price;
    uint tokenId = idToMarketItem[itemId].tokenId;

    require(msg.value == price, "Please submit the asking price in order to complete the purchase");

    idToMarketItem[itemId].seller.transfer(msg.value); // transfer the price amount to the seller

    IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId); // transfer the NFT from marketplace address to the buyer address

    idToMarketItem[itemId].owner = payable(msg.sender);
    idToMarketItem[itemId].sold = true;
    _itemsSold.increment();

    payable(owner).transfer(fivePercentOf(price)); // pay the marketplace fee when a sale is created
  }

  function fetchMarketItems() public view returns (MarketItem[] memory) {
    uint totalItemCount = _itemIds.current(); // get market item count
    uint unsoldItemCount = totalItemCount - _itemsSold.current();
    uint currentIndex = 0;
    
    MarketItem[] memory items = new MarketItem[](unsoldItemCount); // array of unsold items

    for (uint i = 0; i < totalItemCount; i++) {
        if (idToMarketItem[i+1].owner == address(0)) {
            uint currentId = idToMarketItem[i+1].itemId;
            MarketItem storage currentItem = idToMarketItem[currentId];
            items[currentIndex] = currentItem;
            currentIndex += 1;
        }
    }
    return items;  
  }

/* Returns onlyl items that a user has purchased */
  function fetchMyNfts() public view returns (MarketItem[] memory) {
    uint totalItemCount = _itemIds.current();
    uint itemCount = 0;
    uint currentIndex = 0;
    
    // get the user NFT count
    for (uint i = 0; i < totalItemCount; i++) {
        if (idToMarketItem[i+1].owner == msg.sender) {
            itemCount += 1;
        }
    }
    
    MarketItem[] memory items = new MarketItem[](itemCount);
    for (uint i = 0; i < totalItemCount; i++) {
      if (idToMarketItem[i + 1].owner == msg.sender) {
        uint currentId = i + 1;
        MarketItem storage currentItem = idToMarketItem[currentId];
        items[currentIndex] = currentItem;
        currentIndex += 1;
      }
    }
    
    return items;
  }

/* Returns only items a user has created */
  function fetchItemsCreated() public view returns (MarketItem[] memory) {
    uint totalItemCount = _itemIds.current();
    uint itemCount = 0;
    uint currentIndex = 0;

    for (uint i = 0; i < totalItemCount; i++) {
      if (idToMarketItem[i+1].seller == msg.sender) {
        itemCount +=1;
      }
    }

    MarketItem[] memory items = new MarketItem[](itemCount);

    for (uint i = 0; i < totalItemCount; i++) {
      if (idToMarketItem[i+1].seller == msg.sender) {
      uint currentId = i +1;
      MarketItem storage currentItem = idToMarketItem[currentId];
      items[currentIndex] = currentItem;
      currentIndex +=1;
      }    
    }
    return items;
  }      
}



