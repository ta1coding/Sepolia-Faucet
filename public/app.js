// Global variables
let provider;
let signer;
let faucetContract;
let currentAccount = null;
let isOwner = false;
const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in decimal
const CONTRACT_ADDRESS = '0xf29E8cF06f1eFaBc8bdb4aDf138Fa07535f62F60'; // Replace with your deployed contract address

// Initialize the application
async function initApp() {
    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
        updateConnectionStatus('MetaMask is not installed. Please install MetaMask to use this app.', false);
        return;
    }

    try {
        // Request access to the user's MetaMask account
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Create a Web3Provider instance
        provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Get the network information
        const network = await provider.getNetwork();
        
        // Check if we're on the Sepolia testnet
        if (network.chainId !== 11155111) {
            updateConnectionStatus(`Please connect to Sepolia testnet. Current network: ${network.name}`, false);
            await switchToSepoliaNetwork();
            return;
        }
        
        // Get the signer (account)
        signer = provider.getSigner();
        currentAccount = await signer.getAddress();
        
        // Initialize the contract
        faucetContract = new ethers.Contract(CONTRACT_ADDRESS, faucetABI, signer);
        
        // Check if the current user is the contract owner
        const contractOwner = await faucetContract.owner();
        isOwner = currentAccount.toLowerCase() === contractOwner.toLowerCase();
        
        // Update UI with the connection status
        updateConnectionStatus(`Connected: ${formatAddress(currentAccount)}`, true);
        
        // Update user address display
        document.getElementById('userAddress').textContent = formatAddress(currentAccount);
        
        // Update faucet information
        await updateFaucetInfo();
        
        // Update claim eligibility
        await updateEligibilityStatus();
        
        // Show or hide admin functions based on ownership
        toggleAdminFunctions();
        
        // Enable buttons that require connection
        document.getElementById('claimButton').disabled = false;
        document.getElementById('donateButton').disabled = false;
        
        // Set up event listeners for MetaMask events
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        
    } catch (error) {
        console.error('Error initializing app:', error);
        updateConnectionStatus('Error connecting to MetaMask. Please try again.', false);
    }
}

// Update UI to show connection status
function updateConnectionStatus(message, isConnected) {
    const statusElement = document.getElementById('connectionStatus');
    statusElement.textContent = message;
    
    if (isConnected) {
        statusElement.classList.remove('disconnected');
        statusElement.classList.add('connected');
    } else {
        statusElement.classList.remove('connected');
        statusElement.classList.add('disconnected');
    }
}

// Switch to Sepolia network
async function switchToSepoliaNetwork() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
        });
        // Reload the page after network switch
        window.location.reload();
    } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [
                        {
                            chainId: SEPOLIA_CHAIN_ID,
                            chainName: 'Sepolia Test Network',
                            nativeCurrency: {
                                name: 'Sepolia ETH',
                                symbol: 'SEP',
                                decimals: 18
                            },
                            rpcUrls: ['https://rpc.sepolia.org'],
                            blockExplorerUrls: ['https://sepolia.etherscan.io/']
                        },
                    ],
                });
                // Reload the page after network added
                window.location.reload();
            } catch (addError) {
                console.error('Error adding Sepolia network:', addError);
            }
        }
        console.error('Error switching to Sepolia network:', switchError);
    }
}

// Handle account changes in MetaMask
async function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // MetaMask is locked or user has no accounts
        updateConnectionStatus('Please connect to MetaMask.', false);
        resetUI();
    } else if (accounts[0] !== currentAccount) {
        // Reload the page to avoid complications
        window.location.reload();
    }
}

// Handle chain/network changes in MetaMask
function handleChainChanged() {
    // Reload the page when the user changes networks
    window.location.reload();
}

// Reset UI when disconnected
function resetUI() {
    currentAccount = null;
    isOwner = false;
    document.getElementById('userAddress').textContent = '-';
    document.getElementById('contractAddress').textContent = '-';
    document.getElementById('faucetBalance').textContent = '-';
    document.getElementById('nftContractAddress').textContent = '-';
    document.getElementById('claimAmount').textContent = '-';
    document.getElementById('claimCooldown').textContent = '-';
    document.getElementById('claimButton').disabled = true;
    document.getElementById('donateButton').disabled = true;
    document.getElementById('eligibilityInfo').textContent = 'Connect your wallet to check eligibility';
    toggleAdminFunctions();
}

