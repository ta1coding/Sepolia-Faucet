// Global variables
let provider;
let signer;
let faucetContract;
let currentAccount = null;
let isOwner = false;
const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in decimal
const CONTRACT_ADDRESS = '0xa67D1312ED237517f6111dE20820AcAF4D6c5084'; // Your deployed contract address

// Initialize the application
async function initApp() {
    if (typeof window.ethereum === 'undefined') {
        updateConnectionStatus('MetaMask is not installed. Please install MetaMask to use this app.', false);
        return;
    }

    try {
        // Request accounts from MetaMask
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        // Create Web3Provider
        provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();
        
        if (network.chainId !== 11155111) {
            updateConnectionStatus(`Please connect to Sepolia testnet. Current network: ${network.name}`, false);
            await switchToSepoliaNetwork();
            return;
        }
        
        signer = provider.getSigner();
        currentAccount = await signer.getAddress();
        faucetContract = new ethers.Contract(CONTRACT_ADDRESS, faucetABI, signer);
        
        const contractOwner = await faucetContract.owner();
        isOwner = currentAccount.toLowerCase() === contractOwner.toLowerCase();
        
        updateConnectionStatus(`Connected: ${formatAddress(currentAccount)}`, true);
        document.getElementById('userAddress').textContent = formatAddress(currentAccount);
        
        await updateFaucetInfo();
        await updateEligibilityStatus();
        toggleAdminFunctions();
        
        document.getElementById('claimButton').disabled = false;
        document.getElementById('donateButton').disabled = false;
        
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        
    } catch (error) {
        console.error('Error initializing app:', error);
        updateConnectionStatus('Error connecting to MetaMask. Please try again.', false);
    }
}

// Update connection status
function updateConnectionStatus(message, isConnected) {
    const statusElement = document.getElementById('connectionStatus');
    statusElement.textContent = message;
    statusElement.classList.toggle('disconnected', !isConnected);
    statusElement.classList.toggle('connected', isConnected);
}

// Switch to Sepolia network
async function switchToSepoliaNetwork() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
        });
        window.location.reload();
    } catch (switchError) {
        if (switchError.code === 4902) {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: SEPOLIA_CHAIN_ID,
                    chainName: 'Sepolia Test Network',
                    nativeCurrency: { name: 'Sepolia ETH', symbol: 'SEP', decimals: 18 },
                    rpcUrls: ['https://rpc.sepolia.org'],
                    blockExplorerUrls: ['https://sepolia.etherscan.io/']
                }],
            });
            window.location.reload();
        }
        console.error('Error switching to Sepolia network:', switchError);
    }
}

// Handle account and chain changes
async function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        updateConnectionStatus('Please connect to MetaMask.', false);
        resetUI();
    } else if (accounts[0] !== currentAccount) {
        window.location.reload();
    }
}

function handleChainChanged() {
    window.location.reload();
}

// Reset UI
function resetUI() {
    currentAccount = null;
    isOwner = false;
    document.getElementById('userAddress').textContent = '-';
    document.getElementById('contractAddress').textContent = '-';
    document.getElementById('faucetBalance').textContent = '-';
    document.getElementById('nftContractAddress').textContent = '-';
    document.getElementById('requiredTokenId').textContent = '-';
    document.getElementById('claimAmount').textContent = '-';
    document.getElementById('claimCooldown').textContent = '-';
    document.getElementById('claimButton').disabled = true;
    document.getElementById('donateButton').disabled = true;
    document.getElementById('eligibilityInfo').textContent = 'Connect your wallet to check eligibility';
    toggleAdminFunctions();
}

// Update faucet info
async function updateFaucetInfo() {
    try {
        document.getElementById('contractAddress').textContent = formatAddress(CONTRACT_ADDRESS);
        const balance = await provider.getBalance(CONTRACT_ADDRESS);
        document.getElementById('faucetBalance').textContent = ethers.utils.formatEther(balance);
        const nftContract = await faucetContract.required_nft_contract();
        document.getElementById('nftContractAddress').textContent = formatAddress(nftContract);
        const requiredTokenId = await faucetContract.required_token_id();
        document.getElementById('requiredTokenId').textContent = requiredTokenId.toString();
        const claimAmount = await faucetContract.claim_amount();
        document.getElementById('claimAmount').textContent = ethers.utils.formatEther(claimAmount);
        const claimCooldown = await faucetContract.claim_cooldown();
        document.getElementById('claimCooldown').textContent = (claimCooldown / 3600).toString();
    } catch (error) {
        console.error('Error updating faucet info:', error);
    }
}

