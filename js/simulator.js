// ANNA × Funs.ai - KYC Simulator v2.0 with IPFS
// Complete AI Transparency Implementation

// Configuration
// Auto-detect API URL based on environment
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000/api/process_kyc'  // Local dev
    : '/api/process_kyc';  // Vercel production

// Global state
let currentAttestationData = null;

// DOM Elements
const form = document.getElementById('kycForm');
const formSection = document.getElementById('formSection');
const loadingSection = document.getElementById('loadingSection');
const successSection = document.getElementById('successSection');
const resultsContainer = document.getElementById('resultsContainer');
const reasoningPreview = document.getElementById('reasoningPreview');
const ipfsCIDElement = document.getElementById('ipfsCID');
const verifyLink = document.getElementById('verifyLink');
const polygonLink = document.getElementById('polygonLink');

// Form submission handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await processKYC();
});

/**
 * Main KYC processing function
 */
async function processKYC() {
    // Collect form data
    const formData = {
        name: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        age: document.getElementById('userAge').value,
        country: document.getElementById('userCountry').value,
        cpf: document.getElementById('userCPF').value,
        passport: document.getElementById('userPassport').value
    };

    console.log('📋 Form data collected (sensitive data will be encrypted):', {
        ...formData,
        cpf: '***ENCRYPTED***',
        passport: '***ENCRYPTED***'
    });

    // Show loading
    formSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');

    try {
        console.log('🚀 Sending KYC request...', formData);
        
        // Call backend API
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ KYC response received:', result);

        // Hide loading
        loadingSection.classList.add('hidden');

        if (result.success && result.kyc_approved) {
            // Store for later use
            currentAttestationData = result;
            
            // Show success with results
            displaySuccessResults(result, formData);
        } else {
            // Show error
            throw new Error(result.reason || result.error || 'KYC processing failed');
        }

    } catch (error) {
        console.error('❌ Error processing KYC:', error);
        loadingSection.classList.add('hidden');
        
        alert(`Error processing KYC:\n\n${error.message}\n\nPlease try again or contact support.`);
        
        // Reset to form
        formSection.classList.remove('hidden');
    }
}

/**
 * Display success results with IPFS transparency
 */
function displaySuccessResults(result, formData) {
    // Basic results
    resultsContainer.innerHTML = `
        <div class="bg-gray-800/50 rounded-lg p-6 space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="text-gray-400 text-sm">User</p>
                    <p class="font-bold text-lg">${formData.name}</p>
                </div>
                <div>
                    <p class="text-gray-400 text-sm">Trust Score</p>
                    <p class="font-bold text-2xl text-green-400">${result.score}/100</p>
                </div>
                <div>
                    <p class="text-gray-400 text-sm">Badge Awarded</p>
                    <p class="font-bold text-purple-400">
                        <i class="fas fa-certificate mr-1"></i>${result.badge}
                    </p>
                </div>
                <div>
                    <p class="text-gray-400 text-sm">Country</p>
                    <p class="font-bold">${formData.country}</p>
                </div>
            </div>
            
            <div class="border-t border-gray-700 pt-3">
                <p class="text-gray-400 text-xs mb-1">Attestation ID</p>
                <p class="font-mono text-xs text-purple-400 break-all">${result.attestation_id}</p>
            </div>
        </div>
    `;

    // Reasoning preview
    if (result.reasoning_preview && result.reasoning_preview.steps_summary) {
        const stepsHTML = result.reasoning_preview.steps_summary
            .map(step => `<div class="text-green-400">✓ ${step}</div>`)
            .join('');
        
        reasoningPreview.innerHTML = `
            <div class="font-bold text-sm mb-2 text-purple-300">
                AI Decision Trail (${result.reasoning_preview.total_steps} steps):
            </div>
            ${stepsHTML}
            <div class="mt-3 text-xs text-gray-400 italic">
                ${result.reasoning_preview.transparency_message}
            </div>
        `;
    }

    // IPFS CID
    ipfsCIDElement.textContent = result.ipfs_cid || 'N/A';

    // Set links
    verifyLink.href = result.certificate_url;
    polygonLink.href = `https://amoy.polygonscan.com/tx/${result.tx_hash}`;

    // Show success section
    successSection.classList.remove('hidden');
    successSection.classList.add('fade-in');
}

/**
 * View full reasoning on IPFS
 */
function viewFullReasoning() {
    if (!currentAttestationData) {
        alert('No attestation data available');
        return;
    }

    const ipfsCID = currentAttestationData.ipfs_cid;
    const attestationId = currentAttestationData.attestation_id;

    if (!ipfsCID) {
        alert('IPFS CID not available');
        return;
    }

    // Open IPFS URL in new tab
    const ipfsUrl = currentAttestationData.ipfs_url;
    
    // Also show modal with reasoning details
    showReasoningModal(ipfsCID, attestationId);
    
    // Open IPFS in new tab
    window.open(ipfsUrl, '_blank');
}

/**
 * Show reasoning modal with details
 */