// Update faucet information
async function updateFaucetInfo() {
    try {
        // Show contract address
        document.getElementById('contractAddress').textContent = formatAddress(CONTRACT_ADDRESS);
        
        // Get and show faucet balance
        const balance = await provider.getBalance(CONTRACT_ADDRESS);
        document.getElementById('faucetBalance').textContent = ethers.utils.formatEther(balance);
        
        // Get and show NFT contract address
        const nftContract = await faucetContract.required_nft_contract();
        document.getElementById('nftContractAddress').textContent = formatAddress(nftContract);
        
        // Get and show claim amount
        const claimAmount = await faucetContract.claim_amount();
        document.getElementById('claimAmount').textContent = ethers.utils.formatEther(claimAmount);
        
        // Get and show claim cooldown (convert from seconds to hours)
        const claimCooldown = await faucetContract.claim_cooldown();
        document.getElementById('claimCooldown').textContent = (claimCooldown / 3600).toString();
        
    } catch (error) {
        console.error('Error updating faucet info:', error);
    }
}

// Update claim eligibility status
async function updateEligibilityStatus() {
    try {
        if (!currentAccount) return;
        
        const eligibilityInfoElement = document.getElementById('eligibilityInfo');
        eligibilityInfoElement.className = 'alert';
        
        // Check if user is whitelisted
        const isWhitelisted = await faucetContract.is_whitelisted(currentAccount);
        
        if (!isWhitelisted) {
            eligibilityInfoElement.textContent = 'You are not whitelisted. Please contact the admin to be added to the whitelist.';
            eligibilityInfoElement.classList.add('alert-danger');
            document.getElementById('claimButton').disabled = true;
            return;
        }
        
        // Check NFT ownership
        const nftContract = await faucetContract.required_nft_contract();
        const ERC721_ABI = [
            "function balanceOf(address owner) view returns (uint256)"
        ];
        const nftContractInstance = new ethers.Contract(nftContract, ERC721_ABI, provider);
        
        try {
            const balance = await nftContractInstance.balanceOf(currentAccount);
            
            if (balance.eq(0)) {
                eligibilityInfoElement.textContent = `You don't own any NFTs from the required contract (${formatAddress(nftContract)}).`;
                eligibilityInfoElement.classList.add('alert-danger');
                document.getElementById('claimButton').disabled = true;
                return;
            }
        } catch (error) {
            console.error('Error checking NFT balance:', error);
            eligibilityInfoElement.textContent = 'Error checking NFT ownership. Please try again.';
            eligibilityInfoElement.classList.add('alert-danger');
            document.getElementById('claimButton').disabled = true;
            return;
        }
        
        // Check cooldown period
        const timeUntilNextClaim = await faucetContract.time_until_next_claim(currentAccount);
        
        if (!timeUntilNextClaim.eq(0)) {
            const hours = Math.floor(timeUntilNextClaim / 3600);
            const minutes = Math.floor((timeUntilNextClaim % 3600) / 60);
            
            eligibilityInfoElement.textContent = `You need to wait ${hours}h ${minutes}m before claiming again.`;
            eligibilityInfoElement.classList.add('alert-warning');
            document.getElementById('claimButton').disabled = true;
            return;
        }
        
        // Check faucet balance
        const claimAmount = await faucetContract.claim_amount();
        const contractBalance = await provider.getBalance(CONTRACT_ADDRESS);
        
        if (contractBalance.lt(claimAmount)) {
            eligibilityInfoElement.textContent = 'The faucet is currently empty. Please try again later.';
            eligibilityInfoElement.classList.add('alert-warning');
            document.getElementById('claimButton').disabled = true;
            return;
        }
        
        // User is eligible to claim
        eligibilityInfoElement.textContent = 'You are eligible to claim Sepolia ETH!';
        eligibilityInfoElement.classList.add('alert-success');
        document.getElementById('claimButton').disabled = false;
        
    } catch (error) {
        console.error('Error checking eligibility:', error);
        document.getElementById('eligibilityInfo').textContent = 'Error checking eligibility. Please try again.';
        document.getElementById('eligibilityInfo').className = 'alert alert-danger';
    }
}

