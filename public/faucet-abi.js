const faucetABI = [
  // Constructor
  {
    "inputs": [{"name": "_required_nft_contract", "type": "address"}],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  // Default payable function
  {
    "stateMutability": "payable",
    "type": "fallback"
  },
  // Public state variables (getters)
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "arg0", "type": "address"}],
    "name": "whitelist",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "arg0", "type": "address"}],
    "name": "last_claim_time",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "required_nft_contract",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claim_cooldown",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claim_amount",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "name": "user", "type": "address"},
      {"indexed": false, "name": "is_whitelisted", "type": "bool"}
    ],
    "name": "WhitelistUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "name": "old_contract", "type": "address"},
      {"indexed": false, "name": "new_contract", "type": "address"}
    ],
    "name": "NFTContractUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "name": "recipient", "type": "address"},
      {"indexed": false, "name": "amount", "type": "uint256"}
    ],
    "name": "FaucetClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "name": "donor", "type": "address"},
      {"indexed": false, "name": "amount", "type": "uint256"}
    ],
    "name": "FaucetDonation",
    "type": "event"
  },
  // External functions
  {
    "inputs": [],
    "name": "donate",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_user", "type": "address"}],
    "name": "add_to_whitelist",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_user", "type": "address"}],
    "name": "remove_from_whitelist",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "_users", "type": "address[]"},
      {"name": "_statuses", "type": "bool[]"}
    ],
    "name": "bulk_update_whitelist",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_new_contract", "type": "address"}],
    "name": "set_nft_contract",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_amount", "type": "uint256"}],
    "name": "set_claim_amount",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_seconds", "type": "uint256"}],
    "name": "set_claim_cooldown",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_user", "type": "address"}],
    "name": "is_whitelisted",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "_user", "type": "address"}],
    "name": "can_claim",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "_user", "type": "address"}],
    "name": "time_until_next_claim",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "_amount", "type": "uint256"}],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_new_owner", "type": "address"}],
    "name": "transfer_ownership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
