/*

------------------- CENARIO DE TESTE -------------------
Buscando todos os crocodilos

Criterios aplicados:
    - performance onde:
        - carga de 100 vu por 10s

Validações:
    - tempo requisicao p(95) < 250ms
    - requisicao com falha < 1%
*/

// IMPORTS
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 100,
    duration: '10s',
    thresholds: {
        http_req_failed: ['rate < 0.01'],
        http_req_duration: ['p(95) < 250']
    }
}

const BASE_URL =`http://localhost:${process.env.PORT}/api`;;

export function setup(){
    const loginRes = http.post(`${BASE_URL}/auth/local/signin/`, {
        username: 'admin@mail.com',
        password: 'password123'
    });
    const token = loginRes.json('access');
    return token;
}

export default function(token){
    
    const params = {
        headers: {
            Authorization: `Bearer ${token}` ,
            'Content-Type': 'application/json'
        }
    }
    const res = http.get(`${BASE_URL}/gas-station`, params);

    check(res, {
        'status code 200': (r) => r.status === 200
    });

    sleep(1)
}