// Toggle admin functions based on ownership
function toggleAdminFunctions() {
    if (isOwner) {
        document.getElementById('notOwnerWarning').style.display = 'none';
        document.getElementById('adminFunctions').style.display = 'block';
    } else {
        document.getElementById('notOwnerWarning').style.display = 'block';
        document.getElementById('adminFunctions').style.display = 'none';
    }
}

// Format address to shorter version for display
function formatAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Claim Sepolia ETH from the faucet
async function claimEth() {
    try {
        const statusElement = document.getElementById('claimStatus');
        statusElement.textContent = 'Claiming Sepolia ETH...';
        statusElement.className = 'alert alert-info';
        
        // Execute the claim transaction
        const tx = await faucetContract.claim();
        
        // Wait for the transaction to be mined
        statusElement.textContent = 'Transaction submitted. Waiting for confirmation...';
        await tx.wait();
        
        // Update UI after successful claim
        statusElement.textContent = 'Successfully claimed Sepolia ETH!';
        statusElement.className = 'alert alert-success';
        
        // Update faucet info and eligibility status
        await updateFaucetInfo();
        await updateEligibilityStatus();
        
    } catch (error) {
        console.error('Error claiming ETH:', error);
        const statusElement = document.getElementById('claimStatus');
        statusElement.textContent = `Error: ${error.message}`;
        statusElement.className = 'alert alert-danger';
    }
}

// Donate Sepolia ETH to the faucet
async function donateEth() {
    try {
        const donationAmount = document.getElementById('donationAmount').value;
        const donationWei = ethers.utils.parseEther(donationAmount);
        
        if (donationWei.lte(0)) {
            document.getElementById('donateStatus').textContent = 'Please enter a valid donation amount.';
            document.getElementById('donateStatus').className = 'alert alert-danger';
            return;
        }
        
        const statusElement = document.getElementById('donateStatus');
        statusElement.textContent = `Donating ${donationAmount} Sepolia ETH...`;
        statusElement.className = 'alert alert-info';
        
        // Execute the donate transaction
        const tx = await faucetContract.donate({ value: donationWei });
        
        // Wait for the transaction to be mined
        statusElement.textContent = 'Transaction submitted. Waiting for confirmation...';
        await tx.wait();
        
        // Update UI after successful donation
        statusElement.textContent = 'Thank you for your donation!';
        statusElement.className = 'alert alert-success';
        
        // Clear donation amount input
        document.getElementById('donationAmount').value = '';
        
        // Update faucet info
        await updateFaucetInfo();
        
    } catch (error) {
        console.error('Error donating ETH:', error);
        const statusElement = document.getElementById('donateStatus');
        statusElement.textContent = `Error: ${error.message}`;
        statusElement.className = 'alert alert-danger';
    }
}

// Check whitelist status of an address
async function checkWhitelistStatus() {
    try {
        const address = document.getElementById('checkWhitelistAddress').value;
        
        if (!ethers.utils.isAddress(address)) {
            document.getElementById('whitelistStatus').textContent = 'Please enter a valid Ethereum address.';
            document.getElementById('whitelistStatus').className = 'alert alert-danger';
            return;
        }
        
        const isWhitelisted = await faucetContract.is_whitelisted(address);
        
        const statusElement = document.getElementById('whitelistStatus');
        if (isWhitelisted) {
            statusElement.textContent = `Address ${formatAddress(address)} is whitelisted.`;
            statusElement.className = 'alert alert-success';
        } else {
            statusElement.textContent = `Address ${formatAddress(address)} is not whitelisted.`;
            statusElement.className = 'alert alert-danger';
        }
        
    } catch (error) {
        console.error('Error checking whitelist status:', error);
        document.getElementById('whitelistStatus').textContent = `Error: ${error.message}`;
        document.getElementById('whitelistStatus').className = 'alert alert-danger';
    }
}

