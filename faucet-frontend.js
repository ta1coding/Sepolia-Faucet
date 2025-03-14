// App.js (continued)
  return (
    <div className="app-container">
      <header>
        <h1>Sepolia Testnet Faucet</h1>
        <p className="subtitle">Get 0.3 Sepolia ETH for testing</p>
      </header>
      
      <div className="wallet-status">
        <p>Connected account: {account ? `${account.slice(0, 8)}...${account.slice(-6)}` : 'Not connected'}</p>
        <p>Faucet balance: {faucetBalance} Sepolia ETH</p>
      </div>
      
      <div className="main-content">
        <div className="claim-section">
          <h2>Claim Sepolia ETH</h2>
          
          <div className="status-container">
            <div className={`status-item ${isWhitelisted ? 'status-success' : 'status-error'}`}>
              <span className="status-label">Whitelist Status:</span>
              <span className="status-value">{isWhitelisted ? 'Whitelisted' : 'Not Whitelisted'}</span>
            </div>
            
            <div className={`status-item ${canClaim ? 'status-success' : 'status-error'}`}>
              <span className="status-label">Claim Status:</span>
              <span className="status-value">{canClaim ? 'Ready to Claim' : 'Cannot Claim'}</span>
            </div>
            
            <div className="status-item">
              <span className="status-label">Next Claim:</span>
              <span className="status-value">{formatTimeRemaining(timeUntilNextClaim)}</span>
            </div>
          </div>
          
          <button 
            className="primary-button" 
            onClick={handleClaim} 
            disabled={!canClaim || isLoading}
          >
            {isLoading ? 'Processing...' : 'Claim 0.3 Sepolia ETH'}
          </button>
          
          {claimStatus && <p className="status-message">{claimStatus}</p>}
        </div>
        
        <div className="donate-section">
          <h2>Donate to Faucet</h2>
          <p>Help others by donating Sepolia ETH to the faucet.</p>
          
          <div className="input-group">
            <input
              type="number"
              value={donationAmount}
              onChange={(e) => setDonationAmount(e.target.value)}
              min="0.01"
              step="0.01"
              placeholder="Amount in Sepolia ETH"
            />
            <button 
              className="primary-button" 
              onClick={handleDonate}
              disabled={isLoading}
            >
              Donate
            </button>
          </div>
          
          {donationStatus && <p className="status-message">{donationStatus}</p>}
        </div>
        
        {isOwner && (
          <div className="admin-section">
            <h2>Admin Functions</h2>
            <p>Owner-only configuration options.</p>
            
            <div className="admin-function">
              <h3>Whitelist Management</h3>
              <div className="input-group">
                <input
                  type="text"
                  value={newWhitelistedAddress}
                  onChange={(e) => setNewWhitelistedAddress(e.target.value)}
                  placeholder="Ethereum Address"
                />
                <div className="button-group">
                  <button 
                    className="secondary-button" 
                    onClick={handleAddToWhitelist}
                    disabled={isLoading}
                  >
                    Add to Whitelist
                  </button>
                  <button 
                    className="secondary-button" 
                    onClick={handleRemoveFromWhitelist}
                    disabled={isLoading}
                  >
                    Remove from Whitelist
                  </button>
                </div>
              </div>
            </div>
            
            <div className="admin-function">
              <h3>NFT Contract Management</h3>
              <div className="input-group">
                <input
                  type="text"
                  value={newNftContract}
                  onChange={(e) => setNewNftContract(e.target.value)}
                  placeholder="NFT Contract Address"
                />
                <button 
                  className="secondary-button" 
                  onClick={handleUpdateNftContract}
                  disabled={isLoading}
                >
                  Update NFT Contract
                </button>
              </div>
            </div>
            
            {adminStatus && <p className="status-message">{adminStatus}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