// Update eligibility status
async function updateEligibilityStatus() {
    try {
        if (!currentAccount) return;
        
        const eligibilityInfoElement = document.getElementById('eligibilityInfo');
        eligibilityInfoElement.className = 'alert';
        
        const isWhitelisted = await faucetContract.is_whitelisted(currentAccount);
        if (!isWhitelisted) {
            eligibilityInfoElement.textContent = 'You are not whitelisted. Please contact the admin to be added to the whitelist.';
            eligibilityInfoElement.classList.add('alert-danger');
            document.getElementById('claimButton').disabled = true;
            return;
        }
        
        const nftContract = await faucetContract.required_nft_contract();
        const requiredTokenId = await faucetContract.required_token_id();
        const ERC1155_ABI = ["function balanceOf(address owner, uint256 id) view returns (uint256)"];
        const nftContractInstance = new ethers.Contract(nftContract, ERC1155_ABI, provider);
        
        let balance;
        try {
            balance = await nftContractInstance.balanceOf(currentAccount, requiredTokenId);
        } catch (nftError) {
            console.error('Error checking NFT balance:', nftError);
            eligibilityInfoElement.textContent = `Error checking NFT ownership: ${nftError.message}`;
            eligibilityInfoElement.classList.add('alert-danger');
            document.getElementById('claimButton').disabled = true;
            return;
        }
        
        if (balance.eq(0)) {
            eligibilityInfoElement.textContent = `You don’t own the required NFT (Token ID: ${requiredTokenId}) from ${formatAddress(nftContract)}.`;
            eligibilityInfoElement.classList.add('alert-danger');
            document.getElementById('claimButton').disabled = true;
            return;
        }
        
        const timeUntilNextClaim = await faucetContract.time_until_next_claim(currentAccount);
        if (!timeUntilNextClaim.eq(0)) {
            const hours = Math.floor(timeUntilNextClaim / 3600);
            const minutes = Math.floor((timeUntilNextClaim % 3600) / 60);
            eligibilityInfoElement.textContent = `You need to wait ${hours}h ${minutes}m before claiming again.`;
            eligibilityInfoElement.classList.add('alert-warning');
            document.getElementById('claimButton').disabled = true;
            return;
        }
        
        const claimAmount = await faucetContract.claim_amount();
        const contractBalance = await provider.getBalance(CONTRACT_ADDRESS);
        if (contractBalance.lt(claimAmount)) {
            eligibilityInfoElement.textContent = 'The faucet is currently empty. Please try again later.';
            eligibilityInfoElement.classList.add('alert-warning');
            document.getElementById('claimButton').disabled = true;
            return;
        }
        
        eligibilityInfoElement.textContent = 'You are eligible to claim Sepolia ETH!';
        eligibilityInfoElement.classList.add('alert-success');
        document.getElementById('claimButton').disabled = false;
        
    } catch (error) {
        console.error('Error checking eligibility:', error);
        document.getElementById('eligibilityInfo').textContent = 'Error checking eligibility. Please try again.';
        document.getElementById('eligibilityInfo').className = 'alert alert-danger';
    }
}

// Toggle admin functions
function toggleAdminFunctions() {
    document.getElementById('notOwnerWarning').style.display = isOwner ? 'none' : 'block';
    document.getElementById('adminFunctions').style.display = isOwner ? 'block' : 'none';
}

// Format address
function formatAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Claim Sepolia ETH
async function claimEth() {
    try {
        const statusElement = document.getElementById('claimStatus');
        statusElement.textContent = 'Claiming Sepolia ETH...';
        statusElement.className = 'alert alert-info';
        statusElement.style.display = 'block';
        
        const tx = await faucetContract.claim();
        statusElement.textContent = 'Transaction submitted. Waiting for confirmation...';
        await tx.wait();
        
        statusElement.textContent = 'Successfully claimed Sepolia ETH!';
        statusElement.className = 'alert alert-success';
        
        await updateFaucetInfo();
        await updateEligibilityStatus();
        
    } catch (error) {
        console.error('Error claiming ETH:', error);
        document.getElementById('claimStatus').textContent = `Error: ${error.message}`;
        document.getElementById('claimStatus').className = 'alert alert-danger';
        document.getElementById('claimStatus').style.display = 'block';
    }
}