// Add address to whitelist
async function addToWhitelist() {
    try {
        const address = document.getElementById('whitelistAddress').value;
        
        if (!ethers.utils.isAddress(address)) {
            document.getElementById('adminStatus').textContent = 'Please enter a valid Ethereum address.';
            document.getElementById('adminStatus').className = 'alert alert-danger';
            return;
        }
        
        const statusElement = document.getElementById('adminStatus');
        statusElement.textContent = `Adding ${formatAddress(address)} to whitelist...`;
        statusElement.className = 'alert alert-info';
        
        // Execute the transaction
        const tx = await faucetContract.add_to_whitelist(address);
        
        // Wait for confirmation
        statusElement.textContent = 'Transaction submitted. Waiting for confirmation...';
        await tx.wait();
        
        // Update UI
        statusElement.textContent = `Successfully added ${formatAddress(address)} to whitelist!`;
        statusElement.className = 'alert alert-success';
        
        // Clear input
        document.getElementById('whitelistAddress').value = '';
        
    } catch (error) {
        console.error('Error adding to whitelist:', error);
        document.getElementById('adminStatus').textContent = `Error: ${error.message}`;
        document.getElementById('adminStatus').className = 'alert alert-danger';
    }
}

// Remove address from whitelist
async function removeFromWhitelist() {
    try {
        const address = document.getElementById('whitelistAddress').value;
        
        if (!ethers.utils.isAddress(address)) {
            document.getElementById('adminStatus').textContent = 'Please enter a valid Ethereum address.';
            document.getElementById('adminStatus').className = 'alert alert-danger';
            return;
        }
        
        const statusElement = document.getElementById('adminStatus');
        statusElement.textContent = `Removing ${formatAddress(address)} from whitelist...`;
        statusElement.className = 'alert alert-info';
        
        // Execute the transaction
        const tx = await faucetContract.remove_from_whitelist(address);
        
        // Wait for confirmation
        statusElement.textContent = 'Transaction submitted. Waiting for confirmation...';
        await tx.wait();
        
        // Update UI
        statusElement.textContent = `Successfully removed ${formatAddress(address)} from whitelist!`;
        statusElement.className = 'alert alert-success';
        
        // Clear input
        document.getElementById('whitelistAddress').value = '';
        
    } catch (error) {
        console.error('Error removing from whitelist:', error);
        document.getElementById('adminStatus').textContent = `Error: ${error.message}`;
        document.getElementById('adminStatus').className = 'alert alert-danger';
    }
}

// Process bulk whitelist updates
async function processBulkWhitelist(addToList) {
    try {
        const textareaContent = document.getElementById('bulkWhitelistAddresses').value;
        
        // Parse addresses (comma or newline separated)
        const addresses = textareaContent
            .split(/[\n,]+/)
            .map(addr => addr.trim())
            .filter(addr => addr && ethers.utils.isAddress(addr));
        
        if (addresses.length === 0) {
            document.getElementById('adminStatus').textContent = 'No valid Ethereum addresses found.';
            document.getElementById('adminStatus').className = 'alert alert-danger';
            return;
        }
        
        if (addresses.length > 100) {
            document.getElementById('adminStatus').textContent = 'Too many addresses. Please limit to 100 addresses at a time.';
            document.getElementById('adminStatus').className = 'alert alert-danger';
            return;
        }
        
        const statusElement = document.getElementById('adminStatus');
        const action = addToList ? 'Adding' : 'Removing';
        statusElement.textContent = `${action} ${addresses.length} addresses to/from whitelist...`;
        statusElement.className = 'alert alert-info';
        
        // Create arrays for bulk update
        const statusArray = Array(addresses.length).fill(addToList);
        
        // Execute the transaction
        const tx = await faucetContract.bulk_update_whitelist(addresses, statusArray);
        
        // Wait for confirmation
        statusElement.textContent = 'Transaction submitted. Waiting for confirmation...';
        await tx.wait();
        
        // Update UI
        statusElement.textContent = `Successfully ${action.toLowerCase()} ${addresses.length} addresses!`;
        statusElement.className = 'alert alert-success';
        
        // Clear textarea
        document.getElementById('bulkWhitelistAddresses').value = '';
        
    } catch (error) {
        console.error('Error processing bulk whitelist:', error);
        document.getElementById('adminStatus').textContent = `Error: ${error.message}`;
        document.getElementById('adminStatus').className = 'alert alert-danger';
    }
}