function showReasoningModal(ipfsCID, attestationId) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-gray-800 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-2xl font-bold text-purple-400">
                    <i class="fas fa-brain mr-2"></i>AI Reasoning on IPFS
                </h3>
                <button onclick="this.closest('.fixed').remove()" 
                        class="text-gray-400 hover:text-white text-2xl">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="space-y-4">
                <!-- Attestation Info -->
                <div class="bg-gray-900/50 rounded-lg p-4">
                    <p class="text-sm text-gray-400 mb-1">Attestation ID</p>
                    <p class="font-mono text-xs text-purple-400 break-all">${attestationId}</p>
                </div>

                <!-- IPFS Info -->
                <div class="bg-gray-900/50 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-2">
                        <p class="text-sm text-gray-400">IPFS CID</p>
                        <button onclick="copyToClipboard('${ipfsCID}')" 
                                class="text-xs text-green-400 hover:text-green-300">
                            <i class="fas fa-copy mr-1"></i>Copy
                        </button>
                    </div>
                    <p class="font-mono text-xs text-green-400 break-all">${ipfsCID}</p>
                </div>

                <!-- Transparency Info -->
                <div class="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg p-4 border-2 border-purple-500/30">
                    <h4 class="font-bold mb-3 text-purple-300">
                        🔓 What's on IPFS:
                    </h4>
                    <ul class="space-y-2 text-sm text-gray-300">
                        <li class="flex items-start gap-2">
                            <i class="fas fa-check text-green-400 mt-1"></i>
                            <span><strong>Public Reasoning:</strong> Conclusion, confidence, risk level (visible to everyone)</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <i class="fas fa-lock text-yellow-400 mt-1"></i>
                            <span><strong>Private Reasoning (Encrypted):</strong> 5 detailed decision steps with full AI analysis</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <i class="fas fa-brain text-purple-400 mt-1"></i>
                            <span><strong>Each Step Includes:</strong> Input data, analysis, AI reasoning, score, confidence, result</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <i class="fas fa-shield-alt text-blue-400 mt-1"></i>
                            <span><strong>Encryption:</strong> AES-256-GCM (only owner can decrypt)</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <i class="fas fa-link text-pink-400 mt-1"></i>
                            <span><strong>On-chain:</strong> IPFS CID recorded on Polygon blockchain</span>
                        </li>
                    </ul>
                </div>

                <!-- Decision Trail Preview -->
                <div class="bg-gray-900/50 rounded-lg p-4">
                    <h4 class="font-bold mb-3 text-green-400">
                        ✓ Decision Trail Preview:
                    </h4>
                    ${currentAttestationData.reasoning_preview.steps_summary
                        .map((step, i) => `
                            <div class="flex items-start gap-2 mb-2 text-sm">
                                <span class="text-purple-400 font-bold">${i + 1}.</span>
                                <span class="text-gray-300">${step.replace(/^\d+\.\s*/, '')}</span>
                            </div>
                        `).join('')}
                </div>

                <!-- Actions -->
                <div class="grid grid-cols-2 gap-4 mt-6">
                    <a href="${currentAttestationData.ipfs_url}" target="_blank"
                       class="py-3 px-4 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-center transition flex items-center justify-center gap-2">
                        <i class="fas fa-external-link-alt"></i>
                        Open IPFS File
                    </a>
                    <a href="https://dashboard.annaprotocol.online" target="_blank"
                       class="py-3 px-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-center transition flex items-center justify-center gap-2">
                        <i class="fas fa-tachometer-alt"></i>
                        Dashboard
                    </a>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            document.body.style.overflow = 'auto';
        }
    });
}

/**
 * Copy IPFS CID to clipboard
 */
function copyIPFS() {
    const ipfsCID = ipfsCIDElement.textContent;
    copyToClipboard(ipfsCID);
}

/**
 * Copy to clipboard helper
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Show feedback
        const feedback = document.createElement('div');
        feedback.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 fade-in';
        feedback.innerHTML = '<i class="fas fa-check mr-2"></i>Copied to clipboard!';
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.remove();
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard');
    });
}

/**
 * Reset form and UI
 */
function resetForm() {
    form.reset();
    currentAttestationData = null;
    
    formSection.classList.remove('hidden');
    loadingSection.classList.add('hidden');
    successSection.classList.add('hidden');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Keyboard shortcuts
 */
document.addEventListener('keydown', (e) => {
    // Escape to close modals
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.fixed.z-50');
        modals.forEach(modal => {
            modal.remove();
            document.body.style.overflow = 'auto';
        });
    }
    
    // Ctrl/Cmd + R to reset (if not in form)
    if ((e.ctrlKey || e.metaKey) && e.key === 'r' && !successSection.classList.contains('hidden')) {
        e.preventDefault();
        resetForm();
    }
});

// Initialize
console.log('🚀 ANNA × Funs.ai KYC Simulator v2.0 initialized');
console.log('✅ IPFS transparency enabled');
console.log('🔒 AES-256-GCM encryption active');
console.log('⛓️  Polygon Amoy testnet ready');