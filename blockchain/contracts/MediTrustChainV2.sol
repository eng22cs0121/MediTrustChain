// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MediTrustChainV2
 * @dev Enhanced drug batch tracking with separated immutable/mutable data
 * @notice Phase 1: Data model redesign - separates BatchCore (hashed) from BatchState (mutable)
 */

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract MediTrustChainV2 is Ownable, Pausable {

    /// ============ Constructor ============

    constructor() Ownable(msg.sender) {}

    /// ============ Enums ============

    /**
     * @dev Batch status follows STRICT state machine:
     * CREATED → PENDING_APPROVAL → APPROVED → IN_TRANSIT → AT_PHARMACY → SOLD
     * ❌ No skipping states
     * ❌ No updates after SOLD or RECALLED
     */
    enum BatchStatus {
        CREATED,           // 0: Batch created by manufacturer (initial state)
        PENDING_APPROVAL,  // 1: Awaiting regulatory approval (manufacturer submits)
        APPROVED,          // 2: Approved by regulator
        REJECTED,          // 3: Rejected by regulator (terminal)
        IN_TRANSIT,        // 4: Distributor has shipped the batch
        AT_PHARMACY,       // 5: Logistics delivered to pharmacy
        SOLD,              // 6: Pharmacy sold after verification (terminal)
        EXPIRED,           // 7: Batch expired (terminal)
        RECALLED           // 8: Batch recalled by regulator (terminal)
    }

    enum UserRole {
        MANUFACTURER,
        REGULATOR,
        DISTRIBUTOR,
        LOGISTICS,
        PHARMACY,
        PATIENT
    }

    /// ============ Data Structures ============

    /**
     * @dev IMMUTABLE core batch data - hashed once at creation, NEVER changes
     * The dataHash is computed from these fields ONLY
     */
    struct BatchCore {
        uint256 id;                      // Auto-generated batch ID
        string batchCode;                // Manufacturer's batch code (e.g., "BCH-001")
        address manufacturer;            // Creator's wallet address
        string drugName;                 // Drug/medicine name
        uint256 quantity;                // Original quantity (number of units)
        uint256 mfgDate;                 // Manufacturing date (Unix timestamp)
        uint256 expDate;                 // Expiry date (Unix timestamp)
        uint256 createdAt;               // Creation timestamp on blockchain
        bytes32 dataHash;                // keccak256 hash of core fields (immutable proof)
    }

    /**
     * @dev MUTABLE state data - changes through supply chain lifecycle
     * These fields are NOT part of the authenticity hash
     */
    struct BatchState {
        BatchStatus status;              // Current status (CREATED → APPROVED → IN_TRANSIT → DELIVERED)
        uint256 approvedAt;              // Timestamp when approved (0 if not yet approved)
        bytes32 approvalHash;            // Regulator's approval hash/signature
        address currentHolder;           // Current custodian (distributor/logistics/pharmacy)
        string lastLocation;             // Last known physical location
        bool isRecalled;                 // Emergency recall flag
        uint256 lastUpdated;             // Last state update timestamp
    }

    /**
     * @dev Batch history entry for audit trail
     */
    struct BatchHistory {
        uint256 timestamp;
        string location;
        BatchStatus status;
        address updatedBy;
        string notes;
    }

    /**
     * @dev Registered user on the blockchain
     */
    struct User {
        address walletAddress;
        UserRole role;
        string organizationName;
        bool isActive;
        uint256 registeredAt;
    }

    /// ============ Drug Master / Regulator Template ============

    struct DrugTemplate {
        uint256 id;
        string drugCode;           // e.g., "DRG-001"
        string drugName;
        string composition;
        string strength;
        bytes32 compositionHash;   // keccak256(drugName + composition + strength)
        address approvedBy;        // regulator wallet
        uint256 approvedAt;
        bool isActive;
    }

    /// ============ State Variables ============

    uint256 private batchIdCounter = 1;
    uint256 private drugTemplateCounter = 0;

    // Core and State are stored separately for clarity and gas optimization
    mapping(uint256 => BatchCore) public batchCores;
    mapping(uint256 => BatchState) public batchStates;
    mapping(uint256 => BatchHistory[]) public batchHistories;
    
    mapping(uint256 => DrugTemplate) public drugTemplates;
    mapping(string => uint256) public drugCodeToTemplateId;   // drugCode → templateId
    mapping(bytes32 => bool) public approvedCompositionHashes; // quick lookup
    
    mapping(address => User) public users;
    mapping(address => bool) public approvedRegulatorsMap;
    mapping(string => uint256) public batchCodeToBatchId;

    address[] public approvedRegulators;

    /// ============ Events ============

    event DrugTemplateCreated(
        uint256 indexed templateId,
        string indexed drugCode,
        string drugName,
        bytes32 compositionHash,
        address indexed approvedBy
    );

    event BatchCreated(
        uint256 indexed batchId,
        string indexed batchCode,
        address indexed manufacturer,
        string drugName,
        uint256 quantity,
        bytes32 dataHash
    );

    event BatchApproved(
        uint256 indexed batchId,
        address indexed regulator,
        uint256 approvedAt
    );

    event BatchRejected(
        uint256 indexed batchId,
        address indexed regulator,
        string reason
    );

    event BatchStatusUpdated(
        uint256 indexed batchId,
        BatchStatus newStatus,
        address indexed updatedBy,
        string location
    );

    event BatchTransferred(
        uint256 indexed batchId,
        address indexed fromHolder,
        address indexed toHolder,
        string location
    );

    event BatchRecalled(
        uint256 indexed batchId,
        address indexed recalledBy,
        string reason
    );

    event UserRegistered(
        address indexed userAddress,
        UserRole role,
        string organizationName
    );

    event RegulatoryApprovalGranted(
        address indexed regulator
    );

    // V2: New events for event-driven architecture
    event BatchSubmittedForApproval(
        uint256 indexed batchId,
        address indexed manufacturer,
        uint256 submittedAt
    );

    event BatchSold(
        uint256 indexed batchId,
        address indexed pharmacy,
        string location,
        uint256 soldAt
    );

    event BatchDeliveredToPharmacy(
        uint256 indexed batchId,
        address indexed logistics,
        string pharmacyLocation,
        uint256 deliveredAt
    );

    event BatchShipped(
        uint256 indexed batchId,
        address indexed distributor,
        string fromLocation,
        string toLocation,
        uint256 shippedAt
    );

    /// ============ Modifiers ============

    modifier onlyManufacturer() {
        require(
            users[msg.sender].role == UserRole.MANUFACTURER,
            "Only manufacturers can call this function"
        );
        _;
    }

    modifier onlyRegulator() {
        require(
            users[msg.sender].role == UserRole.REGULATOR &&
            approvedRegulatorsMap[msg.sender],
            "Only approved regulators can call this function"
        );
        _;
    }

    modifier onlyRegisteredUser() {
        require(
            users[msg.sender].isActive,
            "User must be registered and active"
        );
        _;
    }

    modifier batchExists(uint256 _batchId) {
        require(
            batchCores[_batchId].mfgDate != 0,
            "Batch does not exist"
        );
        _;
    }

    /// ============ User Management ============

    /**
     * @dev Register a new user on the blockchain
     */
    function registerUser(
        UserRole _role,
        string memory _organizationName
    ) public {
        require(!users[msg.sender].isActive, "User already registered");
        require(bytes(_organizationName).length > 0, "Organization name cannot be empty");

        users[msg.sender] = User({
            walletAddress: msg.sender,
            role: _role,
            organizationName: _organizationName,
            isActive: true,
            registeredAt: block.timestamp
        });

        emit UserRegistered(msg.sender, _role, _organizationName);
    }

    /**
     * @dev Grant regulatory approval to a regulator
     */
    function grantRegulatoryApproval(address _regulatorAddress) 
        public 
        onlyOwner 
    {
        require(
            users[_regulatorAddress].role == UserRole.REGULATOR,
            "User must have REGULATOR role"
        );
        require(!approvedRegulatorsMap[_regulatorAddress], "Regulator already approved");

        approvedRegulatorsMap[_regulatorAddress] = true;
        approvedRegulators.push(_regulatorAddress);

        emit RegulatoryApprovalGranted(_regulatorAddress);
    }

    /**
     * @dev Get list of all approved regulators
     */
    function getApprovedRegulators() public view returns (address[] memory) {
        return approvedRegulators;
    }

    /// ============ Drug Master Management ============

    /**
     * @dev Regulator locks an official drug composition
     * @param drugCode  Unique identifier e.g. "DRG-001"
     * @param drugName  Official name
     * @param composition  Approved ingredients
     * @param strength  Dosage strength
     */
    function approveDrugTemplate(
        string calldata drugCode,
        string calldata drugName,
        string calldata composition,
        string calldata strength
    ) external whenNotPaused returns (uint256) {
        User memory caller = users[msg.sender];
        require(caller.isActive, "User not registered");
        require(caller.role == UserRole.REGULATOR, "Only regulators can approve drug templates");
        require(approvedRegulatorsMap[msg.sender], "Only approved regulators can call this function");
        require(drugCodeToTemplateId[drugCode] == 0, "Drug code already exists");

        bytes32 compHash = keccak256(abi.encodePacked(drugName, composition, strength));

        drugTemplateCounter++;
        drugTemplates[drugTemplateCounter] = DrugTemplate({
            id:              drugTemplateCounter,
            drugCode:        drugCode,
            drugName:        drugName,
            composition:     composition,
            strength:        strength,
            compositionHash: compHash,
            approvedBy:      msg.sender,
            approvedAt:      block.timestamp,
            isActive:        true
        });

        drugCodeToTemplateId[drugCode]          = drugTemplateCounter;
        approvedCompositionHashes[compHash]     = true;

        emit DrugTemplateCreated(drugTemplateCounter, drugCode, drugName, compHash, msg.sender);
        return drugTemplateCounter;
    }

    /// ============ Batch Management ============

    /**
     * @dev Create a new drug batch (called by manufacturer)
     * @notice The dataHash is computed from IMMUTABLE fields only
     */
    function createBatch(
        string memory _batchCode,
        string memory _drugName,
        uint256 _quantity,
        uint256 _mfgDate,
        uint256 _expDate,
        uint256 _drugTemplateId
    ) 
        public 
        onlyManufacturer 
        onlyRegisteredUser 
        returns (uint256) 
    {
        require(_quantity > 0, "Quantity must be greater than 0");
        require(_mfgDate < _expDate, "Manufacturing date must be before expiry date");
        require(bytes(_batchCode).length > 0, "Batch code cannot be empty");
        require(batchCodeToBatchId[_batchCode] == 0, "Batch code already exists");

        // Verify drug template exists and is active
        DrugTemplate storage template = drugTemplates[_drugTemplateId];
        require(template.id != 0,    "Drug template not found");
        require(template.isActive,   "Drug template is inactive");

        // Verify composition hash matches the approved template
        bytes32 expectedHash = template.compositionHash;
        require(approvedCompositionHashes[expectedHash], "Composition not approved by regulator");

        uint256 newBatchId = batchIdCounter;
        batchIdCounter++;

        // Compute hash from IMMUTABLE fields only
        bytes32 dataHash = keccak256(abi.encode(
            _batchCode,
            _drugName,
            _quantity,
            _mfgDate,
            _expDate,
            msg.sender,  // manufacturer address
            _drugTemplateId // binds batch to approved template
        ));

        // Store immutable core data
        batchCores[newBatchId] = BatchCore({
            id: newBatchId,
            batchCode: _batchCode,
            manufacturer: msg.sender,
            drugName: _drugName,
            quantity: _quantity,
            mfgDate: _mfgDate,
            expDate: _expDate,
            createdAt: block.timestamp,
            dataHash: dataHash
        });

        // Initialize mutable state
        batchStates[newBatchId] = BatchState({
            status: BatchStatus.PENDING_APPROVAL, // Auto-submit to Pending Approval
            approvedAt: 0,
            approvalHash: bytes32(0),
            currentHolder: msg.sender,
            lastLocation: users[msg.sender].organizationName,
            isRecalled: false,
            lastUpdated: block.timestamp
        });

        batchCodeToBatchId[_batchCode] = newBatchId;

        // Add initial history entry
        batchHistories[newBatchId].push(BatchHistory({
            timestamp: block.timestamp,
            location: users[msg.sender].organizationName,
            status: BatchStatus.PENDING_APPROVAL,
            updatedBy: msg.sender,
            notes: "Batch created and submitted for approval"
        }));

        emit BatchCreated(newBatchId, _batchCode, msg.sender, _drugName, _quantity, dataHash);
        
        // Emit events for auto-submission
        emit BatchStatusUpdated(newBatchId, BatchStatus.PENDING_APPROVAL, msg.sender, users[msg.sender].organizationName);
        emit BatchSubmittedForApproval(newBatchId, msg.sender, block.timestamp);

        return newBatchId;
    }

    /**
     * @dev Submit batch for regulatory approval
     */
    function submitForApproval(uint256 _batchId) 
        public 
        onlyManufacturer 
        batchExists(_batchId) 
    {
        require(batchCores[_batchId].manufacturer == msg.sender, "Only batch manufacturer can submit");
        require(batchStates[_batchId].status == BatchStatus.CREATED, "Batch must be in CREATED status");

        batchStates[_batchId].status = BatchStatus.PENDING_APPROVAL;
        batchStates[_batchId].lastUpdated = block.timestamp;

        batchHistories[_batchId].push(BatchHistory({
            timestamp: block.timestamp,
            location: users[msg.sender].organizationName,
            status: BatchStatus.PENDING_APPROVAL,
            updatedBy: msg.sender,
            notes: "Submitted for regulatory approval"
        }));

        emit BatchStatusUpdated(_batchId, BatchStatus.PENDING_APPROVAL, msg.sender, "Regulatory Review");
        emit BatchSubmittedForApproval(_batchId, msg.sender, block.timestamp);
    }

    /**
     * @dev Approve a batch (called by approved regulator)
     */
    function approveBatch(uint256 _batchId, bytes32 _approvalHash) 
        public 
        onlyRegulator 
        batchExists(_batchId) 
    {
        require(
            batchStates[_batchId].status == BatchStatus.PENDING_APPROVAL,
            "Batch must be in PENDING_APPROVAL status"
        );

        batchStates[_batchId].status = BatchStatus.APPROVED;
        batchStates[_batchId].approvedAt = block.timestamp;
        batchStates[_batchId].approvalHash = _approvalHash;
        batchStates[_batchId].lastUpdated = block.timestamp;

        batchHistories[_batchId].push(BatchHistory({
            timestamp: block.timestamp,
            location: users[msg.sender].organizationName,
            status: BatchStatus.APPROVED,
            updatedBy: msg.sender,
            notes: "Approved by regulator"
        }));

        emit BatchApproved(_batchId, msg.sender, block.timestamp);
    }

    /**
     * @dev Reject a batch (called by approved regulator)
     */
    function rejectBatch(uint256 _batchId, string memory _reason) 
        public 
        onlyRegulator 
        batchExists(_batchId) 
    {
        require(
            batchStates[_batchId].status == BatchStatus.PENDING_APPROVAL,
            "Batch must be in PENDING_APPROVAL status"
        );

        batchStates[_batchId].status = BatchStatus.REJECTED;
        batchStates[_batchId].lastUpdated = block.timestamp;

        batchHistories[_batchId].push(BatchHistory({
            timestamp: block.timestamp,
            location: users[msg.sender].organizationName,
            status: BatchStatus.REJECTED,
            updatedBy: msg.sender,
            notes: string(abi.encodePacked("Rejected: ", _reason))
        }));

        emit BatchRejected(_batchId, msg.sender, _reason);
    }

    /**
     * @dev Update batch status and transfer custody
     * STRICT: Follows state machine, no skipping, no updates after SOLD/RECALLED
     */
    function updateBatchStatus(
        uint256 _batchId,
        BatchStatus _newStatus,
        string memory _location
    ) 
        public 
        onlyRegisteredUser 
        batchExists(_batchId) 
    {
        BatchState storage state = batchStates[_batchId];
        
        // TERMINAL STATES: No updates allowed after SOLD, RECALLED, REJECTED, or EXPIRED
        require(!state.isRecalled, "Cannot update recalled batch");
        require(state.status != BatchStatus.SOLD, "Batch already sold - no further updates allowed");
        require(state.status != BatchStatus.RECALLED, "Batch has been recalled - no further updates allowed");
        require(state.status != BatchStatus.REJECTED, "Batch was rejected - no further updates allowed");
        require(state.status != BatchStatus.EXPIRED, "Batch has expired - no further updates allowed");

        // Validate status transitions
        require(_isValidStatusTransition(state.status, _newStatus), "Invalid status transition");

        // Update mutable state
        address previousHolder = state.currentHolder;
        state.status = _newStatus;
        state.currentHolder = msg.sender;
        state.lastLocation = _location;
        state.lastUpdated = block.timestamp;

        batchHistories[_batchId].push(BatchHistory({
            timestamp: block.timestamp,
            location: _location,
            status: _newStatus,
            updatedBy: msg.sender,
            notes: ""
        }));

        emit BatchStatusUpdated(_batchId, _newStatus, msg.sender, _location);
        
        if (previousHolder != msg.sender) {
            emit BatchTransferred(_batchId, previousHolder, msg.sender, _location);
        }

        // Emit specific events for event-driven architecture
        if (_newStatus == BatchStatus.IN_TRANSIT) {
            emit BatchShipped(_batchId, msg.sender, batchStates[_batchId].lastLocation, _location, block.timestamp);
        } else if (_newStatus == BatchStatus.AT_PHARMACY) {
            emit BatchDeliveredToPharmacy(_batchId, msg.sender, _location, block.timestamp);
        } else if (_newStatus == BatchStatus.SOLD) {
            emit BatchSold(_batchId, msg.sender, _location, block.timestamp);
        }
    }

    /**
     * @dev Recall a batch (emergency action by regulator)
     */
    function recallBatch(uint256 _batchId, string memory _reason) 
        public 
        onlyRegulator 
        batchExists(_batchId) 
    {
        require(!batchStates[_batchId].isRecalled, "Batch already recalled");

        batchStates[_batchId].isRecalled = true;
        batchStates[_batchId].status = BatchStatus.RECALLED;
        batchStates[_batchId].lastUpdated = block.timestamp;

        batchHistories[_batchId].push(BatchHistory({
            timestamp: block.timestamp,
            location: "RECALL",
            status: BatchStatus.RECALLED,
            updatedBy: msg.sender,
            notes: string(abi.encodePacked("Recalled: ", _reason))
        }));

        emit BatchRecalled(_batchId, msg.sender, _reason);
    }

    /// ============ Batch Queries ============

    /**
     * @dev Get full batch data (core + state)
     */
    function getBatchFull(uint256 _batchId) 
        public 
        view 
        batchExists(_batchId) 
        returns (BatchCore memory core, BatchState memory state) 
    {
        return (batchCores[_batchId], batchStates[_batchId]);
    }

    /**
     * @dev Get batch core data only (immutable)
     */
    function getBatchCore(uint256 _batchId) 
        public 
        view 
        batchExists(_batchId) 
        returns (BatchCore memory) 
    {
        return batchCores[_batchId];
    }

    /**
     * @dev Get batch state only (mutable)
     */
    function getBatchState(uint256 _batchId) 
        public 
        view 
        batchExists(_batchId) 
        returns (BatchState memory) 
    {
        return batchStates[_batchId];
    }

    /**
     * @dev Get batch history
     */
    function getBatchHistory(uint256 _batchId) 
        public 
        view 
        batchExists(_batchId) 
        returns (BatchHistory[] memory) 
    {
        return batchHistories[_batchId];
    }

    /**
     * @dev Get batch ID from batch code
     */
    function getBatchIdByCode(string memory _batchCode) 
        public 
        view 
        returns (uint256) 
    {
        return batchCodeToBatchId[_batchCode];
    }

    /**
     * @dev Verify batch authenticity (basic check)
     */
    function verifyBatchAuthenticity(uint256 _batchId) 
        public 
        view 
        batchExists(_batchId) 
        returns (bool isGenuine, string memory status) 
    {
        BatchCore memory core = batchCores[_batchId];
        BatchState memory state = batchStates[_batchId];
        
        // Check if batch is in a valid state for use (approved and in supply chain)
        bool validForUse = state.status == BatchStatus.APPROVED || 
                           state.status == BatchStatus.IN_TRANSIT || 
                           state.status == BatchStatus.AT_PHARMACY ||
                           state.status == BatchStatus.SOLD;

        // Check if batch is not expired
        bool notExpired = core.expDate > block.timestamp;

        // Check if batch is not recalled
        bool notRecalled = !state.isRecalled;

        isGenuine = validForUse && notExpired && notRecalled;

        if (!validForUse) {
            status = "NOT_APPROVED";
        } else if (!notExpired) {
            status = "EXPIRED";
        } else if (!notRecalled) {
            status = "RECALLED";
        } else {
            status = "GENUINE";
        }

        return (isGenuine, status);
    }

    /**
     * @dev Verify batch authenticity WITH hash verification (enhanced security)
     * @param _batchId Batch ID to verify
     * @param _providedHash Hash computed from core data by frontend
     */
    function verifyBatchWithHash(
        uint256 _batchId, 
        bytes32 _providedHash
    ) 
        public 
        view 
        batchExists(_batchId) 
        returns (bool isGenuine, string memory status) 
    {
        BatchCore memory core = batchCores[_batchId];
        BatchState memory state = batchStates[_batchId];
        
        // STEP 1: Check hash integrity FIRST (most critical security check)
        // Compare stored hash with provided hash from QR code
        bool hashMatches = core.dataHash == _providedHash;
        
        // If hash doesn't match, data has been tampered
        if (!hashMatches) {
            return (false, "TAMPERED");
        }
        
        // STEP 2: Check if batch has been recalled
        if (state.isRecalled) {
            return (false, "RECALLED");
        }
        
        // STEP 3: Check if batch has expired
        if (core.expDate <= block.timestamp) {
            return (false, "EXPIRED");
        }
        
        // STEP 4: Check if batch is in a valid state for use
        // Valid states: APPROVED onward (in supply chain or sold)
        bool validForUse = state.status == BatchStatus.APPROVED || 
                           state.status == BatchStatus.IN_TRANSIT || 
                           state.status == BatchStatus.AT_PHARMACY ||
                           state.status == BatchStatus.SOLD;
        
        if (!validForUse) {
            return (false, "NOT_APPROVED");
        }
        
        // All checks passed - batch is genuine!
        return (true, "GENUINE");
    }

    /// ============ Helper Functions ============

    /**
     * @dev Validate batch status transitions - STRICT STATE MACHINE
     * 
     * Valid Flow:
     *   CREATED → PENDING_APPROVAL (manufacturer submits for approval)
     *   PENDING_APPROVAL → APPROVED (regulator approves)
     *   PENDING_APPROVAL → REJECTED (regulator rejects - TERMINAL)
     *   APPROVED → IN_TRANSIT (distributor ships)
     *   IN_TRANSIT → AT_PHARMACY (logistics delivers)
     *   AT_PHARMACY → SOLD (pharmacy sells after verification - TERMINAL)
     * 
     * ❌ No skipping states (e.g., cannot go APPROVED → SOLD)
     * ❌ No updates after SOLD, RECALLED, REJECTED, or EXPIRED
     */
    function _isValidStatusTransition(BatchStatus _from, BatchStatus _to) 
        internal 
        pure 
        returns (bool) 
    {
        // CREATED → PENDING_APPROVAL (manufacturer submits)
        if (_from == BatchStatus.CREATED && _to == BatchStatus.PENDING_APPROVAL) return true;
        
        // PENDING_APPROVAL → APPROVED (regulator approves)
        if (_from == BatchStatus.PENDING_APPROVAL && _to == BatchStatus.APPROVED) return true;
        
        // PENDING_APPROVAL → REJECTED (regulator rejects) - handled by rejectBatch()
        if (_from == BatchStatus.PENDING_APPROVAL && _to == BatchStatus.REJECTED) return true;
        
        // APPROVED → IN_TRANSIT (distributor ships)
        if (_from == BatchStatus.APPROVED && _to == BatchStatus.IN_TRANSIT) return true;
        
        // IN_TRANSIT → AT_PHARMACY (logistics delivers to pharmacy)
        if (_from == BatchStatus.IN_TRANSIT && _to == BatchStatus.AT_PHARMACY) return true;
        
        // AT_PHARMACY → SOLD (pharmacy records sale after verification)
        if (_from == BatchStatus.AT_PHARMACY && _to == BatchStatus.SOLD) return true;

        // All other transitions are INVALID
        return false;
    }

    /// ============ Admin Functions ============

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function getTotalBatches() public view returns (uint256) {
        return batchIdCounter;
    }
}