// Update NFT contract address
async function updateNftContract() {
    try {
        const newContractAddress = document.getElementById('newNftContract').value;
        
        if (!ethers.utils.isAddress(newContractAddress)) {
            document.getElementById('adminStatus').textContent = 'Please enter a valid Ethereum address.';
            document.getElementById('adminStatus').className = 'alert alert-danger';
            return;
        }
        
        const statusElement = document.getElementById('adminStatus');
        statusElement.textContent = 'Updating NFT contract address...';
        statusElement.className = 'alert alert-info';
        
        // Execute the transaction
        const tx = await faucetContract.set_nft_contract(newContractAddress);
        
        // Wait for confirmation
        statusElement.textContent = 'Transaction submitted. Waiting for confirmation...';
        await tx.wait();
        
        // Update UI
        statusElement.textContent = 'Successfully updated NFT contract address!';
        statusElement.className = 'alert alert-success';
        
        // Clear input
        document.getElementById('newNftContract').value = '';
        
        // Update faucet info
        await updateFaucetInfo();
        
    } catch (error) {
        console.error('Error updating NFT contract:', error);
        document.getElementById('adminStatus').textContent = `Error: ${error.message}`;
        document.getElementById('adminStatus').className = 'alert alert-danger';
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
            return;
        }
        
        const statusElement = document.getElementById('adminStatus');
        statusElement.textContent = `Updating claim amount to ${amountEth} ETH...`;
        statusElement.className = 'alert alert-info';
        
        // Execute the transaction
        const tx = await faucetContract.set_claim_amount(amountWei);
        
        // Wait for confirmation
        statusElement.textContent = 'Transaction submitted. Waiting for confirmation...';
        await tx.wait();
        
        // Update UI
        statusElement.textContent = 'Successfully updated claim amount!';
        statusElement.className = 'alert alert-success';
        
        // Update faucet info
        await updateFaucetInfo();
        
    } catch (error) {
        console.error('Error updating claim amount:', error);
        document.getElementById('adminStatus').textContent = `Error: ${error.message}`;
        document.getElementById('adminStatus').className = 'alert alert-danger';
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
            return;
        }
        
        const statusElement = document.getElementById('adminStatus');
        statusElement.textContent = `Updating claim cooldown to ${cooldownHours} hours...`;
        statusElement.className = 'alert alert-info';
        
        // Execute the transaction
        const tx = await faucetContract.set_claim_cooldown(cooldownSeconds);
        
        // Wait for confirmation
        statusElement.textContent = 'Transaction submitted. Waiting for confirmation...';
        await tx.wait();
        
        // Update UI
        statusElement.textContent = 'Successfully updated claim cooldown!';
        statusElement.className = 'alert alert-success';
        
        // Update faucet info
        await updateFaucetInfo();
        
    } catch (error) {
        console.error('Error updating claim cooldown:', error);
        document.getElementById('adminStatus').textContent = `Error: ${error.message}`;
        document.getElementById('adminStatus').className = 'alert alert-danger';
    }
}