// Donate Sepolia ETH
async function donateEth() {
    try {
        const donationAmount = document.getElementById('donationAmount').value;
        const donationWei = ethers.utils.parseEther(donationAmount);
        
        if (donationWei.lte(0)) {
            document.getElementById('donateStatus').textContent = 'Please enter a valid donation amount.';
            document.getElementById('donateStatus').className = 'alert alert-danger';
            document.getElementById('donateStatus').style.display = 'block';
            return;
        }
        
        const statusElement = document.getElementById('donateStatus');
        statusElement.textContent = `Donating ${donationAmount} Sepolia ETH...`;
        statusElement.className = 'alert alert-info';
        statusElement.style.display = 'block';
        
        const tx = await faucetContract.donate({ value: donationWei });
        statusElement.textContent = 'Transaction submitted. Waiting for confirmation...';
        await tx.wait();
        
        statusElement.textContent = 'Thank you for your donation!';
        statusElement.className = 'alert alert-success';
        document.getElementById('donationAmount').value = '';
        await updateFaucetInfo();
        
    } catch (error) {
        console.error('Error donating ETH:', error);
        document.getElementById('donateStatus').textContent = `Error: ${error.message}`;
        document.getElementById('donateStatus').className = 'alert alert-danger';
        document.getElementById('donateStatus').style.display = 'block';
    }
}

// Check whitelist status
async function checkWhitelistStatus() {
    try {
        const address = document.getElementById('checkWhitelistAddress').value;
        if (!ethers.utils.isAddress(address)) {
            document.getElementById('whitelistStatus').textContent = 'Please enter a valid Ethereum address.';
            document.getElementById('whitelistStatus').className = 'alert alert-danger';
            document.getElementById('whitelistStatus').style.display = 'block';
            return;
        }
        
        const isWhitelisted = await faucetContract.is_whitelisted(address);
        document.getElementById('whitelistStatus').textContent = `Address ${formatAddress(address)} is ${isWhitelisted ? '' : 'not '}whitelisted.`;
        document.getElementById('whitelistStatus').className = `alert alert-${isWhitelisted ? 'success' : 'danger'}`;
        document.getElementById('whitelistStatus').style.display = 'block';
    } catch (error) {
        console.error('Error checking whitelist status:', error);
        document.getElementById('whitelistStatus').textContent = `Error: ${error.message}`;
        document.getElementById('whitelistStatus').className = 'alert alert-danger';
        document.getElementById('whitelistStatus').style.display = 'block';
    }
}

// Add to whitelist
async function addToWhitelist() {
    try {
        const address = document.getElementById('whitelistAddress').value;
        if (!ethers.utils.isAddress(address)) {
            document.getElementById('adminStatus').textContent = 'Please enter a valid Ethereum address.';
            document.getElementById('adminStatus').className = 'alert alert-danger';
            document.getElementById('adminStatus').style.display = 'block';
            return;
        }
        
        const statusElement = document.getElementById('adminStatus');
        statusElement.textContent = `Adding ${formatAddress(address)} to whitelist...`;
        statusElement.className = 'alert alert-info';
        statusElement.style.display = 'block';
        
        const tx = await faucetContract.add_to_whitelist(address);
        statusElement.textContent = 'Transaction submitted. Waiting for confirmation...';
        await tx.wait();
        
        statusElement.textContent = `Successfully added ${formatAddress(address)} to whitelist!`;
        statusElement.className = 'alert alert-success';
        document.getElementById('whitelistAddress').value = '';
        
    } catch (error) {
        console.error('Error adding to whitelist:', error);
        document.getElementById('adminStatus').textContent = `Error: ${error.message}`;
        document.getElementById('adminStatus').className = 'alert alert-danger';
        document.getElementById('adminStatus').style.display = 'block';
    }
}

