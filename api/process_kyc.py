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
                    'dashboard_url': anna_result['dashboard_url']
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
            network='polygon-amoy',
            identity_contract='0x8b9b5D3f698BE53Ae98162f6e013Bc9214bc7AF0',
            attestation_contract='0x4c92d3305e7F1417f718827B819E285325a823d3',
            reputation_contract='0xd1F37B4be48FC4B8287059C92F9A2450D4b0990B'
        )
        
        print("DEBUG: Creating reasoning...", file=sys.stderr)
        
        # Criar raciocínio estruturado
        reasoning = Reasoning(
            input=f"KYC {user_name}, {user_age}y, {user_country}",
            reasoning_steps=[
                ReasoningStep(1, "Biometria", f"Match 98%, liveness OK"),
                ReasoningStep(2, "Documentos", f"Válido {user_country}"),
                ReasoningStep(3, "Compliance", f"Sem OFAC, idade {user_age}>18")
            ],
            conclusion=f"Aprovado. Badge Verified {account_type.title()}",
            confidence=kyc_score / 100
        )
        
        print("DEBUG: Creating metadata...", file=sys.stderr)
        
        # Criar metadados estruturados (COMPACTOS - max 500 chars)
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        external_id = f"FUNS-KYC-{timestamp}"
        
        metadata = Metadata(
            external_id=external_id,
            document_type="kyc_creator_onboarding",
            client_name=user_name,
            system_origin="Funs.ai v2.1",
            custom_fields={
                "type": account_type,
                "badge": f"Verified {account_type.title()}",
                "risk": round((100 - kyc_score) / 100, 2),
                "country": user_country,
                "age": user_age,
                # Reasoning compacto (quebra caixa-preta)
                "reasoning": {
                    "steps": [
                        {"n": 1, "t": "Biometria", "r": "Match 98% ✓"},
                        {"n": 2, "t": "Docs", "r": f"{user_country} ✓"},
                        {"n": 3, "t": "Compliance", "r": f"{user_age}y, OFAC ✓"}
                    ],
                    "result": f"Approved: Verified {account_type.title()}",
                    "conf": kyc_score / 100
                }
            }
        )
        
        print("DEBUG: Calling submit_attestation_with_metadata...", file=sys.stderr)
        
        # Criar attestation on-chain
        result = client.submit_attestation_with_metadata(
            content=f"KYC aprovado: {user_name} é Verified {account_type.title()}",
            reasoning=reasoning,
            metadata=metadata
            gas_limit=1200000
        )
        
        print(f"DEBUG: Attestation created successfully! ID: {result.attestation_id}", file=sys.stderr)
        
        # Garantir prefixo 0x
        attestation_id = result.attestation_id if result.attestation_id.startswith('0x') else f"0x{result.attestation_id}"
        tx_hash = result.tx_hash if result.tx_hash.startswith('0x') else f"0x{result.tx_hash}"
        
        return {
            'attestation_id': attestation_id,
            'tx_hash': tx_hash,
            'certificate_url': f"https://annaprotocol.com/verify?hash={attestation_id}",
            'dashboard_url': f"https://dashboard.annaprotocol.online"
        }