"""
Vercel Serverless Function - Processa KYC e cria attestation ANNA
Endpoint: POST /api/process_kyc
"""

from http.server import BaseHTTPRequestHandler
import json
import os
import sys
from datetime import datetime
from anna_protocol.client import ANNAClient, Reasoning, ReasoningStep, Metadata

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            print("=== DEBUG: Request received ===", file=sys.stderr)
            
            # Ler dados do request
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            print(f"DEBUG: Data received: {data}", file=sys.stderr)
            
            # Extrair dados do formulário
            user_name = data.get('name')
            user_age = data.get('age')
            user_country = data.get('country')
            account_type = data.get('account_type', 'creator')
            
            print(f"DEBUG: Processing KYC for {user_name}, age {user_age}", file=sys.stderr)
            
            # Simular análise de KYC
            kyc_result = self._simulate_kyc_analysis(user_name, user_age, user_country)
            
            print(f"DEBUG: KYC result: {kyc_result}", file=sys.stderr)
            
            # Se aprovado, criar attestation ANNA
            if kyc_result['approved']:
                print("DEBUG: Creating ANNA attestation...", file=sys.stderr)
                
                anna_result = self._create_anna_attestation(
                    user_name=user_name,
                    user_age=user_age,
                    user_country=user_country,
                    account_type=account_type,
                    kyc_score=kyc_result['score']
                )
                
                print(f"DEBUG: Attestation created: {anna_result['attestation_id']}", file=sys.stderr)
                
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
            
            print("=== DEBUG: Response sent successfully ===", file=sys.stderr)
            
        except Exception as e:
            print(f"=== ERROR: {str(e)} ===", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            
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
        """Simula análise de KYC"""
        score = 92
        
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
        
        print("DEBUG: Initializing ANNA client...", file=sys.stderr)
        
        # Inicializar cliente ANNA
        client = ANNAClient(
            private_key=os.getenv('ANNA_PRIVATE_KEY'),
            network='polygon-amoy'
        )
        
        print("DEBUG: Creating reasoning...", file=sys.stderr)
        
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
        
        print("DEBUG: Creating metadata...", file=sys.stderr)
        
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
        
        print("DEBUG: Calling create_attestation...", file=sys.stderr)
        
        # Criar attestation on-chain
        result = client.submit_attestation(
            content=f"Decisão KYC: Aprovada para {user_name}. Badge Verified {account_type.title()} atribuído.",
            reasoning=reasoning,
            metadata=metadata,
            category="socialfi_kyc"
        )
        
        print(f"DEBUG: Attestation created successfully! ID: {result.attestation_id}", file=sys.stderr)
        
        return {
            'attestation_id': result.attestation_id,
            'tx_hash': result.tx_hash,
            'certificate_url': f"https://dashboard.annaprotocol.online/certificate/{result.attestation_id}"
        }