const faucetABI = [
  {
      "stateMutability": "nonpayable",
      "type": "constructor",
      "inputs": [
          {"name": "_required_nft_contract", "type": "address"},
          {"name": "_required_token_id", "type": "uint256"}
      ]
  },
  {
      "stateMutability": "nonpayable",
      "type": "function",
      "name": "add_to_whitelist",
      "inputs": [{"name": "_user", "type": "address"}],
      "outputs": []
  },
  {
      "stateMutability": "nonpayable",
      "type": "function",
      "name": "remove_from_whitelist",
      "inputs": [{"name": "_user", "type": "address"}],
      "outputs": []
  },
  {
      "stateMutability": "nonpayable",
      "type": "function",
      "name": "bulk_update_whitelist",
      "inputs": [
          {"name": "_users", "type": "address[]"},
          {"name": "_statuses", "type": "bool[]"}
      ],
      "outputs": []
  },
  {
      "stateMutability": "nonpayable",
      "type": "function",
      "name": "set_nft_contract",
      "inputs": [{"name": "_new_contract", "type": "address"}],
      "outputs": []
  },
  {
      "stateMutability": "nonpayable",
      "type": "function",
      "name": "set_required_token_id",
      "inputs": [{"name": "_new_token_id", "type": "uint256"}],
      "outputs": []
  },
  {
      "stateMutability": "nonpayable",
      "type": "function",
      "name": "set_claim_amount",
      "inputs": [{"name": "_amount", "type": "uint256"}],
      "outputs": []
  },
  {
      "stateMutability": "nonpayable",
      "type": "function",
      "name": "set_claim_cooldown",
      "inputs": [{"name": "_seconds", "type": "uint256"}],
      "outputs": []
  },
  {
      "stateMutability": "nonpayable",
      "type": "function",
      "name": "claim",
      "inputs": [],
      "outputs": []
  },
  {
      "stateMutability": "payable",
      "type": "function",
      "name": "donate",
      "inputs": [],
      "outputs": []
  },
  {
      "stateMutability": "nonpayable",
      "type": "function",
      "name": "withdraw",
      "inputs": [{"name": "_amount", "type": "uint256"}],
      "outputs": []
  },
  {
      "stateMutability": "nonpayable",
      "type": "function",
      "name": "transfer_ownership",
      "inputs": [{"name": "_new_owner", "type": "address"}],
      "outputs": []
  },
  {
      "stateMutability": "view",
      "type": "function",
      "name": "is_whitelisted",
      "inputs": [{"name": "_user", "type": "address"}],
      "outputs": [{"name": "", "type": "bool"}]
  },
  {
      "stateMutability": "view",
      "type": "function",
      "name": "can_claim",
      "inputs": [{"name": "_user", "type": "address"}],
      "outputs": [{"name": "", "type": "bool"}]
  },
  {
      "stateMutability": "view",
      "type": "function",
      "name": "time_until_next_claim",
      "inputs": [{"name": "_user", "type": "address"}],
      "outputs": [{"name": "", "type": "uint256"}]
  },
  {
      "stateMutability": "view",
      "type": "function",
      "name": "owner",
      "inputs": [],
      "outputs": [{"name": "", "type": "address"}]
  },
  {
      "stateMutability": "view",
      "type": "function",
      "name": "whitelist",
      "inputs": [{"name": "arg0", "type": "address"}],
      "outputs": [{"name": "", "type": "bool"}]
  },
  {
      "stateMutability": "view",
      "type": "function",
      "name": "last_claim_time",
      "inputs": [{"name": "arg0", "type": "address"}],
      "outputs": [{"name": "", "type": "uint256"}]
  },
  {
      "stateMutability": "view",
      "type": "function",
      "name": "required_nft_contract",
      "inputs": [],
      "outputs": [{"name": "", "type": "address"}]
  },
  {
      "stateMutability": "view",
      "type": "function",
      "name": "required_token_id",
      "inputs": [],
      "outputs": [{"name": "", "type": "uint256"}]
  },
  {
      "stateMutability": "view",
      "type": "function",
      "name": "claim_cooldown",
      "inputs": [],
      "outputs": [{"name": "", "type": "uint256"}]
  },
  {
      "stateMutability": "view",
      "type": "function",
      "name": "claim_amount",
      "inputs": [],
      "outputs": [{"name": "", "type": "uint256"}]
  },
  {
      "stateMutability": "payable",
      "type": "receive"
  },
  {
      "type": "event",
      "name": "WhitelistUpdated",
      "inputs": [
          {"name": "user", "type": "address", "indexed": false},
          {"name": "is_whitelisted", "type": "bool", "indexed": false}
      ]
  },
  {
      "type": "event",
      "name": "NFTContractUpdated",
      "inputs": [
          {"name": "old_contract", "type": "address", "indexed": false},
          {"name": "new_contract", "type": "address", "indexed": false}
      ]
  },
  {
      "type": "event",
      "name": "RequiredTokenIdUpdated",
      "inputs": [
          {"name": "old_token_id", "type": "uint256", "indexed": false},
          {"name": "new_token_id", "type": "uint256", "indexed": false}
      ]
  },
  {
      "type": "event",
      "name": "FaucetClaimed",
      "inputs": [
          {"name": "recipient", "type": "address", "indexed": false},
          {"name": "amount", "type": "uint256", "indexed": false}
      ]
  },
  {
      "type": "event",
      "name": "FaucetDonation",
      "inputs": [
          {"name": "donor", "type": "address", "indexed": false},
          {"name": "amount", "type": "uint256", "indexed": false}
      ]
  }
];