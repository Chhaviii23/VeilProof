// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title VeilProof Commitment Registry (v1)
/// @notice Stores only opaque 32-byte commitments and a protocol version.
/// No filenames, case references, categories, raw hashes, identity, or keys are stored.
/// Non-upgradeable and append-only; first-seen metadata is preserved.
contract CommitmentRegistry {
    struct Anchor {
        uint64 firstBlock;
        uint64 firstTimestamp;
        bool exists;
    }

    address public governance;
    mapping(address => bool) public submitters;
    mapping(bytes32 => Anchor) private _anchors;

    event Anchored(bytes32 indexed commitment, uint16 proofVersion, uint64 blockNumber);

    modifier onlySubmitter() {
        require(submitters[msg.sender], "not authorized");
        _;
    }

    constructor(address initialSubmitter) {
        governance = msg.sender;
        if (initialSubmitter != address(0)) {
            submitters[initialSubmitter] = true;
        }
    }

    function setSubmitter(address account, bool allowed) external {
        require(msg.sender == governance, "not governance");
        submitters[account] = allowed;
    }

    function anchor(bytes32 commitment, uint16 proofVersion) external onlySubmitter {
        require(proofVersion != 0, "unsupported version");
        Anchor storage a = _anchors[commitment];
        if (!a.exists) {
            a.exists = true;
            a.firstBlock = uint64(block.number);
            a.firstTimestamp = uint64(block.timestamp);
        }
        // Idempotent: duplicate submissions are recorded as events but do not overwrite
        // the first-seen metadata of an existing commitment.
        emit Anchored(commitment, proofVersion, uint64(block.number));
    }

    function firstSeen(bytes32 commitment) external view returns (uint64, uint64, bool) {
        Anchor storage a = _anchors[commitment];
        return (a.firstBlock, a.firstTimestamp, a.exists);
    }
}
