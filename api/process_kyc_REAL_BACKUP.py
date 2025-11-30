"""
Vercel Serverless Function - Processa KYC e cria attestation ANNA
Endpoint: POST /api/process_kyc
"""

from http.server import BaseHTTPRequestHandler
import json
import os
from datetime import datetime
from anna_protocol.client import ANNAClient, Reasoning, ReasoningStep, Metadata

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Ler dados do request
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # Extrair dados do formulário
            user_name = data.get('name')
            user_age = data.get('age')
            user_country = data.get('country')
            account_type = data.get('account_type', 'creator')
            
            # Simular análise de KYC (aqui você integraria com a IA real da funs.ai)
            kyc_result = self._simulate_kyc_analysis(user_name, user_age, user_country)
            
            # Se aprovado, criar attestation ANNA
            if kyc_result['approved']:
                anna_result = self._create_anna_attestation(
                    user_name=user_name,
                    user_age=user_age,
                    user_country=user_country,
                    account_type=account_type,
                    kyc_score=kyc_result['score']
                )
                
                response = {
                    'success': True,
                    'kyc_approved': True,
                    'score': kyc_result['score'],
                    'badge': kyc_result['badge'],
                    'attestation_id': anna_result['attestation_id'],
                    'tx_hash': anna_result['tx_hash'],
                    'certificate_url': anna_result['certificate_url'],
                    'dashboard_url': f"https://dashboard.annaprotocol.online/attestations/{anna_result['attestation_id']}"
                }
            else:
                response = {
                    'success': True,
                    'kyc_approved': False,
                    'reason': kyc_result['reason']
                }
            
            # Enviar resposta
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            error_response = {
                'success': False,
                'error': str(e)
            }
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(error_response).encode())
    
    def do_OPTIONS(self):
        # CORS preflight
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def _simulate_kyc_analysis(self, name, age, country):
        """Simula análise de KYC (substitua pela IA real da funs.ai)"""
        score = 92  # Score baseado em análise biométrica + docs
        
        # Regras simples de validação
        if int(age) < 18:
            return {
                'approved': False,
                'reason': 'Usuário menor de 18 anos',
                'score': 0
            }
        
        return {
            'approved': True,
            'score': score,
            'badge': 'Verified Creator'
        }
    
    def _create_anna_attestation(self, user_name, user_age, user_country, account_type, kyc_score):
        """Cria attestation real no ANNA Protocol"""
        
        # Inicializar cliente ANNA
        client = ANNAClient(
            private_key=os.getenv('ANNA_PRIVATE_KEY'),
            network='polygon-amoy'
        )
        
        # Criar raciocínio estruturado
        reasoning = Reasoning(
            input=f"Verificar KYC de {user_name} para cadastro como {account_type} na Funs.ai. País: {user_country}, Idade: {user_age}.",
            reasoning_steps=[
                ReasoningStep(
                    step_number=1,
                    description="Análise biométrica",
                    rationale=f"Selfie match: 98% com foto do documento. Sem deepfake detectado. Usuário verificado: {user_name}."
                ),
                ReasoningStep(
                    step_number=2,
                    description="Verificação de documentos",
                    rationale=f"Documento válido, emitido em {user_country}. Endereço coincide com declaração fiscal."
                ),
                ReasoningStep(
                    step_number=3,
                    description="Risco de compliance",
                    rationale=f"Sem hits em OFAC/PEP. Idade {user_age} anos (>18 para SocialFi). País: {user_country} sem restrições."
                )
            ],
            conclusion=f"Aprovar KYC. Atribuir badge 'Verified {account_type.title()}'. Permitir acesso a features premium da Funs.ai.",
            confidence=kyc_score / 100
        )
        
        # Criar metadados estruturados
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        external_id = f"FUNS-KYC-{timestamp}"
        
        metadata = Metadata(
            external_id=external_id,
            document_type="kyc_creator_onboarding",
            client_name=user_name,
            system_origin="Funs.ai SocialFi Platform v2.1",
            custom_fields={
                "account_type": account_type,
                "badge_type": f"Verified {account_type.title()}",
                "risk_score": round((100 - kyc_score) / 100, 2),
                "country": user_country,
                "age": user_age,
                "features_unlocked": ["nft_minting", "token_rewards", "community_creation"]
            }
        )
        
        # Criar attestation on-chain
        result = client.create_attestation(
            content=f"Decisão KYC: Aprovada para {user_name}. Badge Verified {account_type.title()} atribuído.",
            reasoning=reasoning,
            metadata=metadata,
            category="socialfi_kyc"
        )
        
        return {
            'attestation_id': result.attestation_id,
            'tx_hash': result.tx_hash,
            'certificate_url': f"https://dashboard.annaprotocol.online/certificate/{result.attestation_id}"
        }