import fs from 'node:fs';
import axios from 'axios';

async function appRoleLogin() {
    const secret_id = fs.readFileSync('/run/sercrets/svc-auth.secret_id', 'utf8');
    console.log(secret_id);

    const role_id = fs.readFileSync('/run/sercrets/svc-auth.role_id', 'utf8');
    console.log(role_id);

    const result = await axios.post('http://vault:8200/auth/approle/login', {
        role_id: role_id,
        secret_id: secret_id
    });

    return result.data.client_token;
}

async function getSecret(name: string, vaultToken:string) {
    const result = await axios.get(`http://vault:8200/kv/svc/auth/${name}`, {
        headers: {'X-Vault-Token': vaultToken},
    });
    return result.data.data.data.name;
}