// Remove from whitelist
async function removeFromWhitelist() {
    try {
        const address = document.getElementById('whitelistAddress').value;
        if (!ethers.utils.isAddress(address)) {
            document.getElementById('adminStatus').textContent = 'Please enter a valid Ethereum address.';
            document.getElementById('adminStatus').className = 'alert alert-danger';
            document.getElementById('adminStatus').style.display = 'block';
            return;
        }
        
        const statusElement = document.getElementById('adminStatus');
        statusElement.textContent = `Removing ${formatAddress(address)} from whitelist...`;
        statusElement.className = 'alert alert-info';
        statusElement.style.display = 'block';
        
        const tx = await faucetContract.remove_from_whitelist(address);
        statusElement.textContent = 'Transaction submitted. Waiting for confirmation...';
        await tx.wait();
        
        statusElement.textContent = `Successfully removed ${formatAddress(address)} from whitelist!`;
        statusElement.className = 'alert alert-success';
        document.getElementById('whitelistAddress').value = '';
        
    } catch (error) {
        console.error('Error removing from whitelist:', error);
        document.getElementById('adminStatus').textContent = `Error: ${error.message}`;
        document.getElementById('adminStatus').className = 'alert alert-danger';
        document.getElementById('adminStatus').style.display = 'block';
    }
}

// Bulk whitelist update
async function processBulkWhitelist(addToList) {
    try {
        const textareaContent = document.getElementById('bulkWhitelistAddresses').value;
        const addresses = textareaContent.split(/[\n,]+/).map(addr => addr.trim()).filter(addr => addr && ethers.utils.isAddress(addr));
        
        if (addresses.length === 0) {
            document.getElementById('adminStatus').textContent = 'No valid Ethereum addresses found.';
            document.getElementById('adminStatus').className = 'alert alert-danger';
            document.getElementById('adminStatus').style.display = 'block';
            return;
        }
        
        if (addresses.length > 100) {
            document.getElementById('adminStatus').textContent = 'Too many addresses. Please limit to 100 addresses at a time.';
            document.getElementById('adminStatus').className = 'alert alert-danger';
            document.getElementById('adminStatus').style.display = 'block';
            return;
        }
        
        const statusElement = document.getElementById('adminStatus');
        const action = addToList ? 'Adding' : 'Removing';
        statusElement.textContent = `${action} ${addresses.length} addresses to/from whitelist...`;
        statusElement.className = 'alert alert-info';
        statusElement.style.display = 'block';
        
        const statusArray = Array(addresses.length).fill(addToList);
        const tx = await faucetContract.bulk_update_whitelist(addresses, statusArray);
        statusElement.textContent = 'Transaction submitted. Waiting for confirmation...';
        await tx.wait();
        
        statusElement.textContent = `Successfully ${action.toLowerCase()} ${addresses.length} addresses!`;
        statusElement.className = 'alert alert-success';
        document.getElementById('bulkWhitelistAddresses').value = '';
        
    } catch (error) {
        console.error('Error processing bulk whitelist:', error);
        document.getElementById('adminStatus').textContent = `Error: ${error.message}`;
        document.getElementById('adminStatus').className = 'alert alert-danger';
        document.getElementById('adminStatus').style.display = 'block';
    }
}

// Update NFT contract address
async function updateNftContract() {
    try {
        const newContractAddress = document.getElementById('newNftContract').value;
        if (!ethers.utils.isAddress(newContractAddress)) {
            document.getElementById('adminStatus').textContent = 'Please enter a valid Ethereum address.';
            document.getElementById('adminStatus').className = 'alert alert-danger';
            document.getElementById('adminStatus').style.display = 'block';
            return;
        }
        
        const statusElement = document.getElementById('adminStatus');
        statusElement.textContent = 'Updating NFT contract address...';
        statusElement.className = 'alert alert-info';
        statusElement.style.display = 'block';
        
        const tx = await faucetContract.set_nft_contract(newContractAddress);
        statusElement.textContent = 'Transaction submitted. Waiting for confirmation...';
        await tx.wait();
        
        statusElement.textContent = 'Successfully updated NFT contract address!';
        statusElement.className = 'alert alert-success';
        document.getElementById('newNftContract').value = '';
        await updateFaucetInfo();
        
    } catch (error) {
        console.error('Error updating NFT contract:', error);
        document.getElementById('adminStatus').textContent = `Error: ${error.message}`;
        document.getElementById('adminStatus').className = 'alert alert-danger';
        document.getElementById('adminStatus').style.display = 'block';
    }
}

