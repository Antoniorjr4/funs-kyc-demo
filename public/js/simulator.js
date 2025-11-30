// Configuração
const API_URL = 'https://your-project.vercel.app/api/process_kyc'; // Substitua pelo URL real após deploy

// Elementos do DOM
const form = document.getElementById('kycForm');
const formSection = document.getElementById('formSection');
const processingSection = document.getElementById('processingSection');
const resultSection = document.getElementById('resultSection');
const successResult = document.getElementById('successResult');
const errorResult = document.getElementById('errorResult');

// Event listener do formulário
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await processKYC();
});

async function processKYC() {
    // Coletar dados do formulário
    const formData = {
        name: document.getElementById('name').value,
        age: document.getElementById('age').value,
        country: document.getElementById('country').value,
        account_type: document.querySelector('input[name="account_type"]:checked').value
    };

    // Mostrar seção de processamento
    formSection.classList.add('hidden');
    processingSection.classList.remove('hidden');

    // Simular etapas de processamento
    await simulateProcessingSteps();

    try {
        // Chamar API backend
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        // Esconder processamento
        processingSection.classList.add('hidden');
        resultSection.classList.remove('hidden');

        if (result.success && result.kyc_approved) {
            // Mostrar resultado de sucesso
            showSuccessResult(result, formData);
        } else {
            // Mostrar erro
            showErrorResult(result);
        }

    } catch (error) {
        console.error('Erro ao processar KYC:', error);
        processingSection.classList.add('hidden');
        resultSection.classList.remove('hidden');
        errorResult.classList.remove('hidden');
        document.getElementById('errorReason').textContent = 
            'Erro ao conectar com o servidor. Tente novamente.';
    }
}

async function simulateProcessingSteps() {
    const steps = [
        { id: 'step1', duration: 1500 },
        { id: 'step2', duration: 2000 },
        { id: 'step3', duration: 1500 },
        { id: 'step4', duration: 3000 }
    ];

    for (const step of steps) {
        const element = document.getElementById(step.id);
        element.classList.remove('opacity-50');
        element.querySelector('.spinner').classList.add('animate-spin');
        
        await new Promise(resolve => setTimeout(resolve, step.duration));
        
        // Marcar como concluído
        element.querySelector('.spinner').remove();
        element.innerHTML += '<i class="fas fa-check-circle text-green-400 text-xl"></i>';
    }
}

function showSuccessResult(result, formData) {
    successResult.classList.remove('hidden');
    
    // Preencher dados
    document.getElementById('resultName').textContent = formData.name;
    document.getElementById('resultScore').textContent = `${result.score}/100`;
    document.getElementById('resultBadge').textContent = result.badge;
    document.getElementById('resultAttestationId').textContent = result.attestation_id;
    document.getElementById('resultTxHash').textContent = result.tx_hash;
    
    // Links
    document.getElementById('polygonScanLink').href = 
        `https://amoy.polygonscan.com/tx/${result.tx_hash}`;
    document.getElementById('dashboardLink').href = result.dashboard_url;
    document.getElementById('certificateLink').href = result.certificate_url;
    
    // Animação
    successResult.classList.add('fade-in');
}

function showErrorResult(result) {
    errorResult.classList.remove('hidden');
    document.getElementById('errorReason').textContent = 
        result.reason || 'Erro desconhecido';
}

// Adicionar animação aos cards de upload
document.querySelectorAll('.border-dashed').forEach(card => {
    card.addEventListener('click', () => {
        card.classList.add('border-purple-500');
        setTimeout(() => {
            card.classList.remove('border-purple-500');
        }, 300);
    });
});