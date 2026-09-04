import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { findUserByUsername, createUser, countReports, addReport, deleteReports, getPlayerMinutes } from '../db/users';
import { addBan } from '../db/bans';
import { hashPassword, signPlayerJWT, privateKey, publicKey, checkAuth, isAdmin } from '../middleware/auth';
import { notifyDiscord } from '../utils/discord';
import { registerSchema, loginSchema } from '../schemas/auth';

const router = Router();

const AUTO_BAN_THRESHOLD = parseInt(process.env.AUTO_BAN_THRESHOLD || '3', 10);

router.get('/jwt/external/key.pem', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.send(publicKey);
});

router.post('/jwt/external/:audience', async (req, res) => {
    const authResult = await checkAuth(req);
    if (!authResult.valid) return res.status(401).send('Unauthorized');
    const { audience } = req.params;
    const token = jwt.sign(
        { sub: authResult.username, displayName: authResult.username, iss: 'citra-core', aud: `external-${audience}` },
        privateKey,
        { algorithm: 'RS256', expiresIn: '1h' }
    );
    res.setHeader('Content-Type', 'text/html');
    res.send(token);
});

router.post('/jwt/internal', async (req, res) => {
    const username = req.header('x-username') || req.body?.username || req.query?.username || '';
    const citraToken = req.header('x-citra-token') || req.header('x-token') || req.body?.citra_token || req.body?.token || req.query?.token || '';

    if (!username || !citraToken) {
        return res.status(401).send('Username and citra_token required');
    }

    const user = await findUserByUsername(username);
    if (!user || user.citra_token !== citraToken) {
        return res.status(403).send('Invalid username or token');
    }

    const token = jwt.sign(
        { sub: user.username, displayName: user.username, iss: 'citra-core' },
        privateKey,
        { algorithm: 'RS256', expiresIn: '1h' }
    );
    res.setHeader('Content-Type', 'text/html');
    res.send(token);
});

router.post('/register', async (req, res) => {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
        const firstIssue = parseResult.error.issues[0];
        return res.status(400).send(firstIssue?.message || 'Invalid registration data');
    }

    const { username, password, email } = parseResult.data;

    const existing = await findUserByUsername(username);
    if (existing) {
        return res.status(409).send('Username already taken');
    }

    const hash = hashPassword(password);
    const token = crypto.randomBytes(16).toString('hex');
    
    await createUser(username, email || '', hash, token);

    console.log(`[Player] Registered: ${username}`);
    res.json({ token: signPlayerJWT(username), username, citraToken: token });
});

router.post('/login', async (req, res) => {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
        const firstIssue = parseResult.error.issues[0];
        return res.status(400).send(firstIssue?.message || 'Invalid login data');
    }

    const { username, password } = parseResult.data;
    const user = await findUserByUsername(username);
    
    if (!user || !bcrypt.compareSync(password, user.hash)) {
        return res.status(401).send('Invalid credentials');
    }

    res.json({ token: signPlayerJWT(user.username), username: user.username });
});

router.get('/player/:username', async (req, res) => {
    const user = await findUserByUsername(req.params.username || '');
    if (!user) return res.status(404).send('Player not found');

    const authResult = await checkAuth(req);
    const isOwner = authResult.valid && authResult.username === user.username;
    const isAdminRequest = isAdmin(req);

    res.json({
        username: user.username,
        citraToken: (isOwner || isAdminRequest) ? user.citra_token : undefined,
        createdAt: user.created_at,
        minutesOnline: Math.round(await getPlayerMinutes(user.username)),
    });
});

router.post('/report', async (req, res) => {
    const authResult = await checkAuth(req);
    if (!authResult.valid) return res.status(401).send('Unauthorized');

    const { target } = req.body;
    const reporter = authResult.username;

    if (!target) return res.status(400).send('target required');

    await addReport(target, reporter);
    const count = await countReports(target);

    if (count >= AUTO_BAN_THRESHOLD) {
        addBan('username', target);
        await deleteReports(target);
        
        console.log(`[AutoBan] ${target} banned after ${count} reports`);
        notifyDiscord(`**${target}** auto-banned after ${AUTO_BAN_THRESHOLD} reports`);
        
        return res.json({ banned: true, count });
    }

    res.json({ banned: false, count });
});

export default router;