// Transfer contract ownership
async function transferOwnership() {
    try {
        const newOwnerAddress = document.getElementById('newOwnerAddress').value;
        
        if (!ethers.utils.isAddress(newOwnerAddress)) {
            document.getElementById('adminStatus').textContent = 'Please enter a valid Ethereum address.';
            document.getElementById('adminStatus').className = 'alert alert-danger';
            return;
        }
        
        // Confirm with the user
        if (!confirm(`Are you sure you want to transfer ownership to ${newOwnerAddress}? This action cannot be undone!`)) {
            return;
        }
        
        const statusElement = document.getElementById('adminStatus');
        statusElement.textContent = 'Transferring ownership...';
        statusElement.className = 'alert alert-info';
        
        // Execute the transaction
        const tx = await faucetContract.transfer_ownership(newOwnerAddress);
        
        // Wait for confirmation
        statusElement.textContent = 'Transaction submitted. Waiting for confirmation...';
        await tx.wait();
        
        // Update UI
        statusElement.textContent = `Successfully transferred ownership to ${formatAddress(newOwnerAddress)}!`;
        statusElement.className = 'alert alert-success';
        
        // Clear input
        document.getElementById('newOwnerAddress').value = '';
        
        // Reset owner status and UI after ownership transfer
        isOwner = false;
        toggleAdminFunctions();
        
    } catch (error) {
        console.error('Error transferring ownership:', error);
        document.getElementById('adminStatus').textContent = `Error: ${error.message}`;
        document.getElementById('adminStatus').className = 'alert alert-danger';
    }
}

// Withdraw ETH from the faucet
async function withdrawEth() {
    try {
        const amountEth = document.getElementById('withdrawAmount').value;
        const amountWei = ethers.utils.parseEther(amountEth);
        
        if (amountWei.lte(0)) {
            document.getElementById('adminStatus').textContent = 'Please enter a valid amount.';
            document.getElementById('adminStatus').className = 'alert alert-danger';
            return;
        }
        
        // Check contract balance
        const contractBalance = await provider.getBalance(CONTRACT_ADDRESS);
        if (amountWei.gt(contractBalance)) {
            document.getElementById('adminStatus').textContent = 'Withdrawal amount exceeds contract balance.';
            document.getElementById('adminStatus').className = 'alert alert-danger';
            return;
        }
        
        // Confirm with the user
        if (!confirm(`Are you sure you want to withdraw ${amountEth} ETH from the faucet?`)) {
            return;
        }
        
        const statusElement = document.getElementById('adminStatus');
        statusElement.textContent = `Withdrawing ${amountEth} ETH...`;
        statusElement.className = 'alert alert-info';
        
        // Execute the transaction
        const tx = await faucetContract.withdraw(amountWei);
        
        // Wait for confirmation
        statusElement.textContent = 'Transaction submitted. Waiting for confirmation...';
        await tx.wait();
        
        // Update UI
        statusElement.textContent = 'Successfully withdrew ETH!';
        statusElement.className = 'alert alert-success';
        
        // Clear input
        document.getElementById('withdrawAmount').value = '';
        
        // Update faucet info
        await updateFaucetInfo();
        
    } catch (error) {
        console.error('Error withdrawing ETH:', error);
        document.getElementById('adminStatus').textContent = `Error: ${error.message}`;
        document.getElementById('adminStatus').className = 'alert alert-danger';
    }
}

// Add event listeners when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize app
    document.getElementById('connectionStatus').addEventListener('click', initApp);
    initApp();
    
    // Add event listeners for claim and donate
    document.getElementById('claimButton').addEventListener('click', claimEth);
    document.getElementById('donateButton').addEventListener('click', donateEth);
    
    // Add event listeners for admin functions
    document.getElementById('checkWhitelistButton').addEventListener('click', checkWhitelistStatus);
    document.getElementById('addToWhitelistButton').addEventListener('click', addToWhitelist);
    document.getElementById('removeFromWhitelistButton').addEventListener('click', removeFromWhitelist);
    document.getElementById('bulkAddButton').addEventListener('click', () => processBulkWhitelist(true));
    document.getElementById('bulkRemoveButton').addEventListener('click', () => processBulkWhitelist(false));
    document.getElementById('updateNftContractButton').addEventListener('click', updateNftContract);
    document.getElementById('updateClaimAmountButton').addEventListener('click', updateClaimAmount);
    document.getElementById('updateClaimCooldownButton').addEventListener('click', updateClaimCooldown);
    document.getElementById('transferOwnershipButton').addEventListener('click', transferOwnership);
    document.getElementById('withdrawButton').addEventListener('click', withdrawEth);
});
