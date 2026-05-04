export const MEDITRUST_ABI = [
    {
        "inputs":  [

                   ],
        "stateMutability":  "nonpayable",
        "type":  "constructor"
    },
    {
        "inputs":  [

                   ],
        "name":  "EnforcedPause",
        "type":  "error"
    },
    {
        "inputs":  [

                   ],
        "name":  "ExpectedPause",
        "type":  "error"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "owner",
                           "type":  "address"
                       }
                   ],
        "name":  "OwnableInvalidOwner",
        "type":  "error"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "account",
                           "type":  "address"
                       }
                   ],
        "name":  "OwnableUnauthorizedAccount",
        "type":  "error"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "batchId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "regulator",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "approvedAt",
                           "type":  "uint256"
                       }
                   ],
        "name":  "BatchApproved",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "batchId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "string",
                           "name":  "batchCode",
                           "type":  "string"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "manufacturer",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "string",
                           "name":  "drugName",
                           "type":  "string"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "quantity",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "bytes32",
                           "name":  "dataHash",
                           "type":  "bytes32"
                       }
                   ],
        "name":  "BatchCreated",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "batchId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "logistics",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "string",
                           "name":  "pharmacyLocation",
                           "type":  "string"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "deliveredAt",
                           "type":  "uint256"
                       }
                   ],
        "name":  "BatchDeliveredToPharmacy",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "batchId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "recalledBy",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "string",
                           "name":  "reason",
                           "type":  "string"
                       }
                   ],
        "name":  "BatchRecalled",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "batchId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "regulator",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "string",
                           "name":  "reason",
                           "type":  "string"
                       }
                   ],
        "name":  "BatchRejected",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "batchId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "distributor",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "string",
                           "name":  "fromLocation",
                           "type":  "string"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "string",
                           "name":  "toLocation",
                           "type":  "string"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "shippedAt",
                           "type":  "uint256"
                       }
                   ],
        "name":  "BatchShipped",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "batchId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "pharmacy",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "string",
                           "name":  "location",
                           "type":  "string"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "soldAt",
                           "type":  "uint256"
                       }
                   ],
        "name":  "BatchSold",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "batchId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "enum MediTrustChainV2.BatchStatus",
                           "name":  "newStatus",
                           "type":  "uint8"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "updatedBy",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "string",
                           "name":  "location",
                           "type":  "string"
                       }
                   ],
        "name":  "BatchStatusUpdated",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "batchId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "manufacturer",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "submittedAt",
                           "type":  "uint256"
                       }
                   ],
        "name":  "BatchSubmittedForApproval",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "batchId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "fromHolder",
                           "type":  "address"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "toHolder",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "string",
                           "name":  "location",
                           "type":  "string"
                       }
                   ],
        "name":  "BatchTransferred",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "previousOwner",
                           "type":  "address"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "newOwner",
                           "type":  "address"
                       }
                   ],
        "name":  "OwnershipTransferred",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  false,
                           "internalType":  "address",
                           "name":  "account",
                           "type":  "address"
                       }
                   ],
        "name":  "Paused",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "regulator",
                           "type":  "address"
                       }
                   ],
        "name":  "RegulatoryApprovalGranted",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  false,
                           "internalType":  "address",
                           "name":  "account",
                           "type":  "address"
                       }
                   ],
        "name":  "Unpaused",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "userAddress",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "enum MediTrustChainV2.UserRole",
                           "name":  "role",
                           "type":  "uint8"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "string",
                           "name":  "organizationName",
                           "type":  "string"
                       }
                   ],
        "name":  "UserRegistered",
        "type":  "event"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_batchId",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "bytes32",
                           "name":  "_approvalHash",
                           "type":  "bytes32"
                       }
                   ],
        "name":  "approveBatch",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       }
                   ],
        "name":  "approvedRegulators",
        "outputs":  [
                        {
                            "internalType":  "address",
                            "name":  "",
                            "type":  "address"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "",
                           "type":  "address"
                       }
                   ],
        "name":  "approvedRegulatorsMap",
        "outputs":  [
                        {
                            "internalType":  "bool",
                            "name":  "",
                            "type":  "bool"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "string",
                           "name":  "",
                           "type":  "string"
                       }
                   ],
        "name":  "batchCodeToBatchId",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       }
                   ],
        "name":  "batchCores",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "id",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "string",
                            "name":  "batchCode",
                            "type":  "string"
                        },
                        {
                            "internalType":  "address",
                            "name":  "manufacturer",
                            "type":  "address"
                        },
                        {
                            "internalType":  "string",
                            "name":  "drugName",
                            "type":  "string"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "quantity",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "mfgDate",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "expDate",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "createdAt",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "bytes32",
                            "name":  "dataHash",
                            "type":  "bytes32"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       }
                   ],
        "name":  "batchHistories",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "timestamp",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "string",
                            "name":  "location",
                            "type":  "string"
                        },
                        {
                            "internalType":  "enum MediTrustChainV2.BatchStatus",
                            "name":  "status",
                            "type":  "uint8"
                        },
                        {
                            "internalType":  "address",
                            "name":  "updatedBy",
                            "type":  "address"
                        },
                        {
                            "internalType":  "string",
                            "name":  "notes",
                            "type":  "string"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       }
                   ],
        "name":  "batchStates",
        "outputs":  [
                        {
                            "internalType":  "enum MediTrustChainV2.BatchStatus",
                            "name":  "status",
                            "type":  "uint8"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "approvedAt",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "bytes32",
                            "name":  "approvalHash",
                            "type":  "bytes32"
                        },
                        {
                            "internalType":  "address",
                            "name":  "currentHolder",
                            "type":  "address"
                        },
                        {
                            "internalType":  "string",
                            "name":  "lastLocation",
                            "type":  "string"
                        },
                        {
                            "internalType":  "bool",
                            "name":  "isRecalled",
                            "type":  "bool"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "lastUpdated",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "string",
                           "name":  "_batchCode",
                           "type":  "string"
                       },
                       {
                           "internalType":  "string",
                           "name":  "_drugName",
                           "type":  "string"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_quantity",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_mfgDate",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_expDate",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_drugTemplateId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "createBatch",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "getApprovedRegulators",
        "outputs":  [
                        {
                            "internalType":  "address[]",
                            "name":  "",
                            "type":  "address[]"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_batchId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "getBatchCore",
        "outputs":  [
                        {
                            "components":  [
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "id",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "string",
                                                   "name":  "batchCode",
                                                   "type":  "string"
                                               },
                                               {
                                                   "internalType":  "address",
                                                   "name":  "manufacturer",
                                                   "type":  "address"
                                               },
                                               {
                                                   "internalType":  "string",
                                                   "name":  "drugName",
                                                   "type":  "string"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "quantity",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "mfgDate",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "expDate",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "createdAt",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "bytes32",
                                                   "name":  "dataHash",
                                                   "type":  "bytes32"
                                               }
                                           ],
                            "internalType":  "struct MediTrustChainV2.BatchCore",
                            "name":  "",
                            "type":  "tuple"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_batchId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "getBatchFull",
        "outputs":  [
                        {
                            "components":  [
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "id",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "string",
                                                   "name":  "batchCode",
                                                   "type":  "string"
                                               },
                                               {
                                                   "internalType":  "address",
                                                   "name":  "manufacturer",
                                                   "type":  "address"
                                               },
                                               {
                                                   "internalType":  "string",
                                                   "name":  "drugName",
                                                   "type":  "string"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "quantity",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "mfgDate",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "expDate",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "createdAt",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "bytes32",
                                                   "name":  "dataHash",
                                                   "type":  "bytes32"
                                               }
                                           ],
                            "internalType":  "struct MediTrustChainV2.BatchCore",
                            "name":  "core",
                            "type":  "tuple"
                        },
                        {
                            "components":  [
                                               {
                                                   "internalType":  "enum MediTrustChainV2.BatchStatus",
                                                   "name":  "status",
                                                   "type":  "uint8"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "approvedAt",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "bytes32",
                                                   "name":  "approvalHash",
                                                   "type":  "bytes32"
                                               },
                                               {
                                                   "internalType":  "address",
                                                   "name":  "currentHolder",
                                                   "type":  "address"
                                               },
                                               {
                                                   "internalType":  "string",
                                                   "name":  "lastLocation",
                                                   "type":  "string"
                                               },
                                               {
                                                   "internalType":  "bool",
                                                   "name":  "isRecalled",
                                                   "type":  "bool"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "lastUpdated",
                                                   "type":  "uint256"
                                               }
                                           ],
                            "internalType":  "struct MediTrustChainV2.BatchState",
                            "name":  "state",
                            "type":  "tuple"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_batchId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "getBatchHistory",
        "outputs":  [
                        {
                            "components":  [
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "timestamp",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "string",
                                                   "name":  "location",
                                                   "type":  "string"
                                               },
                                               {
                                                   "internalType":  "enum MediTrustChainV2.BatchStatus",
                                                   "name":  "status",
                                                   "type":  "uint8"
                                               },
                                               {
                                                   "internalType":  "address",
                                                   "name":  "updatedBy",
                                                   "type":  "address"
                                               },
                                               {
                                                   "internalType":  "string",
                                                   "name":  "notes",
                                                   "type":  "string"
                                               }
                                           ],
                            "internalType":  "struct MediTrustChainV2.BatchHistory[]",
                            "name":  "",
                            "type":  "tuple[]"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "string",
                           "name":  "_batchCode",
                           "type":  "string"
                       }
                   ],
        "name":  "getBatchIdByCode",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_batchId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "getBatchState",
        "outputs":  [
                        {
                            "components":  [
                                               {
                                                   "internalType":  "enum MediTrustChainV2.BatchStatus",
                                                   "name":  "status",
                                                   "type":  "uint8"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "approvedAt",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "bytes32",
                                                   "name":  "approvalHash",
                                                   "type":  "bytes32"
                                               },
                                               {
                                                   "internalType":  "address",
                                                   "name":  "currentHolder",
                                                   "type":  "address"
                                               },
                                               {
                                                   "internalType":  "string",
                                                   "name":  "lastLocation",
                                                   "type":  "string"
                                               },
                                               {
                                                   "internalType":  "bool",
                                                   "name":  "isRecalled",
                                                   "type":  "bool"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "lastUpdated",
                                                   "type":  "uint256"
                                               }
                                           ],
                            "internalType":  "struct MediTrustChainV2.BatchState",
                            "name":  "",
                            "type":  "tuple"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "getTotalBatches",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "_regulatorAddress",
                           "type":  "address"
                       }
                   ],
        "name":  "grantRegulatoryApproval",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "owner",
        "outputs":  [
                        {
                            "internalType":  "address",
                            "name":  "",
                            "type":  "address"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "pause",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "paused",
        "outputs":  [
                        {
                            "internalType":  "bool",
                            "name":  "",
                            "type":  "bool"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_batchId",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "string",
                           "name":  "_reason",
                           "type":  "string"
                       }
                   ],
        "name":  "recallBatch",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "enum MediTrustChainV2.UserRole",
                           "name":  "_role",
                           "type":  "uint8"
                       },
                       {
                           "internalType":  "string",
                           "name":  "_organizationName",
                           "type":  "string"
                       }
                   ],
        "name":  "registerUser",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_batchId",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "string",
                           "name":  "_reason",
                           "type":  "string"
                       }
                   ],
        "name":  "rejectBatch",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "renounceOwnership",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_batchId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "submitForApproval",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "newOwner",
                           "type":  "address"
                       }
                   ],
        "name":  "transferOwnership",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "unpause",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_batchId",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "enum MediTrustChainV2.BatchStatus",
                           "name":  "_newStatus",
                           "type":  "uint8"
                       },
                       {
                           "internalType":  "string",
                           "name":  "_location",
                           "type":  "string"
                       }
                   ],
        "name":  "updateBatchStatus",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "",
                           "type":  "address"
                       }
                   ],
        "name":  "users",
        "outputs":  [
                        {
                            "internalType":  "address",
                            "name":  "walletAddress",
                            "type":  "address"
                        },
                        {
                            "internalType":  "enum MediTrustChainV2.UserRole",
                            "name":  "role",
                            "type":  "uint8"
                        },
                        {
                            "internalType":  "string",
                            "name":  "organizationName",
                            "type":  "string"
                        },
                        {
                            "internalType":  "bool",
                            "name":  "isActive",
                            "type":  "bool"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "registeredAt",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_batchId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "verifyBatchAuthenticity",
        "outputs":  [
                        {
                            "internalType":  "bool",
                            "name":  "isGenuine",
                            "type":  "bool"
                        },
                        {
                            "internalType":  "string",
                            "name":  "status",
                            "type":  "string"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_batchId",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "bytes32",
                           "name":  "_providedHash",
                           "type":  "bytes32"
                       }
                   ],
        "name":  "verifyBatchWithHash",
        "outputs":  [
                        {
                            "internalType":  "bool",
                            "name":  "isGenuine",
                            "type":  "bool"
                        },
                        {
                            "internalType":  "string",
                            "name":  "status",
                            "type":  "string"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "templateId",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "drugCode",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "drugName",
                "type": "string"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "approvedBy",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "compositionHash",
                "type": "bytes32"
            }
        ],
        "name": "DrugTemplateCreated",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "drugCode",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "drugName",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "composition",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "strength",
                "type": "string"
            }
        ],
        "name": "approveDrugTemplate",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "templateId",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "templateId",
                "type": "uint256"
            }
        ],
        "name": "getDrugTemplate",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "id",
                        "type": "uint256"
                    },
                    {
                        "internalType": "string",
                        "name": "drugCode",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "drugName",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "composition",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "strength",
                        "type": "string"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "compositionHash",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "address",
                        "name": "approvedBy",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "approvedAt",
                        "type": "uint256"
                    },
                    {
                        "internalType": "bool",
                        "name": "isActive",
                        "type": "bool"
                    }
                ],
                "internalType": "struct MediTrustChainV2.DrugTemplate",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];
