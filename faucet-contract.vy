# @version ^0.3.7

# Interface for ERC1155
interface ERC1155:
    def balanceOf(_owner: address, _id: uint256) -> uint256: view

# State variables
owner: public(address)
whitelist: public(HashMap[address, bool])
last_claim_time: public(HashMap[address, uint256])
required_nft_contract: public(address)
required_token_id: public(uint256)  # Specific token ID required for claiming
claim_cooldown: public(uint256)    # 24 hours in seconds
claim_amount: public(uint256)      # 0.3 Sepolia in wei

# Events
event WhitelistUpdated:
    user: address
    is_whitelisted: bool

event NFTContractUpdated:
    old_contract: address
    new_contract: address

event RequiredTokenIdUpdated:
    old_token_id: uint256
    new_token_id: uint256

event FaucetClaimed:
    recipient: address
    amount: uint256
    
event FaucetDonation:
    donor: address
    amount: uint256

@external
def __init__(_required_nft_contract: address, _required_token_id: uint256):
    self.owner = msg.sender
    self.claim_cooldown = 86400             # 24 hours in seconds
    self.claim_amount = 300000000000000000  # 0.3 Sepolia ETH in wei
    self.required_nft_contract = _required_nft_contract
    self.required_token_id = _required_token_id

@external
@payable
def __default__():
    # Allow receiving ETH
    pass

@external
@payable
def donate():
    """
    Allow users to donate Sepolia ETH to the faucet
    """
    assert msg.value > 0, "Donation must be greater than 0"
    log FaucetDonation(msg.sender, msg.value)

@external
def claim():
    """
    Claim Sepolia from the faucet if all conditions are met
    """
    # Check if the user is whitelisted
    assert self.whitelist[msg.sender], "Address not whitelisted"
    
    # Check if the cooldown period has passed
    assert block.timestamp > self.last_claim_time[msg.sender] + self.claim_cooldown, "Cooldown period not passed"
    
    # Check if the user owns the specific required NFT
    nft_contract: ERC1155 = ERC1155(self.required_nft_contract)
    assert nft_contract.balanceOf(msg.sender, self.required_token_id) > 0, "User does not own the required NFT"
    
    # Check if the contract has enough balance
    assert self.balance >= self.claim_amount, "Faucet is empty"
    
    # Update the last claim time
    self.last_claim_time[msg.sender] = block.timestamp
    
    # Send the Sepolia ETH
    send(msg.sender, self.claim_amount)
    
    # Emit event
    log FaucetClaimed(msg.sender, self.claim_amount)

@external
def add_to_whitelist(_user: address):
    """
    Add a user to the whitelist
    """
    assert msg.sender == self.owner, "Only owner can update whitelist"
    self.whitelist[_user] = True
    log WhitelistUpdated(_user, True)

@external
def remove_from_whitelist(_user: address):
    """
    Remove a user from the whitelist
    """
    assert msg.sender == self.owner, "Only owner can update whitelist"
    self.whitelist[_user] = False
    log WhitelistUpdated(_user, False)

@external
def bulk_update_whitelist(_users: DynArray[address, 100], _statuses: DynArray[bool, 100]):
    """
    Bulk update whitelist status for multiple users
    """
    assert msg.sender == self.owner, "Only owner can update whitelist"
    assert len(_users) == len(_statuses), "Input arrays must be the same length"
    
    for i in range(100):
        if i >= len(_users):
            break
        self.whitelist[_users[i]] = _statuses[i]
        log WhitelistUpdated(_users[i], _statuses[i])

@external
def set_nft_contract(_new_contract: address):
    """
    Update the required NFT contract address
    """
    assert msg.sender == self.owner, "Only owner can update NFT contract"
    old_contract: address = self.required_nft_contract
    self.required_nft_contract = _new_contract
    log NFTContractUpdated(old_contract, _new_contract)

@external
def set_required_token_id(_new_token_id: uint256):
    """
    Update the required token ID for claiming
    """
    assert msg.sender == self.owner, "Only owner can update required token ID"
    old_token_id: uint256 = self.required_token_id
    self.required_token_id = _new_token_id
    log RequiredTokenIdUpdated(old_token_id, _new_token_id)

@external
def set_claim_amount(_amount: uint256):
    """
    Update the claim amount
    """
    assert msg.sender == self.owner, "Only owner can update claim amount"
    self.claim_amount = _amount

@external
def set_claim_cooldown(_seconds: uint256):
    """
    Update the claim cooldown period
    """
    assert msg.sender == self.owner, "Only owner can update cooldown period"
    self.claim_cooldown = _seconds

@external
@view
def is_whitelisted(_user: address) -> bool:
    """
    Check if a user is whitelisted
    """
    return self.whitelist[_user]

@external
@view
def can_claim(_user: address) -> bool:
    """
    Check if a user can claim from the faucet
    """
    if not self.whitelist[_user]:
        return False
        
    if block.timestamp <= self.last_claim_time[_user] + self.claim_cooldown:
        return False
    
    nft_contract: ERC1155 = ERC1155(self.required_nft_contract)
    if nft_contract.balanceOf(_user, self.required_token_id) == 0:
        return False
    
    return self.balance >= self.claim_amount

@external
@view
def time_until_next_claim(_user: address) -> uint256:
    """
    Get the time remaining until user can claim again (in seconds)
    """
    last_time: uint256 = self.last_claim_time[_user]
    if last_time == 0:
        return 0
        
    next_eligible_time: uint256 = last_time + self.claim_cooldown
    
    if block.timestamp >= next_eligible_time:
        return 0
    else:
        return next_eligible_time - block.timestamp

@external
def withdraw(_amount: uint256):
    """
    Allow the owner to withdraw funds from the faucet
    """
    assert msg.sender == self.owner, "Only owner can withdraw"
    assert _amount <= self.balance, "Insufficient balance"
    send(self.owner, _amount)

@external
def transfer_ownership(_new_owner: address):
    """
    Transfer contract ownership to a new address
    """
    assert msg.sender == self.owner, "Only owner can transfer ownership"
    self.owner = _new_owner