// Update required token ID
async function updateRequiredTokenId() {
    try {
        const newTokenId = document.getElementById('newRequiredTokenId').value;
        const tokenId = parseInt(newTokenId);
        
        if (isNaN(tokenId) || tokenId < 0) {
            document.getElementById('adminStatus').textContent = 'Please enter a valid token ID (non-negative integer).';
            document.getElementById('adminStatus').className = 'alert alert-danger';
            document.getElementById('adminStatus').style.display = 'block';
            return;
        }
        
        const statusElement = document.getElementById('adminStatus');
        statusElement.textContent = `Updating required token ID to ${tokenId}...`;
        statusElement.className = 'alert alert-info';
        statusElement.style.display = 'block';
        
        const tx = await faucetContract.set_required_token_id(tokenId);
        statusElement.textContent = 'Transaction submitted. Waiting for confirmation...';
        await tx.wait();
        
        statusElement.textContent = `Successfully updated required token ID to ${tokenId}!`;
        statusElement.className = 'alert alert-success';
        document.getElementById('newRequiredTokenId').value = '';
        await updateFaucetInfo();
        await updateEligibilityStatus();
        
    } catch (error) {
        console.error('Error updating required token ID:', error);
        document.getElementById('adminStatus').textContent = `Error: ${error.message}`;
        document.getElementById('adminStatus').className = 'alert alert-danger';
        document.getElementById('adminStatus').style.display = 'block';
    }
}

// Update claim amount
async function updateClaimAmount() {
    try {
        const amountEth = document.getElementById('newClaimAmount').value;
        const amountWei = ethers.utils.parseEther(amountEth);
        
        if (amountWei.lte(0)) {
            document.getElementById('adminStatus').textContent = 'Please enter a valid amount.';
            document.getElementById('adminStatus').className = 'alert alert-danger';
            document.getElementById('adminStatus').style.display = 'block';
            return;
        }
        
        const statusElement = document.getElementById('adminStatus');
        statusElement.textContent = `Updating claim amount to ${amountEth} ETH...`;
        statusElement.className = 'alert alert-info';
        statusElement.style.display = 'block';
        
        const tx = await faucetContract.set_claim_amount(amountWei);
        statusElement.textContent = 'Transaction submitted. Waiting for confirmation...';
        await tx.wait();
        
        statusElement.textContent = 'Successfully updated claim amount!';
        statusElement.className = 'alert alert-success';
        await updateFaucetInfo();
        
    } catch (error) {
        console.error('Error updating claim amount:', error);
        document.getElementById('adminStatus').textContent = `Error: ${error.message}`;
        document.getElementById('adminStatus').className = 'alert alert-danger';
        document.getElementById('adminStatus').style.display = 'block';
    }
}

// Update claim cooldown
async function updateClaimCooldown() {
    try {
        const cooldownHours = document.getElementById('newClaimCooldown').value;
        const cooldownSeconds = parseInt(cooldownHours) * 3600;
        
        if (cooldownSeconds <= 0) {
            document.getElementById('adminStatus').textContent = 'Please enter a valid cooldown period.';
            document.getElementById('adminStatus').className = 'alert alert-danger';
            document.getElementById('adminStatus').style.display = 'block';
            return;
        }
        
        const statusElement = document.getElementById('adminStatus');
        statusElement.textContent = `Updating claim cooldown to ${cooldownHours} hours...`;
        statusElement.className = 'alert alert-info';
        statusElement.style.display = 'block';
        
        const tx = await faucetContract.set_claim_cooldown(cooldownSeconds);
        statusElement.textContent = 'Transaction submitted. Waiting for confirmation...';
        await tx.wait();
        
        statusElement.textContent = 'Successfully updated claim cooldown!';
        statusElement.className = 'alert alert-success';
        await updateFaucetInfo();
        
    } catch (error) {
        console.error('Error updating claim cooldown:', error);
        document.getElementById('adminStatus').textContent = `Error: ${error.message}`;
        document.getElementById('adminStatus').className = 'alert alert-danger';
        document.getElementById('adminStatus').style.display = 'block';
    }
}

