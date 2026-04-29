import express from 'express';
import { exportJWK, importSPKI } from 'jose';
import dotenv from 'dotenv';
import { createPublicKey } from 'crypto';
dotenv.config(); // {path: '...'} pour personnailiser ou est la cles
const app = express();
const port = 3000;
const secret = process.env.SECRETKEY;
if (!secret)
    throw new Error('SECRETKEY manquante dans .env');
app.get('/signing-key', async (req, res) => {
    const publicKeyPem = createPublicKey(secret).export({ type: 'spki', format: 'pem' });
    const publicKey = await importSPKI(publicKeyPem, 'RS256'); // ← extrait la clé publique en PEM
    const jwk = await exportJWK(publicKey);
    res.json({ keys: [{ ...jwk, use: 'sig', kid: 'svc-auth-key-1' }] });
    // use: 'sig',                // ← indique que cette clé sert à signer (pas à chiffrer)
    //    kid: 'svc-auth-key-1'    ← identifiant unique de la clé
});
app.listen(port, () => {
    console.log(`listening on port ${port}`);
});
