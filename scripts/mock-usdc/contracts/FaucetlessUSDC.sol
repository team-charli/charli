// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/* ──────────────────────────────────────────────────────────────
   Faucet-enabled USDC mock
   • 6-decimals ERC-20
   • Native EIP-2612 permit with  version = "2"
   • Deployer is owner; can mint and burn at will
─────────────────────────────────────────────────────────────────*/
contract FaucetlessUSDC is ERC20 {
    uint8  private constant _DECIMALS = 6;
    bytes32 private immutable _HASHED_NAME  = keccak256(bytes("USD Coin"));
    bytes32 private immutable _HASHED_VER   = keccak256(bytes("2"));     // ← Circle’s version
    bytes32 private immutable _TYPE_HASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    mapping(address => uint256) public nonces;
    address public owner;

    /* ---------- construction ---------- */
    constructor(uint256 initialSupply) ERC20("USD Coin", "USDC") {
        owner = msg.sender;
        _mint(msg.sender, initialSupply);
    }

    /* ---------- EIP-712 domain ---------- */
    function _domainSeparator() private view returns (bytes32) {
        return keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                _HASHED_NAME,
                _HASHED_VER,
                block.chainid,
                address(this)
            )
        );
    }
    function DOMAIN_SEPARATOR() external view returns (bytes32) { return _domainSeparator(); }

    /* ---------- permit ---------- */
    function permit(
        address owner_,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8   v,
        bytes32 r,
        bytes32 s
    ) external {
        require(block.timestamp <= deadline, "permit expired");

        bytes32 structHash = keccak256(
            abi.encode(_TYPE_HASH, owner_, spender, value, nonces[owner_]++, deadline)
        );
        bytes32 hash = keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));

        address signer = ecrecover(hash, v, r, s);
        require(signer == owner_, "bad sig");
        _approve(owner_, spender, value);
    }

    /* ---------- faucet helpers ---------- */
    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }

    function mint(address to, uint256 amount) external onlyOwner { _mint(to, amount); }
    function burn(uint256 amount)         external onlyOwner { _burn(msg.sender, amount); }

    /* ---------- metadata ---------- */
    function decimals() public pure override returns (uint8) { return _DECIMALS; }
}