// Transfer ownership
async function transferOwnership() {
    try {
        const newOwnerAddress = document.getElementById('newOwnerAddress').value;
        if (!ethers.utils.isAddress(newOwnerAddress)) {
            document.getElementById('adminStatus').textContent = 'Please enter a valid Ethereum address.';
            document.getElementById('adminStatus').className = 'alert alert-danger';
            document.getElementById('adminStatus').style.display = 'block';
            return;
        }
        
        if (!confirm(`Are you sure you want to transfer ownership to ${newOwnerAddress}? This action cannot be undone!`)) {
            return;
        }
        
        const statusElement = document.getElementById('adminStatus');
        statusElement.textContent = 'Transferring ownership...';
        statusElement.className = 'alert alert-info';
        statusElement.style.display = 'block';
        
        const tx = await faucetContract.transfer_ownership(newOwnerAddress);
        statusElement.textContent = 'Transaction submitted. Waiting for confirmation...';
        await tx.wait();
        
        statusElement.textContent = `Successfully transferred ownership to ${formatAddress(newOwnerAddress)}!`;
        statusElement.className = 'alert alert-success';
        document.getElementById('newOwnerAddress').value = '';
        isOwner = false;
        toggleAdminFunctions();
        
    } catch (error) {
        console.error('Error transferring ownership:', error);
        document.getElementById('adminStatus').textContent = `Error: ${error.message}`;
        document.getElementById('adminStatus').className = 'alert alert-danger';
        document.getElementById('adminStatus').style.display = 'block';
    }
}

// Withdraw ETH
async function withdrawEth() {
    try {
        const amountEth = document.getElementById('withdrawAmount').value;
        const amountWei = ethers.utils.parseEther(amountEth);
        
        if (amountWei.lte(0)) {
            document.getElementById('adminStatus').textContent = 'Please enter a valid amount.';
            document.getElementById('adminStatus').className = 'alert alert-danger';
            document.getElementById('adminStatus').style.display = 'block';
            return;
        }
        
        const contractBalance = await provider.getBalance(CONTRACT_ADDRESS);
        if (amountWei.gt(contractBalance)) {
            document.getElementById('adminStatus').textContent = 'Withdrawal amount exceeds contract balance.';
            document.getElementById('adminStatus').className = 'alert alert-danger';
            document.getElementById('adminStatus').style.display = 'block';
            return;
        }
        
        if (!confirm(`Are you sure you want to withdraw ${amountEth} ETH from the faucet?`)) {
            return;
        }
        
        const statusElement = document.getElementById('adminStatus');
        statusElement.textContent = `Withdrawing ${amountEth} ETH...`;
        statusElement.className = 'alert alert-info';
        statusElement.style.display = 'block';
        
        const tx = await faucetContract.withdraw(amountWei);
        statusElement.textContent = 'Transaction submitted. Waiting for confirmation...';
        await tx.wait();
        
        statusElement.textContent = 'Successfully withdrew ETH!';
        statusElement.className = 'alert alert-success';
        document.getElementById('withdrawAmount').value = '';
        await updateFaucetInfo();
        
    } catch (error) {
        console.error('Error withdrawing ETH:', error);
        document.getElementById('adminStatus').textContent = `Error: ${error.message}`;
        document.getElementById('adminStatus').className = 'alert alert-danger';
        document.getElementById('adminStatus').style.display = 'block';
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('connectionStatus').addEventListener('click', initApp);
    initApp();
    
    document.getElementById('claimButton').addEventListener('click', claimEth);
    document.getElementById('donateButton').addEventListener('click', donateEth);
    document.getElementById('checkWhitelistButton').addEventListener('click', checkWhitelistStatus);
    document.getElementById('addToWhitelistButton').addEventListener('click', addToWhitelist);
    document.getElementById('removeFromWhitelistButton').addEventListener('click', removeFromWhitelist);
    document.getElementById('bulkAddButton').addEventListener('click', () => processBulkWhitelist(true));
    document.getElementById('bulkRemoveButton').addEventListener('click', () => processBulkWhitelist(false));
    document.getElementById('updateNftContractButton').addEventListener('click', updateNftContract);
    document.getElementById('updateRequiredTokenIdButton').addEventListener('click', updateRequiredTokenId);
    document.getElementById('updateClaimAmountButton').addEventListener('click', updateClaimAmount);
    document.getElementById('updateClaimCooldownButton').addEventListener('click', updateClaimCooldown);
    document.getElementById('transferOwnershipButton').addEventListener('click', transferOwnership);
    document.getElementById('withdrawButton').addEventListener('click', withdrawEth);
});