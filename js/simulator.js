// ANNA × Funs.ai - KYC Simulator v2.0 with IPFS
console.log('🚀 ANNA × Funs.ai KYC Simulator v2.0 initialized');
console.log('✅ IPFS transparency enabled');
console.log('🔒 AES-256-GCM encryption active');
console.log('⛓️  Polygon Amoy testnet ready');

// API endpoint (auto-detect environment)
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000/api/process_kyc'
    : '/api/process_kyc';

// DOM elements
const formSection = document.getElementById('formSection');
const loadingSection = document.getElementById('loadingSection');
const successSection = document.getElementById('successSection');
const kycForm = document.getElementById('kycForm');

// Store current attestation data
let currentAttestationId = '';
let currentTxHash = '';
let currentIpfsCid = '';

// Form submit handler
kycForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await processKYC();
});

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

    // Animate loading steps
    animateLoadingSteps();

    try {
        console.log('📡 Sending request to:', API_URL);
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        console.log('📥 Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Success response:', result);

        if (result.success && result.kyc_approved) {
            displaySuccessResult(result);
        } else {
            throw new Error(result.reason || 'KYC not approved');
        }

    } catch (error) {
        console.error('❌ Error processing KYC:', error);
        loadingSection.classList.add('hidden');
        formSection.classList.remove('hidden');
        alert(`Error processing KYC:\n\nHTTP ${error.message.split(':')[0]}:\n\nPlease try again or contact support.`);
    }
}

function animateLoadingSteps() {
    const steps = [
        { id: 'step1', delay: 500 },
        { id: 'step2', delay: 1000 },
        { id: 'step3', delay: 1500 },
        { id: 'step4', delay: 2000 },
        { id: 'step5', delay: 2500 }
    ];

    steps.forEach(step => {
        setTimeout(() => {
            const element = document.getElementById(step.id);
            element.classList.remove('text-gray-500');
            element.classList.add('text-green-400');
            element.querySelector('i').className = 'fas fa-check-circle text-green-400';
        }, step.delay);
    });
}

function displaySuccessResult(result) {
    // Hide loading
    loadingSection.classList.add('hidden');

    // Store current attestation data
    currentAttestationId = result.attestation_id;
    currentTxHash = result.tx_hash;
    currentIpfsCid = result.ipfs_cid;

    // Update score and badge
    document.getElementById('scoreDisplay').textContent = result.score;
    document.getElementById('badgeDisplay').textContent = result.badge;

    // Update IPFS CID
    document.getElementById('ipfsCidDisplay').textContent = result.ipfs_cid;

    // Update TX Hash
    document.getElementById('txHashDisplay').textContent = result.tx_hash;

    // Update reasoning steps
    const stepsContainer = document.getElementById('reasoningSteps');
    stepsContainer.innerHTML = '';
    
    if (result.reasoning_preview && result.reasoning_preview.steps_summary) {
        result.reasoning_preview.steps_summary.forEach(step => {
            const li = document.createElement('li');
            li.innerHTML = `<i class="fas fa-check-circle text-green-400 mr-2"></i>${step}`;
            stepsContainer.appendChild(li);
        });
    }

    // Update links
    document.getElementById('certificateLink').href = result.certificate_url;
    document.getElementById('polygonScanLink').href = `https://amoy.polygonscan.com/tx/${result.tx_hash}`;

    // Show success section
    successSection.classList.remove('hidden');

    console.log('🎉 Success screen displayed');
}

function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;

    navigator.clipboard.writeText(text).then(() => {
        // Visual feedback
        const originalText = element.textContent;
        element.textContent = '✓ Copied!';
        element.classList.add('text-green-400');

        setTimeout(() => {
            element.textContent = originalText;
            element.classList.remove('text-green-400');
        }, 2000);

        console.log('📋 Copied to clipboard:', text);
    }).catch(err => {
        console.error('❌ Failed to copy:', err);
        alert('Failed to copy to clipboard');
    });
}

function viewInDashboard() {
    // Open dashboard with attestation ID as URL parameter
    const dashboardUrl = `https://dashboard.annaprotocol.online?attestation=${currentAttestationId}`;
    
    console.log('🔗 Opening dashboard:', dashboardUrl);
    console.log('📝 Attestation ID:', currentAttestationId);
    console.log('💾 IPFS CID:', currentIpfsCid);
    console.log('💎 TX Hash:', currentTxHash);
    
    window.open(dashboardUrl, '_blank');
}

function resetForm() {
    // Reset form
    kycForm.reset();

    // Reset upload cards
    selfieUploaded = false;
    documentUploaded = false;

    const selfieCard = document.getElementById('selfieUploadCard');
    const documentCard = document.getElementById('documentUploadCard');

    [selfieCard, documentCard].forEach(card => {
        card.classList.remove('uploading', 'uploaded');
        const icon = card.querySelector('i');
        icon.className = card === selfieCard 
            ? 'fas fa-camera text-4xl text-gray-400 mb-3'
            : 'fas fa-id-card text-4xl text-gray-400 mb-3';
        card.querySelector('.upload-preview').classList.add('hidden');
    });

    // Reset loading steps
    for (let i = 1; i <= 5; i++) {
        const step = document.getElementById(`step${i}`);
        step.classList.remove('text-green-400');
        step.classList.add('text-gray-500');
        step.querySelector('i').className = i === 1 
            ? 'fas fa-circle-notch fa-spin'
            : 'fas fa-circle';
    }

    // Show form, hide others
    successSection.classList.add('hidden');
    loadingSection.classList.add('hidden');
    formSection.classList.remove('hidden');

    // Clear stored data
    currentAttestationId = '';
    currentTxHash = '';
    currentIpfsCid = '';

    console.log('🔄 Form reset');
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+R or Cmd+R to reset (when not in input)
    if ((e.ctrlKey || e.metaKey) && e.key === 'r' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        if (!successSection.classList.contains('hidden')) {
            resetForm();
        }
    }
});

console.log('✅ Simulator ready!');
console.log('📍 API endpoint:', API_URL);